import { S3Client, PutObjectCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { NextRequest } from 'next/server';
import { isS3Configured, S3_BUCKET } from './s3';

// S3 client instance
const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

// Generate a unique key for S3 objects
export function generateS3Key(filename: string, userId: string): string {
  const timestamp = Date.now();
  const fileExtension = filename.split('.').pop() || '';
  return `uploads/${userId}/${timestamp}-${uuidv4()}.${fileExtension}`;
}

// Generate a presigned URL for direct S3 upload
export async function generatePresignedUploadUrl(key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour expiration
}

// Initialize a multipart upload
export async function createMultipartUpload(key: string, contentType: string) {
  const command = new CreateMultipartUploadCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const { UploadId } = await s3Client.send(command);
  return { uploadId: UploadId };
}

// Generate presigned URL for a part of a multipart upload
export async function generatePresignedPartUrl(
  key: string,
  uploadId: string,
  partNumber: number
): Promise<string> {
  // If it's a simple upload (no uploadId or partNumber)
  if (uploadId === 'simple-upload' && partNumber === 1) {
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      ContentType: 'application/octet-stream',
    });
    return getSignedUrl(s3Client, command, { expiresIn: 3600 });
  }

  // For multipart uploads
  const command = new UploadPartCommand({
    Bucket: S3_BUCKET,
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber,
  });

  return getSignedUrl(s3Client, command, { 
    expiresIn: 3600,
    // Add these headers to support CORS
    signableHeaders: new Set(['content-type', 'content-length']),
  });
}

// Complete a multipart upload
export async function completeMultipartUpload(
  key: string,
  uploadId: string,
  parts: { ETag: string; PartNumber: number }[]
) {
  const command = new CompleteMultipartUploadCommand({
    Bucket: S3_BUCKET,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: parts,
    },
  });

  await s3Client.send(command);
  return `https://${S3_BUCKET}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${key}`;
}

// Handle S3 upload completion
export async function handleS3UploadCompletion(req: NextRequest) {
  if (!isS3Configured()) {
    throw new Error('S3 is not properly configured');
  }

  const body = await req.json();
  const { key, uploadId, parts } = body;

  if (!key || !uploadId || !Array.isArray(parts)) {
    throw new Error('Missing required fields in request body');
  }

  const url = await completeMultipartUpload(key, uploadId, parts);
  return { url };
}

// Get public URL for an S3 object
export function getS3PublicUrl(key: string): string {
  if (!key) return '';
  return `https://${S3_BUCKET}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${key}`;
}
