import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db/db';
import { memories, memoryAssets, allUsers, type MemoryType, type AssetType, type ProcessingStatus } from '@/db';
import { randomBytes } from 'crypto';
import { randomUUID } from 'crypto';
import { eq, and } from 'drizzle-orm';
import { fatLogger } from '@/lib/logger';
import { detectMemoryType } from '@/utils/memory-type';
import { createTemporaryUser } from '@/services/user';
// Drizzle ORM imports are used in the where clause

interface FileMetadata {
  width?: number;
  height?: number;
  [key: string]: string | number | boolean | null | undefined;
}

// New parallel processing format
interface FinalizeAsset {
  assetType: AssetType;
  assetLocation?: 's3' | 'vercel_blob' | 'icp' | 'arweave' | 'ipfs' | 'neon';
  storageKey?: string;
  bytes?: number;
  width?: number;
  height?: number;
  mimeType?: string;
  processingStatus: ProcessingStatus;
  url?: string; // URL for the asset (data URL for placeholders, S3 URL for others)
}

interface FinalizeRequest {
  memoryId: string;
  assets: FinalizeAsset[];
  parentFolderId?: string;
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

  // Format 3: New parallel processing format
  memoryId?: string;
  assets?: FinalizeAsset[];
}

export async function POST(request: Request) {
  try {
    fatLogger.info('Starting upload complete request', 'be');

    // Check for onboarding query parameter
    const url = new URL(request.url);
    const isOnboarding = url.searchParams.get('onboarding') === 'true';

    if (isOnboarding) {
      fatLogger.info('Handling onboarding request (no auth required)', 'be');
      return await handleOnboardingComplete(request);
    }

    // Existing authenticated logic
    const session = await auth();
    if (!session?.user?.id) {
      fatLogger.error('No session or user ID', 'be');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    fatLogger.info('User authenticated:', 'be', { userId });

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
    fatLogger.info('Request data:', 'be', { requestData });

    // Handle new parallel processing format (Format 3)
    if (requestData.memoryId && requestData.assets) {
      fatLogger.info('Using Format 3 (parallel processing)', 'be');
      return await handleParallelProcessingFinalize(requestData as FinalizeRequest, allUserId);
    }

    // Handle legacy formats (Format 1 & 2)
    fatLogger.info('Using legacy format (Format 1 or 2)', 'be');
    return await handleLegacyComplete(requestData, allUserId);
  } catch (error) {
    fatLogger.error('Error in upload complete:', 'be', { error });
    fatLogger.error('Error message:', 'be', { error: error instanceof Error ? error.message : 'Unknown error' });
    fatLogger.error('Error stack:', 'be', { error: error instanceof Error ? error.stack : 'No stack trace' });
    fatLogger.error('Error completing upload:', 'be', { data: error instanceof Error ? error : undefined });
    return NextResponse.json({ error: 'Failed to complete upload' }, { status: 500 });
  }
}

/**
 * Handle new parallel processing finalize format
 */
async function handleParallelProcessingFinalize(request: FinalizeRequest, allUserId: string) {
  const { memoryId, assets, parentFolderId } = request;

  fatLogger.info(`🔄 Processing parallel finalize for memory: ${memoryId} with ${assets.length} assets`, 'be');
  if (parentFolderId) {
    fatLogger.info(`📁 Linking memory to folder: ${parentFolderId}`, 'be');
  }

  // Verify the memory exists and belongs to the user
  const existingMemory = await db.query.memories.findFirst({
    where: (memories, { eq, and: andFn }) => {
      return andFn(eq(memories.id, memoryId), eq(memories.ownerId, allUserId));
    },
  });

  if (!existingMemory) {
    return NextResponse.json({ error: 'Memory not found or access denied' }, { status: 404 });
  }

  // Update memory with parentFolderId if provided
  if (parentFolderId) {
    await db
      .update(memories)
      .set({
        parentFolderId: parentFolderId,
        updatedAt: new Date(),
      })
      .where(eq(memories.id, memoryId));

    fatLogger.info(`✅ Updated memory ${memoryId} with parentFolderId: ${parentFolderId}`, 'be');
  }

  // Process each asset with idempotent upserts
  const processedAssets = [];

  for (const asset of assets) {
    try {
      // Check if asset already exists
      const existingAsset = await db.query.memoryAssets.findFirst({
        where: (memoryAssets, { eq, and: andFn }) => {
          return andFn(eq(memoryAssets.memoryId, memoryId), eq(memoryAssets.assetType, asset.assetType));
        },
      });

      if (existingAsset) {
        // Update existing asset
        await db
          .update(memoryAssets)
          .set({
            processingStatus: asset.processingStatus,
            processingError: asset.processingStatus === 'failed' ? 'Processing failed' : null,
            assetLocation: asset.assetLocation || existingAsset.assetLocation,
            storageKey: asset.storageKey || existingAsset.storageKey,
            bytes: asset.bytes || existingAsset.bytes,
            width: asset.width || existingAsset.width,
            height: asset.height || existingAsset.height,
            mimeType: asset.mimeType || existingAsset.mimeType,
            url: asset.url || existingAsset.url, // Use url field for all assets
            updatedAt: new Date(),
          })
          .where(and(eq(memoryAssets.memoryId, memoryId), eq(memoryAssets.assetType, asset.assetType)));

        fatLogger.info(`✅ Updated existing asset: ${asset.assetType} -> ${asset.processingStatus}`, 'be');
      } else {
        // Create new asset
        const assetId = randomUUID();

        await db.insert(memoryAssets).values({
          id: assetId,
          memoryId: memoryId,
          assetType: asset.assetType,
          variant: null,
          url: asset.url || '', // Use url field for all assets
          assetLocation: asset.assetLocation || 's3',
          storageKey: asset.storageKey || '',
          bucket: process.env.AWS_S3_BUCKET || 'futura0',
          bytes: asset.bytes || 0,
          width: asset.width || null,
          height: asset.height || null,
          mimeType: asset.mimeType || 'application/octet-stream',
          processingStatus: asset.processingStatus,
          processingError: asset.processingStatus === 'failed' ? 'Processing failed' : null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        fatLogger.info(`✅ Created new asset: ${asset.assetType} -> ${asset.processingStatus}`, 'be');
      }

      processedAssets.push({
        assetType: asset.assetType,
        processingStatus: asset.processingStatus,
        url: asset.url,
      });
    } catch (error) {
      fatLogger.error(`❌ Failed to process asset ${asset.assetType}:`, 'be', {
        data: error instanceof Error ? error : undefined,
      });
      // Continue processing other assets even if one fails
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      memoryId: memoryId,
      assets: processedAssets,
    },
  });
}

/**
 * Handle legacy complete formats (backward compatibility)
 */
async function handleLegacyComplete(requestData: CompleteUploadRequest, allUserId: string) {
  fatLogger.info('Starting handleLegacyComplete with allUserId:', 'be', { allUserId });
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
        fatLogger.warn('Failed to parse token data', 'be', { error: e instanceof Error ? e : undefined });
      }
    }
  } else {
    return NextResponse.json(
      {
        error:
          'Invalid request format. Must include either (token, url, size, mimeType) or (fileKey, originalName, size, type) or (memoryId, assets)',
      },
      { status: 400 }
    );
  }

  if (!size) {
    fatLogger.error('Missing required field: size', 'be');
    return NextResponse.json({ error: 'Missing required field: size' }, { status: 400 });
  }

  fatLogger.info('Parsed request data:', 'be', { fileKey, originalName, size, mimeType, metadata });

  // Determine memory type from content type or file extension
  const memoryType: MemoryType = detectMemoryType(mimeType, originalName);

  // Construct the file URL based on storage backend
  let fileUrl: string;
  if (metadata.storageBackend === 's3' && metadata.storageKey) {
    fileUrl = `https://${process.env.AWS_S3_BUCKET || 'futura0'}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${metadata.storageKey}`;
  } else {
    fileUrl = requestData.url || `/${fileKey}`;
  }
  const memoryId = randomUUID();
  fatLogger.info('Generated memoryId:', 'be', { memoryId });

  // Create memory record
  fatLogger.info('About to create memory record in database', 'be');
  try {
    await db
      .insert(memories)
      .values({
        id: memoryId,
        ownerId: allUserId,
        type: memoryType,
        title: originalName.split('.')[0] || 'Untitled',
        description: '',
        fileCreatedAt: new Date(),
        sharingStatus: 'private',
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
        storageDuration: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      })
      .returning();
    fatLogger.info('Memory record created successfully', 'be');
  } catch (error) {
    fatLogger.error('Error creating memory record:', 'be', { error });
    throw error;
  }

  // Create asset record
  fatLogger.info('About to create asset record in database', 'be');
  try {
    await db.insert(memoryAssets).values({
      memoryId: memoryId,
      assetType: 'original',
      variant: null,
      url: fileUrl,
      assetLocation: 's3',
      storageKey: fileKey,
      bucket: process.env.AWS_S3_BUCKET || 'futura0',
      bytes: size,
      width: metadata.width ? Number(metadata.width) : null,
      height: metadata.height ? Number(metadata.height) : null,
      mimeType: mimeType,
      processingStatus: 'completed' as const,
      processingError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    fatLogger.info('Asset record created successfully', 'be');
  } catch (error) {
    fatLogger.error('Error creating asset record:', 'be', { error });
    throw error;
  }

  fatLogger.info('Both memory and asset records created successfully', 'be');

  // Create storage edges for the memory
  try {
    fatLogger.info('Creating storage edges for memory:', 'be', { memoryId });
    const { createMemoryStorageEdges } = await import('@/lib/usecases/memory/create-memory-storage-edges');

    const storageEdgeResult = await createMemoryStorageEdges({
      memoryId: memoryId,
      memoryType: memoryType,
      url: fileUrl,
      size: size,
      contentHash: undefined, // Legacy format doesn't provide content hash
    });

    if (!storageEdgeResult.success) {
      fatLogger.error('Failed to create storage edges:', 'be', { error: storageEdgeResult.error });
      // Don't fail the entire operation if storage edges fail
    } else {
      fatLogger.info('Storage edges created successfully:', 'be', {
        metadataEdge: Array.isArray(storageEdgeResult.metadataEdge)
          ? storageEdgeResult.metadataEdge[0]?.id
          : storageEdgeResult.metadataEdge?.id,
        assetEdge: Array.isArray(storageEdgeResult.assetEdge)
          ? storageEdgeResult.assetEdge[0]?.id
          : storageEdgeResult.assetEdge?.id,
      });
    }
  } catch (error) {
    fatLogger.error('Error creating storage edges:', 'be', { error });
    // Don't fail the entire operation if storage edges fail
  }
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
          assetLocation: 's3',
          storageKey: fileKey,
        },
      ],
      // Include other required fields
      type: memoryType,
      title: originalName.split('.')[0] || 'Untitled',
      description: '',
      fileCreatedAt: new Date().toISOString(),
      sharingStatus: 'private',
      parentFolderId: null,
      tags: [],
      recipients: [],
      unlockDate: null,
      metadata: {},
      createdAt: new Date().toISOString(),
    },
  });
}

/**
 * Handle onboarding complete request (no authentication required)
 */
async function handleOnboardingComplete(request: Request) {
  try {
    const { blobUrl, metadata } = await request.json();

    if (!blobUrl) {
      return NextResponse.json({ error: 'Blob URL is required' }, { status: 400 });
    }

    // Create temporary user using service
    const tempUserResult = await createTemporaryUser({
      name: 'Temporary User',
      email: 'temp@example.com',
    });

    if (!tempUserResult.success || !tempUserResult.data) {
      fatLogger.error('Failed to create temporary user:', 'be', { error: tempUserResult.error });
      return NextResponse.json({ error: 'Failed to create temporary user' }, { status: 500 });
    }

    const { tempUserId, allUserId } = tempUserResult.data;
    const memoryId = randomUUID();

    fatLogger.info('Created temporary user:', 'be', {
      tempUserId,
      allUserId,
    });

    // Determine memory type from metadata
    const memoryType = detectMemoryType(
      metadata?.mimeType || 'application/octet-stream',
      metadata?.title || 'Untitled'
    );

    // Create memory record
    await db.insert(memories).values({
      id: memoryId,
      ownerId: allUserId,
      type: memoryType,
      title: metadata?.title || 'Untitled',
      description: metadata?.description || '',
      fileCreatedAt: new Date(),
      sharingStatus: 'private',
      ownerSecureCode: randomBytes(16).toString('hex'),
      parentFolderId: null,
      tags: [],
      recipients: [],
      unlockDate: null,
      metadata: {
        originalPath: metadata?.title || 'Untitled',
        custom: metadata || {},
      },
      storageDuration: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });

    // Create asset record
    await db.insert(memoryAssets).values({
      id: randomUUID(),
      memoryId: memoryId,
      assetType: 'original',
      variant: null,
      url: blobUrl,
      assetLocation: 'vercel_blob',
      storageKey: blobUrl.split('/').pop() || '',
      bucket: 'vercel-blob',
      bytes: metadata?.size || 0,
      width: metadata?.width || null,
      height: metadata?.height || null,
      mimeType: metadata?.mimeType || 'application/octet-stream',
      processingStatus: 'completed',
      processingError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      ok: true,
      memoryId,
      tempUserId,
      allUserId, // ← Return the allUserId to frontend
    });
  } catch (error) {
    fatLogger.error('Error creating onboarding memory:', 'be', { error });
    return NextResponse.json({ error: 'Failed to create memory' }, { status: 500 });
  }
}
