// src/nextjs/src/app/api/memories/grant/route.ts
//
// ⚠️  DEPRECATED: This endpoint is deprecated in favor of the new unified architecture:
// - Use /api/upload/vercel-blob for uploads only
// - Use /api/upload/complete for database operations
//
// This endpoint will be removed in a future version.
//
import { NextResponse, NextRequest } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { getAllUserId } from '@/app/api/memories/utils/user-management';
import { createMemoryFromBlob } from '@/app/api/memories/utils/memory-creation';
import { enqueueImageProcessing } from '@/app/api/memories/utils/image-processing-workflow';

import { logger } from '@/lib/logger';
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
  // Log deprecation warning
  logger.warn(
    '⚠️  DEPRECATED: /api/upload/vercel-blob/grant is deprecated. Use /api/upload/vercel-blob + /api/upload/complete instead.'
  );

  // who's uploading?
  const user = await getAllUserId(req);
  if (!user?.allUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json()) as HandleUploadBody & { clientPayload?: string };
  logger.info('🔍 Raw request body keys:', undefined, { keys: Object.keys(body) });
  logger.info('🔍 Raw clientPayload value:', undefined, { clientPayload: body.clientPayload });

  // Extract client payload from the request body
  const clientPayload = body.clientPayload ? JSON.parse(body.clientPayload) : {};
  logger.info('📦 Client payload received:', clientPayload);

  // Store memory ID to return to client
  let createdMemoryId: string | undefined;

  const res = await handleUpload({
    request: req,
    body,
    onBeforeGenerateToken: async () => {
      return {
        allowedContentTypes: ALLOWED,
        maximumSizeInBytes: 5 * 1024 ** 4, // up to 5 TB
        addRandomSuffix: true,
        tokenPayload: JSON.stringify({
          allUserId: user.allUserId,
          isOnboarding: !!clientPayload.isOnboarding,
          mode: clientPayload.mode || 'files',
          existingUserId: clientPayload.existingUserId,
        }),
      };
    },
    onUploadCompleted: async ({ blob, tokenPayload }) => {
      logger.info('🎉 onUploadCompleted callback triggered!', undefined, { blob: blob.url, tokenPayload });
      // persist in DB
      try {
        const payload = tokenPayload ? JSON.parse(tokenPayload as string) : {};
        logger.info('📦 Parsed token payload:', payload);

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

        logger.info('Memory creation result', { result });

        // Store the memory ID to return to client
        if (result.success && result.memoryId) {
          createdMemoryId = result.memoryId;
        }

        // If this is an image and memory creation was successful, enqueue image processing
        if (result.success && result.memoryId && blob.contentType?.startsWith('image/')) {
          logger.info(`🖼️ Enqueueing image processing for memory ${result.memoryId}`);
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
        logger.error('❌ post-upload DB create failed', undefined, { data: e });
      }
    },
  });

  // Add the created memory ID to the response
  return NextResponse.json({
    ...res,
    memoryId: createdMemoryId,
  });
}
