import { NextRequest, NextResponse } from 'next/server';
import { getUserIdForUpload } from '../../memories/utils/user-management';
import { storeInNewDatabase } from '../../memories/utils/memory-database';
import { getMemoryType, toAcceptedMimeType } from '../../memories/utils/file-processing';

export async function POST(request: NextRequest) {
  try {
    const { fileName, fileType, fileSize, s3Url, parentFolderId } = await request.json();

    if (!fileName || !fileType || !fileSize || !s3Url) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const { allUserId, error } = await getUserIdForUpload({});
    if (error) {
      return error;
    }

    const memoryType = getMemoryType(toAcceptedMimeType(fileType));

    const result = await storeInNewDatabase({
      type: memoryType,
      ownerId: allUserId,
      url: s3Url,
      file: { name: fileName, size: fileSize, type: fileType } as File,
      metadata: {
        uploadedAt: new Date().toISOString(),
        originalName: fileName,
        size: fileSize,
        mimeType: toAcceptedMimeType(fileType),
      },
      parentFolderId,
      assetLocation: 's3',
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in commit endpoint:', error);
    return NextResponse.json({ error: 'Failed to commit file' }, { status: 500 });
  }
}
