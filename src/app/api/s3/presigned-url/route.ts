import { NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export async function POST(request: Request) {
  console.log('🔑 Received request to generate presigned URL');
  try {
    const body = await request.json();
    console.log('📦 Request body:', body);

    const { key } = body;

    if (!key) {
      console.error('❌ Key is required');
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    const bucket = process.env.AWS_S3_BUCKET;
    console.log('🪣 Using S3 bucket:', bucket);
    console.log('🔑 Using S3 key:', key);
    console.log('🌍 S3 region:', process.env.AWS_S3_REGION || 'eu-central-1');
    console.log('🔐 AWS credentials available:', {
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
      hasBucket: !!process.env.AWS_S3_BUCKET,
    });

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    console.log('🔑 Command created, generating presigned URL...');
    // Generate a presigned URL that's valid for 1 hour
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    console.log('✅ Generated presigned URL:', url);

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json({ error: 'Failed to generate presigned URL' }, { status: 500 });
  }
}
