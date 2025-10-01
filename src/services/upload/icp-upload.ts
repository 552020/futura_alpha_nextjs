'use client';

// import { HttpAgent } from '@dfinity/agent';
import type { AssetMetadata, _SERVICE } from '@/ic/declarations/backend/backend.did';
import type { HostingPreferences } from '@/hooks/use-hosting-preferences';
import { UPLOAD_LIMITS_ICP } from '@/config/upload-limits';

import { logger } from '@/lib/logger';

// Create ICP upload specific logger
const icpLogger = logger.icpUpload('fe');
// Types for ICP upload - compatible with existing UploadStorage
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

export interface UploadResult {
  memoryId: string;
  size: number;
  checksum_sha256: string | null;
  remote_id: string;
}

export interface UploadProgress {
  fileIndex: number;
  totalFiles: number;
  currentFile: string;
  bytesUploaded: number;
  totalBytes: number;
  percentage: number;
}

// Use the generated backend types and IDL factory
type CanisterActor = _SERVICE;

/**
 * Get or create a capsule ID for the authenticated user
 */
async function getOrCreateCapsuleId(actor: CanisterActor): Promise<string> {
  icpLogger.debug('🔍 Starting capsule ID retrieval/creation process');

  try {
    // Try to get existing capsule
    icpLogger.debug('📋 Attempting to read existing capsule...');
    const capsuleResult = await actor.capsules_read_basic([]);

    if ('Ok' in capsuleResult && capsuleResult.Ok) {
      icpLogger.info('✅ Found existing capsule', { capsuleId: capsuleResult.Ok.capsule_id });
      return capsuleResult.Ok.capsule_id;
    }

    // No capsule found, create one
    icpLogger.info('🆕 No capsule found, creating new one...');
    const createResult = await actor.capsules_create([]);

    if ('Ok' in createResult) {
      icpLogger.info('✅ Successfully created new capsule', {
        capsuleId: createResult.Ok.id,
        timestamp: new Date().toISOString(),
      });
      return createResult.Ok.id;
    } else {
      icpLogger.error('❌ Failed to create capsule', { error: createResult });
      throw new Error(`Failed to create capsule: ${JSON.stringify(createResult)}`);
    }
  } catch (error) {
    icpLogger.error('❌ Failed to get or create capsule', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Failed to get or create capsule: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create Neon database records for ICP upload via the complete endpoint
 * This mirrors the same pattern used for S3 uploads
 */
async function createNeonDatabaseRecord(
  file: File,
  icpMemoryId: string
): Promise<{ memoryId: string; assetId: string }> {
  icpLogger.debug('🗄️ Starting Neon database record creation', {
    icpMemoryId,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
  });

  try {
    const requestBody = {
      // Use the new parallel processing format (Format 3)
      memoryId: icpMemoryId,
      assets: [
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
      ],
    };

    icpLogger.debug('📤 Calling /api/upload/complete endpoint', { requestBody });

    // Call the complete endpoint to create database records
    const response = await fetch('/api/upload/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    icpLogger.debug('📥 Received response from /api/upload/complete', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    });

    if (!response.ok) {
      const errorText = await response.text();
      icpLogger.error('❌ Failed to create database record - API error', {
        status: response.status,
        statusText: response.statusText,
        errorText,
      });
      throw new Error(`Failed to create database record: ${response.statusText}`);
    }

    const result = await response.json();

    icpLogger.info('✅ Successfully created Neon database records', {
      memoryId: result.data.memoryId,
      assetId: result.data.assets[0]?.id || 'unknown',
      icpMemoryId: icpMemoryId,
      timestamp: new Date().toISOString(),
    });

    return {
      memoryId: result.data.memoryId,
      assetId: result.data.assets[0]?.id || 'unknown',
    };
  } catch (error) {
    icpLogger.error('❌ Failed to create Neon database record', {
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
): Promise<UploadResult> {
  icpLogger.info('🚀 Starting ICP file upload', {
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
    blobHosting: preferences.blobHosting,
    databaseHosting: preferences.databaseHosting,
  });

  // Handle blob hosting preferences
  if (preferences.blobHosting.includes('icp')) {
    icpLogger.debug('✅ ICP blob hosting preference confirmed');

    // Case 1: ICP storage - current implementation
    const limits = {
      inline_max: UPLOAD_LIMITS_ICP.INLINE_MAX_BYTES,
      chunk_size: UPLOAD_LIMITS_ICP.CHUNK_SIZE_BYTES,
      max_chunks: UPLOAD_LIMITS_ICP.MAX_CHUNKS,
    };
    const idem = crypto.randomUUID();

    icpLogger.debug('📋 Upload configuration', {
      limits,
      idem,
      uploadType: file.size <= limits.inline_max ? 'inline' : 'chunked',
    });

    // Use existing backendActor function (simplified approach)
    icpLogger.debug('🔗 Creating backend actor...');
    const { backendActor } = await import('@/ic/backend');
    const actor = (await backendActor()) as CanisterActor;
    icpLogger.debug('✅ Backend actor created successfully');

    const fileSize = file.size;
    const isInline = fileSize <= limits.inline_max;

    icpLogger.info('📊 Upload strategy determined', {
      fileSize,
      isInline,
      expectedChunks: isInline ? 1 : Math.ceil(fileSize / limits.chunk_size),
    });

    // Get or create capsule ID
    const capsuleId = await getOrCreateCapsuleId(actor);

    let icpResult: UploadResult;
    if (isInline) {
      icpLogger.info('📤 Starting inline upload to ICP');
      icpResult = await uploadInlineToICP(file, actor, capsuleId, idem, onProgress);
    } else {
      icpLogger.info('📤 Starting chunked upload to ICP');
      icpResult = await uploadChunkedToICP(file, actor, capsuleId, idem, limits, onProgress);
    }

    icpLogger.info('✅ ICP upload completed successfully', {
      memoryId: icpResult.memoryId,
      size: icpResult.size,
      checksum: icpResult.checksum_sha256,
    });

    // Create Neon database record after successful ICP upload (only if user has neon/vercel in database preferences)
    if (preferences.databaseHosting.includes('neon')) {
      icpLogger.info('🗄️ User has neon in database preferences, creating Neon database record');
      try {
        const { memoryId, assetId } = await createNeonDatabaseRecord(file, icpResult.memoryId);
        icpLogger.info('✅ Successfully created Neon database record for ICP upload', {
          memoryId,
          assetId,
          icpMemoryId: icpResult.memoryId,
          databaseHosting: preferences.databaseHosting,
        });
      } catch (error) {
        icpLogger.error('⚠️ Failed to create Neon database record, but ICP upload succeeded', {
          icpMemoryId: icpResult.memoryId,
          error: error instanceof Error ? error.message : 'Unknown error',
          databaseHosting: preferences.databaseHosting,
        });
        // Don't fail the upload if database record creation fails
        // The file is already uploaded to ICP successfully
      }
    } else {
      icpLogger.info('⏭️ Skipping Neon database record creation - user prefers ICP-only database', {
        databaseHosting: preferences.databaseHosting,
        icpMemoryId: icpResult.memoryId,
      });
    }

    icpLogger.info('🎉 ICP upload process completed', {
      fileName: file.name,
      icpMemoryId: icpResult.memoryId,
      totalSize: icpResult.size,
      databaseRecordCreated: preferences.databaseHosting.includes('neon'),
    });

    return icpResult;
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
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];
  const totalFiles = files.length;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    // Update progress for current file
    onProgress?.({
      fileIndex: i,
      totalFiles,
      currentFile: file.name,
      bytesUploaded: 0,
      totalBytes: file.size,
      percentage: (i / totalFiles) * 100,
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
        });
      });

      results.push(result);
    } catch (error) {
      logger.error(`Failed to upload file ${file.name}:`, undefined, {
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
    data: { id: result.memoryId },
    results: [
      {
        memoryId: result.memoryId,
        size: result.size,
        checksum_sha256: result.checksum_sha256,
      },
    ],
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
  icpLogger.debug('📤 Starting inline upload to ICP', {
    fileName: file.name,
    fileSize: file.size,
    capsuleId,
    idem,
  });

  try {
    // Read file as bytes
    icpLogger.debug('📖 Reading file as bytes...');
    const fileBytes = await file.arrayBuffer();
    const bytesArray = Array.from(new Uint8Array(fileBytes));
    icpLogger.debug('✅ File bytes read successfully', { bytesLength: bytesArray.length });

    // Update progress
    onProgress?.({
      fileIndex: 0,
      totalFiles: 1,
      currentFile: file.name,
      bytesUploaded: file.size,
      totalBytes: file.size,
      percentage: 100,
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
    icpLogger.debug('📞 Calling memories_create on canister...');
    const createResult = await actor.memories_create(
      capsuleId, // capsule_id
      [bytesArray], // inline_bytes
      [], // blob_ref
      [], // storage_edge_blob_type
      [], // title
      [], // description
      [], // date_of_memory
      [], // sha256
      assetMetadata, // asset_metadata
      idem // idem
    );

    if ('Err' in createResult) {
      icpLogger.error('❌ memories_create failed', { error: createResult.Err });
      throw new Error(`Failed to create memory: ${JSON.stringify(createResult.Err)}`);
    }
    const memoryId = createResult.Ok;

    icpLogger.info('✅ Inline upload completed successfully', {
      memoryId,
      fileName: file.name,
      fileSize: file.size,
    });

    return {
      memoryId: memoryId,
      size: file.size,
      checksum_sha256: null, // Inline uploads don't provide checksum
      remote_id: memoryId,
    };
  } catch (error) {
    icpLogger.error('❌ Inline upload failed', {
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
  icpLogger.debug('📤 Starting chunked upload to ICP', {
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

    icpLogger.info('📊 Chunked upload configuration', {
      fileSize,
      chunkSize,
      expectedChunks,
      maxChunks: limits.max_chunks,
    });

    if (expectedChunks > limits.max_chunks) {
      icpLogger.error('❌ File too large for chunked upload', {
        expectedChunks,
        maxChunks: limits.max_chunks,
        fileSize,
      });
      throw new Error(`File too large: ${expectedChunks} chunks exceeds limit of ${limits.max_chunks}`);
    }

    // Create asset metadata for the file (simplified like the working script)
    const assetMetadata: AssetMetadata = {
      Image: {
        base: {
          url: [],
          height: [],
          updated_at: BigInt(Date.now() * 1000000),
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

    // Begin upload session
    icpLogger.debug('🚀 Beginning upload session...');
    const sessionResult = await actor.uploads_begin(capsuleId, assetMetadata, expectedChunks, idem);

    if ('Err' in sessionResult) {
      icpLogger.error('❌ Failed to begin upload session', { error: sessionResult.Err });
      throw new Error(`Failed to begin upload: ${JSON.stringify(sessionResult.Err)}`);
    }
    const sessionId = sessionResult.Ok;
    icpLogger.info('✅ Upload session started', { sessionId, expectedChunks });

    // Upload chunks
    icpLogger.info('📦 Starting chunk upload process...');
    let bytesUploaded = 0;
    for (let i = 0; i < expectedChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, fileSize);
      const chunk = await file.slice(start, end).arrayBuffer();
      const chunkBytes = Array.from(new Uint8Array(chunk));

      icpLogger.debug(`📤 Uploading chunk ${i + 1}/${expectedChunks}`, {
        chunkIndex: i,
        chunkSize: chunk.byteLength,
        start,
        end,
      });

      await actor.uploads_put_chunk(sessionId, i, chunkBytes);

      bytesUploaded += chunk.byteLength;

      icpLogger.debug(`✅ Chunk ${i + 1}/${expectedChunks} uploaded successfully`, {
        bytesUploaded,
        totalBytes: fileSize,
        percentage: (bytesUploaded / fileSize) * 100,
      });

      // Update progress
      onProgress?.({
        fileIndex: 0,
        totalFiles: 1,
        currentFile: file.name,
        bytesUploaded,
        totalBytes: fileSize,
        percentage: (bytesUploaded / fileSize) * 100,
      });
    }

    icpLogger.info('✅ All chunks uploaded successfully', {
      totalChunks: expectedChunks,
      totalBytes: bytesUploaded,
    });

    // Calculate SHA256 hash (like the working script)
    icpLogger.debug('🔐 Calculating SHA256 hash...');
    const fileBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
    const expectedHash = new Uint8Array(hashBuffer);
    const hashHex = Array.from(expectedHash)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    icpLogger.info('✅ SHA256 hash calculated', {
      hash: hashHex,
      hashLength: expectedHash.length,
    });

    // Finish upload
    icpLogger.debug('🏁 Finishing upload session...');
    const finishResult = await actor.uploads_finish(sessionId, Array.from(expectedHash), BigInt(fileSize));

    if ('Err' in finishResult) {
      icpLogger.error('❌ Failed to finish upload', { error: finishResult.Err });
      throw new Error(`Failed to finish upload: ${JSON.stringify(finishResult.Err)}`);
    }
    const memoryId = finishResult.Ok;

    icpLogger.info('🎉 Chunked upload completed successfully', {
      memoryId,
      fileName: file.name,
      fileSize: file.size,
      totalChunks: expectedChunks,
      hash: hashHex,
    });

    return {
      memoryId: memoryId,
      size: file.size,
      checksum_sha256: hashHex,
      remote_id: memoryId,
    };
  } catch (error) {
    icpLogger.error('❌ Chunked upload failed', {
      fileName: file.name,
      fileSize: file.size,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Chunked upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
