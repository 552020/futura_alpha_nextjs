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
import { processImageDerivativesPure, type ProcessedBlobs } from './image-derivatives';
// import { finalizeAllAssets, type ProcessedAssets } from './finalize'; // Not used for ICP-only uploads
import { type ProcessedAssets } from './finalize';
// import { extractFolderName } from './shared-utils';
import { type UploadServiceResult } from './types';
// import { fatLogger } from '@/lib/logger';
import { getAuthClient } from '@/ic/ii';
import { backendActor } from '@/ic/backend';
import type {
  Result,
  Result_5,
  Result_6,
  Result13,
  Result15,
  MemoryMetadata,
  // InternalBlobAssetInput, // Not used for inline storage approach
  AssetMetadata,
  AssetType,
  MemoryType,
  DatabaseHosting,
  UploadFinishResult,
} from '@/ic/declarations/backend/backend.did';

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
  onProgress?: (progress: number) => void
): Promise<UploadServiceResult[]> {
  const isSingleFile = files.length === 1;

  const uploadPromises = files.map(async (file, _index) => {
    // 1. Upload original file using ICP chunked upload
    const uploadResult = await uploadFileToICPWithProgress(file, progress => {
      if (isSingleFile) {
        onProgress?.(progress);
      } else {
        // For multiple files, we could calculate overall progress here
        // For now, just call with the current file's progress
        onProgress?.(progress);
      }
    });

    // 2. Create ICP memory record with the original blob
    const icpMemoryId = await createICPMemoryWithOriginalBlob(file, uploadResult.uploadResult.blob_id);

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
    const laneAPromise = uploadOriginalAndCreateMemory([file], onProgress).then(results => results[0]);

    let laneBPromise: Promise<ProcessedAssets> | null = null;
    if (file.type.startsWith('image/')) {
      // Lane B processes original File object immediately
      laneBPromise = processImageDerivativesPure(file).then(processedBlobs =>
        uploadProcessedAssetsToICP(processedBlobs, file.name)
      );
    }

    // 2. Wait for both lanes to complete
    const laneAResult = await Promise.allSettled([laneAPromise]).then(results => results[0]);
    const laneBResult = laneBPromise ? await Promise.allSettled([laneBPromise]).then(results => results[0]) : null;

    // 3. Create storage edges for all artifacts (after both lanes complete)
    if (laneAResult.status === 'fulfilled') {
      const icpMemoryId = laneAResult.value.data.id;
      const originalResult = laneAResult.value.results[0];

      // Create storage edges for original + derivatives
      const derivativeAssets =
        laneBResult?.status === 'fulfilled'
          ? {
              display: laneBResult.value.display
                ? { blobId: laneBResult.value.display.storageKey || '', size: laneBResult.value.display.bytes || 0 }
                : undefined,
              thumb: laneBResult.value.thumb
                ? { blobId: laneBResult.value.thumb.storageKey || '', size: laneBResult.value.thumb.bytes || 0 }
                : undefined,
              placeholder: laneBResult.value.placeholder
                ? { blobId: 'inline', size: laneBResult.value.placeholder.bytes || 0 }
                : undefined,
            }
          : {};

      await createStorageEdgesForAllAssets(icpMemoryId, file, originalResult.blobId, derivativeAssets);
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
  results?: Array<{ memoryId: string; size?: number; checksum_sha256?: string | null; name?: string; type?: string }>;
  userId?: string;
  successfulUploads?: number;
}> {
  try {
    // 2.1. Start Lane A: Upload original files to ICP
    const laneAPromise = uploadOriginalAndCreateMemory(files, progress => {
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
    // const _parentFolderId = await createFolderIfNeeded(mode, files);

    // 5. Finalize all assets for each file
    if (laneAResult.status === 'fulfilled' && laneBResult?.status === 'fulfilled') {
      // Finalize each file's assets
      // const _finalizePromises = files.map(async (file, index) => {
      //   const _laneAResultForFile = {
      //     status: 'fulfilled' as const,
      //     value: {
      //       data: laneAResult.value[index].data,
      //       results: laneAResult.value[index].results.map(r => ({
      //         memoryId: r.memoryId,
      //         size: Number(r.size),
      //         checksum_sha256: r.checksumSha256
      //           ? Array.from(r.checksumSha256)
      //               .map(b => b.toString(16).padStart(2, '0'))
      //               .join('')
      //           : null,
      //       })),
      //       userId: laneAResult.value[index].userId,
      //     },
      //   };

      //   const _laneBResultForFile = {
      //     status: 'fulfilled' as const,
      //     value: laneBResult.value[index] || {},
      //   };

      //   // For ICP-only uploads, we don't create memory records in Neon database
      //   // We only create storage edges to track where the ICP memories are stored
      // });

      // CRITICAL: Create ICP memory records and storage edges (no Neon memory records)
      if (laneAResult.status === 'fulfilled') {
        const edgePromises = laneAResult.value.map(async (result, index) => {
          // Generate a unique UUID for tracking purposes (not stored in Neon)
          const memoryId = crypto.randomUUID();
          const file = files[index];

          // Collect blob asset information for this file
          const blobAssets = [];

          // Add original asset from Lane A
          const originalResult = result.results[0];
          blobAssets.push({
            blobId: originalResult.blobId, // Use the actual ICP blob ID
            assetType: 'original' as const,
            size: Number(originalResult.size),
            hash: originalResult.checksumSha256
              ? Array.from(originalResult.checksumSha256)
                  .map(b => b.toString(16).padStart(2, '0'))
                  .join('')
              : '',
            mimeType: file.type,
          });

          // Add derivative assets from Lane B
          if (laneBResult?.status === 'fulfilled' && laneBResult.value[index]) {
            const { display, thumb, placeholder } = laneBResult.value[index];

            if (display) {
              blobAssets.push({
                blobId: display.storageKey || '', // This now contains the ICP blob ID
                assetType: 'display' as const,
                size: display.bytes || 0,
                hash: '', // TODO: Get hash from ICP upload result
                mimeType: display.mimeType || 'image/jpeg',
              });
            }

            if (thumb) {
              blobAssets.push({
                blobId: thumb.storageKey || '', // This now contains the ICP blob ID
                assetType: 'thumb' as const,
                size: thumb.bytes || 0,
                hash: '', // TODO: Get hash from ICP upload result
                mimeType: thumb.mimeType || 'image/jpeg',
              });
            }

            // Prepare placeholder data for inline storage (not as blob asset)
            const placeholderData = placeholder
              ? {
                  dataUrl: placeholder.url || '',
                  size: placeholder.bytes || 0,
                  mimeType: placeholder.mimeType || 'image/jpeg',
                }
              : null;

            // Create memory metadata for ICP
            const memoryMetadata: MemoryMetadata = {
              title: [file.name.split('.')[0] || 'Untitled'],
              updated_at: BigInt(Date.now()),
              sharing_status: { Private: null },
              date_of_memory: [],
              memory_type: { Image: null } as MemoryType,
              tags: [],
              has_thumbnails: true,
              content_type: file.type,
              people_in_memory: [],
              has_previews: true,
              database_storage_edges: [{ Neon: null } as DatabaseHosting],
              description: [],
              created_at: BigInt(Date.now()),
              created_by: [],
              total_size: BigInt(file.size),
              thumbnail_url: [],
              parent_folder_id: [],
              asset_count: 1,
              deleted_at: [],
              primary_asset_url: [],
              shared_count: 0,
              file_created_at: [],
              location: [],
              memory_notes: [],
              uploaded_at: BigInt(Date.now()),
            };

            // Create ICP memory record and storage edges
            if (placeholderData) {
              await createICPMemoryRecordAndEdges(memoryId, blobAssets, placeholderData, memoryMetadata);
            } else {
              throw new Error('Placeholder data is required for ICP memory creation');
            }
          }
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
// async function createFolderIfNeeded(mode: 'directory' | 'multiple-files', files: File[]): Promise<string | undefined> {
//   if (mode !== 'directory') {
//     return undefined;
//   }

//   const folderName = extractFolderName(files[0]);

//   const folderResponse = await fetch('/api/folders', {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify({ folderName }),
//   });

//   if (!folderResponse.ok) {
//     const error = await folderResponse.json();
//     throw new Error(error.error || 'Failed to create folder');
//   }

//   const { folder } = await folderResponse.json();
//   return folder.id;
// }

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

      const displayUploadResult = await uploadFileToICPWithProgress(displayFile, () => {}); // No progress tracking for derivatives

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

      const thumbUploadResult = await uploadFileToICPWithProgress(thumbFile, () => {}); // No progress tracking for derivatives

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

  // Prepare placeholder for inline storage in ICP memory (not as blob)
  if (processedBlobs.placeholder) {
    try {
      // Convert data URL to bytes for inline storage
      const placeholderBytes = dataURLtoBytes(processedBlobs.placeholder.dataUrl);

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
      console.log(
        '❌ Failed to prepare placeholder for inline storage:',
        error instanceof Error ? error.message : 'Unknown error'
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
    const capsuleResult = (await backend.capsules_read_basic([])) as Result_6;
    let capsuleId;

    if ('Ok' in capsuleResult && capsuleResult.Ok) {
      capsuleId = capsuleResult.Ok.capsule_id;
      console.log(`✅ Using existing capsule: ${capsuleId}`);
    } else {
      console.log('🆕 No capsule found, creating one...');
      const createResult = (await backend.capsules_create([])) as Result_5;
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

    // 4. Begin upload session
    console.log('🚀 Starting upload session...');
    const begin = (await backend.uploads_begin(capsuleId, totalChunks, `upload-${Date.now()}`)) as Result13;

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
    const fin = (await backend.uploads_finish(session, hash, BigInt(file.size))) as Result15;

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
    return {
      file,
      uploadResult: fin.Ok,
    };
  } catch (error) {
    console.log('❌ ICP upload failed:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

/**
 * Create ICP memory record and storage edges
 *
 * This function creates the memory record in the ICP canister and creates
 * storage edges to track where each artifact is stored.
 *
 * @param trackingMemoryId - The tracking ID for this ICP memory (not stored in Neon)
 * @param blobAssets - Array of blob assets that were uploaded to ICP
 * @param memoryMetadata - Memory metadata for ICP canister
 */
async function createICPMemoryRecordAndEdges(
  trackingMemoryId: string,
  blobAssets: Array<{
    blobId: string;
    assetType: 'original' | 'display' | 'thumb';
    size: number;
    hash: string;
    mimeType: string;
  }>,
  placeholderData: {
    dataUrl: string;
    size: number;
    mimeType: string;
  },
  _memoryMetadata: MemoryMetadata
): Promise<string> {
  try {
    console.log(`🔗 Creating ICP memory record and storage edges for tracking ID: ${trackingMemoryId}`);

    // Get authenticated backend actor
    const authClient = await getAuthClient();
    if (!authClient.isAuthenticated()) {
      throw new Error('Please connect your Internet Identity to create ICP memory records');
    }

    const identity = authClient.getIdentity();
    const backend = await backendActor(identity);

    // Get capsule ID
    const capsuleResult = await backend.capsules_read_basic([]);
    if (!('Ok' in capsuleResult)) {
      throw new Error('Failed to get user capsule');
    }
    const capsuleId = capsuleResult.Ok.capsule_id;

    // Convert data URL to bytes for inline placeholder storage
    const placeholderBytes = dataURLtoBytes(placeholderData.dataUrl);

    // Create placeholder asset metadata
    const placeholderAssetMetadata: AssetMetadata = {
      Image: {
        dpi: [],
        color_space: [],
        base: {
          url: [],
          height: [],
          updated_at: BigInt(Date.now()),
          asset_type: { Preview: null } as AssetType,
          sha256: [],
          name: 'placeholder',
          storage_key: [],
          tags: [],
          processing_error: [],
          mime_type: placeholderData.mimeType,
          description: [],
          created_at: BigInt(Date.now()),
          deleted_at: [],
          bytes: BigInt(placeholderBytes.length),
          asset_location: [],
          width: [],
          processing_status: [],
          bucket: [],
          // hash: '', // TODO: Calculate actual hash - not part of AssetMetadataBase
        },
        exif_data: [],
        compression_ratio: [],
        orientation: [],
      },
    };

    // Create memory in ICP canister with placeholder as inline asset
    // TODO: Support multiple assets (placeholder inline + others as blobs)
    const result = await backend.memories_create(
      capsuleId,
      [placeholderBytes], // inline bytes for placeholder (array format)
      [], // no blob ref (empty array)
      [], // no external location (empty array)
      [], // no external storage key (empty array)
      [], // no external URL (empty array)
      [], // no external size (empty array)
      [], // no external hash (empty array)
      placeholderAssetMetadata,
      trackingMemoryId // Use tracking ID as idempotency key
    );

    if ('Ok' in result) {
      const icpMemoryId = result.Ok;
      console.log(`✅ ICP memory created: ${icpMemoryId} for tracking ID: ${trackingMemoryId}`);

      // Create storage edges for each artifact via API
      await createStorageEdgesViaAPI(trackingMemoryId, icpMemoryId, blobAssets, placeholderData);

      return icpMemoryId;
    } else {
      throw new Error(`Failed to create ICP memory: ${JSON.stringify(result.Err)}`);
    }
  } catch (error) {
    console.log('❌ Failed to create ICP memory record:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

/**
 * Create storage edges for ICP memory via API
 *
 * This function creates storage edge records to track where each artifact is stored.
 * It creates edges for metadata (in both Neon and ICP) and assets (in ICP).
 */
async function createStorageEdgesViaAPI(
  trackingMemoryId: string,
  icpMemoryId: string,
  blobAssets: Array<{
    blobId: string;
    assetType: 'original' | 'display' | 'thumb';
    size: number;
    hash: string;
    mimeType: string;
  }>,
  placeholderData: {
    dataUrl: string;
    size: number;
    mimeType: string;
  }
): Promise<void> {
  try {
    console.log(`🔗 Creating storage edges for memory: ${trackingMemoryId} (ICP: ${icpMemoryId})`);

    const edges = [];

    // 1. Metadata edge for ICP canister
    edges.push({
      memoryId: trackingMemoryId,
      memoryType: 'image',
      artifact: 'metadata',
      locationMetadata: 'icp',
      present: true,
      location: `icp://memory/${icpMemoryId}`,
      contentHash: null,
      sizeBytes: null,
      syncState: 'idle',
      syncError: null,
    });

    // 2. Placeholder edge (inline asset in ICP memory)
    edges.push({
      memoryId: trackingMemoryId,
      memoryType: 'image',
      artifact: 'asset',
      locationAsset: 'icp',
      present: true,
      location: `icp://memory/${icpMemoryId}/inline/placeholder`,
      contentHash: null, // TODO: Calculate hash
      sizeBytes: placeholderData.size,
      syncState: 'idle',
      syncError: null,
    });

    // 3. Asset edges for each blob in ICP
    for (const asset of blobAssets) {
      edges.push({
        memoryId: trackingMemoryId,
        memoryType: 'image',
        artifact: 'asset',
        locationAsset: 'icp',
        present: true,
        location: `icp://blob/${asset.blobId}`,
        contentHash: asset.hash,
        sizeBytes: asset.size,
        syncState: 'idle',
        syncError: null,
      });
    }

    // Create storage edges via API endpoint
    for (const edge of edges) {
      const response = await fetch('/api/storage/edges', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(edge),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to create storage edge: ${error.error || 'Unknown error'}`);
      }
    }

    console.log(`✅ Created ${edges.length} storage edges for memory: ${trackingMemoryId}`);
  } catch (error) {
    console.log('❌ Failed to create storage edges:', error instanceof Error ? error.message : 'Unknown error');
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
async function createICPMemoryWithOriginalBlob(file: File, originalBlobId: string): Promise<string> {
  try {
    console.log(`🔗 Creating ICP memory with original blob: ${originalBlobId}`);

    // Get authenticated backend actor
    const authClient = await getAuthClient();
    if (!authClient.isAuthenticated()) {
      throw new Error('Please connect your Internet Identity to create ICP memory records');
    }

    const identity = authClient.getIdentity();
    const backend = await backendActor(identity);

    // Get capsule ID
    const capsuleResult = await backend.capsules_read_basic([]);
    if (!('Ok' in capsuleResult)) {
      throw new Error('Failed to get user capsule');
    }
    const capsuleId = capsuleResult.Ok.capsule_id;

    // Create memory metadata
    const memoryMetadata: MemoryMetadata = {
      title: [file.name.split('.')[0] || 'Untitled'],
      updated_at: BigInt(Date.now()),
      sharing_status: { Private: null },
      date_of_memory: [],
      memory_type: { Image: null } as MemoryType,
      tags: [],
      has_thumbnails: true,
      content_type: file.type,
      people_in_memory: [],
      has_previews: true,
      database_storage_edges: [{ Neon: null } as DatabaseHosting],
      description: [],
      created_at: BigInt(Date.now()),
      created_by: [],
      total_size: BigInt(file.size),
      thumbnail_url: [],
      parent_folder_id: [],
      asset_count: 1,
      deleted_at: [],
      primary_asset_url: [],
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
          asset_type: { Original: null } as AssetType,
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
    const result = await backend.memories_create_with_internal_blobs(
      capsuleId,
      memoryMetadata,
      [{ blob_id: originalBlobId, metadata: assetMetadata }],
      `memory-${Date.now()}` // idempotency key
    );

    if ('Ok' in result) {
      const icpMemoryId = result.Ok;
      console.log(`✅ ICP memory created: ${icpMemoryId} with original blob: ${originalBlobId}`);
      return icpMemoryId;
    } else {
      throw new Error(`Failed to create ICP memory: ${JSON.stringify(result.Err)}`);
    }
  } catch (error) {
    console.log('❌ Failed to create ICP memory record:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

/**
 * Create storage edges for all artifacts
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
    console.log(`🔗 Creating storage edges for memory: ${icpMemoryId}`);

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
    for (const edge of edges) {
      const response = await fetch('/api/storage/edges', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(edge),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to create storage edge: ${error.error || 'Unknown error'}`);
      }
    }

    console.log(`✅ Created ${edges.length} storage edges for memory: ${icpMemoryId}`);
  } catch (error) {
    console.log('❌ Failed to create storage edges:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}
