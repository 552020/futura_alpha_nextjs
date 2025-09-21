import { NextRequest, NextResponse } from 'next/server';
import { generatePresignedUrl } from '../utils/presign-logic';
import { getUserIdForUpload } from '../../memories/utils/user-management';

interface FileInfo {
  fileName: string;
  fileType: string;
  fileSize: number;
}

export async function POST(request: NextRequest) {
  try {
    const { files } = await request.json();

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: 'Missing or invalid files array' }, { status: 400 });
    }

    const { allUserId, error } = await getUserIdForUpload({});
    if (error) {
      return error;
    }

    const presignPromises = files.map((file: FileInfo) =>
      generatePresignedUrl({
        userId: allUserId,
        fileName: file.fileName,
        fileType: file.fileType,
        fileSize: file.fileSize,
      })
    );

    const presignedUrls = await Promise.all(presignPromises);

    return NextResponse.json({ presignedUrls });
  } catch (error) {
    console.error('Error in batch presign endpoint:', error);
    return NextResponse.json({ error: 'Failed to generate batch presigned URLs' }, { status: 500 });
  }
}
