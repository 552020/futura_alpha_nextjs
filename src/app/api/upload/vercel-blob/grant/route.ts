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
import { detectMemoryType } from '@/utils/memory-type';

import { fatLogger } from '@/lib/logger';
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
  fatLogger.warn(
    '⚠️  DEPRECATED: /api/upload/vercel-blob/grant is deprecated. Use /api/upload/vercel-blob + /api/upload/complete instead.',
    'be'
  );

  // who's uploading?
  const user = await getAllUserId(req);
  if (!user?.allUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json()) as HandleUploadBody & {
    clientPayload?: string;
  };
  fatLogger.info('🔍 Raw request body keys:', 'be', {
    keys: Object.keys(body),
  });
  fatLogger.info('🔍 Raw clientPayload value:', 'be', {
    clientPayload: body.clientPayload,
  });

  // Extract client payload from the request body
  const clientPayload = body.clientPayload
    ? JSON.parse(body.clientPayload)
    : {};
  fatLogger.info('📦 Client payload received:', 'be', clientPayload);

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
      fatLogger.info('🎉 onUploadCompleted callback triggered!', 'be', {
        blob: blob.url,
        tokenPayload,
      });
      // persist in DB
      try {
        const payload = tokenPayload ? JSON.parse(tokenPayload as string) : {};
        fatLogger.info('📦 Parsed token payload:', payload);

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

        fatLogger.info('Memory creation result', 'be', { result });

        // Store the memory ID to return to client
        if (result.success && result.memoryId) {
          createdMemoryId = result.memoryId;
        }

        // If this is an image and memory creation was successful, enqueue image processing
        if (
          result.success &&
          result.memoryId &&
          blob.contentType &&
          detectMemoryType(blob.contentType) === 'image'
        ) {
          fatLogger.info(
            `🖼️ Enqueueing image processing for memory ${result.memoryId}`,
            'be'
          );
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
        fatLogger.error('❌ post-upload DB create failed', 'be', { data: e });
      }
    },
  });

  // Add the created memory ID to the response
  return NextResponse.json({
    ...res,
    memoryId: createdMemoryId,
  });
}
