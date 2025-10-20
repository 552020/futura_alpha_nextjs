/**
 * Enhanced S3 upload with parallel processing
 *
 * Implements the parallel lanes approach:
 * - Lane A: Upload original to S3
 * - Lane B: Process image derivatives (display → thumb → placeholder)
 * Both lanes run simultaneously for optimal performance.
 */

import { getGrants, type GrantResponse } from './s3-grant';
import { processImageDerivativesPure, uploadProcessedAssetsToS3 } from './image-derivatives';
import { finalizeAllAssets, type ProcessedAssets } from './finalize';
import { detectMemoryTypeFromFile } from '@/utils/memory-type';
import {
  uploadFileWithProgress,
  createFolderIfNeeded,
  // generateS3PublicUrl,
} from './shared-utils';
import { type UploadServiceResult } from './types';
import { fatLogger } from '@/lib/logger';

/**
 * Upload original files to S3 using grants (Lane A)
 * STEP 2.1 of the upload pipeline (uploadMultipleToS3WithProcessing in s3-with-processing.ts)
 */
async function uploadOriginalToS3(
  files: File[],
  grants: GrantResponse[],
  onProgress?: (progress: number) => void
): Promise<UploadServiceResult[]> {
  fatLogger.info('🚀 ENTERING: uploadOriginalToS3', 'be', {
    timestamp: new Date().toISOString(),
    fileCount: files.length,
    fileNames: files.map(f => f.name),
    grantCount: grants.length,
  });
  const isSingleFile = files.length === 1;

  const uploadPromises = files.map(async (file, index) => {
    const grant = grants[index];
    if (!grant) {
      throw new Error(`No grant found for file: ${file.name}`);
    }

    // Upload original file using grant
    await uploadFileWithProgress(file, grant.original.uploadUrl, progress => {
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
        fileKey: grant.original.fileKey,
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
          blobId: commitData.data.id,
          size: BigInt(file.size),
          checksumSha256: undefined,
          storageBackend: 's3' as const,
          storageLocation: '', // Will be filled by finalizeAllAssets
          uploadedAt: BigInt(Date.now()),
        },
      ],
      userId: commitData.data.ownerId || '',
      totalFiles: 1,
      totalSize: file.size,
      processingTime: 0,
      storageBackend: 's3' as const,
      databaseBackend: 'neon' as const,
    };
  });

  const uploadResults = await Promise.all(uploadPromises);

  fatLogger.info('✅ EXITING: uploadOriginalToS3', 'be', {
    timestamp: new Date().toISOString(),
    fileCount: files.length,
    resultCount: uploadResults.length,
  });

  return uploadResults;
}

export async function uploadToS3WithProcessing(
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadServiceResult> {
  fatLogger.info('🚀 ENTERING: uploadToS3WithProcessing', 'be', {
    timestamp: new Date().toISOString(),
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
  });

  // const startTime = Date.now();

  try {
    // 1. Single grant before starting both lanes
    const grants = await getGrants([file]);
    const grant = grants[0];

    // 2. Start both lanes simultaneously
    const laneAPromise = uploadOriginalToS3([file], [grant], onProgress).then(results => results[0]);

    let laneBPromise: Promise<ProcessedAssets> | null = null;
    if (detectMemoryTypeFromFile(file) === 'image') {
      // Lane B processes original File object immediately
      laneBPromise = processImageDerivativesPure(file).then(processedBlobs =>
        uploadProcessedAssetsToS3(processedBlobs, grant)
      );
    }

    // 3. Wait for both lanes to complete
    const laneAResult = await Promise.allSettled([laneAPromise]).then(results => results[0]);
    const laneBResult = laneBPromise ? await Promise.allSettled([laneBPromise]).then(results => results[0]) : null;

    // 4. Single finalize with all assets and precise statuses
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await finalizeAllAssets(laneAResult as any, laneBResult);

    // Return Lane A result (original upload)
    if (laneAResult.status === 'fulfilled') {
      fatLogger.info('✅ EXITING: uploadToS3WithProcessing', 'be', {
        timestamp: new Date().toISOString(),
        fileName: file.name,
        status: 'success',
      });
      return laneAResult.value;
    } else {
      fatLogger.info('❌ EXITING: uploadToS3WithProcessing (lane A failed)', 'be', {
        timestamp: new Date().toISOString(),
        fileName: file.name,
        error: laneAResult.reason,
      });
      throw laneAResult.reason;
    }
  } catch (error) {
    fatLogger.info('❌ EXITING: uploadToS3WithProcessing (with error)', 'be', {
      timestamp: new Date().toISOString(),
      fileName: file.name,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Enhanced S3 batch upload with parallel processing for multiple files
 *
 * Implements the parallel lanes approach for multiple files:
 * - Lane A: Upload all originals to S3 using batch presigned URLs
 * - Lane B: Process image derivatives for each image file (display → thumb → placeholder)
 * Both lanes run simultaneously for optimal performance.
 */
export async function uploadMultipleToS3WithProcessing(
  files: File[],
  mode: 'directory' | 'multiple-files',
  onProgress?: (file: File, progress: number) => void
): Promise<{
  results?: Array<{ memoryId: string; size?: number; checksum_sha256?: string | null; name?: string; type?: string }>;
  userId?: string;
  successfulUploads?: number;
}> {
  // const startTime = Date.now();

  try {
    // 1. Get grants for all files (Lane A preparation)
    const grants = await getGrants(files);

    // 2.1. Start Lane A: Upload original files to S3
    const laneAPromise = uploadOriginalToS3(files, grants, progress => {
      // Convert overall progress to per-file progress for compatibility
      onProgress?.(files[0], progress);
    });

    // 2.2. Start Lane B: Process derivatives for image files
    const imageFiles = files.filter(file => detectMemoryTypeFromFile(file) === 'image');
    let laneBPromise: Promise<ProcessedAssets[]> | null = null;

    if (imageFiles.length > 0) {
      laneBPromise = processMultipleImageDerivativesPure(imageFiles, grants);
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
          value: laneAResult.value[index],
        };

        const laneBResultForFile = {
          status: 'fulfilled' as const,
          value: laneBResult.value[index] || {},
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await finalizeAllAssets(laneAResultForFile as any, laneBResultForFile, parentFolderId);
      });

      await Promise.all(finalizePromises);
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
 * Lane A: Upload all original files to S3 using batch presigned URLs
 * (This function is now called uploadOriginalToS3)
 */

/**
 * Process image derivatives for multiple files using pure processing + S3 upload
 * STEP 2.2 of the upload pipeline (uploadMultipleToS3WithProcessing in s3-with-processing.ts)
 */
async function processMultipleImageDerivativesPure(
  imageFiles: File[],
  grants: GrantResponse[]
): Promise<ProcessedAssets[]> {
  const derivativePromises = imageFiles.map(async (file, index) => {
    try {
      const grant = grants[index];
      if (!grant) {
        throw new Error(`No grant found for file: ${file.name}`);
      }

      // Pure processing first, then S3 upload
      const processedBlobs = await processImageDerivativesPure(file);
      return await uploadProcessedAssetsToS3(processedBlobs, grant);
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
