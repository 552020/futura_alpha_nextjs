/**
 * S3 Storage Utilities
 *
 * Pure utility functions for S3-related operations.
 * No direct database operations - these are framework-agnostic utilities.
 */

/**
 * Extract S3 key from a full S3 URL
 *
 * @param url - Full S3 URL or just the key
 * @returns S3 key (path within bucket)
 *
 * @example
 * extractS3KeyFromUrl('https://bucket.s3.region.amazonaws.com/path/to/file.jpg')
 * // Returns: 'path/to/file.jpg'
 *
 * @example
 * extractS3KeyFromUrl('path/to/file.jpg')
 * // Returns: 'path/to/file.jpg'
 */
export function extractS3KeyFromUrl(url: string): string {
  if (!url) return '';

  const s3Domain = '.s3.amazonaws.com/';
  const s3UrlIndex = url.indexOf(s3Domain);

  if (s3UrlIndex > -1) {
    return url.substring(s3UrlIndex + s3Domain.length).split('?')[0];
  }

  // If it's already just a key, return as-is
  return url;
}

/**
 * Build S3 storage key from URL based on asset location
 *
 * @param url - Asset URL
 * @param assetLocation - Where the asset is stored ('s3' | 'vercel_blob' | etc.)
 * @returns Storage key for the asset
 */
export function buildStorageKey(
  url: string,
  assetLocation: 's3' | 'vercel_blob' | 'icp' | 'arweave' | 'ipfs' | 'neon'
): string {
  if (assetLocation === 's3') {
    return url.replace(
      `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_S3_REGION || 'eu-central-1'}.amazonaws.com/`,
      ''
    );
  }

  // For other storage types, use the filename
  return url.split('/').pop() || '';
}
