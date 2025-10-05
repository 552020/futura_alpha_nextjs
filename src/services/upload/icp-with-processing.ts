/**
 * Enhanced ICP upload with parallel processing
 *
 * Implements the parallel lanes approach:
 * - Lane A: Upload original to ICP canister
 * - Lane B: Process image derivatives (display → thumb → placeholder)
 * Both lanes run simultaneously for optimal performance.
 *
 * Mirrors the S3 architecture pattern from s3-with-processing.ts
 */

import { processImageDerivativesPure, type ProcessedBlobs } from './image-derivatives';
import { finalizeAllAssets, type ProcessedAssets } from './finalize';
import { extractFolderName } from './shared-utils';
import { type UploadServiceResult } from './types';
// import { logger } from '@/lib/logger';
import { getAuthClient } from '@/ic/ii';
import { backendActor } from '@/ic/backend';
import type { Result, Result_4, Result_13, Result_15, AssetMetadata } from '@/ic/declarations/backend/backend.did';

/**
 * Upload original files to ICP using chunked uploads (Lane A)
 * STEP 2.1 of the upload pipeline (uploadMultipleToICPWithProcessing in icp-with-processing.ts)
 */
async function uploadOriginalToICP(
  files: File[],
  onProgress?: (progress: number) => void
): Promise<UploadServiceResult[]> {
  const isSingleFile = files.length === 1;

  const uploadPromises = files.map(async (file, _index) => {
    // Upload original file using ICP chunked upload
    await uploadFileToICPWithProgress(file, progress => {
      if (isSingleFile) {
        onProgress?.(progress);
      } else {
        // For multiple files, we could calculate overall progress here
        // For now, just call with the current file's progress
        onProgress?.(progress);
      }
    });

    // Commit to database
    const commitResponse = await fetch('/api/upload/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileKey: `icp-${Date.now()}-${file.name}`, // Generate ICP-specific key
        originalName: file.name,
        size: file.size,
        type: file.type,
      }),
    });

    if (!commitResponse.ok) {
      const error = await commitResponse.json();
      throw new Error(error.error || 'Failed to commit upload');
    }

    const commitData = await commitResponse.json();

    return {
      data: { id: commitData.data.id },
      results: [
        {
          memoryId: commitData.data.id,
          blobId: `icp-${Date.now()}-${file.name}`,
          size: BigInt(file.size),
          checksumSha256: undefined,
          storageBackend: 'icp' as const,
          storageLocation: '', // Will be set after memory edge creation
          uploadedAt: BigInt(Date.now()),
          expiresAt: undefined,
        },
      ],
      userId: commitData.data.ownerId || '',
      totalFiles: files.length,
      totalSize: files.reduce((sum, f) => sum + f.size, 0),
      processingTime: 0, // Will be calculated
      storageBackend: 'icp' as const,
      databaseBackend: 'neon' as const,
    };
  });

  const uploadResults = await Promise.all(uploadPromises);
  return uploadResults;
}

export async function uploadToICPWithProcessing(
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadServiceResult> {
  try {
    // 2. Start both lanes simultaneously
    const laneAPromise = uploadOriginalToICP([file], onProgress).then(results => results[0]);

    let laneBPromise: Promise<ProcessedAssets> | null = null;
    if (file.type.startsWith('image/')) {
      // Lane B processes original File object immediately
      laneBPromise = processImageDerivativesPure(file).then(processedBlobs =>
        uploadProcessedAssetsToICP(processedBlobs, file.name)
      );
    }

    // 3. Wait for both lanes to complete
    const laneAResult = await Promise.allSettled([laneAPromise]).then(results => results[0]);
    const laneBResult = laneBPromise ? await Promise.allSettled([laneBPromise]).then(results => results[0]) : null;

    // 4. Single finalize with all assets and precise statuses
    // Convert UploadServiceResult to the format expected by finalizeAllAssets
    const laneAResultForFinalize =
      laneAResult.status === 'fulfilled'
        ? {
            status: 'fulfilled' as const,
            value: {
              data: laneAResult.value.data,
              results: laneAResult.value.results.map(r => ({
                memoryId: r.memoryId,
                size: Number(r.size),
                checksum_sha256: r.checksumSha256
                  ? Array.from(r.checksumSha256)
                      .map(b => b.toString(16).padStart(2, '0'))
                      .join('')
                  : null,
              })),
              userId: laneAResult.value.userId,
            },
          }
        : laneAResult;

    await finalizeAllAssets(laneAResultForFinalize, laneBResult);

    // CRITICAL: Create ICP memory edge after Neon database storage
    if (laneAResult.status === 'fulfilled') {
      const memoryId = laneAResult.value.data.id;
      await createICPMemoryEdge(memoryId, memoryId); // TODO: Get actual Neon memory ID from finalizeAllAssets
    }

    // Return Lane A result (original upload)
    if (laneAResult.status === 'fulfilled') {
      return laneAResult.value;
    } else {
      throw laneAResult.reason;
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Enhanced ICP batch upload with parallel processing for multiple files
 *
 * Implements the parallel lanes approach for multiple files:
 * - Lane A: Upload all originals to ICP using chunked uploads
 * - Lane B: Process image derivatives for each image file (display → thumb → placeholder)
 * Both lanes run simultaneously for optimal performance.
 */
export async function uploadMultipleToICPWithProcessing(
  files: File[],
  mode: 'directory' | 'multiple-files',
  onProgress?: (file: File, progress: number) => void
): Promise<{
  results?: Array<{ memoryId: string; size?: number; checksum_sha256?: string | null; name?: string; type?: string }>;
  userId?: string;
  successfulUploads?: number;
}> {
  try {
    // 2.1. Start Lane A: Upload original files to ICP
    const laneAPromise = uploadOriginalToICP(files, progress => {
      // Convert overall progress to per-file progress for compatibility
      onProgress?.(files[0], progress);
    });

    // 2.2. Start Lane B: Process derivatives for image files
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    let laneBPromise: Promise<ProcessedAssets[]> | null = null;

    if (imageFiles.length > 0) {
      laneBPromise = processMultipleImageDerivativesForICP(imageFiles);
    }

    // 3. Wait for both lanes to complete
    const laneAResult = await Promise.allSettled([laneAPromise]).then(results => results[0]);
    const laneBResult = laneBPromise ? await Promise.allSettled([laneBPromise]).then(results => results[0]) : null;

    // 4. Create folder if needed (for directory mode)
    const parentFolderId = await createFolderIfNeeded(mode, files);

    // 5. Finalize all assets for each file
    if (laneAResult.status === 'fulfilled' && laneBResult?.status === 'fulfilled') {
      // Finalize each file's assets
      const finalizePromises = files.map(async (file, index) => {
        const laneAResultForFile = {
          status: 'fulfilled' as const,
          value: {
            data: laneAResult.value[index].data,
            results: laneAResult.value[index].results.map(r => ({
              memoryId: r.memoryId,
              size: Number(r.size),
              checksum_sha256: r.checksumSha256
                ? Array.from(r.checksumSha256)
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('')
                : null,
            })),
            userId: laneAResult.value[index].userId,
          },
        };

        const laneBResultForFile = {
          status: 'fulfilled' as const,
          value: laneBResult.value[index] || {},
        };

        await finalizeAllAssets(laneAResultForFile, laneBResultForFile, parentFolderId);
      });

      await Promise.all(finalizePromises);

      // CRITICAL: Create ICP memory edges after Neon database storage
      if (laneAResult.status === 'fulfilled') {
        const edgePromises = laneAResult.value.map(async result => {
          const memoryId = result.data.id;
          await createICPMemoryEdge(memoryId, memoryId); // TODO: Get actual Neon memory ID from finalizeAllAssets
        });
        await Promise.all(edgePromises);
      }
    }

    return {
      results:
        laneAResult.status === 'fulfilled'
          ? laneAResult.value.map(result => ({
              memoryId: result.results[0].memoryId,
              size: Number(result.results[0].size),
              checksum_sha256: result.results[0].checksumSha256
                ? Array.from(result.results[0].checksumSha256)
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('')
                : null,
              name: files[0]?.name,
              type: files[0]?.type,
            }))
          : [],
      userId: laneAResult.status === 'fulfilled' ? laneAResult.value[0]?.userId || '' : '',
      successfulUploads: laneAResult.status === 'fulfilled' ? laneAResult.value.length : 0,
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Create folder for directory mode uploads
 * STEP 4 of the upload pipeline (uploadMultipleToICPWithProcessing in icp-with-processing.ts)
 */
async function createFolderIfNeeded(mode: 'directory' | 'multiple-files', files: File[]): Promise<string | undefined> {
  if (mode !== 'directory') {
    return undefined;
  }

  const folderName = extractFolderName(files[0]);

  const folderResponse = await fetch('/api/folders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ folderName }),
  });

  if (!folderResponse.ok) {
    const error = await folderResponse.json();
    throw new Error(error.error || 'Failed to create folder');
  }

  const { folder } = await folderResponse.json();
  return folder.id;
}

/**
 * Process image derivatives for multiple files using pure processing + ICP upload
 * STEP 2.2 of the upload pipeline (uploadMultipleToICPWithProcessing in icp-with-processing.ts)
 */
async function processMultipleImageDerivativesForICP(imageFiles: File[]): Promise<ProcessedAssets[]> {
  const derivativePromises = imageFiles.map(async (file, _index) => {
    try {
      // Pure processing first, then ICP upload
      const processedBlobs = await processImageDerivativesPure(file);
      return await uploadProcessedAssetsToICP(processedBlobs, file.name);
    } catch (_error) {
      return {
        display: { assetType: 'display' as const, processingStatus: 'failed' as const },
        thumb: { assetType: 'thumb' as const, processingStatus: 'failed' as const },
        placeholder: { assetType: 'placeholder' as const, processingStatus: 'failed' as const },
      };
    }
  });

  return await Promise.all(derivativePromises);
}

/**
 * Upload processed blobs to ICP using chunked uploads
 * This function handles the ICP-specific upload logic for processed assets
 */
export async function uploadProcessedAssetsToICP(
  processedBlobs: ProcessedBlobs,
  originalFileName: string
): Promise<ProcessedAssets> {
  const results: ProcessedAssets = {};

  // Upload display asset to ICP
  if (processedBlobs.display) {
    try {
      // Convert blob to File for ICP upload
      const displayFile = new File([processedBlobs.display.blob], `display-${originalFileName}`, {
        type: processedBlobs.display.mimeType,
      });

      await uploadFileToICPWithProgress(displayFile, () => {}); // No progress tracking for derivatives

      results.display = {
        assetType: 'display',
        processingStatus: 'completed',
        assetLocation: 'icp',
        storageKey: `display-${originalFileName}`,
        bytes: processedBlobs.display.bytes,
        width: processedBlobs.display.width,
        height: processedBlobs.display.height,
        mimeType: processedBlobs.display.mimeType,
        url: '', // ICP URLs will be generated after memory edge creation
      };
    } catch (error) {
      console.log(
        '❌ Failed to upload display asset to ICP:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      results.display = {
        assetType: 'display',
        processingStatus: 'failed',
        assetLocation: 'icp',
        storageKey: `display-${originalFileName}`,
        bytes: 0,
        width: 0,
        height: 0,
        mimeType: 'image/jpeg',
        url: '',
      };
    }
  }

  // Upload thumb asset to ICP
  if (processedBlobs.thumb) {
    try {
      // Convert blob to File for ICP upload
      const thumbFile = new File([processedBlobs.thumb.blob], `thumb-${originalFileName}`, {
        type: processedBlobs.thumb.mimeType,
      });

      await uploadFileToICPWithProgress(thumbFile, () => {}); // No progress tracking for derivatives

      results.thumb = {
        assetType: 'thumb',
        processingStatus: 'completed',
        assetLocation: 'icp',
        storageKey: `thumb-${originalFileName}`,
        bytes: processedBlobs.thumb.bytes,
        width: processedBlobs.thumb.width,
        height: processedBlobs.thumb.height,
        mimeType: processedBlobs.thumb.mimeType,
        url: '', // ICP URLs will be generated after memory edge creation
      };
    } catch (error) {
      console.log('❌ Failed to upload thumb asset to ICP:', error instanceof Error ? error.message : 'Unknown error');
      results.thumb = {
        assetType: 'thumb',
        processingStatus: 'failed',
        assetLocation: 'icp',
        storageKey: `thumb-${originalFileName}`,
        bytes: 0,
        width: 0,
        height: 0,
        mimeType: 'image/jpeg',
        url: '',
      };
    }
  }

  // Placeholder is stored in database, not uploaded to ICP
  if (processedBlobs.placeholder) {
    results.placeholder = {
      assetType: 'placeholder',
      processingStatus: 'completed',
      assetLocation: 'neon', // Stored in database
      storageKey: 'placeholder',
      bytes: 0,
      width: processedBlobs.placeholder.width,
      height: processedBlobs.placeholder.height,
      mimeType: 'image/jpeg',
      url: processedBlobs.placeholder.dataUrl,
    };
  }

  return results;
}

/**
 * Upload file to ICP using chunked uploads with progress tracking
 *
 * This function implements the ICP upload flow:
 * 1. Get/create capsule ID
 * 2. Begin upload session with asset metadata
 * 3. Stream chunks to ICP canister
 * 4. Compute file hash for verification
 * 5. Finish upload and get memory ID
 *
 * @param file - The file to upload
 * @param onProgress - Progress callback (0-100)
 * @returns Promise<File> - The uploaded file
 */
export async function uploadFileToICPWithProgress(file: File, onProgress: (progress: number) => void): Promise<File> {
  const startTime = Date.now();
  console.log('🚀 uploadFileToICPWithProgress called!', { fileName: file.name, fileSize: file.size });
  console.log(`🔄 ICP upload started: ${file.name} (${file.size} bytes)`);

  try {
    // Import ICP dependencies
    const { getAuthClient } = await import('@/ic/ii');
    const { backendActor } = await import('@/ic/backend');

    // 1. Get authenticated actor using existing pattern
    const authClient = await getAuthClient();
    if (!authClient.isAuthenticated()) {
      throw new Error('Please connect your Internet Identity to upload to ICP');
    }

    const identity = authClient.getIdentity();
    const backend = await backendActor(identity);

    // 2. Get or create capsule
    console.log('🔍 Getting capsule...');
    const capsuleResult = (await backend.capsules_read_basic([])) as Result_4;
    let capsuleId;

    if ('Ok' in capsuleResult && capsuleResult.Ok) {
      capsuleId = capsuleResult.Ok.id;
      console.log(`✅ Using existing capsule: ${capsuleId}`);
    } else {
      console.log('🆕 No capsule found, creating one...');
      const createResult = (await backend.capsules_create([])) as Result_4;
      if (!('Ok' in createResult)) {
        throw new Error('Failed to create capsule: ' + JSON.stringify(createResult));
      }
      capsuleId = createResult.Ok.id;
      console.log(`✅ Created new capsule: ${capsuleId}`);
    }

    // 3. Prepare upload session using established limits
    const { UPLOAD_LIMITS_ICP } = await import('@/config/upload-limits');
    const limits = {
      inline_max: UPLOAD_LIMITS_ICP.INLINE_MAX_BYTES,
      chunk_size: UPLOAD_LIMITS_ICP.CHUNK_SIZE_BYTES,
      max_chunks: UPLOAD_LIMITS_ICP.MAX_CHUNKS,
    };

    // Validate file size and chunk count
    if (!UPLOAD_LIMITS_ICP.isFileSizeValid(file.size)) {
      throw new Error(UPLOAD_LIMITS_ICP.getFileSizeErrorMessage(file.size));
    }

    const totalChunks = UPLOAD_LIMITS_ICP.getExpectedChunks(file.size);
    const isInline = file.size <= limits.inline_max;

    console.log(
      `📦 Upload configuration: ${totalChunks} chunks of ${limits.chunk_size} bytes (${isInline ? 'inline' : 'chunked'})`
    );

    // 4. Create asset metadata (using same pattern as existing service)
    const assetMetadata = {
      Image: {
        base: {
          url: [],
          height: [],
          updated_at: BigInt(Date.now() * 1000000), // Convert to nanoseconds
          asset_type: { Original: null },
          sha256: [],
          name: file.name,
          storage_key: [],
          tags: ['frontend-upload', 'icp-upload'],
          processing_error: [],
          mime_type: file.type || 'application/octet-stream',
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
    } as AssetMetadata; // Use proper AssetMetadata type

    // 5. Begin upload session
    console.log('🚀 Starting upload session...');
    const begin = (await backend.uploads_begin(
      capsuleId,
      assetMetadata,
      totalChunks,
      `upload-${Date.now()}`
    )) as Result_13;

    if (!('Ok' in begin)) {
      throw new Error('uploads_begin failed: ' + JSON.stringify(begin));
    }

    const session = begin.Ok;
    console.log(`✅ Upload session started: ${session}`);

    // 6. Stream chunks
    console.log('📦 Starting chunk upload process...');
    const uploadStartTime = Date.now();
    let uploadedBytes = 0;

    for (let index = 0; index < totalChunks; index++) {
      const start = index * limits.chunk_size;
      const end = Math.min(start + limits.chunk_size, file.size);
      const chunk = new Uint8Array(await file.slice(start, end).arrayBuffer());

      console.log(`📤 Uploading chunk ${index + 1}/${totalChunks} (${chunk.length} bytes)`);

      const put = (await backend.uploads_put_chunk(session, index, chunk)) as Result;

      if (!('Ok' in put)) {
        throw new Error(`put_chunk ${index} failed: ` + JSON.stringify(put));
      }

      uploadedBytes += chunk.length;
      const percentage = (uploadedBytes / file.size) * 100;
      onProgress(percentage);

      console.log(`✅ Chunk ${index + 1}/${totalChunks} uploaded (${percentage.toFixed(1)}%)`);
    }

    const uploadEndTime = Date.now();
    const uploadDuration = uploadEndTime - uploadStartTime;
    const uploadSpeed = uploadedBytes / 1024 / 1024 / (uploadDuration / 1000); // MB/s

    console.log(`✅ All chunks uploaded (${uploadedBytes} bytes total)`);
    console.log(`⏱️ Upload time: ${uploadDuration}ms (${(uploadDuration / 1000).toFixed(2)}s)`);
    console.log(`🚀 Upload speed: ${uploadSpeed.toFixed(2)} MB/s`);

    // 7. Compute file hash
    console.log('🔐 Computing file hash...');
    const fileBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
    const hash = new Uint8Array(hashBuffer);
    const hashHex = Array.from(hash)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    console.log(`✅ File hash: ${hashHex}`);

    // 8. Finish upload
    console.log('🏁 Finishing upload...');
    const fin = (await backend.uploads_finish(session, hash, BigInt(file.size))) as Result_15;

    if (!('Ok' in fin)) {
      throw new Error('uploads_finish failed: ' + JSON.stringify(fin));
    }

    const totalTime = Date.now() - startTime;
    const totalSpeed = file.size / 1024 / 1024 / (totalTime / 1000); // MB/s

    console.log('🎉 Upload completed successfully!');
    console.log('📋 Result:', fin.Ok);
    console.log(`⏱️ Total time: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
    console.log(`🚀 Total speed: ${totalSpeed.toFixed(2)} MB/s`);
    console.log(`🔐 Final hash: ${hashHex}`);

    onProgress(100);
    return file;
  } catch (error) {
    console.log('❌ ICP upload failed:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

/**
 * Create ICP memory edge after Neon database storage
 *
 * This function tells the ICP canister about the Neon database record,
 * creating the bidirectional link between ICP and Neon storage.
 *
 * @param icpMemoryId - The memory ID from ICP canister
 * @param neonMemoryId - The memory ID from Neon database
 */
async function createICPMemoryEdge(icpMemoryId: string, neonMemoryId: string): Promise<void> {
  try {
    console.log(`🔗 Creating ICP memory edge: ${icpMemoryId} → ${neonMemoryId}`);

    // Get authenticated backend actor
    const authClient = await getAuthClient();
    if (!authClient.isAuthenticated()) {
      throw new Error('Please connect your Internet Identity to create memory edges');
    }

    const identity = authClient.getIdentity();
    const backend = await backendActor(identity);

    // Get existing memory to preserve all metadata
    const existingMemory = await backend.memories_read(icpMemoryId);
    if (!existingMemory || !('Ok' in existingMemory)) {
      throw new Error('Failed to read existing memory for edge creation');
    }

    const memory = existingMemory.Ok;
    const existingMetadata = memory.metadata || {};

    // Update memory metadata with database storage edge, preserving all existing fields
    const updateData = {
      access: [], // Keep existing access
      name: [], // Keep existing name
      metadata: [
        {
          ...existingMetadata, // Preserve all existing metadata
          database_storage_edges: [{ Icp: null }], // Add Neon database edge
        },
      ],
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (await (backend as any).memories_update(icpMemoryId, updateData)) as unknown;

    if (!('Ok' in (result as Record<string, unknown>))) {
      throw new Error('Failed to create ICP memory edge: ' + JSON.stringify(result));
    }

    console.log(`✅ ICP memory edge created successfully: ${icpMemoryId} → ${neonMemoryId}`);
  } catch (error) {
    console.log('❌ Failed to create ICP memory edge:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}
