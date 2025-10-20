import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db/db';
import { eq, and } from 'drizzle-orm';
import { allUsers, memories, storageEdges, folders } from '@/db';

import { fatLogger } from '@/lib/logger';

// Helper function to handle folder deletion
async function handleFolderDeletion(folderId: string, ownerId: string) {
  try {
    fatLogger.info(`🗑️ [Folder Deletion] Starting deletion for folder: ${folderId}`, 'be');

    // 1. Check if folder exists and belongs to user
    const folder = await db.query.folders.findFirst({
      where: and(eq(folders.id, folderId), eq(folders.ownerId, ownerId)),
    });

    if (!folder) {
      fatLogger.error(`❌ Folder not found: ${folderId}`, 'be');
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    // 2. Get all memories in this folder
    const memoriesToDelete = await db.query.memories.findMany({
      where: and(eq(memories.parentFolderId, folderId), eq(memories.ownerId, ownerId)),
      with: {
        assets: true,
      },
    });

    fatLogger.info(`📋 [Folder Deletion] Found ${memoriesToDelete.length} memories to delete`, 'be');

    // 3. Delete all memories in the folder
    let deletedMemoriesCount = 0;
    let totalDeletedS3Objects = 0;
    let totalDeletedEdges = 0;

    for (const memory of memoriesToDelete) {
      try {
        // Delete memory from database
        await db.delete(memories).where(eq(memories.id, memory.id));

        // Clean up storage edges
        const { cleanupStorageEdgesForMemory } = await import('../utils/memory-database');
        const cleanupResult = await cleanupStorageEdgesForMemory({
          memoryId: memory.id,
          memoryType: memory.type as 'image' | 'video' | 'note' | 'document' | 'audio',
          memoryData: memory,
        });

        if (cleanupResult.success) {
          totalDeletedS3Objects += cleanupResult.deletedS3Count || 0;
          totalDeletedEdges += cleanupResult.deletedCount || 0;
        }

        deletedMemoriesCount++;
      } catch (error) {
        fatLogger.error(`❌ Failed to delete memory ${memory.id}:`, 'be', {
          data: error instanceof Error ? error : undefined,
        });
      }
    }

    // 4. Delete the folder itself
    await db.delete(folders).where(eq(folders.id, folderId));

    fatLogger.info(`✅ [Folder Deletion] Completed for ${folderId}`, 'be', {
      deletedMemories: deletedMemoriesCount,
      deletedS3Objects: totalDeletedS3Objects,
      deletedEdges: totalDeletedEdges,
    });

    return NextResponse.json({
      success: true,
      message: 'Folder deleted successfully',
      deletedMemories: deletedMemoriesCount,
      cleanup: {
        deletedS3Objects: totalDeletedS3Objects,
        deletedEdges: totalDeletedEdges,
      },
    });
  } catch (error) {
    fatLogger.error('❌ [Folder Deletion] Error:', 'be', {
      folderId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: 'Failed to delete folder',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// Helper function to add storage status to memory by querying storageEdges table
async function addStorageStatusToMemory(memory: typeof memories.$inferSelect) {
  fatLogger.info(`🔍 [STORAGE STATUS] Fetching storage status for memory: ${memory.id}`, 'be', {
    memoryId: memory.id,
    memoryType: memory.type,
    memoryTitle: memory.title,
  });

  // Query storageEdges table to get actual storage locations
  const edges = await db.query.storageEdges.findMany({
    where: and(eq(storageEdges.memoryId, memory.id), eq(storageEdges.present, true)),
  });

  fatLogger.info(`🔍 [STORAGE STATUS] Memory ${memory.id} - Found ${edges.length} storage edges:`, 'be', {
    memoryId: memory.id,
    edgesCount: edges.length,
    edges: edges.map(edge => ({
      id: edge.id,
      artifact: edge.artifact,
      locationMetadata: edge.locationMetadata,
      locationAsset: edge.locationAsset,
      present: edge.present,
      locationUrl: edge.locationUrl,
    })),
  });

  // Extract unique storage locations from the edges
  const storageLocations = new Set<string>();

  edges.forEach(edge => {
    // Add metadata location if present
    if (edge.locationMetadata) {
      storageLocations.add(edge.locationMetadata);
    }
    // Add asset location if present
    if (edge.locationAsset) {
      storageLocations.add(edge.locationAsset);
    }
  });

  const finalLocations = Array.from(storageLocations);

  if (finalLocations.length === 0) {
    fatLogger.warn(`⚠️ [STORAGE STATUS] Memory ${memory.id} - NO STORAGE LOCATIONS FOUND!`, 'be', {
      memoryId: memory.id,
      memoryType: memory.type,
      memoryTitle: memory.title,
      edgesCount: edges.length,
      finalLocations: finalLocations,
      edges: edges.map(edge => ({
        artifact: edge.artifact,
        locationMetadata: edge.locationMetadata,
        locationAsset: edge.locationAsset,
        present: edge.present,
      })),
    });
  } else {
    fatLogger.info(`✅ [STORAGE STATUS] Memory ${memory.id} - Storage locations found:`, 'be', {
      memoryId: memory.id,
      memoryType: memory.type,
      memoryTitle: memory.title,
      finalLocations: finalLocations,
      edgesCount: edges.length,
    });
  }

  return {
    ...memory,
    storageStatus: {
      storageLocations: finalLocations,
    },
  };
}

// GET /api/memories/[id] - Get memory with all assets
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get the allUserId for the authenticated user
    const allUserRecord = await db.query.allUsers.findFirst({
      where: eq(allUsers.userId, session.user.id),
    });

    if (!allUserRecord) {
      fatLogger.error('No allUsers record found for user:', 'be', { data: session.user.id });
      return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    }

    const { id: memoryId } = await params;

    // Fetch memory with all assets
    const memory = await db.query.memories.findFirst({
      where: and(eq(memories.id, memoryId), eq(memories.ownerId, allUserRecord.id)),
      with: {
        assets: true,
      },
    });

    if (!memory) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }

    // Add storage status to memory
    const memoryWithStorageStatus = await addStorageStatusToMemory(memory);

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
    const allUserRecord = await db.query.allUsers.findFirst({
      where: eq(allUsers.userId, session.user.id),
    });

    if (!allUserRecord) {
      fatLogger.error('No allUsers record found for user:', 'be', { data: session.user.id });
      return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    }

    const { id: memoryId } = await params;

    // Check if memory exists and belongs to user
    const existingMemory = await db.query.memories.findFirst({
      where: and(eq(memories.id, memoryId), eq(memories.ownerId, allUserRecord.id)),
    });

    if (!existingMemory) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }

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
    const allUserRecord = await db.query.allUsers.findFirst({
      where: eq(allUsers.userId, session.user.id),
    });

    if (!allUserRecord) {
      fatLogger.error('No allUsers record found for user:', 'be', { data: session.user.id });
      return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    }

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
      return await handleFolderDeletion(cleanId, allUserRecord.id);
    }

    // If not a folder, treat as a memory
    const memoryId = cleanId;
    fatLogger.info(`🖼️ [Individual Route] Item is a memory, using memory deletion logic`, 'be');

    // 1. FIRST: Get the memory data BEFORE deletion (with all relations)
    const memoryData = await db.query.memories.findFirst({
      where: and(eq(memories.id, memoryId), eq(memories.ownerId, allUserRecord.id)),
      with: {
        assets: true,
        folder: true,
      },
    });

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

    // 2. THEN: Delete memory from database (this will cascade delete assets due to foreign key constraint)
    const deletedMemories = await db.delete(memories).where(eq(memories.id, memoryId)).returning();

    if (!deletedMemories || deletedMemories.length === 0) {
      fatLogger.error(`❌ Failed to delete memory: ${memoryId}`, 'be');
      return NextResponse.json({ error: 'Failed to delete memory' }, { status: 500 });
    }

    fatLogger.info(`✅ Individual route - Deleted memory from database: ${memoryId}`, 'be');

    // Debug: Log what we're about to pass to cleanup
    fatLogger.info('🔧 DEBUG - Individual route - About to call cleanup with:', 'be', {
      memoryId,
      memoryType: memoryData.type,
      memoryDataProvided: !!memoryData,
      memoryDataType: typeof memoryData,
      memoryDataId: memoryData?.id,
      isObjectWithId: typeof memoryData === 'object' && !!memoryData?.id,
    });

    // 3. FINALLY: Clean up storage edges with the pre-retrieved memory data
    const { cleanupMemoryAndStorage } = await import('@/lib/usecases/memory/cleanup-memory-and-storage');
    const cleanupResult = await cleanupMemoryAndStorage({
      memoryId,
      memoryType: memoryData.type as 'image' | 'video' | 'note' | 'document' | 'audio',
      memoryData, // Pass the complete memory data we retrieved BEFORE deletion
    });

    if (!cleanupResult.success) {
      fatLogger.error(`❌ Individual route - Storage cleanup failed for ${memoryId}:`, 'be', {
        data: cleanupResult.error,
      });
      // Don't fail the entire operation if cleanup fails
    } else {
      fatLogger.info(`✅ Individual route - Storage cleanup completed for ${memoryId}`, 'be', {
        deletedS3Objects: cleanupResult.deletedS3Count,
        deletedEdges: cleanupResult.deletedCount,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Memory deleted successfully',
      cleanup: {
        success: cleanupResult.success,
        deletedS3Objects: cleanupResult.deletedS3Count || 0,
        deletedEdges: cleanupResult.deletedCount || 0,
      },
    });
  } catch (error) {
    fatLogger.error('Error deleting individual memory:', 'be', { data: error instanceof Error ? error : undefined });
    return NextResponse.json({ error: 'Failed to delete memory' }, { status: 500 });
  }
}
