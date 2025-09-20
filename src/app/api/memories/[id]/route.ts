import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db/db';
import { eq, and } from 'drizzle-orm';
import { allUsers, memories } from '@/db/schema';

// Helper function to add storage status to memory (similar to gallery utils)
function addStorageStatusToMemory(memory: typeof memories.$inferSelect) {
  // Calculate storage status from the memory's own fields
  const hasNeonStorage = memory.storageLocations?.includes('neon-db') || false;
  const hasBlobStorage = memory.storageLocations?.includes('vercel-blob') || false;
  const hasIcpStorage = memory.storageLocations?.includes('icp-canister') || false;

  // Determine overall status
  let overallStatus: 'stored_forever' | 'partially_stored' | 'web2_only';
  if (hasIcpStorage) {
    overallStatus = 'stored_forever';
  } else if (hasNeonStorage || hasBlobStorage) {
    overallStatus = 'partially_stored';
  } else {
    overallStatus = 'web2_only';
  }

  return {
    ...memory,
    storageStatus: {
      metaNeon: hasNeonStorage,
      assetBlob: hasBlobStorage,
      metaIcp: hasIcpStorage,
      assetIcp: hasIcpStorage,
      overallStatus,
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
      console.error('No allUsers record found for user:', session.user.id);
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
    console.error('Error fetching memory:', error);
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
      console.error('No allUsers record found for user:', session.user.id);
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
    const { title, description, takenAt, isPublic, parentFolderId } = body;

    // Update memory
    const [updatedMemory] = await db
      .update(memories)
      .set({
        title: title || existingMemory.title,
        description: description !== undefined ? description : existingMemory.description,
        fileCreatedAt: takenAt ? new Date(takenAt) : existingMemory.fileCreatedAt,
        isPublic: isPublic !== undefined ? isPublic : existingMemory.isPublic,
        parentFolderId: parentFolderId !== undefined ? parentFolderId : existingMemory.parentFolderId,
        updatedAt: new Date(),
      })
      .where(eq(memories.id, memoryId))
      .returning();

    return NextResponse.json({
      success: true,
      data: updatedMemory,
    });
  } catch (error) {
    console.error('Error updating memory:', error);
    return NextResponse.json({ error: 'Failed to update memory' }, { status: 500 });
  }
}

// DELETE /api/memories/[id] - Delete memory - FIXED VERSION
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
      console.error('No allUsers record found for user:', session.user.id);
      return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    }

    const { id: memoryId } = await params;

    console.log(`🗑️ [Individual Route] Deleting memory: ${memoryId}`);

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
            storageBackend?: string;
            storageKey?: string;
            [key: string]: unknown;
          };
          [key: string]: unknown;
        }
      | null
      | undefined;

    console.log('🔧 DEBUG - Individual route memory data retrieved:', {
      found: !!memoryData,
      memoryId: memoryData?.id,
      type: memoryData?.type,
      hasMetadata: !!memoryData?.metadata,
      metadataKeys: memoryData?.metadata ? Object.keys(memoryData.metadata) : 'none',
      storageKey: typedMetadata?.custom?.storageKey,
      storageBackend: typedMetadata?.custom?.storageBackend,
    });

    if (!memoryData) {
      console.error(`❌ Memory not found: ${memoryId}`);
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }

    console.log(`📋 Individual route - Retrieved memory data for cleanup:`, {
      id: memoryData.id,
      type: memoryData.type,
      hasMetadata: !!typedMetadata,
      hasCustomMetadata: !!typedMetadata?.custom,
      storageBackend: typedMetadata?.custom?.storageBackend,
      storageKey: typedMetadata?.custom?.storageKey,
      memoryDataExists: !!memoryData,
    });

    // 2. THEN: Delete memory from database (this will cascade delete assets due to foreign key constraint)
    const deletedMemories = await db.delete(memories).where(eq(memories.id, memoryId)).returning();

    if (!deletedMemories || deletedMemories.length === 0) {
      console.error(`❌ Failed to delete memory: ${memoryId}`);
      return NextResponse.json({ error: 'Failed to delete memory' }, { status: 500 });
    }

    console.log(`✅ Individual route - Deleted memory from database: ${memoryId}`);

    // Debug: Log what we're about to pass to cleanup
    console.log('🔧 DEBUG - Individual route - About to call cleanup with:', {
      memoryId,
      memoryType: memoryData.type,
      memoryDataProvided: !!memoryData,
      memoryDataType: typeof memoryData,
      memoryDataId: memoryData?.id,
      isObjectWithId: typeof memoryData === 'object' && !!memoryData?.id,
    });

    // 3. FINALLY: Clean up storage edges with the pre-retrieved memory data
    const { cleanupStorageEdgesForMemory } = await import('../utils/memory-database');
    const cleanupResult = await cleanupStorageEdgesForMemory({
      memoryId,
      memoryType: memoryData.type as 'image' | 'video' | 'note' | 'document' | 'audio',
      memoryData, // Pass the complete memory data we retrieved BEFORE deletion
    });

    if (!cleanupResult.success) {
      console.error(`❌ Individual route - Storage cleanup failed for ${memoryId}:`, cleanupResult.error);
      // Don't fail the entire operation if cleanup fails
    } else {
      console.log(`✅ Individual route - Storage cleanup completed for ${memoryId}`, {
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
    console.error('Error deleting individual memory:', error);
    return NextResponse.json({ error: 'Failed to delete memory' }, { status: 500 });
  }
}
