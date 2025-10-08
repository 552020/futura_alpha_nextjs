/**
 * MEMORY DELETION HANDLER
 *
 * This module handles memory deletion operations:
 * - Bulk delete all memories for a user
 * - Delete memories by type
 * - Clean up storage edges
 * - Handle cascading deletions
 *
 * USAGE:
 * - DELETE /api/memories?all=true - Delete all memories
 * - DELETE /api/memories?type=image - Delete all images
 * - DELETE /api/memories?type=video - Delete all videos
 * - DELETE /api/memories?folder=<folderName> - Delete all memories in folder
 *
 * SECURITY:
 * - Only deletes memories owned by the authenticated user
 * - Validates user permissions before deletion
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db/db';
import { allUsers, memories, folders, galleries, galleryItems } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { cleanupStorageEdgesForMemory } from './utils/memory-database';

import { fatLogger } from '@/lib/logger';
// Type for memory with metadata for deletion operations
interface MemoryForDeletion {
  id: string;
  type: 'image' | 'video' | 'note' | 'document' | 'audio';
  metadata?: {
    custom?: {
      storageBackend?: string;
      storageKey?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  } | null;
  custom?: {
    storageBackend?: string;
    storageKey?: string;
    [key: string]: unknown;
  };
  storageBackend?: string;
  storageKey?: string;
  storageLocations?: string[] | null;
  [key: string]: unknown; // Index signature to allow additional properties
}

// Helper function to clean up storage edges for deleted memories
async function cleanupStorageEdgesForMemories(memoriesToDelete: MemoryForDeletion[]) {
  fatLogger.info(`🧹 Starting cleanup for ${memoriesToDelete.length} memories`, 'be');

  const cleanupPromises = memoriesToDelete.map(memoryData => {
    if (!memoryData) {
      fatLogger.warn('⚠️ Received undefined memory data in cleanup', 'be');
      return Promise.resolve({ success: false });
    }

    fatLogger.info(`🧹 Cleaning up memory: ${memoryData.id} (${memoryData.type})`, 'be');

    return cleanupStorageEdgesForMemory({
      memoryId: memoryData.id,
      memoryType: memoryData.type as 'image' | 'video' | 'note' | 'document' | 'audio',
      memoryData,
    });
  });

  const results = await Promise.allSettled(cleanupPromises);

  let successCount = 0;
  let errorCount = 0;

  results.forEach((result, index) => {
    const memory = memoriesToDelete[index];
    if (result.status === 'fulfilled' && result.value.success) {
      successCount++;
      fatLogger.info(`✅ Successfully cleaned up memory: ${memory?.id || 'unknown'}`, 'be');
    } else {
      errorCount++;
      fatLogger.error(
        `❌ Failed to clean up memory ${memory?.id || 'unknown'}:`,
        result.status === 'rejected' ? result.reason : result.value
      );
    }
  });

  fatLogger.info(`🧹 Cleanup complete. Success: ${successCount}, Errors: ${errorCount}`, 'be');
  return { successCount, errorCount };
}

/**
 * Main DELETE handler for memory deletion
 * Handles bulk deletion and type-specific deletion
 */
export async function handleApiMemoryDelete(request: NextRequest): Promise<NextResponse> {
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

    // Get query parameters for selective deletion
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const folder = searchParams.get('folder'); // folder name to delete
    const all = searchParams.get('all');
    const memoryId = searchParams.get('id'); // Single memory ID to delete

    let deletedCount = 0;

    if (memoryId) {
      // Single memory deletion
      fatLogger.info(`🗑️ Deleting single memory: ${memoryId}`, 'be');

      // 1. FIRST: Get the memory data BEFORE deletion
      const memoryData = await db.query.memories.findFirst({
        where: and(eq(memories.id, memoryId), eq(memories.ownerId, allUserRecord.id)),
        with: {
          assets: true,
          folder: true,
        },
      });

      if (!memoryData) {
        fatLogger.error(`❌ Memory not found: ${memoryId}`, 'be');
        return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
      }

      // 2. THEN: Delete the memory from database
      const [deletedMemoryRow] = await db
        .delete(memories)
        .where(and(eq(memories.id, memoryId), eq(memories.ownerId, allUserRecord.id)))
        .returning();

      if (!deletedMemoryRow) {
        fatLogger.error(`❌ Failed to delete memory or memory not found: ${memoryId}`, 'be');
        return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
      }

      fatLogger.info(`✅ Deleted memory from database: ${memoryId}`, 'be');

      // 3. FINALLY: Clean up storage edges with pre-fetched data
      const cleanupResult = await cleanupStorageEdgesForMemory({
        memoryId,
        memoryType: memoryData.type as 'image' | 'video' | 'document' | 'audio' | 'note',
        memoryData,
      });

      if (!cleanupResult.success) {
        fatLogger.error(`❌ Failed to clean up storage for memory ${memoryId}:`, 'be', { data: cleanupResult.error });
      } else {
        fatLogger.info(`✅ Successfully cleaned up storage for memory: ${memoryId}`, 'be');
      }

      return NextResponse.json({
        success: true,
        message: 'Memory deleted successfully',
        memoryId,
      });
    } else if (all === 'true') {
      // Delete all memories, folders, and galleries for the user
      fatLogger.info('🗑️ Clearing all data for user:', 'be', { userId: allUserRecord.id });

      // 1. First get all memories that will be deleted for cleanup
      const memoriesToDelete = await db.query.memories.findMany({
        where: eq(memories.ownerId, allUserRecord.id),
        with: {
          assets: true,
          folder: true,
        },
      });

      if (memoriesToDelete.length > 0) {
        await cleanupStorageEdgesForMemories(memoriesToDelete);
      }

      // 2. Delete all memories
      const deletedMemoriesResult = await db.delete(memories).where(eq(memories.ownerId, allUserRecord.id)).returning();

      // 3. Delete galleries & gallery items
      const userGalleries = await db.query.galleries.findMany({
        where: eq(galleries.ownerId, allUserRecord.id),
        columns: { id: true },
      });
      const galleryIds = userGalleries.map(g => g.id);

      if (galleryIds.length > 0) {
        await db.delete(galleryItems).where(inArray(galleryItems.galleryId, galleryIds)).returning();
      }
      await db.delete(galleries).where(eq(galleries.ownerId, allUserRecord.id)).returning();

      // 4. Delete folders
      await db.delete(folders).where(eq(folders.ownerId, allUserRecord.id)).returning();

      deletedCount = deletedMemoriesResult.length;
    } else if (type) {
      // Delete specific type
      const memoriesToDelete = await db.query.memories.findMany({
        where: and(
          eq(memories.ownerId, allUserRecord.id),
          eq(memories.type, type as 'image' | 'video' | 'document' | 'note' | 'audio')
        ),
        with: {
          assets: true,
          folder: true,
        },
      });

      if (memoriesToDelete.length > 0) {
        await cleanupStorageEdgesForMemories(memoriesToDelete);
      }

      const deletedMemoriesResult = await db
        .delete(memories)
        .where(
          and(
            eq(memories.ownerId, allUserRecord.id),
            eq(memories.type, type as 'image' | 'video' | 'document' | 'note' | 'audio')
          )
        )
        .returning();

      deletedCount = deletedMemoriesResult.length;
    } else if (folder) {
      // Delete memories in specific folder
      const memoriesToDelete = await db.query.memories.findMany({
        where: and(eq(memories.ownerId, allUserRecord.id), eq(memories.parentFolderId, folder)),
        with: {
          assets: true,
          folder: true,
        },
      });

      if (memoriesToDelete.length > 0) {
        await cleanupStorageEdgesForMemories(memoriesToDelete);
      }

      const deletedMemoriesResult = await db
        .delete(memories)
        .where(and(eq(memories.ownerId, allUserRecord.id), eq(memories.parentFolderId, folder)))
        .returning();

      deletedCount = deletedMemoriesResult.length;
    } else {
      return NextResponse.json(
        {
          error: "Missing parameter. Use 'all=true', 'type=<memory_type>', or 'folder=<folder_name>'",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        all === 'true'
          ? `Successfully deleted ${deletedCount} memories, all folders, and all galleries`
          : `Successfully deleted ${deletedCount} memories`,
      deletedCount,
      type,
      folder,
      all,
    });
  } catch (error) {
    fatLogger.error('Error in bulk delete:', 'be', { data: error instanceof Error ? error : undefined });
    return NextResponse.json({ error: 'Failed to delete memories' }, { status: 500 });
  }
}
