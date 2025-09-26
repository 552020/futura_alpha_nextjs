/**
 * Enhanced S3 upload with parallel processing
 *
 * Implements the parallel lanes approach:
 * - Lane A: Upload original to S3
 * - Lane B: Process image derivatives (display → thumb → placeholder)
 * Both lanes run simultaneously for optimal performance.
 */

import { getGrants, type GrantResponse } from './s3-grant';
import { processImageDerivatives } from './image-derivatives';
import { finalizeAllAssets, type ProcessedAssets } from './finalize';
import {
  uploadFileWithProgress,
  extractFolderName,
  // generateS3PublicUrl,
  type UploadServiceResult,
} from './shared-utils';

/**
 * Upload original file to S3 using grant (Lane A)
 * STEP 2.1 of the upload pipeline (uploadMultipleToS3WithProcessing in s3-with-processing.ts)
 */
async function uploadToS3WithGrants(
  files: File[],
  grants: GrantResponse[],
  onProgress?: (progress: number) => void
): Promise<UploadServiceResult[]> {
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
          size: file.size,
          checksum_sha256: null,
        },
      ],
      userId: commitData.data.ownerId || '',
    };
  });

  const uploadResults = await Promise.all(uploadPromises);
  return uploadResults;
}

export async function uploadToS3WithProcessing(
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadServiceResult> {
  // const startTime = Date.now();

  try {
    // 1. Single grant before starting both lanes
    const grants = await getGrants([file]);
    const grant = grants[0];

    // 2. Start both lanes simultaneously
    const laneAPromise = uploadToS3WithGrants([file], [grant], onProgress).then(results => results[0]);

    let laneBPromise: Promise<ProcessedAssets> | null = null;
    if (file.type.startsWith('image/')) {
      // Lane B processes original File object immediately
      laneBPromise = processImageDerivatives(file, grant);
    }

    // 3. Wait for both lanes to complete
    const laneAResult = await Promise.allSettled([laneAPromise]).then(results => results[0]);
    const laneBResult = laneBPromise ? await Promise.allSettled([laneBPromise]).then(results => results[0]) : null;

    // 4. Single finalize with all assets and precise statuses
    await finalizeAllAssets(laneAResult, laneBResult);

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
    const laneAPromise = uploadToS3WithGrants(files, grants, progress => {
      // Convert overall progress to per-file progress for compatibility
      onProgress?.(files[0], progress);
    });

    // 2.2. Start Lane B: Process derivatives for image files
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    let laneBPromise: Promise<ProcessedAssets[]> | null = null;

    if (imageFiles.length > 0) {
      laneBPromise = processMultipleImageDerivativesWithGrants(imageFiles, grants);
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

        await finalizeAllAssets(laneAResultForFile, laneBResultForFile, parentFolderId);
      });

      await Promise.all(finalizePromises);
    }

    return {
      results: laneAResult.status === 'fulfilled' ? laneAResult.value.map(result => result.results[0]) : [],
      userId: laneAResult.status === 'fulfilled' ? laneAResult.value[0]?.userId || '' : '',
      successfulUploads: laneAResult.status === 'fulfilled' ? laneAResult.value.length : 0,
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Lane A: Upload all original files to S3 using batch presigned URLs
 */

/**
 * Create folder for directory mode uploads
 * STEP 4 of the upload pipeline (uploadMultipleToS3WithProcessing in s3-with-processing.ts)
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
 * Process image derivatives for multiple files using grants
 * STEP 2.2 of the upload pipeline (uploadMultipleToS3WithProcessing in s3-with-processing.ts)
 */
async function processMultipleImageDerivativesWithGrants(
  imageFiles: File[],
  grants: GrantResponse[]
): Promise<ProcessedAssets[]> {
  const derivativePromises = imageFiles.map(async (file, index) => {
    try {
      const grant = grants[index];
      if (!grant) {
        throw new Error(`No grant found for file: ${file.name}`);
      }

      return await processImageDerivatives(file, grant);
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
