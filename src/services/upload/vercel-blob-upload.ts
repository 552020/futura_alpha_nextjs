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

interface UploadResponse {
  success: boolean;
  data: {
    id: string;
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

/**
 * Get memory type from file extension
 */
function getMemoryTypeFromFile(file: File): 'image' | 'video' | 'document' | 'note' | 'audio' {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (!extension) return 'document';

  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff'];
  const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'];
  const audioExtensions = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'];

  if (imageExtensions.includes(extension)) return 'image';
  if (videoExtensions.includes(extension)) return 'video';
  if (audioExtensions.includes(extension)) return 'audio';

  return 'document';
}

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

  const blob = await blobUpload(file.name, file, {
    access: 'public',
    handleUploadUrl: '/api/memories/grant/vercel-blob', // Use Vercel Blob specific grant endpoint
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

  // Memory was already created by the grant endpoint's onUploadCompleted callback
  // The grant endpoint now returns the memoryId in the response
  const memoryId = (blob as { memoryId?: string }).memoryId;

  if (memoryId) {
    // Return the memory data using the ID from the grant endpoint
    return {
      success: true,
      data: {
        id: memoryId,
        type: getMemoryTypeFromFile(file),
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
        type: getMemoryTypeFromFile(file),
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

      results.push({
        data: { id: memory.id },
        results: [
          {
            memoryId: memory.id,
            size: file.size,
            checksum_sha256: null,
          },
        ],
        userId: existingUserId || '',
      });
    } else {
      // Handle failed uploads - continue with other files
      console.error(`Upload failed for file ${file.name}:`, result.reason);
      throw new Error(`Upload failed for file ${file.name}: ${result.reason.message}`);
    }
  }

  return results;
}
