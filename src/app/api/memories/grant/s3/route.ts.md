```ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth-utils';
import { generateS3Key, createMultipartUpload, generatePresignedPartUrl } from '@/lib/s3-service';
import { isS3Configured } from '@/lib/s3';

// Handle S3 upload grant request
export async function POST(req: NextRequest) {
  try {
    if (!isS3Configured()) {
      return NextResponse.json({ error: 'S3 storage is not configured' }, { status: 500 });
    }

    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { filename, contentType, parts = 1 } = await req.json();

    if (!filename || !contentType) {
      return NextResponse.json(
        { error: 'Missing required fields: filename and contentType are required' },
        { status: 400 }
      );
    }

    // Generate a unique key for the upload
    const key = generateS3Key(filename, userId);

    // For small files, use a simple upload
    if (parts === 1) {
      const uploadUrl = await generatePresignedPartUrl(key, 'simple-upload', 1);

      return NextResponse.json({
        key,
        uploadId: 'simple-upload',
        urls: [uploadUrl],
        parts: [{ partNumber: 1, url: uploadUrl }],
      });
    }

    // For large files, use multipart upload
    const { uploadId } = await createMultipartUpload(key, contentType);

    if (!uploadId) {
      return NextResponse.json({ error: 'Failed to create multipart upload' }, { status: 500 });
    }

    const partUrls = await Promise.all(
      Array.from({ length: parts }, (_, i) => generatePresignedPartUrl(key, uploadId, i + 1))
    );

    const response = {
      key,
      uploadId,
      urls: partUrls,
      parts: partUrls.map((url, index) => ({
        partNumber: index + 1,
        url,
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error generating S3 upload URLs:', error);
    return NextResponse.json({ error: 'Failed to generate upload URLs' }, { status: 500 });
  }
}

// Handle OPTIONS for CORS preflight
// This is needed for the browser to make the preflight request
// when using the fetch API with custom headers
// https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS#preflighted_requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
```
