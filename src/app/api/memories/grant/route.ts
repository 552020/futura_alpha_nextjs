// src/nextjs/src/app/api/memories/grant/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { getAllUserId, createMemoryFromBlob } from '@/app/api/memories/utils';
import { enqueueImageProcessing } from '@/app/api/memories/utils/image-processing-workflow';

// optional: centralize your allowlist
const ALLOWED = [
  'image/*',
  'video/*',
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export async function POST(req: NextRequest) {
  // who’s uploading?
  const user = await getAllUserId(req);
  if (!user?.allUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json()) as HandleUploadBody & { clientPayload?: string };

  // Extract client payload from the request body
  const clientPayload = body.clientPayload ? JSON.parse(body.clientPayload) : {};
  console.log('📦 Client payload received:', clientPayload);

  const res = await handleUpload({
    request: req,
    body,
    onBeforeGenerateToken: async () => {
      return {
        allowedContentTypes: ALLOWED,
        maximumSizeInBytes: 5 * 1024 ** 4, // up to 5 TB
        addRandomSuffix: true,
        // TODO: Use pathname parameter if we need custom path structure
        // onBeforeGenerateToken: async (pathname) => {
        // const safePath = generateBlobFilename(pathname || 'upload');
        // path: `${process.env.BLOB_FOLDER_NAME || "futura"}/${safePath}`,
        tokenPayload: JSON.stringify({
          allUserId: user.allUserId,
          isOnboarding: !!clientPayload.isOnboarding,
          mode: clientPayload.mode || 'files',
          existingUserId: clientPayload.existingUserId,
        }),
      };
    },
    onUploadCompleted: async ({ blob, tokenPayload }) => {
      // persist in DB
      try {
        const payload = tokenPayload ? JSON.parse(tokenPayload as string) : {};
        const result = await createMemoryFromBlob(
          {
            url: blob.url,
            pathname: blob.pathname,
            size: 0, // TODO: Get actual size from blob or client
            contentType: blob.contentType || 'application/octet-stream',
          },
          {
            allUserId: payload.allUserId,
            isOnboarding: payload.isOnboarding,
            mode: payload.mode,
          }
        );

        // If this is an image and memory creation was successful, enqueue image processing
        if (result.success && result.memoryId && blob.contentType?.startsWith('image/')) {
          console.log(`🖼️ Enqueueing image processing for memory ${result.memoryId}`);
          enqueueImageProcessing({
            memoryId: result.memoryId,
            originalBlobUrl: blob.url,
            originalPathname: blob.pathname,
            originalContentType: blob.contentType,
            originalSize: 0, // TODO: Get actual size
          });
        }
      } catch (e) {
        // don't throw; upload already succeeded. Log & alert.
        console.error('post-upload DB create failed', e);
      }
    },
  });

  return NextResponse.json(res);
}
