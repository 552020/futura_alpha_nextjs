import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { generateS3Key, generateDerivativeS3Key, generatePresignedUploadUrl } from '@/lib/s3-service';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileName, fileType, derivatives } = await request.json();

    if (!fileName || !fileType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Generate a unique base key for all assets (original + derivatives)
    const baseKey = generateS3Key(fileName, session.user.id);

    // Generate presigned URL for original file
    const originalUploadUrl = await generatePresignedUploadUrl(baseKey, fileType);

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
        fileKey: baseKey, // Use same base key for original
        contentType: fileType,
      },
      placeholderInDb: true, // Placeholder stored in database, not S3
    };

    // Add derivative presigned URLs if requested
    if (derivatives && Array.isArray(derivatives)) {
      if (derivatives.includes('display')) {
        const displayKey = generateDerivativeS3Key(baseKey, 'display');
        const displayUploadUrl = await generatePresignedUploadUrl(displayKey, 'image/webp');

        response.display = {
          uploadUrl: displayUploadUrl,
          fileKey: displayKey,
          contentType: 'image/webp',
        };
      }

      if (derivatives.includes('thumb')) {
        const thumbKey = generateDerivativeS3Key(baseKey, 'thumb');
        const thumbUploadUrl = await generatePresignedUploadUrl(thumbKey, 'image/webp');

        response.thumb = {
          uploadUrl: thumbUploadUrl,
          fileKey: thumbKey,
          contentType: 'image/webp',
        };
      }
    }

    console.log(`🎫 Generated presigned URLs for: ${fileName}`, {
      original: baseKey,
      derivatives: derivatives || [],
      hasDisplay: !!response.display,
      hasThumb: !!response.thumb,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error generating upload URLs:', error);
    return NextResponse.json({ error: 'Failed to generate upload URLs' }, { status: 500 });
  }
}
