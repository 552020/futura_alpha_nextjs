import { NextRequest, NextResponse } from 'next/server';
import { getUserIdForUpload } from '../../memories/utils/user-management';
import { processMultipleFilesBatch } from '../../memories/utils/memory-database';

interface FileCommitInfo {
  fileName: string;
  fileType: string;
  fileSize: number;
  s3Url: string;
}

export async function POST(request: NextRequest) {
  try {
    const { files, parentFolderId } = await request.json();

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: 'Missing or invalid files array' }, { status: 400 });
    }

    const { allUserId, error } = await getUserIdForUpload({});
    if (error) {
      return error;
    }

    const fileObjects = files.map((f: FileCommitInfo) => ({
      name: f.fileName,
      size: f.fileSize,
      type: f.fileType,
    })) as File[];
    const urls = files.map((f: FileCommitInfo) => f.s3Url);

    const result = await processMultipleFilesBatch({
      files: fileObjects,
      urls,
      ownerId: allUserId,
      parentFolderId,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to process files' }, { status: 500 });
    }

    // Transform the result to match the expected format
    const response = {
      results: result.memories.map((memory, index) => ({
        memoryId: memory.id,
        size: fileObjects[index]?.size || 0,
        name: fileObjects[index]?.name || 'Unknown',
        type: fileObjects[index]?.type || 'application/octet-stream',
        checksum_sha256: null,
        success: true,
      })),
      userId: allUserId,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in batch commit endpoint:', error);
    return NextResponse.json({ error: 'Failed to batch commit files' }, { status: 500 });
  }
}
