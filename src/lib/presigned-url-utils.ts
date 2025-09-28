/**
 * PRESIGNED URL UTILITIES
 *
 * Shared utilities for generating presigned URLs for S3 objects.
 * Used by both gallery API and single image view to avoid code duplication.
 */

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { logger } from '@/lib/logger';
/**
 * Generate a presigned URL directly using AWS SDK (more reliable than server-side fetch)
 * @param key - The S3 object key
 * @param bucket - The S3 bucket name (optional, will use env var if not provided)
 * @param region - The S3 region (optional, will use env var if not provided)
 * @returns Promise<string> - The presigned URL
 */
export async function generatePresignedUrlDirect(key: string, bucket?: string, region?: string): Promise<string> {
  logger.info('🔑 generatePresignedUrlDirect called with:', {
    key,
    bucket,
    region,
    hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
    hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
  });

  const bucketName = bucket || process.env.AWS_S3_BUCKET || 'futura0';
  const regionName = region || process.env.AWS_S3_REGION || 'eu-central-1';

  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('AWS credentials not configured');
  }

  const s3Client = new S3Client({
    region: regionName,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  logger.info('✅ Generated presigned URL directly:', { url: url.substring(0, 100) + '...' });
  return url;
}

/**
 * Generate a presigned URL for an S3 object
 * @param key - The S3 object key
 * @returns Promise<string> - The presigned URL
 */
export async function generatePresignedUrl(key: string): Promise<string> {
  logger.info('🔑 Requesting presigned URL for key:', { key });
  try {
    // Use absolute URL for server-side fetch
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';
    const apiUrl = `${baseUrl}/api/upload/s3/download`;
    logger.info('🌐 Using API URL:', { apiUrl });
    logger.info('🌐 Environment check:', {
      hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
      hasVercelUrl: !!process.env.VERCEL_URL,
      baseUrl,
    });

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ key }),
    });

    logger.s3().info('📡 Presigned URL response status:', { status: response.status });
    logger.s3().info('📡 Presigned URL response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('❌ Failed to generate presigned URL:', undefined, {
        status: response.status,
        statusText: response.statusText,
        errorText,
        apiUrl,
      });
      throw new Error(`Failed to generate presigned URL: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    logger.s3().info('✅ Received presigned URL response:', {
      hasUrl: !!data.url,
      urlLength: data.url?.length || 0,
      urlPreview: data.url ? data.url.substring(0, 100) + '...' : 'No URL',
    });

    if (!data.url) {
      throw new Error('No URL returned from presigned URL endpoint');
    }

    return data.url;
  } catch (error) {
    logger.error('Error in generatePresignedUrl', undefined, { data: error as Error });
    throw error;
  }
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
      logger.info(`🔑 Generating presigned URL for S3 key: ${s3Key}`);

      const presignedUrl = await generatePresignedUrl(s3Key);
      logger.info(`✅ Generated presigned URL from S3 URL`);
      return presignedUrl;
    }
  } catch (error) {
    logger.error('Error generating presigned URL from S3 URL', undefined, { data: error as Error });
  }

  // Fallback to original URL if presigned URL generation fails
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

  logger.info('🔑 generatePresignedUrlFromStorageKey called with:', {
    storageKey,
    bucket,
    region,
    envBucket: process.env.NEXT_PUBLIC_AWS_S3_BUCKET || process.env.AWS_S3_BUCKET,
    envRegion: process.env.NEXT_PUBLIC_AWS_S3_REGION,
  });

  try {
    logger.info('🔑 Attempting to get presigned URL for:', { storageKey });
    const presignedUrl = await generatePresignedUrl(storageKey);
    logger.s3().info('✅ Successfully generated presigned URL:', { presignedUrl });
    return presignedUrl;
  } catch (error) {
    logger.warn('⚠️ Server-side fetch failed, trying direct AWS SDK method:', {
      storageKey,
      error: error instanceof Error ? error.message : String(error),
    });

    try {
      // Try direct AWS SDK method as fallback
      const directPresignedUrl = await generatePresignedUrlDirect(storageKey, bucket, region);
      logger.info('✅ Successfully generated presigned URL using direct method');
      return directPresignedUrl;
    } catch (directError) {
      logger.error('❌ Both presigned URL methods failed:', undefined, {
        serverError: error instanceof Error ? error.message : String(error),
        directError: directError instanceof Error ? directError.message : String(directError),
      });

      // Final fallback to direct URL (will likely fail for private buckets)
      const bucketName = bucket || process.env.NEXT_PUBLIC_AWS_S3_BUCKET || process.env.AWS_S3_BUCKET || 'futura0';
      const regionName = region || process.env.NEXT_PUBLIC_AWS_S3_REGION || 'eu-central-1';
      const directUrl = `https://${bucketName}.s3.${regionName}.amazonaws.com/${storageKey}`;

      logger.info('🔄 Using direct URL as final fallback:', { directUrl });
      logger.info('⚠️ WARNING: Direct S3 URLs may not work for private buckets. All presigning methods failed.');
      return directUrl;
    }
  }
}

/**
 * Generate the best URL for an asset based on its storage backend
 * @param asset - The asset object with url, assetLocation, storageKey, bucket
 * @returns Promise<string> - The best available URL (presigned for S3, direct for others)
 */
export async function generateBestAssetUrl(asset: {
  url: string;
  assetLocation?: string;
  storageKey?: string;
  bucket?: string | null;
}): Promise<string> {
  logger.info('🔍 generateBestAssetUrl called with:', {
    url: asset.url,
    assetLocation: asset.assetLocation,
    storageKey: asset.storageKey,
    bucket: asset.bucket,
  });

  // For S3 assets, try to presign using storageKey
  if (asset.assetLocation === 's3' && asset.storageKey) {
    try {
      logger.info('🔑 Attempting to presign S3 URL for storageKey:', { storageKey: asset.storageKey });
      const presignedUrl = await generatePresignedUrlFromStorageKey(asset.storageKey, asset.bucket || undefined);
      logger.s3().info('✅ Successfully generated presigned URL:', { presignedUrl });
      return presignedUrl;
    } catch (error) {
      logger.warn('Failed to presign S3 URL, using direct URL', {
        error: error instanceof Error ? error.message : String(error),
      });
      logger.info('🔄 Falling back to direct URL:', { url: asset.url });
      return asset.url;
    }
  }

  // For other backends (vercel_blob, icp, etc.), use the stored URL directly
  logger.info('🌐 Using direct URL for non-S3 asset:', { url: asset.url });
  return asset.url;
}
