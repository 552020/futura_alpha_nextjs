import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { fatLogger } from '@/lib/logger';

const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

/**
 * Generate a presigned URL directly using AWS SDK (SERVER-SIDE ONLY)
 * @param key - The S3 object key
 * @param bucket - The S3 bucket name (optional, will use env var if not provided)
 * @param region - The S3 region (optional, will use env var if not provided)
 * @returns Promise<string> - The presigned URL
 */
export async function generatePresignedUrlDirect(key: string, bucket?: string, region?: string): Promise<string> {
  const bucketName = bucket || process.env.AWS_S3_BUCKET || 'futura0';
  const regionName = region || process.env.AWS_S3_REGION || 'eu-central-1';

  fatLogger.info('Generating presigned URL directly with AWS SDK', 'be', {
    key,
    bucket: bucketName,
    region: regionName,
  });

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  fatLogger.info('Generated presigned URL directly', 'be', {
    urlLength: url.length,
    urlPreview: url.substring(0, 100) + '...',
  });
  return url;
}

/**
 * Generate a presigned URL for an S3 object (SERVER-SIDE ONLY)
 * @param key - The S3 object key
 * @returns Promise<string> - The presigned URL
 */
export async function generatePresignedUrl(key: string): Promise<string> {
  fatLogger.info('Requesting presigned URL for key', 'be', { key });

  // Use direct AWS SDK method instead of server-side fetch
  return await generatePresignedUrlDirect(key);
}

/**
 * Generate a presigned URL for an S3 object from a full S3 URL
 * @param s3Url - The full S3 URL (e.g., https://bucket.s3.region.amazonaws.com/key)
 * @returns Promise<string> - The presigned URL, or original URL if not S3
 */
export async function generatePresignedUrlFromS3Url(s3Url: string): Promise<string> {
  if (!s3Url || !s3Url.includes('s3.amazonaws.com')) {
    return s3Url;
  }

  try {
    // Extract S3 key from URL
    const urlParts = s3Url.split('.amazonaws.com/');
    if (urlParts.length === 2) {
      const s3Key = urlParts[1];
      fatLogger.info(`Generating presigned URL for S3 key: ${s3Key}`, 'be');

      const presignedUrl = await generatePresignedUrl(s3Key);
      fatLogger.info('Generated presigned URL from S3 URL', 'be');
      return presignedUrl;
    }
  } catch (error) {
    fatLogger.error('Failed to generate presigned URL from S3 URL', 'be', { error, s3Url });
  }

  // Return original URL if presigned URL generation fails
  return s3Url;
}

/**
 * Generate a presigned URL for an S3 object from storage key and bucket info
 * @param storageKey - The S3 storage key
 * @param bucket - The S3 bucket name (optional, will use env var if not provided)
 * @param region - The S3 region (optional, will use env var if not provided)
 * @returns Promise<string> - The presigned URL, or constructed direct URL as fallback
 */
export async function generatePresignedUrlFromStorageKey(
  storageKey: string,
  bucket?: string,
  region?: string
): Promise<string> {
  if (!storageKey) {
    throw new Error('Storage key is required');
  }

  // Check if we're in a browser environment (frontend)
  const isBrowser = typeof window !== 'undefined';

  if (isBrowser) {
    fatLogger.info('Browser environment detected, using API call', 'fe', { storageKey });
    // In browser, call the API endpoint directly
    try {
      const response = await fetch('/api/upload/s3/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key: storageKey }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      fatLogger.info('Successfully got presigned URL from API', 'fe', {
        urlLength: data.url?.length || 0,
        urlPreview: data.url ? data.url.substring(0, 100) + '...' : 'No URL',
      });

      return data.url;
    } catch (error) {
      fatLogger.error('Failed to get presigned URL from API', 'fe', {
        error: error instanceof Error ? error.message : String(error),
        storageKey,
      });
      throw error;
    }
  }

  // Server-side: Use the existing logic
  fatLogger.info('Server environment detected, using direct AWS SDK', 'be', { storageKey });

  fatLogger.info('generatePresignedUrlFromStorageKey called', 'be', {
    storageKey,
    bucket,
    region,
    envBucket: process.env.NEXT_PUBLIC_AWS_S3_BUCKET || process.env.AWS_S3_BUCKET,
    envRegion: process.env.NEXT_PUBLIC_AWS_S3_REGION,
    nodeEnv: process.env.NODE_ENV,
  });

  // In production, prefer direct AWS SDK method (similar to II fix)
  // In development, try server-side fetch first for easier debugging
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    fatLogger.info('Production mode: Using direct AWS SDK method first', 'be', { storageKey });
    try {
      const directPresignedUrl = await generatePresignedUrlDirect(storageKey, bucket, region);
      fatLogger.info('Production mode: Direct AWS SDK method succeeded', 'be', {
        urlLength: directPresignedUrl.length,
        urlPreview: directPresignedUrl.substring(0, 100) + '...',
      });
      return directPresignedUrl;
    } catch (directError) {
      fatLogger.error('Production mode: Direct AWS SDK method failed, trying server-side fetch', 'be', {
        error: directError instanceof Error ? directError.message : String(directError),
        storageKey,
      });
      // Fall through to server-side fetch
    }
  }

  // Development mode: try server-side fetch first for easier debugging
  fatLogger.info('Development mode: Attempting server-side fetch method first', 'be', { storageKey });
  try {
    const presignedUrl = await generatePresignedUrl(storageKey);
    fatLogger.info('Development mode: Server-side fetch succeeded', 'be', {
      urlLength: presignedUrl.length,
      urlPreview: presignedUrl.substring(0, 100) + '...',
    });
    return presignedUrl;
  } catch (serverError) {
    fatLogger.error('Development mode: Server-side fetch failed, trying direct AWS SDK', 'be', {
      error: serverError instanceof Error ? serverError.message : String(serverError),
      storageKey,
    });
    // Fall through to direct AWS SDK method
  }

  // Final fallback: try direct AWS SDK method
  try {
    const directPresignedUrl = await generatePresignedUrlDirect(storageKey, bucket, region);
    fatLogger.info('Final fallback: Direct AWS SDK method succeeded', 'be', {
      urlLength: directPresignedUrl.length,
      urlPreview: directPresignedUrl.substring(0, 100) + '...',
    });
    return directPresignedUrl;
  } catch (directError) {
    fatLogger.error('All methods failed, falling back to direct URL', 'be', {
      error: directError instanceof Error ? directError.message : String(directError),
      storageKey,
    });
    // Fallback to original URL if presigned URL generation fails
    const bucketName = bucket || process.env.NEXT_PUBLIC_AWS_S3_BUCKET || process.env.AWS_S3_BUCKET || 'futura0';
    const regionName = region || process.env.NEXT_PUBLIC_AWS_S3_REGION || process.env.AWS_S3_REGION || 'eu-central-1';
    const s3Url = `https://${bucketName}.s3.${regionName}.amazonaws.com/${storageKey}`;
    fatLogger.info('Using direct S3 URL as fallback', 'be', { s3Url });
    return s3Url;
  }
}

/**
 * Generate the best available asset URL for a given asset
 * @param asset - The asset object with storage information
 * @returns Promise<string> - The best available URL (presigned if possible, direct as fallback)
 */
export async function generateBestAssetUrl(asset: {
  url?: string;
  storageKey?: string;
  bucket?: string | null;
}): Promise<string> {
  // If we already have a URL, use it
  if (asset.url) {
    return asset.url;
  }

  // If we have a storage key, generate a presigned URL
  if (asset.storageKey) {
    try {
      const presignedUrl = await generatePresignedUrlFromStorageKey(asset.storageKey, asset.bucket || undefined);
      return presignedUrl;
    } catch (error) {
      fatLogger.error('Failed to generate presigned URL for asset', 'be', {
        error: error instanceof Error ? error.message : String(error),
        storageKey: asset.storageKey,
        bucket: asset.bucket,
      });
      // Fall through to direct URL construction
    }
  }

  // Fallback to direct URL construction
  const bucketName = asset.bucket || process.env.NEXT_PUBLIC_AWS_S3_BUCKET || process.env.AWS_S3_BUCKET || 'futura0';
  const regionName = process.env.NEXT_PUBLIC_AWS_S3_REGION || process.env.AWS_S3_REGION || 'eu-central-1';
  const directUrl = `https://${bucketName}.s3.${regionName}.amazonaws.com/${asset.storageKey}`;

  fatLogger.info('Using direct URL as fallback', 'be', { directUrl });
  return directUrl;
}
