import { NextResponse } from 'next/server';
import { handleUpload } from '@vercel/blob/client';
import { fatLogger } from '@/lib/logger';

/**
 * Vercel Blob Upload URL Endpoint
 *
 * Handles direct uploads to Vercel Blob for onboarding users.
 * No authentication required.
 */
export async function POST(req: Request) {
  try {
    const res = await handleUpload({
      request: req,
      body: await req.json(),
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: [
            'image/*',
            'video/*',
            'audio/*',
            'application/pdf',
            'text/plain',
            'text/markdown',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          ],
          maximumSizeInBytes: 5 * 1024 ** 4, // up to 5 TB
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {},
    });

    return NextResponse.json(res);
  } catch (error) {
    fatLogger.error('Error uploading to Vercel Blob', 'be', { error });
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
