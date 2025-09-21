/**
 * PRESIGNED URL UTILITIES
 * 
 * Shared utilities for generating presigned URLs for S3 objects.
 * Used by both gallery API and single image view to avoid code duplication.
 */

/**
 * Generate a presigned URL for an S3 object
 * @param key - The S3 object key
 * @returns Promise<string> - The presigned URL
 */
export async function generatePresignedUrl(key: string): Promise<string> {
  console.log('🔑 Requesting presigned URL for key:', key);
  try {
    const response = await fetch('/api/s3/presigned-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ key }),
    });

    console.log('📡 Presigned URL response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to generate presigned URL:', errorText);
      throw new Error(`Failed to generate presigned URL: ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Received presigned URL:', data.url ? 'URL received' : 'No URL in response');

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

  try {
    console.log('🔑 Attempting to get presigned URL for:', storageKey);
    const presignedUrl = await generatePresignedUrl(storageKey);
    console.log('✅ Using presigned URL for storage key:', storageKey);
    return presignedUrl;
  } catch (error) {
    console.warn('⚠️ Falling back to direct URL for storage key:', {
      storageKey,
      error: error instanceof Error ? error.message : String(error),
    });

    // Fallback to direct URL if presigned URL generation fails
    const bucketName = bucket || process.env.NEXT_PUBLIC_AWS_S3_BUCKET || process.env.AWS_S3_BUCKET || 'default-bucket';
    const regionName = region || process.env.NEXT_PUBLIC_AWS_S3_REGION || 'eu-central-1';
    const directUrl = `https://${bucketName}.s3.${regionName}.amazonaws.com/${storageKey}`;

    console.log('🔄 Using direct URL as fallback:', directUrl);
    return directUrl;
  }
}
