/**
 * STORAGE UTILITIES
 *
 * This module handles file uploads to external storage services.
 * Currently supports Vercel Blob storage.
 *
 * USAGE:
 * - Upload files to Vercel Blob
 * - Handle upload errors gracefully
 * - Manage file storage operations
 */

import { put } from '@vercel/blob';
import { generateBlobFilename } from '@/lib/storage/blob-config';
import { uploadToS3 } from '@/lib/s3';

export async function uploadFileToStorage(
  file: File,
  existingBuffer?: Buffer,
  storageBackend: string = 'vercel_blob',
  userId?: string
): Promise<string> {
  if (storageBackend === 's3') {
    console.log('☁️ Using S3 storage backend for file:', file.name);

    try {
      // Use the existing S3 utility function
      const buffer = existingBuffer || Buffer.from(await file.arrayBuffer());

      // Create a clean file name without path for S3
      const cleanFileName = file.name.split('/').pop() || file.name;
      const s3File = new File([new Uint8Array(buffer)], cleanFileName, { type: file.type });

      // Upload to S3 with the clean file name and user ID
      const url = await uploadToS3(s3File, undefined, userId);
      console.log('✅ Successfully uploaded to S3:', url);
      return url;
    } catch (error) {
      console.error('❌ S3 upload error:', error);
      throw new Error(`S3 upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Default to Vercel Blob for other cases
  console.log('☁️ Using Vercel Blob storage for file:', file.name);
  try {
    const safeFileName = file.name.replace(/[^a-zA-Z0-9-_\.]/g, '_');
    const buffer = existingBuffer || Buffer.from(await file.arrayBuffer());
    const { url } = await put(generateBlobFilename(safeFileName), buffer, {
      access: 'public',
      contentType: file.type,
    });
    return url;
  } catch (error) {
    console.error('❌ Vercel Blob upload error:', error);
    throw new Error(`Vercel Blob upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Upload file to storage with error handling
 * Returns URL or error response
 */
export async function uploadFileToStorageWithErrorHandling(
  file: File,
  buffer: Buffer,
  uploadFn: typeof uploadFileToStorage,
  storageBackend: string = 'vercel_blob',
  userId?: string
): Promise<{ url: string; error: null } | { url: null; error: string }> {
  try {
    console.log(`📤 Starting ${storageBackend} file upload for: ${file.name}`);
    const url = await uploadFn(file, buffer, storageBackend, userId);
    console.log(`✅ File uploaded successfully to ${storageBackend}:`, url);
    return { url, error: null };
  } catch (uploadError) {
    console.error(`❌ ${storageBackend} upload error:`, uploadError);
    return {
      url: null,
      error: uploadError instanceof Error ? uploadError.message : String(uploadError),
    };
  }
}
