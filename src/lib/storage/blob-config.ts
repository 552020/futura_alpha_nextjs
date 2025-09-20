/**
 * Blob Storage Configuration
 *
 * Centralized configuration for Vercel Blob storage settings
 */

/**
 * Get the blob folder name from environment variables
 * Defaults to "futura" if not specified
 */
export function getBlobFolderName(): string {
  return process.env.BLOB_FOLDER_NAME || 'futura';
}

/**
 * Generate a unique filename with timestamp and folder prefix
 */
export function generateBlobFilename(originalFilename: string, addRandomSuffix = false): string {
  const folderName = getBlobFolderName();
  const timestamp = Date.now();
  const extension = originalFilename.split('.').pop() || '';
  const baseName = originalFilename.replace(/\.[^/.]+$/, '');

  if (addRandomSuffix) {
    const random = Math.random().toString(36).substring(2, 8);
    return `${folderName}/${timestamp}-${baseName}-${random}.${extension}`;
  } else {
    return `${folderName}/${timestamp}-${baseName}.${extension}`;
  }
}

/**
 * Generate filename for processed image assets
 */
export function generateProcessedImageFilename(
  originalFilename: string,
  variant: 'original' | 'display' | 'thumb'
): string {
  const folderName = getBlobFolderName();
  const timestamp = Date.now();
  const baseName = originalFilename.replace(/\.[^/.]+$/, '');

  switch (variant) {
    case 'original':
      return `${folderName}/${timestamp}-${baseName}.webp`;
    case 'display':
      return `${folderName}/${timestamp}-${baseName}_display.webp`;
    case 'thumb':
      return `${folderName}/${timestamp}-${baseName}_thumb.webp`;
    default:
      throw new Error(`Unknown variant: ${variant}`);
  }
}
