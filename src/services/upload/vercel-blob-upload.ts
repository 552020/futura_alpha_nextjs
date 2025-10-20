/**
 * UPLOAD SERVICE - BLOB-FIRST APPROACH
 *
 * This service implements the new blob-first upload flow:
 * 1. Upload file to blob storage (Vercel Blob, AWS S3, etc.)
 * 2. Get blob URL from storage provider
 * 3. Call POST /api/memories with blob URL and metadata
 *
 * This replaces the old approach of sending files directly to backend endpoints.
 */

// import { type StorageBackend } from '@/lib/storage';
import { upload as blobUpload } from '@vercel/blob/client';
import { type UploadServiceResult } from './shared-utils';
import { processImageDerivativesPure, type ProcessedBlobs } from './image-derivatives';

import { fatLogger } from '@/lib/logger';
// Import image processing functions (we'll need to create these)

interface UploadResponse {
  success: boolean;
  data: {
    id: string;
    ownerId?: string; // For onboarding users
    type: string;
    title: string;
    description: string;
    fileCreatedAt: string;
    isPublic: boolean;
    parentFolderId: string | null;
    tags: string[];
    recipients: string[];
    unlockDate: string | null;
    metadata: Record<string, unknown>;
    createdAt: string;
    assets: Array<{
      id: string;
      assetType: string;
      url: string;
      bytes: number;
      mimeType: string;
      storageBackend: string;
      storageKey: string;
    }>;
  };
}

type UploadMode = 'multiple-files' | 'single' | 'directory';

import { detectMemoryTypeFromFile } from '@/utils/memory-type';

export async function uploadFileToVercelBlob(
  file: File,
  isOnboarding: boolean,
  existingUserId?: string,
  mode: UploadMode = 'multiple-files'
): Promise<UploadResponse> {
  // Use new client-side upload flow with our grant endpoint
  const clientPayloadData = {
    isOnboarding,
    mode,
    filename: file.name,
    existingUserId,
    // Add any other context needed on the server side
  };

  // Choose the correct endpoint based on authentication status
  const uploadEndpoint = isOnboarding
    ? '/api/upload/vercel-blob/upload-url' // No auth required for onboarding
    : '/api/upload/vercel-blob/grant'; // Auth required for authenticated users

  const blob = await blobUpload(file.name, file, {
    access: 'public',
    handleUploadUrl: uploadEndpoint,
    multipart: true, // chunked + parallel + retries for large files
    clientPayload: JSON.stringify(clientPayloadData),
    onUploadProgress: _ev => {
      // Hook into UI progress tracking
      if (typeof window !== 'undefined') {
        // TODO: Dispatch progress to a store or UI component
        // dispatch({ type: 'UPLOAD_PROGRESS', file: file.name, percentage: ev.percentage });
      }
    },
  });

  if (isOnboarding) {
    // For onboarding users, we need to create the memory separately using the complete endpoint
    try {
      const commitResponse = await fetch('/api/upload/complete?onboarding=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blobUrl: blob.url,
          metadata: {
            title: file.name,
            mimeType: file.type,
            size: file.size,
            width: undefined, // TODO: Extract from image if needed
            height: undefined, // TODO: Extract from image if needed
          },
        }),
      });

      if (!commitResponse.ok) {
        const error = await commitResponse.json();
        throw new Error(error.error || 'Failed to create onboarding memory');
      }

      const commitResult = await commitResponse.json();
      console.log('🔍 [DEBUG] commitResult from /api/upload/complete:', JSON.stringify(commitResult, null, 2));

      // Return result in expected format with allUserId for onboarding context
      const result = {
        success: true,
        data: {
          id: commitResult.memoryId,
          ownerId: commitResult.allUserId, // ← This is the allUserId for onboarding context
          type: detectMemoryTypeFromFile(file),
          title: file.name.split('.')[0] || 'Untitled',
          description: '',
          fileCreatedAt: new Date().toISOString(),
          isPublic: false,
          parentFolderId: null,
          tags: [],
          recipients: [],
          unlockDate: null,
          metadata: {},
          createdAt: new Date().toISOString(),
          assets: [
            {
              id: 'temp-asset-id',
              assetType: 'original',
              url: blob.url,
              bytes: file.size,
              mimeType: file.type,
              storageBackend: 'vercel_blob',
              storageKey: blob.pathname,
            },
          ],
        },
      };

      console.log('🔍 [DEBUG] Final upload result:', JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      throw new Error(
        `Failed to create onboarding memory: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  } else {
    // For authenticated users, memory was already created by the grant endpoint's onUploadCompleted callback
    // The grant endpoint now returns the memoryId in the response
    const memoryId = (blob as { memoryId?: string }).memoryId;

    if (memoryId) {
      // Return the memory data using the ID from the grant endpoint
      return {
        success: true,
        data: {
          id: memoryId,
          type: detectMemoryTypeFromFile(file),
          title: file.name.split('.')[0] || 'Untitled',
          description: '',
          fileCreatedAt: new Date().toISOString(),
          isPublic: false,
          parentFolderId: null,
          tags: [],
          recipients: [],
          unlockDate: null,
          metadata: {},
          createdAt: new Date().toISOString(),
          assets: [
            {
              id: 'temp-asset-id',
              assetType: 'original',
              url: blob.url,
              bytes: file.size,
              mimeType: file.type,
              storageBackend: 'vercel_blob',
              storageKey: blob.pathname,
            },
          ],
        },
      };
    } else {
      // Fallback: return the blob info even if memory creation failed
      // This allows the upload to appear successful, but the file won't show in dashboard
      return {
        success: true,
        data: {
          id: 'temp-id', // Temporary ID - file won't appear in dashboard
          type: detectMemoryTypeFromFile(file),
          title: file.name.split('.')[0] || 'Untitled',
          description: '',
          fileCreatedAt: new Date().toISOString(),
          isPublic: false,
          parentFolderId: null,
          tags: [],
          recipients: [],
          unlockDate: null,
          metadata: {},
          createdAt: new Date().toISOString(),
          assets: [
            {
              id: 'temp-asset-id',
              assetType: 'original',
              url: blob.url,
              bytes: file.size,
              mimeType: file.type,
              storageBackend: 'vercel_blob',
              storageKey: blob.pathname,
            },
          ],
        },
      };
    }
  }
}

/**
 * Upload to Vercel Blob - unified function for single and multiple files
 */
export async function uploadToVercelBlob(
  files: File[],
  isOnboarding: boolean,
  existingUserId: string | undefined,
  mode: 'single' | 'multiple-files' | 'directory',
  _onProgress?: (progress: number) => void
): Promise<UploadServiceResult[]> {
  const results: UploadServiceResult[] = [];

  // Upload all files in parallel
  const uploadPromises = files.map(async file => {
    const uploadResult = await uploadFileToVercelBlob(file, isOnboarding, existingUserId, mode);
    return { file, uploadResult };
  });

  const uploadResults = await Promise.allSettled(uploadPromises);

  // Process results
  for (let i = 0; i < uploadResults.length; i++) {
    const result = uploadResults[i];
    const file = files[i];

    if (result.status === 'fulfilled') {
      const { uploadResult } = result.value;

      // Convert to expected format
      const memory = Array.isArray(uploadResult.data) ? uploadResult.data[0] : uploadResult.data;

      if (!memory || !memory.id) {
        throw new Error(`Upload failed for file ${file.name}: Invalid response from server`);
      }

      console.log('🔍 [DEBUG] uploadToVercelBlob: memory object:', JSON.stringify(memory, null, 2));
      console.log('🔍 [DEBUG] uploadToVercelBlob: memory.ownerId:', memory.ownerId);

      results.push({
        data: {
          id: memory.id,
          ownerId: memory.ownerId || '', // Preserve ownerId for onboarding context
        } as { id: string; ownerId?: string },
        results: [
          {
            memoryId: memory.id,
            blobId: memory.id,
            size: BigInt(file.size),
            checksumSha256: undefined,
            storageBackend: 'vercel_blob' as const,
            storageLocation: '', // Will be filled by finalizeAllAssets
            uploadedAt: BigInt(Date.now()),
          },
        ],
        userId: existingUserId || '',
        totalFiles: 1,
        totalSize: file.size,
        processingTime: 0,
        storageBackend: 'vercel_blob' as const,
        databaseBackend: 'neon' as const,
      });
    } else {
      // Handle failed uploads - continue with other files
      fatLogger.error(`Upload failed for file ${file.name}:`, 'be', { data: result.reason });
      throw new Error(`Upload failed for file ${file.name}: ${result.reason.message}`);
    }
  }

  return results;
}

/**
 * Enhanced Vercel Blob upload with parallel processing
 *
 * Implements the parallel lanes approach (similar to S3):
 * - Lane A: Upload original to Vercel Blob
 * - Lane B: Process image derivatives (display → thumb → placeholder)
 * Both lanes run simultaneously for optimal performance.
 */
export async function uploadToVercelBlobWithProcessing(
  file: File,
  isOnboarding: boolean,
  existingUserId?: string,
  mode: UploadMode = 'multiple-files',
  onProgress?: (progress: number) => void
): Promise<UploadServiceResult> {
  try {
    // 1. NO GRANTS NEEDED - Vercel Blob doesn't use presigned URLs

    // 2. Start both lanes simultaneously
    const laneAPromise = uploadOriginalToVercelBlob(file, isOnboarding, existingUserId, mode, onProgress);

    let laneBPromise: Promise<ProcessedBlobs> | null = null;
    if (file.type.startsWith('image/')) {
      // Lane B processes original File object immediately (same as S3)
      laneBPromise = processImageDerivativesForVercelBlob(file);
    }

    // 3. Wait for both lanes to complete
    const laneAResult = await Promise.allSettled([laneAPromise]).then(results => results[0]);
    const laneBResult = laneBPromise ? await Promise.allSettled([laneBPromise]).then(results => results[0]) : null;

    // 4. Upload processed assets to Vercel Blob if they exist
    let processedAssetUrls: { display?: { url: string; pathname: string }; thumb?: { url: string; pathname: string } } =
      {};
    if (laneBResult?.status === 'fulfilled' && laneBResult.value) {
      processedAssetUrls = await uploadProcessedAssetsToVercelBlob(
        laneBResult.value,
        file.name,
        isOnboarding,
        existingUserId,
        mode
      );
    }

    // 5. Create memory with all assets using unified completion endpoint
    const memoryResult = await createMemoryWithUnifiedCompletion(
      laneAResult,
      laneBResult?.status === 'fulfilled' ? laneBResult.value : null,
      processedAssetUrls,
      file,
      isOnboarding,
      existingUserId
    );

    // Return the result from memory creation
    return memoryResult;
  } catch (error) {
    throw error;
  }
}

/**
 * Lane A: Upload original file to Vercel Blob
 */
async function uploadOriginalToVercelBlob(
  file: File,
  _isOnboarding: boolean,
  _existingUserId?: string,
  _mode: UploadMode = 'multiple-files',
  onProgress?: (progress: number) => void
): Promise<{ blob: { url: string; pathname: string }; file: File }> {
  const blob = await blobUpload(file.name, file, {
    access: 'public',
    handleUploadUrl: '/api/upload/vercel-blob', // ← Use existing endpoint
    multipart: true,
    onUploadProgress: ev => {
      onProgress?.(ev.percentage);
    },
  });

  return { blob, file };
}

/**
 * Lane B: Process image derivatives for Vercel Blob using pure processing
 */
async function processImageDerivativesForVercelBlob(file: File): Promise<ProcessedBlobs> {
  // Use the same pure processing function as S3
  return await processImageDerivativesPure(file);
}

/**
 * Upload processed assets to Vercel Blob and return their URLs
 */
async function uploadProcessedAssetsToVercelBlob(
  processedBlobs: ProcessedBlobs,
  baseFileName: string,
  isOnboarding: boolean,
  existingUserId?: string,
  mode: UploadMode = 'multiple-files'
): Promise<{
  display?: { url: string; pathname: string };
  thumb?: { url: string; pathname: string };
}> {
  const results: {
    display?: { url: string; pathname: string };
    thumb?: { url: string; pathname: string };
  } = {};

  const uploadPromises: Promise<void>[] = [];

  // Upload display asset
  if (processedBlobs.display) {
    uploadPromises.push(
      uploadAssetToVercelBlob(
        processedBlobs.display,
        `${baseFileName}_display`,
        isOnboarding,
        existingUserId,
        mode
      ).then(result => {
        results.display = result;
      })
    );
  }

  // Upload thumb asset
  if (processedBlobs.thumb) {
    uploadPromises.push(
      uploadAssetToVercelBlob(processedBlobs.thumb, `${baseFileName}_thumb`, isOnboarding, existingUserId, mode).then(
        result => {
          results.thumb = result;
        }
      )
    );
  }

  // Wait for all uploads to complete
  await Promise.all(uploadPromises);

  return results;
}

/**
 * Upload a single processed asset to Vercel Blob
 */
async function uploadAssetToVercelBlob(
  asset: { blob: Blob; width: number; height: number; mimeType: string; bytes: number },
  fileName: string,
  isOnboarding: boolean,
  existingUserId?: string,
  mode: UploadMode = 'multiple-files'
): Promise<{ url: string; pathname: string }> {
  const clientPayloadData = {
    isOnboarding,
    mode,
    filename: fileName,
    existingUserId,
    assetType: 'processed',
  };

  const blob = await blobUpload(fileName, asset.blob, {
    access: 'public',
    handleUploadUrl: '/api/upload/vercel-blob', // Use the main endpoint for processed assets
    multipart: true,
    clientPayload: JSON.stringify(clientPayloadData),
  });

  return {
    url: blob.url,
    pathname: blob.pathname,
  };
}

/**
 * Create memory with all assets using unified completion endpoint
 */
async function createMemoryWithUnifiedCompletion(
  laneAResult: PromiseSettledResult<{ blob: { url: string; pathname: string }; file: File }>,
  laneBResult: ProcessedBlobs | null,
  processedAssetUrls: { display?: { url: string; pathname: string }; thumb?: { url: string; pathname: string } },
  file: File,
  isOnboarding: boolean,
  _existingUserId?: string
): Promise<UploadServiceResult> {
  if (laneAResult.status !== 'fulfilled') {
    throw new Error('Original upload failed');
  }

  const { blob } = laneAResult.value;

  // Memory creation is now handled by the appropriate endpoint

  // Prepare assets array
  const assets: Array<{
    assetType: 'original' | 'display' | 'thumb' | 'placeholder';
    url: string;
    assetLocation: 'vercel_blob' | 'neon';
    storageKey: string;
    bytes: number;
    width?: number;
    height?: number;
    mimeType: string;
    processingStatus: 'completed' | 'failed';
  }> = [
    {
      assetType: 'original',
      url: blob.url,
      assetLocation: 'vercel_blob',
      storageKey: blob.pathname,
      bytes: file.size,
      mimeType: file.type,
      processingStatus: 'completed',
    },
  ];

  // Add processed assets if available
  if (laneBResult) {
    if (laneBResult.display && processedAssetUrls.display) {
      assets.push({
        assetType: 'display',
        url: processedAssetUrls.display.url,
        assetLocation: 'vercel_blob',
        storageKey: processedAssetUrls.display.pathname,
        bytes: laneBResult.display.bytes,
        width: laneBResult.display.width,
        height: laneBResult.display.height,
        mimeType: laneBResult.display.mimeType,
        processingStatus: 'completed',
      });
    }

    if (laneBResult.thumb && processedAssetUrls.thumb) {
      assets.push({
        assetType: 'thumb',
        url: processedAssetUrls.thumb.url,
        assetLocation: 'vercel_blob',
        storageKey: processedAssetUrls.thumb.pathname,
        bytes: laneBResult.thumb.bytes,
        width: laneBResult.thumb.width,
        height: laneBResult.thumb.height,
        mimeType: laneBResult.thumb.mimeType,
        processingStatus: 'completed',
      });
    }

    if (laneBResult.placeholder) {
      assets.push({
        assetType: 'placeholder',
        url: laneBResult.placeholder.dataUrl,
        assetLocation: 'neon', // Placeholder stored in database
        storageKey: 'placeholder',
        bytes: 0,
        width: laneBResult.placeholder.width,
        height: laneBResult.placeholder.height,
        mimeType: 'image/jpeg',
        processingStatus: 'completed',
      });
    }
  }

  // Create memory using appropriate endpoint based on onboarding status
  if (isOnboarding) {
    // For onboarding users, use onboarding-specific endpoint
    const commitResponse = await fetch('/api/upload/complete?onboarding=true', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blobUrl: assets[0]?.url || '', // Use first asset URL for onboarding
        metadata: {
          title: file.name,
          mimeType: file.type,
          size: file.size,
          width: assets[0]?.width,
          height: assets[0]?.height,
        },
      }),
    });

    if (!commitResponse.ok) {
      const error = await commitResponse.json();
      throw new Error(error.error || 'Failed to create onboarding memory');
    }

    const commitResult = await commitResponse.json();

    // Return result in expected format
    return {
      data: { id: commitResult.memoryId },
      results: [
        {
          memoryId: commitResult.memoryId,
          blobId: commitResult.memoryId,
          size: BigInt(file.size),
          checksumSha256: undefined,
          storageBackend: 'vercel_blob' as const,
          storageLocation: assets[0]?.url || '',
          uploadedAt: BigInt(Date.now()),
        },
      ],
      userId: commitResult.tempUserId,
      totalFiles: 1,
      totalSize: file.size,
      processingTime: 0,
      storageBackend: 'vercel_blob' as const,
      databaseBackend: 'neon' as const,
    };
  } else {
    // For authenticated users, use existing complete endpoint
    const completeResponse = await fetch('/api/upload/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memoryId: 'temp-memory-id', // Will be generated by the endpoint
        assets: assets.map(asset => ({
          assetType: asset.assetType,
          assetLocation: asset.assetLocation,
          storageKey: asset.storageKey,
          bytes: asset.bytes,
          width: asset.width,
          height: asset.height,
          mimeType: asset.mimeType,
          processingStatus: asset.processingStatus,
          url: asset.url,
        })),
      }),
    });

    if (!completeResponse.ok) {
      const error = await completeResponse.json();
      throw new Error(error.error || 'Failed to create memory');
    }

    const result = await completeResponse.json();
    return result;
  }
}
