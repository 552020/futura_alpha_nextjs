import { NextRequest, NextResponse } from 'next/server';
import { generateS3Key, generateDerivativeS3Key, generatePresignedUploadUrl } from '@/lib/s3-service';
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

    // Generate grants for all files (same approach as single file)
    const grantPromises = files.map(async (file: FileInfo) => {
      // Generate a unique base key for all assets (original + derivatives)
      const baseKey = generateS3Key(file.fileName, allUserId);
      
      // Generate presigned URL for original file
      const originalUploadUrl = await generatePresignedUploadUrl(baseKey, file.fileType);

      // Build response with original file
      const response: {
        original: {
          uploadUrl: string;
          fileKey: string;
          contentType: string;
        };
        display?: {
          uploadUrl: string;
          fileKey: string;
          contentType: string;
        };
        thumb?: {
          uploadUrl: string;
          fileKey: string;
          contentType: string;
        };
        placeholderInDb: boolean;
      } = {
        original: {
          uploadUrl: originalUploadUrl,
          fileKey: baseKey,
          contentType: file.fileType,
        },
        placeholderInDb: true, // Placeholder stored in database, not S3
      };

      // Add derivative presigned URLs for image files
      if (file.fileType.startsWith('image/')) {
        const displayKey = generateDerivativeS3Key(baseKey, 'display');
        const displayUploadUrl = await generatePresignedUploadUrl(displayKey, 'image/webp');

        const thumbKey = generateDerivativeS3Key(baseKey, 'thumb');
        const thumbUploadUrl = await generatePresignedUploadUrl(thumbKey, 'image/webp');

        response.display = {
          uploadUrl: displayUploadUrl,
          fileKey: displayKey,
          contentType: 'image/webp',
        };

        response.thumb = {
          uploadUrl: thumbUploadUrl,
          fileKey: thumbKey,
          contentType: 'image/webp',
        };
      }

      return response;
    });

    const grants = await Promise.all(grantPromises);

    console.log(`🎫 Generated batch grants for ${files.length} files`, {
      files: files.map(f => f.fileName),
      hasDerivatives: grants.some(g => g.display && g.thumb),
    });

    return NextResponse.json({ grants });
  } catch (error) {
    console.error('Error in batch presign endpoint:', error);
    return NextResponse.json({ error: 'Failed to generate batch presigned URLs' }, { status: 500 });
  }
}
