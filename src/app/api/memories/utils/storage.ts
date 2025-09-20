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

export async function uploadFileToStorage(file: File, existingBuffer?: Buffer, storageBackend: string = 'vercel_blob'): Promise<string> {
  if (storageBackend === 's3') {
    console.log('☁️ Using S3 storage backend for file:', file.name);
    
    try {
      // Use the existing S3 utility function
      const buffer = existingBuffer || Buffer.from(await file.arrayBuffer());
      const url = await uploadToS3(new File([buffer], file.name, { type: file.type }));
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
  uploadFileToStorage: (file: File, buffer?: Buffer, storageBackend?: string) => Promise<string>,
  storageBackend: string = 'vercel_blob'
): Promise<{ url: string; error: string | null }> {
  let url;
  try {
    console.log(`📤 Starting ${storageBackend} file upload for: ${file.name}`);
    url = await uploadFileToStorage(file, buffer, storageBackend);
    console.log(`✅ File uploaded successfully to ${storageBackend}:`, url);
    return { url, error: null };
  } catch (uploadError) {
    console.error(`❌ ${storageBackend} upload error:`, uploadError);
    return {
      url: '',
      error: uploadError instanceof Error ? uploadError.message : String(uploadError),
    };
  }
}
