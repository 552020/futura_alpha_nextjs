/**
 * Enhanced ICP upload with parallel processing
 *
 * Implements the parallel lanes approach:
 * - Lane A: Upload original to ICP canister
 * - Lane B: Process image derivatives (display → thumb → placeholder) and upload all to ICP
 * Both lanes run simultaneously for optimal performance.
 *
 * Mirrors the S3 architecture pattern from s3-with-processing.ts
 */

// import { randomUUID } from 'crypto'; // Not used in this file

import { detectMemoryTypeFromFile } from '@/utils/memory-type';
import {
  processImageDerivativesPure,
  type ProcessedBlobs,
} from './image-derivatives';
// import { finalizeAllAssets, type ProcessedAssets } from './finalize'; // Not used for ICP-only uploads
import { type ProcessedAssets } from './finalize';
import { createFolderIfNeeded } from './shared-utils';
import { type UploadServiceResult } from './types';
// import { fatLogger } from '@/lib/logger';
import { getAuthClient } from '@/ic/ii';
import { backendActor } from '@/ic/backend';
import type {
  AssetMetadata,
  Result,
  Result_5,
  Result_6,
  Result13,
  Result15,
  MemoryMetadata,
  MemoryType,
  DatabaseHosting,
  UploadFinishResult,
} from '@/ic/declarations/backend/backend.did.d';
import { fatLogger } from '@/lib/logger/fat-logger';

/**
 * Upload original files to ICP and create memory records (Lane A)
 * STEP 2.1 of the upload pipeline (uploadMultipleToICPWithProcessing in icp-with-processing.ts)
 *
 * Lane A responsibilities:
 * 1. Upload original file to ICP using chunked uploads
 * 2. Create ICP memory record with the original blob
 *
 * NOTE: Derivative processing and storage edges are handled separately
 */
async function uploadOriginalAndCreateMemory(
  files: File[],
  onProgress?: (progress: number) => void,
  parentFolderId?: string
): Promise<UploadServiceResult[]> {
  const isSingleFile = files.length === 1;

  const uploadPromises = files.map(async (file, fileIndex) => {
    // 1. Upload original file using ICP chunked upload
    const uploadResult = await uploadFileToICPWithProgress(file, (progress) => {
      if (isSingleFile) {
        onProgress?.(progress);
      } else {
        // For multiple files, calculate overall progress across all files
        // Each file contributes 100% / totalFiles to the overall progress
        const overallProgress = (fileIndex * 100 + progress) / files.length;
        onProgress?.(Math.min(overallProgress, 100));
      }
    });

    // 2. Create ICP memory record with the original blob
    const icpMemoryId = await createICPMemoryWithOriginalBlob(
      file,
      uploadResult.uploadResult.blob_id,
      parentFolderId
    );

    return {
      data: { id: icpMemoryId },
      results: [
        {
          memoryId: icpMemoryId,
          blobId: uploadResult.uploadResult.blob_id,
          size: BigInt(file.size),
          checksumSha256: undefined,
          storageBackend: 'icp' as const,
          storageLocation: `icp://blob/${uploadResult.uploadResult.blob_id}`,
          uploadedAt: BigInt(Date.now()),
          expiresAt: undefined,
        },
      ],
      userId: '', // TODO: Get from session if needed
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

export async function uploadFileAndCreateMemoryWithDerivatives(
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadServiceResult> {
  try {
    // 1. Start both lanes simultaneously
    const laneAPromise = uploadOriginalAndCreateMemory([file], onProgress).then(
      (results) => results[0]
    );

    let laneBPromise: Promise<ProcessedAssets> | null = null;
    if (file.type.startsWith('image/')) {
      // Lane B processes original File object immediately
      laneBPromise = processImageDerivativesPure(file).then((processedBlobs) =>
        uploadProcessedAssetsToICP(processedBlobs, file.name)
      );
    }

    // 2. Wait for both lanes to complete
    const laneAResult = await Promise.allSettled([laneAPromise]).then(
      (results) => results[0]
    );
    const laneBResult = laneBPromise
      ? await Promise.allSettled([laneBPromise]).then((results) => results[0])
      : null;

    if (laneAResult.status === 'rejected') {
      fatLogger.error('❌ Lane A (original upload) failed:', 'fe', {
        error:
          laneAResult.reason instanceof Error
            ? laneAResult.reason.message
            : 'Unknown error',
      });
    }
    if (laneBResult?.status === 'rejected') {
      fatLogger.error('❌ Lane B (derivative processing) failed:', 'fe', {
        error:
          laneBResult.reason instanceof Error
            ? laneBResult.reason.message
            : 'Unknown error',
      });
    }

    // 3. Add derivative assets to existing memory using new endpoints
    if (laneAResult.status === 'fulfilled') {
      const icpMemoryId = laneAResult.value.data.id;
      const originalResult = laneAResult.value.results[0];

      // Add derivatives to existing memory using new asset addition endpoints
      if (laneBResult?.status === 'fulfilled' && laneBResult.value) {
        await addDerivativeAssetsToMemory(icpMemoryId, laneBResult.value, file);
      }

      // 4. Create storage edges for all artifacts (after asset addition)
      const derivativeAssets =
        laneBResult?.status === 'fulfilled'
          ? {
              display: laneBResult.value.display
                ? {
                    blobId: laneBResult.value.display.storageKey || '',
                    size: laneBResult.value.display.bytes || 0,
                  }
                : undefined,
              thumb: laneBResult.value.thumb
                ? {
                    blobId: laneBResult.value.thumb.storageKey || '',
                    size: laneBResult.value.thumb.bytes || 0,
                  }
                : undefined,
              placeholder: laneBResult.value.placeholder
                ? {
                    blobId: 'inline',
                    size: laneBResult.value.placeholder.bytes || 0,
                  }
                : undefined,
            }
          : {};

      await createStorageEdgesForAllAssets(
        icpMemoryId,
        file,
        originalResult.blobId,
        derivativeAssets
      );
    }

    // Return Lane A result (original upload + memory creation)
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
 * - Lane B: Process image derivatives for each image file (display → thumb → placeholder) and upload all to ICP
 * Both lanes run simultaneously for optimal performance.
 */
export async function uploadMultipleToICPWithProcessing(
  files: File[],
  mode: 'directory' | 'multiple-files',
  onProgress?: (file: File, progress: number) => void
): Promise<{
  results?: Array<{
    memoryId: string;
    size?: number;
    checksum_sha256?: string | null;
    name?: string;
    type?: string;
  }>;
  userId?: string;
  successfulUploads?: number;
}> {
  try {
    // 1. Create folder if needed (for directory mode) - must be done before lane promises
    const parentFolderId = await createFolderIfNeeded(mode, files);

    // 2.1. Start Lane A: Upload original files to ICP
    const laneAPromise = uploadOriginalAndCreateMemory(
      files,
      (progress) => {
        // Convert overall progress to per-file progress for compatibility
        onProgress?.(files[0], progress);
      },
      parentFolderId
    );

    // 2.2. Start Lane B: Process derivatives for image files
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    let laneBPromise: Promise<ProcessedAssets[]> | null = null;

    if (imageFiles.length > 0) {
      laneBPromise = processMultipleImageDerivativesForICP(imageFiles);
    }

    // 3. Wait for both lanes to complete
    const laneAResult = await Promise.allSettled([laneAPromise]).then(
      (results) => results[0]
    );
    const laneBResult = laneBPromise
      ? await Promise.allSettled([laneBPromise]).then((results) => results[0])
      : null;

    // 4. Add derivative assets to existing memories
    if (
      laneAResult.status === 'fulfilled' &&
      laneBResult?.status === 'fulfilled'
    ) {
      // Add derivatives to each memory
      const assetAdditionPromises = files.map(async (file, index) => {
        const memoryResult = laneAResult.value[index];
        const derivativeResult = laneBResult.value[index];

        if (derivativeResult) {
          await addDerivativeAssetsToMemory(
            memoryResult.data.id,
            derivativeResult,
            file
          );
        }
      });

      await Promise.all(assetAdditionPromises);
    }

    // 5. Create storage edges for all assets
    if (laneAResult.status === 'fulfilled') {
      const storageEdgePromises = files.map(async (file, index) => {
        const memoryResult = laneAResult.value[index];
        const derivativeResult =
          laneBResult?.status === 'fulfilled' ? laneBResult.value[index] : null;

        const derivativeAssets = derivativeResult
          ? {
              display: derivativeResult.display
                ? {
                    blobId: derivativeResult.display.storageKey || '',
                    size: derivativeResult.display.bytes || 0,
                  }
                : undefined,
              thumb: derivativeResult.thumb
                ? {
                    blobId: derivativeResult.thumb.storageKey || '',
                    size: derivativeResult.thumb.bytes || 0,
                  }
                : undefined,
              placeholder: derivativeResult.placeholder
                ? {
                    blobId: 'inline',
                    size: derivativeResult.placeholder.bytes || 0,
                  }
                : undefined,
            }
          : {};

        await createStorageEdgesForAllAssets(
          memoryResult.data.id,
          file,
          memoryResult.results[0].blobId,
          derivativeAssets
        );
      });

      await Promise.all(storageEdgePromises);
    }

    return {
      results:
        laneAResult.status === 'fulfilled'
          ? laneAResult.value.map((result) => ({
              memoryId: result.results[0].memoryId,
              size: Number(result.results[0].size),
              checksum_sha256: result.results[0].checksumSha256
                ? Array.from(result.results[0].checksumSha256)
                    .map((b) => b.toString(16).padStart(2, '0'))
                    .join('')
                : null,
              name: files[0]?.name,
              type: files[0]?.type,
            }))
          : [],
      userId:
        laneAResult.status === 'fulfilled'
          ? laneAResult.value[0]?.userId || ''
          : '',
      successfulUploads:
        laneAResult.status === 'fulfilled' ? laneAResult.value.length : 0,
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Process image derivatives for multiple files using pure processing + ICP upload
 * STEP 2.2 of the upload pipeline (uploadMultipleToICPWithProcessing in icp-with-processing.ts)
 */
async function processMultipleImageDerivativesForICP(
  imageFiles: File[]
): Promise<ProcessedAssets[]> {
  const derivativePromises = imageFiles.map(async (file, _index) => {
    try {
      // Pure processing first, then ICP upload
      const processedBlobs = await processImageDerivativesPure(file);

      // 🔍 [Lane B] Log processed blob dimensions before upload
      if (processedBlobs.display) {
        fatLogger.info('🔍 [Lane B] Display blob dimensions:', 'fe', {
          width: processedBlobs.display.width,
          height: processedBlobs.display.height,
          bytes: processedBlobs.display.bytes,
          mimeType: processedBlobs.display.mimeType,
        });
      } else {
        fatLogger.warn('⚠️ [Lane B] No display blob generated', 'fe');
      }
      if (processedBlobs.thumb) {
        fatLogger.info('🔍 [Lane B] Thumb blob dimensions:', 'fe', {
          width: processedBlobs.thumb.width,
          height: processedBlobs.thumb.height,
          bytes: processedBlobs.thumb.bytes,
          mimeType: processedBlobs.thumb.mimeType,
        });
      } else {
        fatLogger.warn('⚠️ [Lane B] No thumb blob generated', 'fe');
      }
      if (processedBlobs.placeholder) {
        fatLogger.info('🔍 [Lane B] Placeholder blob dimensions:', 'fe', {
          width: processedBlobs.placeholder.width,
          height: processedBlobs.placeholder.height,
          bytes: processedBlobs.placeholder.bytes,
        });
      } else {
        fatLogger.warn('⚠️ [Lane B] No placeholder blob generated', 'fe');
      }

      return await uploadProcessedAssetsToICP(processedBlobs, file.name);
    } catch (error) {
      fatLogger.error(
        '❌ [Lane B] Failed to process image derivatives:',
        'fe',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          fileName: file.name,
        }
      );
      return {
        display: {
          assetType: 'display' as const,
          processingStatus: 'failed' as const,
        },
        thumb: {
          assetType: 'thumb' as const,
          processingStatus: 'failed' as const,
        },
        placeholder: {
          assetType: 'placeholder' as const,
          processingStatus: 'failed' as const,
        },
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
      const displayFile = new File(
        [processedBlobs.display.blob],
        `display-${originalFileName}`,
        {
          type: processedBlobs.display.mimeType,
        }
      );

      const displayUploadResult = await uploadFileToICPWithProgress(
        displayFile,
        () => {}
      ); // No progress tracking for derivatives

      fatLogger.info('✅ [Lane B] Display upload completed:', 'fe', {
        blob_id: displayUploadResult.uploadResult.blob_id,
        original_dimensions: `${processedBlobs.display.width}x${processedBlobs.display.height}`,
        original_bytes: processedBlobs.display.bytes,
      });

      results.display = {
        assetType: 'display',
        processingStatus: 'completed',
        assetLocation: 'icp',
        storageKey: displayUploadResult.uploadResult.blob_id, // Use actual ICP blob ID
        bytes: processedBlobs.display.bytes,
        width: processedBlobs.display.width,
        height: processedBlobs.display.height,
        mimeType: processedBlobs.display.mimeType,
        url: '', // ICP URLs will be generated after memory edge creation
      };
    } catch (error) {
      fatLogger.error(
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
      const thumbFile = new File(
        [processedBlobs.thumb.blob],
        `thumb-${originalFileName}`,
        {
          type: processedBlobs.thumb.mimeType,
        }
      );

      const thumbUploadResult = await uploadFileToICPWithProgress(
        thumbFile,
        () => {}
      ); // No progress tracking for derivatives

      fatLogger.info('✅ [Lane B] Thumb upload completed:', 'fe', {
        blob_id: thumbUploadResult.uploadResult.blob_id,
        original_dimensions: `${processedBlobs.thumb.width}x${processedBlobs.thumb.height}`,
        original_bytes: processedBlobs.thumb.bytes,
      });

      results.thumb = {
        assetType: 'thumb',
        processingStatus: 'completed',
        assetLocation: 'icp',
        storageKey: thumbUploadResult.uploadResult.blob_id, // Use actual ICP blob ID
        bytes: processedBlobs.thumb.bytes,
        width: processedBlobs.thumb.width,
        height: processedBlobs.thumb.height,
        mimeType: processedBlobs.thumb.mimeType,
        url: '', // ICP URLs will be generated after memory edge creation
      };
    } catch (error) {
      fatLogger.error(
        '❌ [Lane B] Failed to upload thumb asset to ICP:',
        'fe',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          fileName: originalFileName,
        }
      );
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

  // Prepare placeholder for inline storage in ICP memory (not as blob)
  if (processedBlobs.placeholder) {
    try {
      // Convert data URL to bytes for inline storage
      const placeholderBytes = dataURLtoBytes(
        processedBlobs.placeholder.dataUrl
      );

      fatLogger.info(
        '✅ [Lane B] Placeholder prepared for inline storage:',
        'fe',
        {
          bytes: placeholderBytes.length,
          dimensions: `${processedBlobs.placeholder.width}x${processedBlobs.placeholder.height}`,
        }
      );

      results.placeholder = {
        assetType: 'placeholder',
        processingStatus: 'completed',
        assetLocation: 'icp', // Will be stored inline in ICP memory
        storageKey: 'inline', // Not a blob, stored inline
        bytes: placeholderBytes.length,
        width: processedBlobs.placeholder.width,
        height: processedBlobs.placeholder.height,
        mimeType: 'image/jpeg',
        url: processedBlobs.placeholder.dataUrl, // Keep data URL for immediate display
      };
    } catch (error) {
      fatLogger.error(
        '❌ [Lane B] Failed to prepare placeholder for inline storage:',
        'fe',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          fileName: originalFileName,
        }
      );
      results.placeholder = {
        assetType: 'placeholder',
        processingStatus: 'failed',
        assetLocation: 'neon', // Fallback to database storage
        storageKey: 'placeholder',
        bytes: 0,
        width: processedBlobs.placeholder.width,
        height: processedBlobs.placeholder.height,
        mimeType: 'image/jpeg',
        url: processedBlobs.placeholder.dataUrl,
      };
    }
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
export async function uploadFileToICPWithProgress(
  file: File,
  onProgress: (progress: number) => void
): Promise<{ file: File; uploadResult: UploadFinishResult }> {
  const startTime = Date.now();

  fatLogger.info('🚀 Starting ICP upload:', 'fe', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
  });

  try {
    // Import ICP dependencies
    const { getAuthClient } = await import('@/ic/ii');
    const { backendActor } = await import('@/ic/backend');

    // 1. Get authenticated actor using existing pattern
    const authClient = await getAuthClient();
    if (!authClient.isAuthenticated()) {
      fatLogger.error(
        '❌ Authentication failed: User not connected to Internet Identity',
        'fe'
      );
      throw new Error('Please connect your Internet Identity to upload to ICP');
    }

    const identity = authClient.getIdentity();
    const backend = await backendActor(identity);

    fatLogger.info('✅ Authentication successful', 'fe');

    // 2. Get or create capsule
    const capsuleResult = (await backend.capsules_read_basic([])) as Result_6;
    let capsuleId;

    if ('Ok' in capsuleResult && capsuleResult.Ok) {
      capsuleId = capsuleResult.Ok.capsule_id;
      fatLogger.info('📦 Using existing capsule:', 'fe', { capsuleId });
    } else {
      fatLogger.info('📦 Creating new capsule...', 'fe');
      const createResult = (await backend.capsules_create([])) as Result_5;
      if (!('Ok' in createResult)) {
        fatLogger.error('❌ Failed to create capsule:', 'fe', {
          error: JSON.stringify(createResult),
        });
        throw new Error(
          'Failed to create capsule: ' + JSON.stringify(createResult)
        );
      }
      capsuleId = createResult.Ok.id;
      fatLogger.info('✅ New capsule created:', 'fe', { capsuleId });
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
      const errorMsg = UPLOAD_LIMITS_ICP.getFileSizeErrorMessage(file.size);
      fatLogger.error('❌ File size validation failed:', 'fe', {
        fileSize: file.size,
        error: errorMsg,
      });
      throw new Error(errorMsg);
    }

    const totalChunks = UPLOAD_LIMITS_ICP.getExpectedChunks(file.size);
    const isInline = file.size <= limits.inline_max;

    fatLogger.info(
      `📦 Upload configuration: ${totalChunks} chunks of ${limits.chunk_size} bytes (${isInline ? 'inline' : 'chunked'})`,
      'fe',
      {
        totalChunks,
        chunkSize: limits.chunk_size,
        isInline,
        fileSize: file.size,
      }
    );

    // 4. Begin upload session
    fatLogger.info('🔄 Starting upload session...', 'fe', {
      capsuleId,
      totalChunks,
    });

    const begin = (await backend.uploads_begin(
      capsuleId,
      totalChunks,
      `upload-${Date.now()}`
    )) as Result13;

    if (!('Ok' in begin)) {
      fatLogger.error('❌ uploads_begin failed:', 'fe', {
        error: JSON.stringify(begin),
        capsuleId,
        totalChunks,
      });
      throw new Error('uploads_begin failed: ' + JSON.stringify(begin));
    }

    const session = begin.Ok;
    fatLogger.info('✅ Upload session started:', 'fe', { sessionId: session });

    // 6. Stream chunks
    const uploadStartTime = Date.now();
    let uploadedBytes = 0;

    fatLogger.info('📤 Starting chunk upload...', 'fe', {
      totalChunks,
      chunkSize: limits.chunk_size,
    });

    for (let index = 0; index < totalChunks; index++) {
      const start = index * limits.chunk_size;
      const end = Math.min(start + limits.chunk_size, file.size);
      const chunk = new Uint8Array(await file.slice(start, end).arrayBuffer());

      const put = (await backend.uploads_put_chunk(
        session,
        index,
        chunk
      )) as Result;

      if (!('Ok' in put)) {
        fatLogger.error('❌ put_chunk failed:', 'fe', {
          error: JSON.stringify(put),
          chunkIndex: index,
          chunkSize: chunk.length,
        });
        throw new Error(
          `put_chunk failed for chunk ${index}: ${JSON.stringify(put)}`
        );
      }

      uploadedBytes += chunk.length;
      const percentage = (uploadedBytes / file.size) * 100;
      onProgress(percentage);

      // Log progress every 10% or for last chunk
      if (
        index % Math.max(1, Math.floor(totalChunks / 10)) === 0 ||
        index === totalChunks - 1
      ) {
        fatLogger.info('📤 Upload progress:', 'fe', {
          chunk: `${index + 1}/${totalChunks}`,
          percentage: Math.round(percentage),
          uploadedBytes,
          totalBytes: file.size,
        });
      }
    }

    const uploadEndTime = Date.now();
    const uploadDuration = uploadEndTime - uploadStartTime;
    const uploadSpeed = uploadedBytes / 1024 / 1024 / (uploadDuration / 1000); // MB/s

    fatLogger.info('✅ All chunks uploaded successfully:', 'fe', {
      totalChunks,
      uploadDuration: `${uploadDuration}ms`,
      uploadSpeed: `${uploadSpeed.toFixed(2)} MB/s`,
    });

    // 7. Compute file hash
    fatLogger.info('🔐 Computing file hash...', 'fe');
    const fileBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
    const hash = new Uint8Array(hashBuffer);
    const hashHex = Array.from(hash)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    fatLogger.info('✅ File hash computed:', 'fe', { hashHex });

    // 8. Finish upload
    fatLogger.info('🏁 Finishing upload...', 'fe', {
      sessionId: session,
      fileSize: file.size,
    });

    const fin = (await backend.uploads_finish(
      session,
      hash,
      BigInt(file.size)
    )) as Result15;

    if (!('Ok' in fin)) {
      fatLogger.error('❌ uploads_finish failed:', 'fe', {
        error: JSON.stringify(fin),
        sessionId: session,
        fileSize: file.size,
      });
      throw new Error('uploads_finish failed: ' + JSON.stringify(fin));
    }

    const totalTime = Date.now() - startTime;
    const totalSpeed = file.size / 1024 / 1024 / (totalTime / 1000); // MB/s

    fatLogger.info('🎉 ICP upload completed successfully:', 'fe', {
      blobId: fin.Ok.blob_id,
      totalTime: `${totalTime}ms`,
      totalSpeed: `${totalSpeed.toFixed(2)} MB/s`,
      fileSize: file.size,
    });

    onProgress(100);
    return {
      file,
      uploadResult: fin.Ok,
    };
  } catch (error) {
    fatLogger.error('❌ ICP upload failed:', 'fe', {
      error: error instanceof Error ? error.message : 'Unknown error',
      fileName: file.name,
      fileSize: file.size,
    });
    throw error;
  }
}

// Helper function to convert data URL to bytes (for inline storage)
function dataURLtoBytes(dataURL: string): Uint8Array {
  const arr = dataURL.split(',');
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return u8arr;
}

/**
 * Create ICP memory record with original blob
 */
async function createICPMemoryWithOriginalBlob(
  file: File,
  originalBlobId: string,
  parentFolderId?: string
): Promise<string> {
  try {
    fatLogger.info('📝 Creating ICP memory record:', 'fe', {
      fileName: file.name,
      fileSize: file.size,
      blobId: originalBlobId,
      parentFolderId,
    });

    // Get authenticated backend actor
    const authClient = await getAuthClient();
    if (!authClient.isAuthenticated()) {
      fatLogger.error('❌ Authentication failed for memory creation', 'fe');
      throw new Error(
        'Please connect your Internet Identity to create ICP memory records'
      );
    }

    const identity = authClient.getIdentity();
    const backend = await backendActor(identity);

    // Get capsule ID
    const capsuleResult = await backend.capsules_read_basic([]);
    if (!('Ok' in capsuleResult)) {
      fatLogger.error('❌ Failed to get user capsule:', 'fe', {
        error: JSON.stringify(capsuleResult),
      });
      throw new Error('Failed to get user capsule');
    }
    const capsuleId = capsuleResult.Ok.capsule_id;
    fatLogger.info('📦 Using capsule for memory creation:', 'fe', {
      capsuleId,
    });

    // Create memory metadata
    const memoryMetadata: MemoryMetadata = {
      title: [file.name.split('.')[0] || 'Untitled'],
      updated_at: BigInt(Date.now()),
      sharing_status: { Private: null },
      date_of_memory: [],
      memory_type: { Image: null } as MemoryType,
      tags: [],
      content_type: file.type,
      people_in_memory: [],
      database_storage_edges: [{ Neon: null } as DatabaseHosting],
      description: [],
      created_at: BigInt(Date.now()),
      created_by: [],
      total_size: BigInt(file.size),
      parent_folder_id: parentFolderId ? [parentFolderId] : [],
      asset_count: 1,
      deleted_at: [],
      shared_count: 0,
      file_created_at: [],
      location: [],
      memory_notes: [],
      uploaded_at: BigInt(Date.now()),
    };

    // Create asset metadata for original blob
    const assetMetadata: AssetMetadata = {
      Image: {
        dpi: [],
        color_space: [],
        base: {
          url: [],
          height: [],
          updated_at: BigInt(Date.now()),
          asset_type: { Original: null },
          sha256: [],
          name: file.name,
          storage_key: [],
          tags: [],
          processing_error: [],
          mime_type: file.type,
          description: [],
          created_at: BigInt(Date.now()),
          deleted_at: [],
          bytes: BigInt(file.size),
          asset_location: [],
          width: [],
          processing_status: [],
          bucket: [],
        },
        exif_data: [],
        compression_ratio: [],
        orientation: [],
      },
    };

    // Create memory with original blob
    fatLogger.info('🔄 Creating memory with original blob...', 'fe', {
      capsuleId,
      blobId: originalBlobId,
      fileName: file.name,
    });

    const result = await backend.memories_create_with_internal_blobs(
      capsuleId,
      memoryMetadata,
      [{ blob_id: originalBlobId, metadata: assetMetadata }],
      `memory-${Date.now()}` // idempotency key
    );

    if ('Ok' in result) {
      const icpMemoryId = result.Ok;
      fatLogger.info('✅ ICP memory created successfully:', 'fe', {
        memoryId: icpMemoryId,
        fileName: file.name,
        blobId: originalBlobId,
      });
      return icpMemoryId;
    } else {
      fatLogger.error('❌ Failed to create ICP memory:', 'fe', {
        error: JSON.stringify(result.Err),
        fileName: file.name,
        blobId: originalBlobId,
      });
      throw new Error(
        `Failed to create ICP memory: ${JSON.stringify(result.Err)}`
      );
    }
  } catch (error) {
    fatLogger.error('❌ Failed to create ICP memory record:', 'fe', {
      error: error instanceof Error ? error.message : 'Unknown error',
      fileName: file.name,
      blobId: originalBlobId,
    });
    throw error;
  }
}

/**
 * Add derivative assets to existing memory using new asset addition endpoints
 */
async function addDerivativeAssetsToMemory(
  icpMemoryId: string,
  derivativeAssets: ProcessedAssets,
  file: File
): Promise<void> {
  try {
    fatLogger.info('🔄 Adding derivative assets to memory:', 'fe', {
      memoryId: icpMemoryId,
      fileName: file.name,
      hasDisplay: !!derivativeAssets.display,
      hasThumb: !!derivativeAssets.thumb,
      hasPlaceholder: !!derivativeAssets.placeholder,
    });

    // Get authenticated backend actor
    const authClient = await getAuthClient();
    if (!authClient.isAuthenticated()) {
      fatLogger.error('❌ Authentication failed for asset addition', 'fe');
      throw new Error(
        'Please connect your Internet Identity to add assets to memory'
      );
    }

    const identity = authClient.getIdentity();
    const backend = await backendActor(identity);

    // Add display derivative if available
    if (derivativeAssets.display?.storageKey) {
      fatLogger.info('🔄 Adding display asset to memory...', 'fe', {
        memoryId: icpMemoryId,
        storageKey: derivativeAssets.display.storageKey,
      });

      const displayAssetMetadata: AssetMetadata = {
        Image: {
          dpi: [],
          color_space: [],
          base: {
            url: [],
            height: [derivativeAssets.display.height || 0],
            updated_at: BigInt(Date.now()),
            asset_type: { Display: null },
            sha256: [],
            name: `${file.name}_display`,
            storage_key: [],
            tags: [],
            processing_error: [],
            mime_type: derivativeAssets.display.mimeType || 'image/jpeg',
            description: [],
            created_at: BigInt(Date.now()),
            deleted_at: [],
            bytes: BigInt(derivativeAssets.display.bytes || 0),
            asset_location: [],
            width: [derivativeAssets.display.width || 0],
            processing_status: [],
            bucket: [],
          },
          exif_data: [],
          compression_ratio: [],
          orientation: [],
        },
      };

      let displayResult;
      try {
        displayResult = await backend.memories_add_asset(
          icpMemoryId,
          {
            blob_id: derivativeAssets.display.storageKey,
            metadata: displayAssetMetadata,
          },
          `display-${Date.now()}`
        );
      } catch (error) {
        fatLogger.error('❌ Failed to add display asset:', 'fe', {
          error: error instanceof Error ? error.message : 'Unknown error',
          memoryId: icpMemoryId,
          storageKey: derivativeAssets.display.storageKey,
        });
        throw error;
      }

      if ('Ok' in displayResult) {
        fatLogger.info('✅ Display asset added successfully:', 'fe', {
          memoryId: icpMemoryId,
          storageKey: derivativeAssets.display.storageKey,
        });
      } else {
        fatLogger.error('❌ Failed to add display asset:', 'fe', {
          error: JSON.stringify(displayResult.Err),
          memoryId: icpMemoryId,
          storageKey: derivativeAssets.display.storageKey,
        });
        throw new Error(
          `Failed to add display asset: ${JSON.stringify(displayResult.Err)}`
        );
      }
    }

    // Add thumb derivative if available
    if (derivativeAssets.thumb?.storageKey) {
      fatLogger.info('🔄 Adding thumb asset to memory...', 'fe', {
        memoryId: icpMemoryId,
        storageKey: derivativeAssets.thumb.storageKey,
      });

      const thumbAssetMetadata: AssetMetadata = {
        Image: {
          dpi: [],
          color_space: [],
          base: {
            url: [],
            height: [derivativeAssets.thumb.height || 0],
            updated_at: BigInt(Date.now()),
            asset_type: { Thumbnail: null },
            sha256: [],
            name: `${file.name}_thumb`,
            storage_key: [],
            tags: [],
            processing_error: [],
            mime_type: derivativeAssets.thumb.mimeType || 'image/jpeg',
            description: [],
            created_at: BigInt(Date.now()),
            deleted_at: [],
            bytes: BigInt(derivativeAssets.thumb.bytes || 0),
            asset_location: [],
            width: [derivativeAssets.thumb.width || 0],
            processing_status: [],
            bucket: [],
          },
          exif_data: [],
          compression_ratio: [],
          orientation: [],
        },
      };

      let thumbResult;
      try {
        thumbResult = await backend.memories_add_asset(
          icpMemoryId,
          {
            blob_id: derivativeAssets.thumb.storageKey,
            metadata: thumbAssetMetadata,
          },
          `thumb-${Date.now()}`
        );
      } catch (error) {
        fatLogger.error('❌ Failed to add thumb asset:', 'fe', {
          error: error instanceof Error ? error.message : 'Unknown error',
          memoryId: icpMemoryId,
          storageKey: derivativeAssets.thumb.storageKey,
        });
        throw error;
      }

      if ('Ok' in thumbResult) {
        fatLogger.info('✅ Thumb asset added successfully:', 'fe', {
          memoryId: icpMemoryId,
          storageKey: derivativeAssets.thumb.storageKey,
        });
      } else {
        fatLogger.error('❌ Failed to add thumb asset:', 'fe', {
          error: JSON.stringify(thumbResult.Err),
          memoryId: icpMemoryId,
          storageKey: derivativeAssets.thumb.storageKey,
        });
        throw new Error(
          `Failed to add thumb asset: ${JSON.stringify(thumbResult.Err)}`
        );
      }
    }

    // Add placeholder as inline asset if available
    if (derivativeAssets.placeholder?.url) {
      fatLogger.info('🔄 Adding placeholder asset to memory...', 'fe', {
        memoryId: icpMemoryId,
        placeholderSize: derivativeAssets.placeholder.bytes,
      });

      const placeholderBytes = dataURLtoBytes(derivativeAssets.placeholder.url);

      const placeholderAssetMetadata: AssetMetadata = {
        Image: {
          dpi: [],
          color_space: [],
          base: {
            url: [],
            height: [derivativeAssets.placeholder.height || 0],
            updated_at: BigInt(Date.now()),
            asset_type: { Placeholder: null },
            sha256: [],
            name: `${file.name}_placeholder`,
            storage_key: [],
            tags: [],
            processing_error: [],
            mime_type: 'image/jpeg',
            description: [],
            created_at: BigInt(Date.now()),
            deleted_at: [],
            bytes: BigInt(placeholderBytes.length),
            asset_location: [],
            width: [derivativeAssets.placeholder.width || 0],
            processing_status: [],
            bucket: [],
          },
          exif_data: [],
          compression_ratio: [],
          orientation: [],
        },
      };

      let placeholderResult;
      try {
        placeholderResult = await backend.memories_add_inline_asset(
          icpMemoryId,
          {
            bytes: placeholderBytes,
            metadata: placeholderAssetMetadata,
          },
          `placeholder-${Date.now()}`
        );
      } catch (error) {
        fatLogger.error('❌ Failed to add placeholder asset:', 'fe', {
          error: error instanceof Error ? error.message : 'Unknown error',
          memoryId: icpMemoryId,
          placeholderSize: placeholderBytes.length,
        });
        throw error;
      }

      if ('Ok' in placeholderResult) {
        fatLogger.info('✅ Placeholder asset added successfully:', 'fe', {
          memoryId: icpMemoryId,
          placeholderSize: placeholderBytes.length,
        });
      } else {
        fatLogger.error('❌ Failed to add placeholder asset:', 'fe', {
          error: JSON.stringify(placeholderResult.Err),
          memoryId: icpMemoryId,
          placeholderSize: placeholderBytes.length,
        });
        throw new Error(
          `Failed to add placeholder asset: ${JSON.stringify(placeholderResult.Err)}`
        );
      }
    }
  } catch (error) {
    fatLogger.error('❌ Failed to add derivative assets to memory:', 'fe', {
      error: error instanceof Error ? error.message : 'Unknown error',
      memoryId: icpMemoryId,
      fileName: file.name,
    });
    throw error;
  }
}

/**
 * Create storage edges for all artifacts
 * This tracks where each asset is stored for storage management and retrieval
 */
async function createStorageEdgesForAllAssets(
  icpMemoryId: string,
  file: File,
  originalBlobId: string,
  derivativeAssets: {
    display?: { blobId: string; size: number };
    thumb?: { blobId: string; size: number };
    placeholder?: { blobId: string; size: number };
  }
): Promise<void> {
  try {
    fatLogger.info('🔄 Creating storage edges for all assets:', 'fe', {
      memoryId: icpMemoryId,
      fileName: file.name,
      originalBlobId,
      hasDisplay: !!derivativeAssets.display,
      hasThumb: !!derivativeAssets.thumb,
      hasPlaceholder: !!derivativeAssets.placeholder,
    });

    const memoryType = detectMemoryTypeFromFile(file);
    const edges = [];

    // 1. Metadata edge for ICP canister
    edges.push({
      memoryId: icpMemoryId,
      memoryType: memoryType,
      artifact: 'metadata',
      locationMetadata: 'icp',
      present: true,
      location: `icp://memory/${icpMemoryId}`,
      contentHash: null,
      sizeBytes: null,
      syncState: 'idle',
      syncError: null,
    });

    // 2. Original asset edge
    edges.push({
      memoryId: icpMemoryId,
      memoryType: memoryType,
      artifact: 'asset',
      locationAsset: 'icp',
      present: true,
      location: `icp://blob/${originalBlobId}`,
      contentHash: null,
      sizeBytes: file.size,
      syncState: 'idle',
      syncError: null,
    });

    // 3. Derivative asset edges
    if (derivativeAssets.display) {
      edges.push({
        memoryId: icpMemoryId,
        memoryType: memoryType,
        artifact: 'asset',
        locationAsset: 'icp',
        present: true,
        location: `icp://blob/${derivativeAssets.display.blobId}`,
        contentHash: null,
        sizeBytes: derivativeAssets.display.size,
        syncState: 'idle',
        syncError: null,
      });
    }

    if (derivativeAssets.thumb) {
      edges.push({
        memoryId: icpMemoryId,
        memoryType: memoryType,
        artifact: 'asset',
        locationAsset: 'icp',
        present: true,
        location: `icp://blob/${derivativeAssets.thumb.blobId}`,
        contentHash: null,
        sizeBytes: derivativeAssets.thumb.size,
        syncState: 'idle',
        syncError: null,
      });
    }

    if (derivativeAssets.placeholder) {
      edges.push({
        memoryId: icpMemoryId,
        memoryType: memoryType,
        artifact: 'asset',
        locationAsset: 'icp',
        present: true,
        location: `icp://blob/${derivativeAssets.placeholder.blobId}`,
        contentHash: null,
        sizeBytes: derivativeAssets.placeholder.size,
        syncState: 'idle',
        syncError: null,
      });
    }

    // Create storage edges via API endpoint
    fatLogger.info('🔄 Creating storage edges via API...', 'fe', {
      edgeCount: edges.length,
      memoryId: icpMemoryId,
    });

    for (const edge of edges) {
      const response = await fetch('/api/storage/edges', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(edge),
      });

      if (!response.ok) {
        const error = await response.json();
        fatLogger.error('❌ Failed to create storage edge:', 'fe', {
          error: error.error || 'Unknown error',
          edge: edge,
          memoryId: icpMemoryId,
        });
        throw new Error(
          `Failed to create storage edge: ${error.error || 'Unknown error'}`
        );
      }
    }

    fatLogger.info('✅ All storage edges created successfully:', 'fe', {
      edgeCount: edges.length,
      memoryId: icpMemoryId,
    });
  } catch (error) {
    fatLogger.error('❌ Failed to create storage edges:', 'fe', {
      error: error instanceof Error ? error.message : 'Unknown error',
      memoryId: icpMemoryId,
      fileName: file.name,
    });
    throw error;
  }
}
