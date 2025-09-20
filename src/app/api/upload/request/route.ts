import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { generateS3Key, generatePresignedUploadUrl } from '@/lib/s3-service';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { fileName, fileType } = await request.json();

    if (!fileName || !fileType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate a unique key for the file
    const key = generateS3Key(fileName, session.user.id);
    
    // Generate a presigned URL for direct upload
    const uploadUrl = await generatePresignedUploadUrl(key, fileType);

    return NextResponse.json({
      uploadUrl,
      fileKey: key,
      publicUrl: `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${key}`
    });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}
