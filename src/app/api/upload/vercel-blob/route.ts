import { NextResponse, NextRequest } from 'next/server';
import { handleUpload } from '@vercel/blob/client';

import { fatLogger } from '@/lib/logger';
// Centralized allowlist for file types
const ALLOWED = [
  'image/*',
  'video/*',
  'audio/*',
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

/**
 * Simplified Vercel Blob upload endpoint
 *
 * This endpoint ONLY handles the upload to Vercel Blob storage.
 * Database operations are handled by the unified /api/upload/complete endpoint.
 *
 * Flow:
 * 1. Client uploads file to this endpoint
 * 2. File is stored in Vercel Blob
 * 3. Client receives blob URL
 * 4. Client calls /api/upload/complete to create database records
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Pure upload handling - no database operations
    const res = await handleUpload({
      request: req,
      body,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: ALLOWED,
          maximumSizeInBytes: 5 * 1024 ** 4, // up to 5 TB
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async ({ blob }) => {
        // Minimal callback - just log the completion
        // Database operations are handled by client via /api/upload/complete
        fatLogger.info('✅ Vercel Blob upload completed:', 'be', {
          url: blob.url,
        });
      },
    });

    return NextResponse.json(res);
  } catch (error) {
    fatLogger.error('❌ Vercel Blob upload failed:', 'be', {
      data: error instanceof Error ? error : undefined,
    });
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
