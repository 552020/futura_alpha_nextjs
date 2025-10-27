import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db/db';
import { eq, and } from 'drizzle-orm';
import { memories, folders } from '@/db';
import { getAllUserRecord } from '@/services/user';

import { fatLogger } from '@/lib/logger';
import { deleteFolderAndContents } from '@/lib/usecases/folder/delete-folder-and-contents';
import { getMemoryWithRelations, attachStorageStatus } from '@/services/memory';
import { deleteMemoryWithCleanup } from '@/lib/usecases/memory/delete-memory-with-cleanup';

type CleanupMemoryData = {
  [key: string]: unknown;
  id: string;
  type: 'image' | 'video' | 'note' | 'document' | 'audio';
  metadata?: {
    [key: string]: unknown;
    custom?: {
      [key: string]: unknown;
      storageBackend?: string;
      storageKey?: string;
    };
  } | null;
  storageLocations?: string[];
  assets?: {
    [key: string]: unknown;
    assetLocation: string;
    storageKey: string;
    url?: string;
  }[];
};

// Folder deletion logic moved to usecase: deleteFolderAndContents

// Storage status helper moved to service: attachStorageStatus

// GET /api/memories/[id] - Get memory with all assets
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Debug environment variables
  fatLogger.info('🔍 [Memory API Debug] Environment variables:', 'be', {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    VERCEL_URL: process.env.VERCEL_URL,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
    AWS_ACCESS_KEY_ID: !!process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: !!process.env.AWS_SECRET_ACCESS_KEY,
    AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
    AWS_S3_REGION: process.env.AWS_S3_REGION,
  });

  try {
    // Get the allUserId for the authenticated user
    const allUserResult = await getAllUserRecord(session.user.id);
    if (!allUserResult.success || !allUserResult.data) {
      fatLogger.error('No allUsers record found for user:', 'be', { data: session.user.id });
      return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    }
    const allUserRecord = allUserResult.data as { id: string };

    const { id: memoryId } = await params;

    // Fetch memory with all assets via service
    const memoryResult = await getMemoryWithRelations(memoryId, allUserRecord.id, { assets: true });
    if (!memoryResult.success || !memoryResult.data) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }
    const memory = memoryResult.data as typeof memories.$inferSelect;

    if (!memory) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }

    // Add storage status to memory
    const attachResult = await attachStorageStatus(memory);
    const memoryWithStorageStatus =
      attachResult.success && attachResult.data
        ? attachResult.data
        : { ...memory, storageStatus: { storageLocations: [] } };

    return NextResponse.json({
      success: true,
      data: memoryWithStorageStatus,
    });
  } catch (error) {
    fatLogger.error('Error fetching memory:', 'be', { data: error instanceof Error ? error : undefined });
    return NextResponse.json({ error: 'Failed to fetch memory' }, { status: 500 });
  }
}

// PUT /api/memories/[id] - Update memory
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get the allUserId for the authenticated user
    const allUserResult = await getAllUserRecord(session.user.id);
    if (!allUserResult.success || !allUserResult.data) {
      fatLogger.error('No allUsers record found for user:', 'be', { data: session.user.id });
      return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    }
    const allUserRecord = allUserResult.data as { id: string };

    const { id: memoryId } = await params;

    // Check if memory exists and belongs to user via service
    const existingMemoryResult = await getMemoryWithRelations(memoryId, allUserRecord.id);
    if (!existingMemoryResult.success || !existingMemoryResult.data) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }
    const existingMemory = existingMemoryResult.data as typeof memories.$inferSelect;

    // Parse request body
    const body = await request.json();
    const { title, description, takenAt, isPublic, parentFolderId } = body as {
      title?: string;
      description?: string;
      takenAt?: string;
      isPublic?: boolean;
      parentFolderId?: string | null;
    };

    // Use service layer for update
    const { updateMemoryRecord } = await import('@/services/memory/memory-operations');

    const result = await updateMemoryRecord(memoryId, {
      title: title ?? existingMemory.title ?? undefined,
      description: description !== undefined ? description : (existingMemory.description ?? null),
      fileCreatedAt: takenAt ? new Date(takenAt) : (existingMemory.fileCreatedAt ?? null),
      sharingStatus: isPublic !== undefined ? (isPublic ? 'public' : 'private') : existingMemory.sharingStatus,
      parentFolderId: parentFolderId !== undefined ? parentFolderId : (existingMemory.parentFolderId ?? null),
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to update memory' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    fatLogger.error('Error updating memory:', 'be', { data: error instanceof Error ? error : undefined });
    return NextResponse.json({ error: 'Failed to update memory' }, { status: 500 });
  }
}

// DELETE /api/memories/[id] - Delete memory or folder - FIXED VERSION
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get the allUserId for the authenticated user
    const allUserResult = await getAllUserRecord(session.user.id);
    if (!allUserResult.success || !allUserResult.data) {
      fatLogger.error('No allUsers record found for user:', 'be', { data: session.user.id });
      return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    }
    const allUserRecord = allUserResult.data as { id: string };

    const { id: itemId } = await params;

    fatLogger.info(`🗑️ [Individual Route] Deleting item: ${itemId}`, 'be');

    // Strip 'folder-' prefix if present (frontend adds this prefix)
    const cleanId = itemId.startsWith('folder-') ? itemId.replace('folder-', '') : itemId;

    fatLogger.info(`🔍 [Individual Route] Clean ID: ${cleanId}`, 'be');

    // First, check if this is a folder by trying to find it in the folders table
    const folderCheck = await db.query.folders.findFirst({
      where: and(eq(folders.id, cleanId), eq(folders.ownerId, allUserRecord.id)),
    });

    if (folderCheck) {
      fatLogger.info(`📁 [Individual Route] Item is a folder, using folder deletion logic`, 'be');
      const result = await deleteFolderAndContents(cleanId, allUserRecord.id);
      if (!result.success) {
        return NextResponse.json({ error: result.error || 'Failed to delete folder' }, { status: 500 });
      }
      return NextResponse.json({
        success: true,
        message: 'Folder deleted successfully',
        deletedMemories: result.deletedMemories,
        cleanup: {
          deletedS3Objects: result.deletedS3Objects,
          deletedEdges: result.deletedEdges,
        },
      });
    }

    // If not a folder, treat as a memory
    const memoryId = cleanId;
    fatLogger.info(`🖼️ [Individual Route] Item is a memory, using memory deletion logic`, 'be');

    // 1. FIRST: Get the memory data BEFORE deletion (with all relations)
    const memoryDataResult = await getMemoryWithRelations(memoryId, allUserRecord.id, { assets: true, folder: true });
    const memoryData = memoryDataResult.success ? (memoryDataResult.data as CleanupMemoryData) : null;

    // Debug: Log what we retrieved
    const typedMetadata = memoryData?.metadata as
      | {
          custom?: {
            assetLocation?: string;
            storageKey?: string;
            [key: string]: unknown;
          };
          [key: string]: unknown;
        }
      | null
      | undefined;

    fatLogger.info('🔧 DEBUG - Individual route memory data retrieved:', 'be', {
      found: !!memoryData,
      memoryId: memoryData?.id,
      type: memoryData?.type,
      hasMetadata: !!memoryData?.metadata,
      metadataKeys: memoryData?.metadata ? Object.keys(memoryData.metadata) : 'none',
      storageKey: typedMetadata?.custom?.storageKey,
      assetLocation: typedMetadata?.custom?.assetLocation,
    });

    if (!memoryData) {
      fatLogger.error(`❌ Memory not found: ${memoryId}`, 'be');
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }

    fatLogger.info(`📋 Individual route - Retrieved memory data for cleanup:`, 'be', {
      id: memoryData.id,
      type: memoryData.type,
      hasMetadata: !!typedMetadata,
      hasCustomMetadata: !!typedMetadata?.custom,
      assetLocation: typedMetadata?.custom?.assetLocation,
      storageKey: typedMetadata?.custom?.storageKey,
      memoryDataExists: !!memoryData,
    });

    // Use usecase to delete memory and cleanup
    const result = await deleteMemoryWithCleanup(memoryId, allUserRecord.id);

    if (!result.success) {
      fatLogger.error(`❌ Failed to delete memory: ${memoryId}`, 'be');
      return NextResponse.json({ error: result.error || 'Failed to delete memory' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Memory deleted successfully',
      cleanup: {
        success: result.cleanup?.success ?? false,
        deletedS3Objects: result.cleanup?.deletedS3Objects ?? 0,
        deletedEdges: result.cleanup?.deletedEdges ?? 0,
      },
    });
  } catch (error) {
    fatLogger.error('Error deleting individual memory:', 'be', { data: error instanceof Error ? error : undefined });
    return NextResponse.json({ error: 'Failed to delete memory' }, { status: 500 });
  }
}
