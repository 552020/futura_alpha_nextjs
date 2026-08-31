import {
  S3Client,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';

import { fatLogger } from '@/lib/logger';
// Get bucket name from environment variables
const BUCKET_NAME = process.env.NEXT_PUBLIC_AWS_S3_BUCKET || 'futura0';

if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  fatLogger.warn('AWS credentials not found. S3 operations will fail', 'be');
}

if (!process.env.AWS_S3_REGION) {
  fatLogger.warn('AWS_S3_REGION not set, defaulting to eu-central-1', 'be');
}

// Initialize S3 client with explicit credentials and region
const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

/**
 * Check if an object exists in S3
 */
async function objectExists(key: string): Promise<boolean> {
  if (!key) return false;

  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    await s3Client.send(command);
    return true;
  } catch (error: unknown) {
    const err = error as Error;
    // AWS SDK v3 sets error.name to "NotFound" when object is missing
    if (err.name === 'NotFound') {
      return false;
    }
    fatLogger.error('Unexpected error checking if S3 object exists', 'be', {
      key,
      error: err,
    });
    return false;
  }
}

/**
 * Delete an object from S3 with enhanced error handling and logging
 */
export async function deleteS3Object(key: string): Promise<boolean> {
  fatLogger.info('deleteS3Object called', 'be', { key });

  if (!key) {
    fatLogger.warn('Attempted to delete S3 object with empty key', 'be');
    return false;
  }

  const bucket = BUCKET_NAME;

  try {
    fatLogger.info('Checking if object exists before deletion', 'be');
    const exists = await objectExists(key);
    fatLogger.info('Object existence check completed', 'be', {
      key,
      exists,
    });

    if (!exists) {
      fatLogger.warn(`S3 object does not exist: ${key}`, 'be');
      return true; // Safe to treat as success
    }

    fatLogger.info('Attempting to delete S3 object', 'be', {
      key,
      bucket,
    });

    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const result = await s3Client.send(command);
    fatLogger.info('DeleteObjectCommand sent successfully', 'be', {
      deleteMarker: result.DeleteMarker,
      versionId: result.VersionId,
      requestId: result.$metadata.requestId,
      httpStatusCode: result.$metadata.httpStatusCode,
    });

    // Verify deletion (silent for NotFound errors)
    try {
      const stillExists = await objectExists(key);
      if (stillExists) {
        const objectUrl = `https://${bucket}.s3.${process.env.AWS_S3_REGION || 'eu-central-1'}.amazonaws.com/${key}`;
        fatLogger.error('S3 object still exists after deletion attempt', 'be', {
          key,
          bucket,
          region: process.env.AWS_S3_REGION || 'eu-central-1',
          fullUrl: objectUrl,
          timestamp: new Date().toISOString(),
        });
        return false;
      }
      fatLogger.info('Deletion verified', 'be', {
        key,
        bucket,
        region: process.env.AWS_S3_REGION || 'eu-central-1',
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      const verifyError = error as Error & { name?: string };
      // A NotFound here is expected → means deletion succeeded (silent)
      if (verifyError.name === 'NotFound') {
        return true;
      }
      throw verifyError;
    }

    return true;
  } catch (error) {
    const fullUrl = `https://${bucket}.s3.${process.env.AWS_S3_REGION || 'eu-central-1'}.amazonaws.com/${key}`;
    fatLogger.error('Unexpected error deleting S3 object', 'be', {
      key,
      url: fullUrl,
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : String(error),
      timestamp: new Date().toISOString(),
    });
    return false;
  }
}
