/**
 * PRESIGNED URL UTILITIES
 *
 * Shared utilities for generating presigned URLs for S3 objects.
 * Used by both gallery API and single image view to avoid code duplication.
 */

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Generate a presigned URL directly using AWS SDK (more reliable than server-side fetch)
 * @param key - The S3 object key
 * @param bucket - The S3 bucket name (optional, will use env var if not provided)
 * @param region - The S3 region (optional, will use env var if not provided)
 * @returns Promise<string> - The presigned URL
 */
export async function generatePresignedUrlDirect(
  key: string,
  bucket?: string,
  region?: string
): Promise<string> {
  console.log('🔑 generatePresignedUrlDirect called with:', {
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
  console.log('✅ Generated presigned URL directly:', url.substring(0, 100) + '...');
  return url;
}

/**
 * Generate a presigned URL for an S3 object
 * @param key - The S3 object key
 * @returns Promise<string> - The presigned URL
 */
export async function generatePresignedUrl(key: string): Promise<string> {
  console.log('🔑 Requesting presigned URL for key:', key);
  try {
    // Use absolute URL for server-side fetch
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';
    const apiUrl = `${baseUrl}/api/s3/presigned-url`;
    console.log('🌐 Using API URL:', apiUrl);
    console.log('🌐 Environment check:', {
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

    console.log('📡 Presigned URL response status:', response.status);
    console.log('📡 Presigned URL response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to generate presigned URL:', {
        status: response.status,
        statusText: response.statusText,
        errorText,
        apiUrl,
      });
      throw new Error(`Failed to generate presigned URL: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Received presigned URL response:', {
      hasUrl: !!data.url,
      urlLength: data.url?.length || 0,
      urlPreview: data.url ? data.url.substring(0, 100) + '...' : 'No URL',
    });

    if (!data.url) {
      throw new Error('No URL returned from presigned URL endpoint');
    }

    return data.url;
  } catch (error) {
    console.error('❌ Error in generatePresignedUrl:', error);
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
      console.log(`🔑 Generating presigned URL for S3 key: ${s3Key}`);

      const presignedUrl = await generatePresignedUrl(s3Key);
      console.log(`✅ Generated presigned URL from S3 URL`);
      return presignedUrl;
    }
  } catch (error) {
    console.error(`❌ Error generating presigned URL from S3 URL:`, error);
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

  console.log('🔑 generatePresignedUrlFromStorageKey called with:', {
    storageKey,
    bucket,
    region,
    envBucket: process.env.NEXT_PUBLIC_AWS_S3_BUCKET || process.env.AWS_S3_BUCKET,
    envRegion: process.env.NEXT_PUBLIC_AWS_S3_REGION,
  });

  try {
    console.log('🔑 Attempting to get presigned URL for:', storageKey);
    const presignedUrl = await generatePresignedUrl(storageKey);
    console.log('✅ Successfully generated presigned URL:', presignedUrl);
    return presignedUrl;
  } catch (error) {
    console.warn('⚠️ Server-side fetch failed, trying direct AWS SDK method:', {
      storageKey,
      error: error instanceof Error ? error.message : String(error),
    });

    try {
      // Try direct AWS SDK method as fallback
      const directPresignedUrl = await generatePresignedUrlDirect(storageKey, bucket, region);
      console.log('✅ Successfully generated presigned URL using direct method');
      return directPresignedUrl;
    } catch (directError) {
      console.error('❌ Both presigned URL methods failed:', {
        serverError: error instanceof Error ? error.message : String(error),
        directError: directError instanceof Error ? directError.message : String(directError),
      });

      // Final fallback to direct URL (will likely fail for private buckets)
      const bucketName = bucket || process.env.NEXT_PUBLIC_AWS_S3_BUCKET || process.env.AWS_S3_BUCKET || 'futura0';
      const regionName = region || process.env.NEXT_PUBLIC_AWS_S3_REGION || 'eu-central-1';
      const directUrl = `https://${bucketName}.s3.${regionName}.amazonaws.com/${storageKey}`;

      console.log('🔄 Using direct URL as final fallback:', directUrl);
      console.log('⚠️ WARNING: Direct S3 URLs may not work for private buckets. All presigning methods failed.');
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
  console.log('🔍 generateBestAssetUrl called with:', {
    url: asset.url,
    assetLocation: asset.assetLocation,
    storageKey: asset.storageKey,
    bucket: asset.bucket,
  });

  // Clean up the storage key if it's a full URL
  const cleanStorageKey = (key?: string) => {
    if (!key) return key;
    
    // If it's already a full URL, extract just the path
    try {
      const url = new URL(key);
      return url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
    } catch (_error) {
      // If it's not a valid URL, return as is but clean up any double slashes
      return key.replace(/^\/+/, '');
    }
  };

  // For S3 assets, try to presign using storageKey
  if (asset.assetLocation === 's3') {
    const storageKey = cleanStorageKey(asset.storageKey || asset.url);
    
    if (!storageKey) {
      console.warn('⚠️ No storage key available for S3 asset, using direct URL');
      return asset.url;
    }

    try {
      console.log('🔑 Attempting to presign S3 URL for storageKey:', storageKey);
      const presignedUrl = await generatePresignedUrlFromStorageKey(
        storageKey, 
        asset.bucket || undefined
      );
      
      console.log('✅ Successfully generated presigned URL');
      return presignedUrl;
    } catch (error) {
      console.warn('⚠️ Failed to presign S3 URL, using direct URL:', error);
      
      // As a last resort, try to construct a direct URL
      try {
        const bucketName = asset.bucket || process.env.NEXT_PUBLIC_AWS_S3_BUCKET || process.env.AWS_S3_BUCKET || 'futura0';
        const region = process.env.NEXT_PUBLIC_AWS_S3_REGION || 'eu-central-1';
        const directUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${storageKey}`;
        console.log('🔄 Falling back to direct S3 URL:', directUrl);
        return directUrl;
      } catch (fallbackError) {
        console.error('❌ Failed to construct direct S3 URL, using original URL:', fallbackError);
        return asset.url;
      }
    }
  }

  // For other backends (vercel_blob, icp, etc.), use the stored URL directly
  console.log('🌐 Using direct URL for non-S3 asset:', asset.url);
  return asset.url;
}
