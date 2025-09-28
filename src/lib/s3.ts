import { S3Client, PutObjectCommand, PutObjectCommandInput } from '@aws-sdk/client-s3';
// import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { logger } from '@/lib/logger';
// S3 Configuration
const s3Config = {
  region: process.env.AWS_S3_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
};

logger.info('S3 Config:', s3Config);

const s3Client = new S3Client(s3Config);

export const S3_BUCKET = process.env.AWS_S3_BUCKET || '';
export const S3_REGION = process.env.AWS_S3_REGION || 'eu-central-1';

logger.info('S3 Bucket:', { bucket: S3_BUCKET });
logger.info('S3 Region:', { region: S3_REGION });

// Check if S3 is properly configured
export function isS3Configured(): boolean {
  const configured = !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_S3_BUCKET
  );
  logger.info('Is S3 Configured?', { configured });
  return configured;
}

// Generate a safe file name with user ID in the path
function generateSafeFileName(originalName: string, userId: string = 'anonymous'): string {
  const timestamp = Date.now();
  const safeFileName = originalName.replace(/[^a-zA-Z0-9-_\.]/g, '_');
  // Include user ID in the path: uploads/{userId}/{timestamp}-{filename}
  const fullName = `uploads/${userId}/${timestamp}-${safeFileName}`;
  logger.info('Generated file name:', { fullName });
  return fullName;
}

// Upload file to S3
export async function uploadToS3(file: File, buffer?: Buffer, userId?: string): Promise<string> {
  if (!isS3Configured()) {
    throw new Error('S3 is not properly configured. Please check your environment variables.');
  }

  const fileBuffer = buffer || Buffer.from(await file.arrayBuffer());
  const cleanFileName = file.name.split('/').pop() || file.name; // Remove any path from the file name
  const fileName = generateSafeFileName(cleanFileName, userId);

  const uploadParams: PutObjectCommandInput = {
    Bucket: S3_BUCKET,
    Key: fileName,
    Body: fileBuffer,
    ContentType: file.type,
    CacheControl: 'max-age=31536000', // 1 year cache
    // ACL: 'public-read', // Make the object publicly readable
  };

  logger.info('Uploading to S3 with params:', { uploadParams });

  try {
    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    const publicUrl = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${fileName}`;
    logger.info('Uploaded file public URL:', { publicUrl });
    return publicUrl;
  } catch (error) {
    logger.error('Error uploading to S3:', undefined, { data: error instanceof Error ? error : undefined });
    throw new Error('Failed to upload file to S3');
  }
}

// Generate presigned URL for upload (if needed) - COMMENTED OUT FOR MVP
// export async function generatePresignedUploadUrl(fileName: string, contentType: string): Promise<string> {
//   if (!isS3Configured()) {
//     throw new Error('S3 is not properly configured. Please check your environment variables.');
//   }

//   const safeFileName = generateSafeFileName(fileName);

//   const command = new PutObjectCommand({
//     Bucket: S3_BUCKET,
//     Key: safeFileName,
//     ContentType: contentType,
//     // ACL: 'public-read',
//   });

//   logger.info('Generating presigned URL for:', safeFileName);

//   try {
//     const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour
//     logger.info('Presigned URL:', signedUrl);
//     return signedUrl;
//   } catch (error) {
//     logger.error('Error generating presigned URL:', undefined, { data: error instanceof Error ? error : undefined });
//     throw new Error('Failed to generate presigned URL');
//   }
// }

// Get public URL for an S3 object - COMMENTED OUT FOR MVP
// export function getS3PublicUrl(key: string): string {
//   const url = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`;
//   logger.info('S3 Public URL:', url);
//   return url;
// }

// Delete file from S3 - COMMENTED OUT FOR MVP
// export async function deleteFromS3(key: string): Promise<void> {
//   if (!isS3Configured()) {
//     throw new Error('S3 is not properly configured. Please check your environment variables.');
//   }

//   try {
//     const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
//     const command = new DeleteObjectCommand({
//       Bucket: S3_BUCKET,
//       Key: key,
//     });

//     logger.info('Deleting from S3:', key);
//     await s3Client.send(command);
//     logger.info('Deleted successfully:', key);
//   } catch (error) {
//     logger.error('Error deleting from S3:', undefined, { data: error instanceof Error ? error : undefined });
//     throw new Error('Failed to delete file from S3');
//   }
// }

// Extract S3 key from URL
export function extractS3KeyFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('s3') || urlObj.hostname.includes('amazonaws.com')) {
      const key = urlObj.pathname.slice(1);
      logger.info('Extracted S3 key from URL:', { key });
      return key;
    }
    return null;
  } catch {
    return null;
  }
}

// Storage type enum - COMMENTED OUT FOR MVP
// export type StorageType = 'vercel-blob' | 's3' | 'icp-canister' | 'neon-db';

// Get preferred storage type - COMMENTED OUT FOR MVP
// export function getPreferredStorageType(): StorageType {
//   const preferred = process.env.PREFERRED_STORAGE_TYPE as StorageType;

//   if (preferred && ['vercel-blob', 's3', 'icp-canister', 'neon-db'].includes(preferred)) {
//     logger.info('Preferred storage type from env:', preferred);
//     return preferred;
//   }

//   const fallback = isS3Configured() ? 's3' : 'vercel-blob';
//   logger.info('Using storage type fallback:', fallback);
//   return fallback;
// }
