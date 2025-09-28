import { NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { logger } from '@/lib/logger';
const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export async function POST(request: Request) {
  logger.info('🔑 Received request to generate presigned URL');
  try {
    const body = await request.json();
    logger.info('📦 Request body:', body);

    const { key } = body;

    if (!key) {
      logger.error('❌ Key is required');
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    const bucket = process.env.AWS_S3_BUCKET;
    logger.info('🪣 Using S3 bucket:', { bucket });
    logger.info('🔑 Using S3 key:', { key });
    logger.info('🌍 S3 region:', { region: process.env.AWS_S3_REGION || 'eu-central-1' });
    logger.info('🔐 AWS credentials available:', {
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
      hasBucket: !!process.env.AWS_S3_BUCKET,
    });

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    logger.info('🔑 Command created, generating presigned URL...');
    // Generate a presigned URL that's valid for 1 hour
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    logger.info('✅ Generated presigned URL:', { url });

    return NextResponse.json({ url });
  } catch (error) {
    logger.error('Error generating presigned URL:', undefined, { data: error instanceof Error ? error : undefined });
    return NextResponse.json({ error: 'Failed to generate presigned URL' }, { status: 500 });
  }
}
