/**
 * Enhanced S3 upload with parallel processing
 *
 * Implements the parallel lanes approach:
 * - Lane A: Upload original to S3
 * - Lane B: Process image derivatives (display → thumb → placeholder)
 * Both lanes run simultaneously for optimal performance.
 */

import { getSingleGrant, type GrantResponse } from './grant';
import { processImageDerivatives } from './image-derivatives';
import { finalizeAllAssets, type ProcessedAssets } from './finalize';
import { uploadFileWithProgress, extractFolderName, generateS3PublicUrl } from './shared-utils';

// Types for batch commit response
interface BatchCommitResponse {
  results: Array<{
    memoryId: string;
    size?: number;
    checksum_sha256?: string | null;
    name?: string;
    type?: string;
    success: boolean;
  }>;
  userId: string;
}

/**
 * Upload original file to S3 using grant (Lane A)
 */
async function uploadToS3WithGrant(
  file: File,
  grant: GrantResponse,
  onProgress?: (progress: number) => void
): Promise<{
  data: { id: string };
  results: Array<{ memoryId: string; size: number; checksum_sha256: string | null }>;
  userId: string;
}> {
  console.log(`🚀 Getting presigned URL for: ${file.name}`);

  // Upload original file using grant
  await uploadFileWithProgress(file, grant.original.uploadUrl, onProgress || (() => {}));

  console.log(`💾 Committing to database: ${file.name}`);

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
  console.log(`✅ Upload completed: ${file.name}`);

  return {
    data: { id: commitData.memoryId },
    results: [
      {
        memoryId: commitData.memoryId,
        size: file.size,
        checksum_sha256: null,
      },
    ],
    userId: commitData.userId || '',
  };
}

export async function uploadToS3WithProcessing(
  file: File,
  onProgress?: (progress: number) => void
): Promise<{
  data: { id: string };
  results: Array<{ memoryId: string; size: number; checksum_sha256: string | null }>;
  userId: string;
}> {
  console.log(`🚀 Starting parallel upload for: ${file.name}`);
  const startTime = Date.now();

  try {
    // 1. Single grant before starting both lanes
    const grant = await getSingleGrant(file);

    // 2. Start both lanes simultaneously
    const laneAPromise = uploadToS3WithGrant(file, grant, onProgress);

    let laneBPromise: Promise<ProcessedAssets> | null = null;
    if (file.type.startsWith('image/')) {
      // Lane B processes original File object immediately
      console.log(`🖼️ Starting Lane B (derivatives) for: ${file.name}`);
      laneBPromise = processImageDerivatives(file, grant);
    } else {
      console.log(`⏭️ Skipping Lane B (derivatives) for non-image: ${file.name}`);
    }

    // 3. Wait for both lanes to complete
    const laneAResult = await Promise.allSettled([laneAPromise]).then(results => results[0]);
    const laneBResult = laneBPromise ? await Promise.allSettled([laneBPromise]).then(results => results[0]) : null;

    // Log lane results
    console.log(`📊 Lane A result: ${laneAResult.status === 'fulfilled' ? '✅ success' : '❌ failed'}`);
    console.log(
      `📊 Lane B result: ${laneBResult?.status === 'fulfilled' ? '✅ success' : laneBResult?.status === 'rejected' ? '❌ failed' : '⏭️ skipped'}`
    );

    // 4. Single finalize with all assets and precise statuses
    await finalizeAllAssets(laneAResult, laneBResult);

    const duration = Date.now() - startTime;
    console.log(`✅ Parallel upload completed for: ${file.name} (${duration}ms)`);

    // Return Lane A result (original upload)
    if (laneAResult.status === 'fulfilled') {
      return laneAResult.value;
    } else {
      throw laneAResult.reason;
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Parallel upload failed for: ${file.name} (${duration}ms)`, error);
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
  console.log(`🚀 Starting parallel batch upload for ${files.length} files`);
  const startTime = Date.now();

  try {
    // 1. Get batch grants for all files (Lane A preparation)
    console.log(`🎫 Getting batch grants for ${files.length} files`);
    const grantResponse = await fetch('/api/upload/batch-presign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: files.map(file => ({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        })),
      }),
    });

    if (!grantResponse.ok) {
      const error = await grantResponse.json();
      throw new Error(error.error || 'Failed to get grants');
    }

    const { grants } = await grantResponse.json();

    // 2. Start both lanes simultaneously
    const laneAPromise = uploadMultipleOriginalsToS3WithGrants(files, grants, onProgress);

    // Lane B: Process derivatives for image files
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    let laneBPromise: Promise<ProcessedAssets[]> | null = null;

    if (imageFiles.length > 0) {
      console.log(`🖼️ Starting Lane B (derivatives) for ${imageFiles.length} image files`);
      laneBPromise = processMultipleImageDerivativesWithGrants(imageFiles, grants);
    } else {
      console.log(`⏭️ Skipping Lane B (derivatives) - no image files`);
    }

    // 3. Wait for both lanes to complete
    const laneAResult = await Promise.allSettled([laneAPromise]).then(results => results[0]);
    const laneBResult = laneBPromise ? await Promise.allSettled([laneBPromise]).then(results => results[0]) : null;

    // Log lane results
    console.log(`📊 Lane A result: ${laneAResult.status === 'fulfilled' ? '✅ success' : '❌ failed'}`);
    console.log(
      `📊 Lane B result: ${laneBResult?.status === 'fulfilled' ? '✅ success' : laneBResult?.status === 'rejected' ? '❌ failed' : '⏭️ skipped'}`
    );

    // 4. Create folder if needed (for directory mode)
    let _parentFolderId: string | undefined = undefined;
    if (mode === 'directory') {
      const folderName = extractFolderName(files[0]);
      console.log(`📁 Creating folder: ${folderName}`);

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
      _parentFolderId = folder.id;
    }

    // 5. Finalize all assets for each file
    console.log(`💾 Finalizing assets for ${files.length} files`);
    if (laneAResult.status === 'fulfilled' && laneBResult?.status === 'fulfilled') {
      // Finalize each file's assets
      const finalizePromises = files.map(async (file, index) => {
        const laneAResultForFile = {
          status: 'fulfilled' as const,
          value: {
            data: { id: laneAResult.value.results[index]?.memoryId || '' },
            results: [laneAResult.value.results[index] || { memoryId: '', size: 0, checksum_sha256: null }],
            userId: laneAResult.value.userId,
          },
        };

        const laneBResultForFile = {
          status: 'fulfilled' as const,
          value: laneBResult.value[index] || {},
        };

        await finalizeAllAssets(laneAResultForFile, laneBResultForFile);
      });

      await Promise.all(finalizePromises);
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Parallel batch upload completed for ${files.length} files (${duration}ms)`);

    return {
      results: laneAResult.status === 'fulfilled' ? laneAResult.value.results : [],
      userId: laneAResult.status === 'fulfilled' ? laneAResult.value.userId : '',
      successfulUploads: laneAResult.status === 'fulfilled' ? laneAResult.value.results.length : 0,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Parallel batch upload failed for ${files.length} files (${duration}ms)`, error);
    throw error;
  }
}

/**
 * Lane A: Upload all original files to S3 using batch presigned URLs
 */

/**
 * Upload multiple original files to S3 using grants (Lane A)
 */
async function uploadMultipleOriginalsToS3WithGrants(
  files: File[],
  grants: GrantResponse[],
  onProgress?: (file: File, progress: number) => void
): Promise<{
  results: Array<{ memoryId: string; size: number; checksum_sha256: string | null }>;
  userId: string;
}> {
  const uploadPromises = files.map(async (file, index) => {
    const grant = grants[index];
    if (!grant) {
      throw new Error(`No grant found for file: ${file.name}`);
    }

    console.log(`📤 Uploading original to S3: ${file.name}`);

    // Upload original file using grant
    await uploadFileWithProgress(file, grant.original.uploadUrl, progress => onProgress?.(file, progress));

    console.log(`💾 Committing to database: ${file.name}`);

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
    console.log(`✅ Upload completed: ${file.name}`);

    return {
      memoryId: commitData.memoryId,
      size: file.size,
      checksum_sha256: null,
    };
  });

  const results = await Promise.all(uploadPromises);

  return {
    results,
    userId: '', // Will be set by the calling function
  };
}

/**
 * Process image derivatives for multiple files using grants
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
    } catch (error) {
      console.error(`Failed to process derivatives for ${file.name}:`, error);
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
 * Commit multiple files to database with their derivatives
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function commitMultipleFilesWithDerivatives(
  files: File[],
  presignedUrls: Array<{ signedUrl: string; s3Key: string }>,
  parentFolderId?: string,
  derivatives?: ProcessedAssets[] | null
): Promise<BatchCommitResponse> {
  // Prepare files data for batch commit
  const filesData = files.map((file, index) => {
    const s3Key = presignedUrls[index].s3Key;
    return {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      s3Url: generateS3PublicUrl(s3Key),
    };
  });

  const commitResponse = await fetch('/api/upload/batch-commit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      files: filesData,
      parentFolderId,
    }),
  });

  if (!commitResponse.ok) {
    const error = await commitResponse.json();
    throw new Error(error.error || 'Failed to commit upload');
  }

  const commitResult = await commitResponse.json();
  console.log(`✅ Batch upload committed: ${files.length} files`);

  // If we have derivatives, finalize them for each memory
  if (derivatives && commitResult.results) {
    console.log(`🔄 Finalizing derivatives for ${derivatives.length} memories`);

    const finalizePromises = commitResult.results.map(
      async (result: BatchCommitResponse['results'][0], index: number) => {
        if (result.success && derivatives[index]) {
          try {
            // Create a mock Lane A result for finalizeAllAssets
            const laneAResult = {
              status: 'fulfilled' as const,
              value: {
                data: { id: result.memoryId },
                results: [{ memoryId: result.memoryId, size: files[index].size, checksum_sha256: null }],
                userId: commitResult.userId || '',
              },
            };

            // Create a mock Lane B result for finalizeAllAssets
            const laneBResult = {
              status: 'fulfilled' as const,
              value: derivatives[index],
            };

            await finalizeAllAssets(laneAResult, laneBResult);
            console.log(`✅ Finalized derivatives for memory: ${result.memoryId}`);
          } catch (error) {
            console.error(`❌ Failed to finalize derivatives for memory ${result.memoryId}:`, error);
          }
        }
      }
    );

    await Promise.all(finalizePromises);
  }

  return commitResult;
}
