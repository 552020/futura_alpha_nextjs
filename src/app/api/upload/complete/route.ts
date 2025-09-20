import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db/db';
import { memories, memoryAssets, allUsers, type MemoryType } from '@/db/schema';
import { randomBytes } from 'crypto';
import { randomUUID } from 'crypto';
// Drizzle ORM imports are used in the where clause

interface FileMetadata {
  width?: number;
  height?: number;
  [key: string]: string | number | boolean | null | undefined;
}

interface CompleteUploadRequest {
  // Format 1: From /api/upload/complete
  token?: string;
  url?: string;
  size?: number;
  mimeType?: string;
  metadata?: FileMetadata & {
    originalName?: string;
    uploadedAt?: string;
    userId?: string;
    isOnboarding?: boolean;
    storageBackend?: string;
    storageKey?: string;
  };

  // Format 2: From /api/memories/complete
  fileKey?: string;
  originalName?: string;
  type?: string;
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Check if the user exists in the all_user table
    const existingUser = await db.query.allUsers.findFirst({
      where: (users, { eq, and: andFn }) => {
        if (!userId) return undefined;
        return andFn(eq(users.userId, userId), eq(users.type, 'user'));
      },
    });

    let allUserId: string;

    if (existingUser) {
      allUserId = existingUser.id;
    } else {
      // Create a new all_user record for this user
      const newUserId = randomUUID();
      await db.insert(allUsers).values({
        id: newUserId,
        type: 'user',
        userId: userId,
        createdAt: new Date(),
      });
      allUserId = newUserId;
    }

    const requestData = (await request.json()) as CompleteUploadRequest;

    // Handle both request formats
    let fileKey: string;
    let originalName: string;
    let size: number;
    let mimeType: string;
    const metadata = requestData.metadata || {};

    if (requestData.token && requestData.url) {
      // Format 1: From /api/upload/complete
      fileKey = requestData.url.split('/').pop() || '';
      originalName = metadata.originalName || fileKey;
      size = requestData.size!;
      mimeType = requestData.mimeType!;
    } else if (requestData.fileKey) {
      // Format 2: From /api/memories/complete
      fileKey = requestData.fileKey;
      originalName = requestData.originalName || fileKey;
      size = requestData.size!;
      mimeType = requestData.type || 'application/octet-stream';

      // Extract userId from token if available
      if (requestData.token) {
        try {
          const tokenData = JSON.parse(requestData.token);
          metadata.userId = tokenData.userId || metadata.userId;
        } catch (e) {
          console.warn('Failed to parse token data', e);
        }
      }
    } else {
      return NextResponse.json(
        {
          error:
            'Invalid request format. Must include either (token, url, size, mimeType) or (fileKey, originalName, size, type)',
        },
        { status: 400 }
      );
    }

    if (!size) {
      return NextResponse.json({ error: 'Missing required field: size' }, { status: 400 });
    }

    // Determine memory type from content type or file extension
    const memoryType: MemoryType = mimeType.startsWith('image/')
      ? 'image'
      : mimeType.startsWith('video/')
        ? 'video'
        : mimeType.startsWith('audio/')
          ? 'audio'
          : originalName.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)
            ? 'image'
            : originalName.match(/\.(mp4|webm|mov|avi|wmv|flv|mkv)$/i)
              ? 'video'
              : originalName.match(/\.(mp3|wav|ogg|m4a|flac|aac)$/i)
                ? 'audio'
                : 'document';

    // Construct the file URL based on storage backend
    let fileUrl: string;
    if (metadata.storageBackend === 's3' && metadata.storageKey) {
      fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${metadata.storageKey}`;
    } else {
      fileUrl = requestData.url || `/${fileKey}`;
    }
    const memoryId = randomUUID();

    // Create memory record
    await db
      .insert(memories)
      .values({
        id: memoryId,
        ownerId: allUserId,
        type: memoryType,
        title: originalName.split('.')[0] || 'Untitled',
        description: '',
        fileCreatedAt: new Date(),
        isPublic: false,
        ownerSecureCode: randomBytes(16).toString('hex'),
        parentFolderId: null,
        tags: [],
        recipients: [],
        unlockDate: null,
        metadata: {
          originalPath: originalName,
          custom: Object.entries(metadata).reduce<Record<string, unknown>>((acc, [key, value]) => {
            if (key !== 'width' && key !== 'height') {
              acc[key] = value;
            }
            return acc;
          }, {}),
        },
        storageLocations: ['aws-s3'],
        storageDuration: null,
        storageCount: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      })
      .returning();

    // Create asset record
    await db.insert(memoryAssets).values({
      memoryId: memoryId,
      assetType: 'original',
      variant: null,
      url: fileUrl,
      storageBackend: 's3',
      storageKey: fileKey,
      bucket: process.env.S3_BUCKET_NAME || 'default-bucket',
      bytes: size,
      width: metadata.width ? Number(metadata.width) : null,
      height: metadata.height ? Number(metadata.height) : null,
      mimeType: mimeType,
      processingStatus: 'completed' as const,
      processingError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      data: {
        id: memoryId,
        assets: [
          {
            id: `asset-${memoryId}`,
            assetType: 'original',
            url: fileUrl,
            bytes: size,
            mimeType: mimeType,
            storageBackend: 's3',
            storageKey: fileKey,
          },
        ],
        // Include other required fields
        type: memoryType,
        title: originalName.split('.')[0] || 'Untitled',
        description: '',
        fileCreatedAt: new Date().toISOString(),
        isPublic: false,
        parentFolderId: null,
        tags: [],
        recipients: [],
        unlockDate: null,
        metadata: {},
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error completing upload:', error);
    return NextResponse.json({ error: 'Failed to complete upload' }, { status: 500 });
  }
}
