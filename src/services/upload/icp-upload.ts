'use client';

import { detectMemoryTypeFromFile } from '@/utils/memory-type';

/**
 * Frontend ICP Upload Service - 2-Lane + 4-Asset System Integration
 *
 * This service implements the complete ICP upload functionality with:
 * - Lane A: Original file upload to ICP canister
 * - Lane B: Image processing + derivative uploads to ICP canister
 * - Database integration: All 4 assets saved to Neon database
 * - Internet Identity authentication
 * - Chunked upload support for large files
 *
 * Reference Implementation:
 * - Backend Test: tests/backend/shared-capsule/upload/ic-upload.mjs
 *   This Node.js test file demonstrates the complete ICP upload flow:
 *   1. Get/create capsule ID
 *   2. Begin upload session with asset metadata
 *   3. Stream chunks to ICP canister
 *   4. Compute file hash for verification
 *   5. Finish upload and get memory ID
 *
 * The backend test shows the core ICP upload API usage that this frontend
 * service implements with additional features like image processing and
 * database integration.
 */

// import { HttpAgent } from '@dfinity/agent';
import type { AssetMetadata, _SERVICE } from '@/ic/declarations/backend/backend.did';
import type { HostingPreferences } from '@/hooks/use-hosting-preferences';
import { UPLOAD_LIMITS_ICP } from '@/config/upload-limits';

import { fatLogger } from '@/lib/logger';

// Generate idempotency key for uploads
function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}
import { processImageDerivativesPure, type ProcessedBlobs } from './image-derivatives';
import {
  type UploadResult,
  type UploadProgress,
  type UploadServiceResult,
  type StorageBackend,
  type DatabaseBackend,
} from './types';

// Create ICP upload specific logger (now using fatLogger)
// const icpLogger = fatLogger;

// Legacy types for backward compatibility (deprecated)
export interface UploadStorage {
  database: 'neon' | 'icp';
  blob_storage: 's3' | 'vercel_blob' | 'icp' | 'arweave' | 'ipfs';
  idem: string;
  expires_at: string;
  ttl_seconds: number;
  limits?: {
    inline_max: number;
    chunk_size: number;
    max_chunks: number;
  };
  icp?: {
    canister_id: string;
    network?: string;
  };
}

// Re-export unified types for backward compatibility
export type { UploadResult, UploadProgress, UploadServiceResult };

// Use the generated backend types and IDL factory
type CanisterActor = _SERVICE;

/**
 * Get or create a capsule ID for the authenticated user
 */
async function getOrCreateCapsuleId(actor: CanisterActor): Promise<string> {
  fatLogger.info('🔍 Starting capsule ID retrieval/creation process', 'fe');

  try {
    // Try to get existing capsule
    fatLogger.info('📋 Attempting to read existing capsule...', 'fe');
    const capsuleResult = await actor.capsules_read_basic([]);

    if ('Ok' in capsuleResult && capsuleResult.Ok) {
      fatLogger.info('✅ Found existing capsule', 'fe', { capsuleId: capsuleResult.Ok.capsule_id });
      return capsuleResult.Ok.capsule_id;
    }

    // No capsule found, create one
    fatLogger.info('🆕 No capsule found, creating new one...', 'fe');
    const createResult = await actor.capsules_create([]);

    if ('Ok' in createResult) {
      fatLogger.info('✅ Successfully created new capsule', 'fe', {
        capsuleId: createResult.Ok.id,
        timestamp: new Date().toISOString(),
      });
      return createResult.Ok.id;
    } else {
      fatLogger.error('❌ Failed to create capsule', 'fe', { error: createResult });
      throw new Error(`Failed to create capsule: ${JSON.stringify(createResult)}`);
    }
  } catch (error) {
    fatLogger.error('❌ Failed to get or create capsule', 'fe', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Failed to get or create capsule: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Process image derivatives for ICP uploads (Lane B)
 * Reuses existing storage-agnostic image processing infrastructure
 */
async function processImageDerivativesForICP(file: File): Promise<ProcessedBlobs> {
  fatLogger.info(`🖼️ Starting Lane B image processing for ICP ${file.name} ${file.size} ${file.type}`, 'fe');

  try {
    // Reuse existing storage-agnostic image processing
    const processedBlobs = await processImageDerivativesPure(file);

    fatLogger.info('✅ Lane B image processing completed for ICP', 'fe', {
      fileName: file.name,
      hasDisplay: !!processedBlobs.display,
      hasThumb: !!processedBlobs.thumb,
      hasPlaceholder: !!processedBlobs.placeholder,
    });

    return processedBlobs;
  } catch (error) {
    fatLogger.error('❌ Lane B image processing failed for ICP', 'fe', {
      fileName: file.name,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Upload processed derivatives to ICP canister (Lane B)
 * Uses chunked upload system for each derivative
 */
async function uploadProcessedAssetsToICP(
  processedBlobs: ProcessedBlobs,
  originalFileName: string,
  actor: CanisterActor,
  capsuleId: string
): Promise<{
  display?: { blobId: string; memoryId: string };
  thumb?: { blobId: string; memoryId: string };
  placeholder?: { blobId: string; memoryId: string };
}> {
  fatLogger.info(
    `📤 Starting Lane B derivative upload to ICP ${originalFileName} ${!!processedBlobs.display} ${!!processedBlobs.thumb} ${!!processedBlobs.placeholder}`,
    'fe'
  );

  const results: {
    display?: { blobId: string; memoryId: string };
    thumb?: { blobId: string; memoryId: string };
    placeholder?: { blobId: string; memoryId: string };
  } = {};

  try {
    // Upload display derivative
    if (processedBlobs.display) {
      fatLogger.info(
        `📤 Uploading display derivative to ICP ${processedBlobs.display.width} ${processedBlobs.display.height} ${processedBlobs.display.bytes}`,
        'fe'
      );

      const displayFile = new File([processedBlobs.display.blob], `${originalFileName}_display`, {
        type: processedBlobs.display.mimeType,
      });
      const displayResult = await uploadChunkedToICP(displayFile, actor, capsuleId, generateIdempotencyKey(), {
        inline_max: UPLOAD_LIMITS_ICP.INLINE_MAX_BYTES,
        chunk_size: UPLOAD_LIMITS_ICP.CHUNK_SIZE_BYTES,
        max_chunks: UPLOAD_LIMITS_ICP.MAX_CHUNKS,
      });
      results.display = {
        blobId: displayResult.blobId,
        memoryId: displayResult.memoryId,
      };

      fatLogger.info('✅ Display derivative uploaded to ICP', 'fe', {
        blobId: displayResult.blobId,
        memoryId: displayResult.memoryId,
      });
    }

    // Upload thumb derivative
    if (processedBlobs.thumb) {
      fatLogger.info('📤 Uploading thumb derivative to ICP', 'fe', {
        width: processedBlobs.thumb.width,
        height: processedBlobs.thumb.height,
        bytes: processedBlobs.thumb.bytes,
      });

      const thumbFile = new File([processedBlobs.thumb.blob], `${originalFileName}_thumb`, {
        type: processedBlobs.thumb.mimeType,
      });
      const thumbResult = await uploadChunkedToICP(thumbFile, actor, capsuleId, generateIdempotencyKey(), {
        inline_max: UPLOAD_LIMITS_ICP.INLINE_MAX_BYTES,
        chunk_size: UPLOAD_LIMITS_ICP.CHUNK_SIZE_BYTES,
        max_chunks: UPLOAD_LIMITS_ICP.MAX_CHUNKS,
      });
      results.thumb = {
        blobId: thumbResult.blobId,
        memoryId: thumbResult.memoryId,
      };

      fatLogger.info('✅ Thumb derivative uploaded to ICP', 'fe', {
        blobId: thumbResult.blobId,
        memoryId: thumbResult.memoryId,
      });
    }

    // Upload placeholder derivative
    if (processedBlobs.placeholder) {
      fatLogger.info('📤 Uploading placeholder derivative to ICP', 'fe', {
        width: processedBlobs.placeholder.width,
        height: processedBlobs.placeholder.height,
      });

      // Convert data URL to blob for upload
      const placeholderBlob = await fetch(processedBlobs.placeholder.dataUrl).then(r => r.blob());
      const placeholderFile = new File([placeholderBlob], `${originalFileName}_placeholder`, {
        type: 'image/jpeg',
      });
      const placeholderResult = await uploadChunkedToICP(placeholderFile, actor, capsuleId, generateIdempotencyKey(), {
        inline_max: UPLOAD_LIMITS_ICP.INLINE_MAX_BYTES,
        chunk_size: UPLOAD_LIMITS_ICP.CHUNK_SIZE_BYTES,
        max_chunks: UPLOAD_LIMITS_ICP.MAX_CHUNKS,
      });
      results.placeholder = {
        blobId: placeholderResult.blobId,
        memoryId: placeholderResult.memoryId,
      };

      fatLogger.info('✅ Placeholder derivative uploaded to ICP', 'fe', {
        blobId: placeholderResult.blobId,
        memoryId: placeholderResult.memoryId,
      });
    }

    fatLogger.info('✅ Lane B derivative upload completed for ICP', 'fe', {
      originalFileName,
      results,
    });

    return results;
  } catch (error) {
    fatLogger.error('❌ Lane B derivative upload failed for ICP', 'fe', {
      originalFileName,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Create Neon database records for ICP upload with all 4 assets
 * This mirrors the same pattern used for S3 uploads but handles derivatives
 */
async function createNeonDatabaseRecord(
  file: File,
  icpMemoryId: string,
  derivativesResult?: {
    display?: { blobId: string; memoryId: string };
    thumb?: { blobId: string; memoryId: string };
    placeholder?: { blobId: string; memoryId: string };
  }
): Promise<{ memoryId: string; assetId: string }> {
  fatLogger.info('🗄️ Starting Neon database record creation', 'fe', {
    icpMemoryId,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
  });

  try {
    // Build assets array with all 4 assets
    const assets = [
      {
        assetType: 'original',
        variant: 'default',
        url: `icp://memory/${icpMemoryId}`, // ICP-specific URL format
        assetLocation: 'icp',
        storageKey: icpMemoryId, // Use ICP memory ID as storage key
        bytes: file.size,
        width: null,
        height: null,
        mimeType: file.type,
        processingStatus: 'completed', // ICP uploads are immediately available
      },
    ];

    // Add derivatives if they exist
    if (derivativesResult?.display) {
      assets.push({
        assetType: 'display',
        variant: 'default',
        url: `icp://memory/${derivativesResult.display.memoryId}`,
        assetLocation: 'icp',
        storageKey: derivativesResult.display.memoryId,
        bytes: 0, // Will be updated by backend
        width: null,
        height: null,
        mimeType: 'image/jpeg',
        processingStatus: 'completed',
      });
    }

    if (derivativesResult?.thumb) {
      assets.push({
        assetType: 'thumb',
        variant: 'default',
        url: `icp://memory/${derivativesResult.thumb.memoryId}`,
        assetLocation: 'icp',
        storageKey: derivativesResult.thumb.memoryId,
        bytes: 0, // Will be updated by backend
        width: null,
        height: null,
        mimeType: 'image/jpeg',
        processingStatus: 'completed',
      });
    }

    if (derivativesResult?.placeholder) {
      assets.push({
        assetType: 'placeholder',
        variant: 'default',
        url: `icp://memory/${derivativesResult.placeholder.memoryId}`,
        assetLocation: 'icp',
        storageKey: derivativesResult.placeholder.memoryId,
        bytes: 0, // Will be updated by backend
        width: null,
        height: null,
        mimeType: 'image/jpeg',
        processingStatus: 'completed',
      });
    }

    // Determine memory type from file
    const memoryType = detectMemoryTypeFromFile(file);

    fatLogger.info('📤 Creating storage edge for ICP memory', 'fe', {
      memoryId: icpMemoryId,
      memoryType,
      fileSize: file.size,
    });

    // Create storage edge for the original asset
    const storageEdgeResponse = await fetch('/api/storage/edges', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        memoryId: icpMemoryId,
        memoryType: memoryType,
        artifact: 'asset',
        locationAsset: 'icp',
        present: true,
        location: `icp://memory/${icpMemoryId}`, // ICP blob location
        contentHash: null, // TODO: Add SHA256 hash if available
        sizeBytes: file.size,
        syncState: 'idle',
      }),
    });

    fatLogger.info('📥 Received response from /api/storage/edges', 'fe', {
      status: storageEdgeResponse.status,
      statusText: storageEdgeResponse.statusText,
      ok: storageEdgeResponse.ok,
    });

    if (!storageEdgeResponse.ok) {
      const errorText = await storageEdgeResponse.text();
      fatLogger.error('❌ Failed to create storage edge - API error', 'fe', {
        status: storageEdgeResponse.status,
        statusText: storageEdgeResponse.statusText,
        errorText,
      });
      throw new Error(`Failed to create storage edge: ${storageEdgeResponse.statusText}`);
    }

    const edgeResult = await storageEdgeResponse.json();

    fatLogger.info('✅ Successfully created storage edge for ICP memory', 'fe', {
      memoryId: icpMemoryId,
      edgeId: edgeResult.data.id,
      memoryType: memoryType,
      backend: 'icp-canister',
      timestamp: new Date().toISOString(),
    });

    return {
      memoryId: icpMemoryId,
      assetId: edgeResult.data.id, // Use edge ID as asset ID
    };
  } catch (error) {
    fatLogger.error('❌ Failed to create Neon database record', 'fe', {
      icpMemoryId,
      fileName: file.name,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Failed to create database record: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Upload a single file to ICP canister
 */
export async function uploadFileToICP(
  file: File,
  preferences: HostingPreferences,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadServiceResult> {
  const startTime = Date.now();

  fatLogger.info('🚀 Starting ICP file upload', 'fe', {
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
    blobHosting: preferences.blobHosting,
    databaseHosting: preferences.databaseHosting,
  });

  // Handle blob hosting preferences
  if (preferences.blobHosting.includes('icp')) {
    fatLogger.info('🔍 DEBUG: About to log ICP blob hosting preference confirmed', 'fe');
    fatLogger.info('✅ ICP blob hosting preference confirmed', 'fe');
    fatLogger.info('🔍 TEST: Direct logger test', 'fe');
    fatLogger.info('🧪 DIRECT LOGGER TEST - This should appear', 'fe');

    // 🚨 TESTING CONFIRMATION: We are routing to ICP upload!
    fatLogger.info('🎯 CONFIRMED: Upload routing to ICP canister', 'fe', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      blobHosting: preferences.blobHosting,
      timestamp: new Date().toISOString(),
    });

    // Case 1: ICP storage - current implementation
    const limits = {
      inline_max: UPLOAD_LIMITS_ICP.INLINE_MAX_BYTES,
      chunk_size: UPLOAD_LIMITS_ICP.CHUNK_SIZE_BYTES,
      max_chunks: UPLOAD_LIMITS_ICP.MAX_CHUNKS,
    };
    const idem = crypto.randomUUID();

    fatLogger.info('🔍 DEBUG: About to log upload configuration', 'fe');
    fatLogger.info('📋 Upload configuration', 'fe', {
      limits,
      idem,
      uploadType: file.size <= limits.inline_max ? 'inline' : 'chunked',
    });

    // Use safe backendActor function with health check
    fatLogger.info('🔍 DEBUG: About to log backend actor creation', 'fe');
    fatLogger.info('🔗 Creating backend actor...', 'fe');
    const { backendActor } = await import('@/ic/backend');
    const actor = (await backendActor()) as CanisterActor;
    fatLogger.info('🔍 DEBUG: About to log backend actor created successfully', 'fe');
    fatLogger.info('✅ Backend actor created successfully', 'fe');

    const fileSize = file.size;
    const isInline = fileSize <= limits.inline_max;

    fatLogger.info('📊 Upload strategy determined', 'fe', {
      fileSize,
      isInline,
      expectedChunks: isInline ? 1 : Math.ceil(fileSize / limits.chunk_size),
    });

    // Get or create capsule ID
    const capsuleId = await getOrCreateCapsuleId(actor);

    // 🚀 PHASE 2: Implement 2-Lane + 4-Asset System
    fatLogger.info('🚀 Starting 2-lane + 4-asset upload system', 'fe', {
      fileName: file.name,
      fileSize: file.size,
      isImage: file.type.startsWith('image/'),
    });

    // Lane A: Upload original file (existing logic)
    const laneAPromise = isInline
      ? uploadInlineToICP(file, actor, capsuleId, idem, onProgress)
      : uploadChunkedToICP(file, actor, capsuleId, idem, limits, onProgress);

    // Lane B: Process image derivatives (if image file)
    let laneBPromise: Promise<ProcessedBlobs> | null = null;
    if (file.type.startsWith('image/')) {
      fatLogger.info('🖼️ Starting Lane B: Image processing', 'fe', { fileName: file.name });
      laneBPromise = processImageDerivativesForICP(file);
    } else {
      fatLogger.info('⏭️ Skipping Lane B: Not an image file', 'fe', { fileName: file.name, fileType: file.type });
    }

    // Wait for both lanes to complete
    fatLogger.info('⏳ Waiting for both lanes to complete...', 'fe');
    const [laneAResult, laneBResult] = await Promise.allSettled([laneAPromise, laneBPromise]);

    // Handle Lane A result
    if (laneAResult.status === 'rejected') {
      fatLogger.error('❌ Lane A failed: Original file upload failed', 'fe', {
        error: laneAResult.reason,
        fileName: file.name,
      });
      throw new Error(`Original file upload failed: ${laneAResult.reason}`);
    }
    const icpResult = laneAResult.value;

    // Handle Lane B result and upload derivatives
    let derivativesResult = null;
    if (laneBResult && laneBResult.status === 'fulfilled' && laneBResult.value) {
      fatLogger.info('✅ Lane B completed: Image processing successful', 'fe', {
        fileName: file.name,
        hasDisplay: !!laneBResult.value.display,
        hasThumb: !!laneBResult.value.thumb,
        hasPlaceholder: !!laneBResult.value.placeholder,
      });

      // Upload derivatives to ICP
      fatLogger.info('📤 Starting derivative uploads to ICP', 'fe', { fileName: file.name });
      derivativesResult = await uploadProcessedAssetsToICP(laneBResult.value, file.name, actor, capsuleId);

      fatLogger.info('✅ Lane B completed: All derivatives uploaded to ICP', 'fe', {
        fileName: file.name,
        derivativesResult,
      });
    } else if (laneBResult && laneBResult.status === 'rejected') {
      fatLogger.warn('⚠️ Lane B failed: Image processing failed, continuing with original only', 'fe', {
        fileName: file.name,
        error: laneBResult.reason,
      });
      // Continue with original file only - don't fail the entire upload
    }

    fatLogger.info('✅ ICP upload completed successfully', 'fe', {
      memoryId: icpResult.memoryId,
      size: icpResult.size,
      checksum: icpResult.checksumSha256,
    });

    // Create Neon database record with all 4 assets (only if user has neon/vercel in database preferences)
    if (preferences.databaseHosting.includes('neon')) {
      fatLogger.info(
        '🗄️ User has neon in database preferences, creating Neon database record with all 4 assets',
        'fe',
        {
          hasDerivatives: !!derivativesResult,
          derivativesCount: derivativesResult ? Object.keys(derivativesResult).length : 0,
        }
      );
      try {
        const { memoryId, assetId } = await createNeonDatabaseRecord(
          file,
          icpResult.memoryId,
          derivativesResult || undefined
        );
        fatLogger.info('✅ Successfully created Neon database record with all 4 assets', 'fe', {
          memoryId,
          assetId,
          icpMemoryId: icpResult.memoryId,
          derivativesCount: derivativesResult ? Object.keys(derivativesResult).length : 0,
          databaseHosting: preferences.databaseHosting,
        });
      } catch (error) {
        fatLogger.warn('⚠️ Failed to create Neon database record, but ICP upload succeeded', 'fe', {
          icpMemoryId: icpResult.memoryId,
          error: error instanceof Error ? error.message : 'Unknown error',
          databaseHosting: preferences.databaseHosting,
        });
        // Don't fail the upload if database record creation fails
        // The file is already uploaded to ICP successfully
      }
    } else {
      fatLogger.info('⏭️ Skipping Neon database record creation - user prefers ICP-only database', 'fe', {
        databaseHosting: preferences.databaseHosting,
        icpMemoryId: icpResult.memoryId,
      });
    }

    fatLogger.info('🎉 ICP upload process completed', 'fe', {
      fileName: file.name,
      icpMemoryId: icpResult.memoryId,
      totalSize: Number(icpResult.size),
      databaseRecordCreated: preferences.databaseHosting.includes('neon'),
    });

    // Convert to unified UploadServiceResult format
    return {
      data: { id: icpResult.memoryId },
      results: [
        {
          memoryId: icpResult.memoryId,
          blobId: icpResult.blobId,
          remoteId: icpResult.remoteId,
          size: icpResult.size,
          checksumSha256: icpResult.checksumSha256,
          storageBackend: 'icp' as StorageBackend,
          storageLocation: `icp://memory/${icpResult.memoryId}`,
          uploadedAt: BigInt(Date.now()),
        },
      ],
      userId: '', // TODO: Get userId from session or context
      totalFiles: 1,
      totalSize: Number(icpResult.size),
      processingTime: Date.now() - startTime,
      storageBackend: 'icp' as StorageBackend,
      databaseBackend: preferences.databaseHosting.includes('neon')
        ? ('neon' as DatabaseBackend)
        : ('icp' as DatabaseBackend),
    };
  }

  if (preferences.blobHosting.includes('s3')) {
    // Case 2: S3 storage - TODO: implement
    throw new Error('ICP upload service: S3 storage not yet implemented');
  }

  if (preferences.blobHosting.includes('arweave')) {
    // Case 3: Arweave storage - TODO: implement
    throw new Error('ICP upload service: Arweave storage not yet implemented');
  }

  if (preferences.blobHosting.includes('ipfs')) {
    // Case 4: IPFS storage - TODO: implement
    throw new Error('ICP upload service: IPFS storage not yet implemented');
  }

  if (preferences.blobHosting.includes('vercel_blob')) {
    // Case 5: Vercel Blob storage - TODO: implement
    throw new Error('ICP upload service: Vercel Blob storage not yet implemented');
  }

  if (preferences.blobHosting.includes('neon')) {
    // Case 6: Neon storage - TODO: implement
    throw new Error('ICP upload service: Neon storage not yet implemented');
  }

  // No matching storage preference found
  throw new Error(
    `ICP upload service: No supported storage preference found. User preferences: ${preferences.blobHosting.join(', ')}`
  );
}

/**
 * Upload multiple files to ICP canister
 */
export async function uploadFolderToICP(
  files: File[],
  preferences: HostingPreferences,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadServiceResult[]> {
  const results: UploadServiceResult[] = [];
  const totalFiles = files.length;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    // Update progress for current file
    onProgress?.({
      fileIndex: i,
      totalFiles,
      currentFile: file.name,
      bytesUploaded: BigInt(0),
      totalBytes: BigInt(file.size),
      percentage: (i / totalFiles) * 100,
      status: 'uploading' as const,
    });

    try {
      const result = await uploadFileToICP(file, preferences, fileProgress => {
        // Calculate overall progress including current file
        const overallPercentage = (i / totalFiles) * 100 + fileProgress.percentage / totalFiles;
        onProgress?.({
          fileIndex: i,
          totalFiles,
          currentFile: file.name,
          bytesUploaded: fileProgress.bytesUploaded,
          totalBytes: fileProgress.totalBytes,
          percentage: overallPercentage,
          status: 'uploading' as const,
        });
      });

      results.push(result);
    } catch (error) {
      fatLogger.error(`Failed to upload file ${file.name}:`, 'be', {
        data: error instanceof Error ? error : undefined,
      });
      // Continue with other files, but log the error
      throw new Error(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return results;
}

/**
 * Main upload function for ICP - used by processor files
 * This is a wrapper that calls the appropriate upload function based on file count
 */
export async function uploadToICP(
  files: File[],
  preferences: HostingPreferences,
  userId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<
  {
    data: { id: string };
    results: Array<{ memoryId: string; size: number; checksum_sha256: string | null }>;
    userId: string;
  }[]
> {
  const results =
    files.length === 1
      ? [await uploadFileToICP(files[0], preferences, onProgress)]
      : await uploadFolderToICP(files, preferences, onProgress);

  // Convert to expected format for processor compatibility
  return results.map(result => ({
    data: { id: result.data.id },
    results: result.results.map(r => ({
      memoryId: r.memoryId,
      size: Number(r.size),
      checksum_sha256: r.checksumSha256
        ? Array.from(r.checksumSha256)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
        : null,
    })),
    userId: userId,
  }));
}

/**
 * Upload a file inline to ICP canister (for small files)
 */
export async function uploadInlineToICP(
  file: File,
  actor: CanisterActor,
  capsuleId: string,
  idem: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  fatLogger.info('📤 Starting inline upload to ICP', 'fe', {
    fileName: file.name,
    fileSize: file.size,
    capsuleId,
    idem,
  });

  try {
    // Read file as bytes
    fatLogger.info('📖 Reading file as bytes...', 'fe');
    const fileBytes = await file.arrayBuffer();
    const bytesArray = Array.from(new Uint8Array(fileBytes));
    fatLogger.info('✅ File bytes read successfully', 'fe', { bytesLength: bytesArray.length });

    // Update progress
    onProgress?.({
      fileIndex: 0,
      totalFiles: 1,
      currentFile: file.name,
      bytesUploaded: BigInt(file.size),
      totalBytes: BigInt(file.size),
      percentage: 100,
      status: 'completed' as const,
    });

    // Create asset metadata for the file (simplified like the working script)
    const assetMetadata: AssetMetadata = {
      Image: {
        base: {
          url: [],
          height: [],
          updated_at: BigInt(Date.now() * 1000000), // Convert to nanoseconds
          asset_type: { Original: null },
          sha256: [],
          name: file.name,
          storage_key: [],
          tags: ['upload-test', 'frontend-uploader'],
          processing_error: [],
          mime_type: file.type,
          description: [`Uploaded file: ${file.name}`],
          created_at: BigInt(Date.now() * 1000000),
          deleted_at: [],
          bytes: BigInt(file.size),
          asset_location: [],
          width: [],
          processing_status: [],
          bucket: [],
        },
        dpi: [],
        color_space: [],
        exif_data: [],
        compression_ratio: [],
        orientation: [],
      },
    };

    // Call canister memories_create with correct signature
    fatLogger.info('📞 Calling memories_create on canister...', 'fe');
    const createResult = await actor.memories_create(
      capsuleId, // capsule_id
      [bytesArray], // inline_bytes
      [], // blob_ref
      [], // storage_edge_blob_type
      [file.name], // title - use filename as title
      [`Uploaded file: ${file.name}`], // description
      [], // date_of_memory
      [], // sha256
      assetMetadata, // asset_metadata
      idem // idem
    );

    if ('Err' in createResult) {
      fatLogger.error('❌ memories_create failed', 'fe', { error: createResult.Err });
      throw new Error(`Failed to create memory: ${JSON.stringify(createResult.Err)}`);
    }
    const memoryId = createResult.Ok;

    fatLogger.info('✅ Inline upload completed successfully', 'fe', {
      memoryId,
      fileName: file.name,
      fileSize: file.size,
    });

    return {
      memoryId: memoryId,
      blobId: memoryId, // For inline uploads, blobId is same as memoryId
      remoteId: memoryId,
      size: BigInt(file.size),
      checksumSha256: undefined, // Inline uploads don't provide checksum
      storageBackend: 'icp' as StorageBackend,
      storageLocation: `icp://memory/${memoryId}`,
      uploadedAt: BigInt(Date.now()),
    };
  } catch (error) {
    fatLogger.error('❌ Inline upload failed', 'fe', {
      fileName: file.name,
      fileSize: file.size,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Inline upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Upload a file in chunks to ICP canister (for large files)
 */
export async function uploadChunkedToICP(
  file: File,
  actor: CanisterActor,
  capsuleId: string,
  idem: string,
  limits: { inline_max: number; chunk_size: number; max_chunks: number },
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  fatLogger.info('📤 Starting chunked upload to ICP', 'fe', {
    fileName: file.name,
    fileSize: file.size,
    capsuleId,
    idem,
    limits,
  });

  try {
    const fileSize = file.size;
    const chunkSize = limits.chunk_size;
    const expectedChunks = Math.ceil(fileSize / chunkSize);

    fatLogger.info('📊 Chunked upload configuration', 'fe', {
      fileSize,
      chunkSize,
      expectedChunks,
      maxChunks: limits.max_chunks,
    });

    if (expectedChunks > limits.max_chunks) {
      fatLogger.error('❌ File too large for chunked upload', 'fe', {
        expectedChunks,
        maxChunks: limits.max_chunks,
        fileSize,
      });
      throw new Error(`File too large: ${expectedChunks} chunks exceeds limit of ${limits.max_chunks}`);
    }

    // Begin upload session
    fatLogger.info('🚀 Beginning upload session...', 'fe');
    const sessionResult = await actor.uploads_begin(capsuleId, expectedChunks, idem);

    if ('Err' in sessionResult) {
      fatLogger.error('❌ Failed to begin upload session', 'fe', { error: sessionResult.Err });
      throw new Error(`Failed to begin upload: ${JSON.stringify(sessionResult.Err)}`);
    }
    const sessionId = sessionResult.Ok;
    fatLogger.info('✅ Upload session started', 'fe', { sessionId, expectedChunks });

    // Upload chunks
    fatLogger.info('📦 Starting chunk upload process...', 'fe');
    let bytesUploaded = BigInt(0);
    for (let i = 0; i < expectedChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, fileSize);
      const chunk = await file.slice(start, end).arrayBuffer();
      const chunkBytes = Array.from(new Uint8Array(chunk));

      fatLogger.info(`📤 Uploading chunk ${i + 1}/${expectedChunks}`, 'fe', {
        chunkIndex: i,
        chunkSize: chunk.byteLength,
        start,
        end,
      });

      await actor.uploads_put_chunk(sessionId, i, chunkBytes);

      bytesUploaded += BigInt(chunk.byteLength);

      fatLogger.info(`✅ Chunk ${i + 1}/${expectedChunks} uploaded successfully`, 'fe', {
        bytesUploaded,
        totalBytes: fileSize,
        percentage: (Number(bytesUploaded) / fileSize) * 100,
      });

      // Update progress
      onProgress?.({
        fileIndex: 0,
        totalFiles: 1,
        currentFile: file.name,
        bytesUploaded,
        totalBytes: BigInt(fileSize),
        percentage: (Number(bytesUploaded) / fileSize) * 100,
        status: 'uploading' as const,
      });
    }

    fatLogger.info('✅ All chunks uploaded successfully', 'fe', {
      totalChunks: expectedChunks,
      totalBytes: bytesUploaded,
    });

    // Calculate SHA256 hash (like the working script)
    fatLogger.info('🔐 Calculating SHA256 hash...', 'fe');
    const fileBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
    const expectedHash = new Uint8Array(hashBuffer);
    const hashHex = Array.from(expectedHash)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    fatLogger.info('✅ SHA256 hash calculated', 'fe', {
      hash: hashHex,
      hashLength: expectedHash.length,
    });

    // Finish upload
    fatLogger.info('🏁 Finishing upload session...', 'fe');
    const finishResult = await actor.uploads_finish(sessionId, Array.from(expectedHash), BigInt(fileSize));

    if ('Err' in finishResult) {
      fatLogger.error('❌ Failed to finish upload', 'fe', { error: finishResult.Err });
      throw new Error(`Failed to finish upload: ${JSON.stringify(finishResult.Err)}`);
    }

    const uploadFinishResult = finishResult.Ok;
    const memoryId = uploadFinishResult.memory_id;
    const blobId = uploadFinishResult.blob_id;

    fatLogger.info('🎉 Chunked upload completed successfully', 'fe', {
      memoryId,
      blobId,
      fileName: file.name,
      fileSize: file.size,
      totalChunks: expectedChunks,
      hash: hashHex,
    });

    return {
      memoryId,
      blobId,
      remoteId: memoryId,
      size: BigInt(file.size),
      checksumSha256: new Uint8Array(hashHex.match(/.{1,2}/g)!.map(h => parseInt(h, 16))),
      storageBackend: 'icp' as StorageBackend,
      storageLocation: `icp://memory/${memoryId}`,
      uploadedAt: BigInt(Date.now()),
    };
  } catch (error) {
    fatLogger.error('❌ Chunked upload failed', 'fe', {
      fileName: file.name,
      fileSize: file.size,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Chunked upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
