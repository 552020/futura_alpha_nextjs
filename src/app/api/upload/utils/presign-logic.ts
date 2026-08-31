/**
 * PRESIGNING LOGIC UTILITIES
 *
 * This module contains shared utilities for generating presigned URLs for S3.
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { generateS3Key } from '@/lib/s3-service';

import { fatLogger } from '@/lib/logger';
const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET!;

interface PresignParams {
  userId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

export async function generatePresignedUrl({
  userId,
  fileName,
  fileType,
  fileSize,
}: PresignParams) {
  // Use unified S3 key generation for consistent folder structure
  const s3Key = generateS3Key(fileName, userId);

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
    ContentType: fileType,
    ContentLength: fileSize,
  });

  try {
    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    }); // URL expires in 1 hour
    return { signedUrl, s3Key };
  } catch (error) {
    fatLogger.error('Error generating presigned URL:', 'be', {
      data: error instanceof Error ? error : undefined,
    });
    throw new Error('Could not generate presigned URL');
  }
}
