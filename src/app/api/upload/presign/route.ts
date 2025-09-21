import { NextRequest, NextResponse } from 'next/server';
import { generatePresignedUrl } from '../utils/presign-logic';
import { getUserIdForUpload } from '../../memories/utils/user-management';

export async function POST(request: NextRequest) {
  try {
    const { fileName, fileType, fileSize } = await request.json();

    if (!fileName || !fileType || !fileSize) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const { allUserId, error } = await getUserIdForUpload({});
    if (error) {
      return error;
    }

    const { signedUrl, s3Key } = await generatePresignedUrl({
      userId: allUserId,
      fileName,
      fileType,
      fileSize,
    });

    return NextResponse.json({ signedUrl, s3Key });
  } catch (error) {
    console.error('Error in presign endpoint:', error);
    return NextResponse.json({ error: 'Failed to generate presigned URL' }, { status: 500 });
  }
}
