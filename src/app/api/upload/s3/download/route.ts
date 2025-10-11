import { NextResponse } from 'next/server';
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

export async function POST(request: Request) {
  fatLogger.info('🔑 Received request to generate presigned URL', 'be');
  try {
    const body = await request.json();
    fatLogger.info('📦 Request body:', 'be', body);

    const { key } = body;

    if (!key) {
      fatLogger.error('❌ Key is required', 'be');
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    const bucket = process.env.AWS_S3_BUCKET;
    fatLogger.info('🪣 Using S3 bucket:', 'be', { bucket });
    fatLogger.info('🔑 Using S3 key:', 'be', { key });
    fatLogger.info('🌍 S3 region:', 'be', { region: process.env.AWS_S3_REGION || 'eu-central-1' });
    fatLogger.info('🔐 AWS credentials available:', 'be', {
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
      hasBucket: !!process.env.AWS_S3_BUCKET,
    });

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    fatLogger.info('🔑 Command created, generating presigned URL...', 'be');
    // Generate a presigned URL that's valid for 1 hour
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    fatLogger.info('✅ Generated presigned URL:', 'be', { url });

    return NextResponse.json({ url });
  } catch (error) {
    fatLogger.error('Error generating presigned URL:', 'be', { data: error instanceof Error ? error : undefined });
    return NextResponse.json({ error: 'Failed to generate presigned URL' }, { status: 500 });
  }
}
