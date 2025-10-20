/**
 * Shared utilities for upload services
 *
 * Contains common functions used by both single-file and multiple-files processors
 * to avoid code duplication.
 */

/**
 * Generic file upload with progress tracking using XMLHttpRequest
 *
 * This function works with any storage service that provides presigned URLs,
 * not just S3. It makes a standard HTTP PUT request to the provided URL.
 *
 * NOTE: Vercel Blob does NOT use this function. Vercel Blob doesn't support
 * presigned URLs - it uses its own blobUpload() function with onUploadProgress
 * callback instead. Vercel Blob doesn't allow direct XMLHttpRequest PUT requests.
 *
 * Used by:
 * - uploadToS3() in single-file-processor.ts (S3 presigned URLs)
 * - uploadMultipleToS3() in multiple-files-processor.ts (S3 batch presigned URLs)
 * - Could be used by Google Cloud Storage (signed URLs)
 * - Could be used by Cloudinary (signed upload URLs)
 * - Could be used by Azure Blob Storage (signed URLs)
 *
 * NOT used by:
 * - uploadToVercelBlob() - Uses blobUpload() with onUploadProgress instead
 * - uploadMultipleToVercelBlob() - Uses FormData to /api/memories endpoint
 * - Arweave uploads - Uses different protocol, no presigned URLs
 *
 * @param file - The file to upload
 * @param url - Presigned URL from any storage service
 * @param onProgress - Progress callback (0-100)
 * @returns Promise<File> - The uploaded file
 */
export async function uploadFileWithProgress(
  file: File,
  url: string,
  onProgress: (progress: number) => void
): Promise<File> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);
    xhr.setRequestHeader('Content-Type', file.type);

    xhr.upload.onprogress = event => {
      if (event.lengthComputable) {
        const progress = (event.loaded / event.total) * 100;
        onProgress(progress);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve(file);
      } else {
        reject(new Error(`Upload failed with status: ${xhr.status}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Upload failed due to a network error'));
    };

    xhr.send(file);
  });
}

// Re-export unified types for backward compatibility
export type { UploadServiceResult } from './types';

// 413 Solution: Check ICP authentication using functional approach
export async function checkICPAuthentication(): Promise<void> {
  const { getAuthClient } = await import('@/ic/ii');
  const authClient = await getAuthClient();
  const isAuthenticated = await authClient.isAuthenticated();
  if (!isAuthenticated) {
    throw new Error('Please connect your Internet Identity to upload to ICP');
  }
}

// 413 Solution: Extract folder name from files
export function extractFolderName(file: File): string {
  const fileWithPath = file as File & { webkitRelativePath?: string };
  fatLogger.info('DEBUG: extractFolderName for file', 'be', {
    name: file.name,
    webkitRelativePath: fileWithPath.webkitRelativePath,
    hasWebkitRelativePath: !!fileWithPath.webkitRelativePath,
  });

  if (fileWithPath.webkitRelativePath) {
    const pathParts = fileWithPath.webkitRelativePath.split('/');
    const folderName = pathParts.length > 1 ? pathParts[0] : 'Ungrouped';
    fatLogger.info('DEBUG: Extracted folder name from webkitRelativePath', 'be', { folderName });
    return folderName;
  }

  fatLogger.info("DEBUG: No webkitRelativePath, returning 'Ungrouped'", 'be');
  return 'Ungrouped';
}

/**
 * Create folder for directory mode uploads
 *
 * This function creates a folder in the database when uploading in directory mode.
 * It extracts the folder name from the first file and creates a folder record.
 *
 * Used by:
 * - uploadMultipleToS3WithProcessing() in s3-with-processing.ts
 * - uploadMultipleToICPWithProcessing() in icp-with-processing.ts
 * - Any other upload service that supports folder organization
 *
 * @param mode - Upload mode: 'directory' or 'multiple-files'
 * @param files - Array of files being uploaded
 * @returns Promise<string | undefined> - Folder ID if created, undefined if not needed
 */
export async function createFolderIfNeeded(
  mode: 'directory' | 'multiple-files',
  files: File[]
): Promise<string | undefined> {
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
 * Generate S3 public URL from S3 key
 *
 * SECURITY NOTE: It's safe to expose NEXT_PUBLIC_AWS_S3_BUCKET and
 * NEXT_PUBLIC_AWS_S3_REGION in the frontend because:
 * - S3 bucket names and regions are publicly visible information
 * - They don't contain sensitive credentials or API keys
 * - They're only used to construct public URLs, not for authentication
 * - The actual security comes from presigned URLs generated server-side
 *
 * What would be UNSAFE: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, etc.
 *
 * @param s3Key - The S3 object key
 * @returns Public S3 URL
 */
export function generateS3PublicUrl(s3Key: string): string {
  const bucket = process.env.NEXT_PUBLIC_AWS_S3_BUCKET;
  const region = process.env.NEXT_PUBLIC_AWS_S3_REGION || 'eu-central-1';
  return `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`;
}

// Common error handling for upload services
export function handleUploadError(
  error: unknown,
  showToast: (toast: { variant: 'destructive'; title: string; description: string }) => void
): void {
  let title = 'Upload failed';
  let description = 'Please try again.';

  if (error instanceof Error) {
    if (error.message.includes('File too large')) {
      title = 'File too large';
      description = error.message;
    } else if (error.message.includes('intent')) {
      title = 'Upload not ready';
      description = error.message;
    } else if (error.message.includes('authentication')) {
      title = 'Authentication required';
      description = error.message;
    } else {
      description = error.message;
    }
  }

  fatLogger.error('Upload error', 'fe', { error });
  showToast({ variant: 'destructive', title, description });
}

/**
 * Shared validation function for upload processors
 *
 * Validates file size, file count, and total size limits based on the hosting platform.
 * Shows appropriate toast messages for validation failures.
 *
 * @param files - Array of files to validate
 * @param showToast - Toast function to show error messages
 * @param uploadLimits - Upload limits object (S3 or ICP specific)
 * @returns true if validation passes, false if validation fails
 */
import {
  UPLOAD_LIMITS_S3,
  UPLOAD_LIMITS_ICP,
  UPLOAD_LIMITS_VERCEL_BLOB,
  UPLOAD_LIMITS_ARWEAVE,
  UPLOAD_LIMITS_IPFS,
} from '@/config/upload-limits';

import { fatLogger } from '@/lib/logger';

// Type for upload limits that support file count and total size validation
type UploadLimitsWithCountAndTotal = {
  isFileCountValid: (count: number) => boolean;
  isFileSizeValid: (size: number) => boolean;
  isTotalSizeValid: (size: number) => boolean;
  getFileCountErrorMessage: (count: number) => string;
  getFileSizeErrorMessage: (size: number) => string;
  getTotalSizeErrorMessage: (size: number) => string;
};

export function validateUploadFiles(
  files: File[],
  showToast: (toast: { variant: 'destructive'; title: string; description: string }) => void,
  uploadLimits: UploadLimitsWithCountAndTotal = UPLOAD_LIMITS_S3
): boolean {
  // Validate file count limit
  if (!uploadLimits.isFileCountValid(files.length)) {
    showToast({
      variant: 'destructive',
      title: 'Too many files',
      description: uploadLimits.getFileCountErrorMessage(files.length),
    });
    return false;
  }

  // Validate individual file sizes
  for (const file of files) {
    if (!uploadLimits.isFileSizeValid(file.size)) {
      showToast({
        variant: 'destructive',
        title: 'File too large',
        description: uploadLimits.getFileSizeErrorMessage(file.size),
      });
      return false;
    }
  }

  // Validate total size limit
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  if (!uploadLimits.isTotalSizeValid(totalSize)) {
    showToast({
      variant: 'destructive',
      title: 'Upload too large',
      description: uploadLimits.getTotalSizeErrorMessage(totalSize),
    });
    return false;
  }

  return true;
}

/**
 * Validate upload files for S3 (default behavior)
 */
export function validateUploadFilesS3(
  files: File[],
  showToast: (toast: { variant: 'destructive'; title: string; description: string }) => void
): boolean {
  return validateUploadFiles(files, showToast, UPLOAD_LIMITS_S3);
}

/**
 * Validate upload files for ICP (chunked upload with different limits)
 */
export function validateUploadFilesICP(
  files: File[],
  showToast: (toast: { variant: 'destructive'; title: string; description: string }) => void
): boolean {
  // ICP doesn't have file count or total size limits in the same way as S3
  // It uses chunking, so we only validate individual file sizes
  for (const file of files) {
    if (!UPLOAD_LIMITS_ICP.isFileSizeValid(file.size)) {
      showToast({
        variant: 'destructive',
        title: 'File too large',
        description: UPLOAD_LIMITS_ICP.getFileSizeErrorMessage(file.size),
      });
      return false;
    }
  }

  return true;
}

/**
 * Validate upload files for Vercel Blob
 */
export function validateUploadFilesVercelBlob(
  files: File[],
  showToast: (toast: { variant: 'destructive'; title: string; description: string }) => void
): boolean {
  return validateUploadFiles(files, showToast, UPLOAD_LIMITS_VERCEL_BLOB);
}

/**
 * Validate upload files for Arweave
 */
export function validateUploadFilesArweave(
  files: File[],
  showToast: (toast: { variant: 'destructive'; title: string; description: string }) => void
): boolean {
  return validateUploadFiles(files, showToast, UPLOAD_LIMITS_ARWEAVE);
}

/**
 * Validate upload files for IPFS
 */
export function validateUploadFilesIPFS(
  files: File[],
  showToast: (toast: { variant: 'destructive'; title: string; description: string }) => void
): boolean {
  return validateUploadFiles(files, showToast, UPLOAD_LIMITS_IPFS);
}

/**
 * Get upload limits for a specific blob hosting service
 */
export function getUploadLimitsForBlobService(blobService: string) {
  switch (blobService) {
    case 's3':
      return UPLOAD_LIMITS_S3;
    case 'icp':
      return UPLOAD_LIMITS_ICP;
    case 'vercel-blob':
      return UPLOAD_LIMITS_VERCEL_BLOB;
    case 'arweave':
      return UPLOAD_LIMITS_ARWEAVE;
    case 'ipfs':
      return UPLOAD_LIMITS_IPFS;
    default:
      return UPLOAD_LIMITS_S3; // Default to S3
  }
}

/**
 * @deprecated Use getUploadLimitsForBlobService instead
 */
export function getUploadLimitsForPlatform(platform: string) {
  return getUploadLimitsForBlobService(platform);
}
