/**
 * PRESIGNING LOGIC UTILITIES
 *
 * This module contains shared utilities for generating presigned URLs for S3.
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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

export async function generatePresignedUrl({ userId, fileName, fileType, fileSize }: PresignParams) {
  const s3Key = `uploads/${userId}/${Date.now()}_${fileName}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
    ContentType: fileType,
    ContentLength: fileSize,
  });

  try {
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // URL expires in 1 hour
    return { signedUrl, s3Key };
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    throw new Error('Could not generate presigned URL');
  }
}
