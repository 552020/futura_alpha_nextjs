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
  fatLogger.info('🔑 Received request to generate presigned URL', 'be', {
    timestamp: new Date().toISOString(),
    userAgent: request.headers.get('user-agent'),
    referer: request.headers.get('referer'),
  });

  let key: string | undefined;
  try {
    const body = await request.json();
    fatLogger.info('📦 Request body received', 'be', {
      hasKey: !!body.key,
      keyLength: body.key?.length || 0,
      keyPreview: body.key ? body.key.substring(0, 50) + '...' : 'null',
      timestamp: new Date().toISOString(),
    });

    key = body.key;

    if (!key) {
      fatLogger.error('❌ Key is required in request body', 'be', {
        body,
        timestamp: new Date().toISOString(),
      });
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

    fatLogger.info('🔑 Command created, generating presigned URL...', 'be', {
      bucket,
      key,
      region: process.env.AWS_S3_REGION || 'eu-central-1',
      timestamp: new Date().toISOString(),
    });

    // Generate a presigned URL that's valid for 1 hour
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    fatLogger.info('✅ Successfully generated presigned URL', 'be', {
      urlLength: url.length,
      urlPreview: url.substring(0, 100) + '...',
      bucket,
      key,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ url });
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    fatLogger.error('💥 CRITICAL: Error generating presigned URL', 'be', {
      error: errorObj.message,
      errorStack: errorObj.stack,
      errorName: errorObj.name,
      bucket: process.env.AWS_S3_BUCKET,
      key,
      region: process.env.AWS_S3_REGION || 'eu-central-1',
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      {
        error: 'Failed to generate presigned URL',
        details: process.env.NODE_ENV === 'development' ? errorObj.message : undefined,
      },
      { status: 500 }
    );
  }
}
