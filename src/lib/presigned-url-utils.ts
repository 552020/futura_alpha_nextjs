/**
 * PRESIGNED URL UTILITIES
 *
 * Shared utilities for generating presigned URLs for S3 objects.
 * Used by both gallery API and single image view to avoid code duplication.
 */

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { fatLogger } from '@/lib/logger';
/**
 * Generate a presigned URL directly using AWS SDK (more reliable than server-side fetch)
 * @param key - The S3 object key
 * @param bucket - The S3 bucket name (optional, will use env var if not provided)
 * @param region - The S3 region (optional, will use env var if not provided)
 * @returns Promise<string> - The presigned URL
 */
export async function generatePresignedUrlDirect(key: string, bucket?: string, region?: string): Promise<string> {
  fatLogger.info('generatePresignedUrlDirect called', 'be', {
    key,
    bucket,
    region,
    hasCredentials: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
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
  fatLogger.info('Generated presigned URL directly', 'be', {
    urlPreview: url.substring(0, 100) + '...',
  });
  return url;
}

/**
 * Generate a presigned URL for an S3 object
 * @param key - The S3 object key
 * @returns Promise<string> - The presigned URL
 */
export async function generatePresignedUrl(key: string): Promise<string> {
  fatLogger.info('Requesting presigned URL for key', 'be', { key });
  try {
    // Comprehensive debugging logs
    fatLogger.info('🔍 [Presigned URL Debug] Environment values:', 'be', {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      VERCEL_URL: process.env.VERCEL_URL,
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      AWS_ACCESS_KEY_ID: !!process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: !!process.env.AWS_SECRET_ACCESS_KEY,
      AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
      AWS_S3_REGION: process.env.AWS_S3_REGION,
    });

    // Use absolute URL for server-side fetch
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';
    fatLogger.info('🔍 [Presigned URL Debug] Calculated baseUrl:', 'be', { baseUrl });

    const apiUrl = `${baseUrl}/api/upload/s3/download`;
    fatLogger.info('🔍 [Presigned URL Debug] Fetch URL:', 'be', { apiUrl });
    fatLogger.info('Using API URL', 'be', { apiUrl });
    fatLogger.info('Environment check', 'be', {
      hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
      hasVercelUrl: !!process.env.VERCEL_URL,
      baseUrl,
    });

    fatLogger.info('🔍 [Presigned URL Debug] Making fetch request...', 'be', { apiUrl, keyLength: key.length });

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ key }),
    });

    fatLogger.info('🔍 [Presigned URL Debug] Response received:', 'be', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      url: response.url,
    });
    fatLogger.info('📡 Presigned URL response status:', 'be', { status: response.status });
    fatLogger.info('📡 Presigned URL response headers:', 'be', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      fatLogger.error('❌ [Presigned URL Debug] Fetch failed:', 'be', {
        status: response.status,
        statusText: response.statusText,
        errorText,
        apiUrl,
        responseUrl: response.url,
      });
      fatLogger.error('Failed to generate presigned URL', 'be', {
        status: response.status,
        statusText: response.statusText,
        errorText,
        apiUrl,
      });
      throw new Error(`Failed to generate presigned URL: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    fatLogger.info('🔍 [Presigned URL Debug] Parsed response data:', 'be', {
      hasUrl: !!data.url,
      urlLength: data.url?.length || 0,
      urlPreview: data.url ? data.url.substring(0, 100) + '...' : 'No URL',
      dataKeys: Object.keys(data),
    });
    fatLogger.info('✅ Received presigned URL response:', 'be', {
      hasUrl: !!data.url,
      urlLength: data.url?.length || 0,
      urlPreview: data.url ? data.url.substring(0, 100) + '...' : 'No URL',
    });

    if (!data.url) {
      fatLogger.error('❌ [Presigned URL Debug] No URL in response data:', 'be', { data });
      throw new Error('No URL returned from presigned URL endpoint');
    }

    fatLogger.info('✅ [Presigned URL Debug] Successfully generated presigned URL via server-side fetch', 'be', {
      urlLength: data.url.length,
      urlPreview: data.url.substring(0, 100) + '...',
    });
    return data.url;
  } catch (error) {
    fatLogger.error('❌ [Presigned URL Debug] Error in generatePresignedUrl:', 'be', {
      error: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : 'Unknown',
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    fatLogger.error('Error in generatePresignedUrl', 'be', { error });
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
      fatLogger.info(`Generating presigned URL for S3 key: ${s3Key}`, 'be');

      const presignedUrl = await generatePresignedUrl(s3Key);
      fatLogger.info('Generated presigned URL from S3 URL', 'be');
      return presignedUrl;
    }
  } catch (error) {
    fatLogger.error('Error generating presigned URL from S3 URL', 'be', { error });
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
    fatLogger.info('🔍 [Production Mode] Using direct AWS SDK method first', 'be', { storageKey });
    try {
      const directPresignedUrl = await generatePresignedUrlDirect(storageKey, bucket, region);
      fatLogger.info('✅ [Production Mode] Direct AWS SDK method succeeded', 'be', {
        urlLength: directPresignedUrl.length,
        urlPreview: directPresignedUrl.substring(0, 100) + '...',
      });
      return directPresignedUrl;
    } catch (directError) {
      fatLogger.warn('⚠️ [Production Mode] Direct AWS SDK failed, trying server-side fetch', 'be', {
        storageKey,
        error: directError instanceof Error ? directError.message : String(directError),
      });

      try {
        const presignedUrl = await generatePresignedUrl(storageKey);
        fatLogger.info('✅ [Production Mode] Server-side fetch succeeded as fallback', 'be', {
          urlLength: presignedUrl.length,
          urlPreview: presignedUrl.substring(0, 100) + '...',
        });
        return presignedUrl;
      } catch (serverError) {
        fatLogger.error('❌ [Production Mode] Both methods failed', 'be', {
          directError: directError instanceof Error ? directError.message : String(directError),
          serverError: serverError instanceof Error ? serverError.message : String(serverError),
        });

        // Final fallback to direct URL
        const bucketName = bucket || process.env.NEXT_PUBLIC_AWS_S3_BUCKET || process.env.AWS_S3_BUCKET || 'futura0';
        const regionName = region || process.env.NEXT_PUBLIC_AWS_S3_REGION || 'eu-central-1';
        const directUrl = `https://${bucketName}.s3.${regionName}.amazonaws.com/${storageKey}`;

        fatLogger.warn('⚠️ [Production Mode] Using direct URL as final fallback', 'be', { directUrl });
        return directUrl;
      }
    }
  } else {
    // Development mode: try server-side fetch first for easier debugging
    fatLogger.info('🔍 [Development Mode] Attempting server-side fetch method first', 'be', { storageKey });
    try {
      const presignedUrl = await generatePresignedUrl(storageKey);
      fatLogger.info('✅ [Development Mode] Server-side fetch succeeded', 'be', {
        urlLength: presignedUrl.length,
        urlPreview: presignedUrl.substring(0, 100) + '...',
      });
      return presignedUrl;
    } catch (error) {
      fatLogger.warn('⚠️ [Development Mode] Server-side fetch failed, trying direct AWS SDK method', 'be', {
        storageKey,
        error: error instanceof Error ? error.message : String(error),
      });

      try {
        const directPresignedUrl = await generatePresignedUrlDirect(storageKey, bucket, region);
        fatLogger.info('✅ [Development Mode] Direct AWS SDK method succeeded as fallback', 'be', {
          urlLength: directPresignedUrl.length,
          urlPreview: directPresignedUrl.substring(0, 100) + '...',
        });
        return directPresignedUrl;
      } catch (directError) {
        fatLogger.error('❌ [Development Mode] Both methods failed', 'be', {
          serverError: error instanceof Error ? error.message : String(error),
          directError: directError instanceof Error ? directError.message : String(directError),
        });

        // Final fallback to direct URL
        const bucketName = bucket || process.env.NEXT_PUBLIC_AWS_S3_BUCKET || process.env.AWS_S3_BUCKET || 'futura0';
        const regionName = region || process.env.NEXT_PUBLIC_AWS_S3_REGION || 'eu-central-1';
        const directUrl = `https://${bucketName}.s3.${regionName}.amazonaws.com/${storageKey}`;

        fatLogger.warn('⚠️ [Development Mode] Using direct URL as final fallback', 'be', { directUrl });
        return directUrl;
      }
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
  fatLogger.info('🔗 generateBestAssetUrl called', 'be', {
    url: asset.url,
    assetLocation: asset.assetLocation,
    storageKey: asset.storageKey,
    bucket: asset.bucket,
    timestamp: new Date().toISOString(),
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
    fatLogger.info('🔍 Processing S3 asset for presigned URL generation', 'be', {
      assetLocation: asset.assetLocation,
      storageKey: asset.storageKey,
      bucket: asset.bucket,
      url: asset.url,
    });

    const storageKey = cleanStorageKey(asset.storageKey || asset.url);

    if (!storageKey) {
      fatLogger.warn('⚠️ No storage key available for S3 asset, using direct URL', 'be', {
        url: asset.url,
        assetLocation: asset.assetLocation,
        providedStorageKey: asset.storageKey,
      });
      return asset.url;
    }

    try {
      fatLogger.info('🚀 Attempting to presign S3 URL for storageKey', 'be', {
        storageKey,
        bucket: asset.bucket,
        timestamp: new Date().toISOString(),
      });

      const presignedUrl = await generatePresignedUrlFromStorageKey(storageKey, asset.bucket || undefined);

      fatLogger.info('✅ Successfully generated presigned URL for S3 asset', 'be', {
        storageKey,
        urlLength: presignedUrl.length,
        urlPreview: presignedUrl.substring(0, 100) + '...',
      });
      return presignedUrl;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      fatLogger.error('❌ CRITICAL: Failed to presign S3 URL', 'be', {
        storageKey,
        bucket: asset.bucket,
        error: errorObj.message,
        errorStack: errorObj.stack,
        errorName: errorObj.name,
        timestamp: new Date().toISOString(),
      });

      // As a last resort, try to construct a direct URL
      try {
        const bucketName =
          asset.bucket || process.env.NEXT_PUBLIC_AWS_S3_BUCKET || process.env.AWS_S3_BUCKET || 'futura0';
        const region = process.env.NEXT_PUBLIC_AWS_S3_REGION || 'eu-central-1';
        const directUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${storageKey}`;

        fatLogger.warn('🔄 Falling back to direct S3 URL construction', 'be', {
          directUrl,
          bucketName,
          region,
          storageKey,
        });
        return directUrl;
      } catch (fallbackError) {
        const fallbackErrorObj = fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError));
        fatLogger.error('💥 CRITICAL: Failed to construct direct S3 URL, using original URL', 'be', {
          error: fallbackErrorObj.message,
          errorStack: fallbackErrorObj.stack,
          originalUrl: asset.url,
          storageKey,
        });
        return asset.url;
      }
    }
  }

  // For other backends (vercel_blob, icp, etc.), use the stored URL directly
  fatLogger.info('Using direct URL for non-S3 asset', 'be', { url: asset.url });
  return asset.url;
}
