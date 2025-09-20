import { UploadResponse } from '../services/upload';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

interface ChunkedUploadOptions {
  isOnboarding: boolean;
  existingUserId?: string;
  mode?: 'files' | 'folder';
  storageBackend?: string | string[];
  userStoragePreference?: 'neon' | 'icp' | 'dual' | 's3';
}

/**
 * Upload a file in chunks
 */
export async function uploadInChunks(
  file: File,
  options: ChunkedUploadOptions,
  onProgress?: (progress: number) => void
): Promise<UploadResponse> {
  const {
    isOnboarding,
    existingUserId,
    mode = 'files',
    storageBackend = 'vercel_blob',
    userStoragePreference
  } = options;

  // First, get an upload URL from the server
  const initResponse = await fetch('/api/upload/init', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filename: file.name,
      fileSize: file.size,
      mimeType: file.type,
      isOnboarding,
      existingUserId,
      mode,
      storageBackend,
      userStoragePreference,
    }),
  });

  if (!initResponse.ok) {
    const error = await initResponse.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to initialize upload');
  }

  const { uploadId, chunkSize = CHUNK_SIZE } = await initResponse.json();
  const totalChunks = Math.ceil(file.size / chunkSize);
  const chunkPromises: Promise<void>[] = [];

  // Upload each chunk
  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * chunkSize;
    const end = Math.min(file.size, start + chunkSize);
    const chunk = file.slice(start, end);

    const formData = new FormData();
    formData.append('file', chunk);
    formData.append('uploadId', uploadId);
    formData.append('chunkIndex', chunkIndex.toString());
    formData.append('totalChunks', totalChunks.toString());
    formData.append('filename', file.name);

    const uploadPromise = fetch('/api/upload/chunk', {
      method: 'POST',
      body: formData,
    }).then(response => {
      if (!response.ok) {
        throw new Error('Chunk upload failed');
      }
      
      // Update progress
      if (onProgress) {
        const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
        onProgress(progress);
      }
    });

    chunkPromises.push(uploadPromise);
  }

  // Wait for all chunks to upload
  await Promise.all(chunkPromises);

  // Complete the upload
  const completeResponse = await fetch('/api/upload/complete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uploadId,
      filename: file.name,
      fileSize: file.size,
      mimeType: file.type,
    }),
  });

  if (!completeResponse.ok) {
    const error = await completeResponse.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to complete upload');
  }

  return completeResponse.json();
}
