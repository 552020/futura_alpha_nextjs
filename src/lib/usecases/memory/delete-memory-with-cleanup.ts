import { db } from '@/db/db';
import { memories } from '@/db';
import { and, eq } from 'drizzle-orm';
import { fatLogger } from '@/lib/logger';
import { getMemoryWithRelations } from '@/services/memory';
import { cleanupMemoryAndStorage } from '@/lib/usecases/memory/cleanup-memory-and-storage';

export interface DeleteMemoryWithCleanupResult {
  success: boolean;
  error?: string;
  cleanup?: {
    success: boolean;
    deletedS3Objects: number;
    deletedEdges: number;
  };
}

export async function deleteMemoryWithCleanup(
  memoryId: string,
  ownerAllUserId: string
): Promise<DeleteMemoryWithCleanupResult> {
  try {
    // 1) Pre-read memory with relations needed for cleanup
    const memoryDataResult = await getMemoryWithRelations(
      memoryId,
      ownerAllUserId,
      { assets: true, folder: true }
    );
    if (!memoryDataResult.success || !memoryDataResult.data) {
      return { success: false, error: 'Memory not found' };
    }

    const memoryData = memoryDataResult.data as {
      id: string;
      type: 'image' | 'video' | 'note' | 'document' | 'audio';
      metadata?: {
        custom?: { storageBackend?: string; storageKey?: string };
      } | null;
      assets?: Array<{
        assetLocation: string;
        storageKey: string;
        url?: string;
      }>;
      [key: string]: unknown;
    };

    // 2) Delete memory from database
    const deleted = await db
      .delete(memories)
      .where(
        and(eq(memories.id, memoryId), eq(memories.ownerId, ownerAllUserId))
      )
      .returning();

    if (!deleted || deleted.length === 0) {
      return { success: false, error: 'Failed to delete memory' };
    }

    fatLogger.info(
      `✅ Usecase - Deleted memory from database: ${memoryId}`,
      'be'
    );

    // 3) Cleanup storage with pre-read data
    const cleanupResult = await cleanupMemoryAndStorage({
      memoryId,
      memoryType: memoryData.type,
      memoryData,
    });

    if (!cleanupResult.success) {
      fatLogger.error(
        `❌ Usecase - Storage cleanup failed for ${memoryId}:`,
        'be',
        { data: cleanupResult.error }
      );
      return {
        success: true,
        cleanup: {
          success: false,
          deletedS3Objects: cleanupResult.deletedS3Count || 0,
          deletedEdges: cleanupResult.deletedCount || 0,
        },
      };
    }

    fatLogger.info(
      `✅ Usecase - Storage cleanup completed for ${memoryId}`,
      'be',
      {
        deletedS3Objects: cleanupResult.deletedS3Count,
        deletedEdges: cleanupResult.deletedCount,
      }
    );

    return {
      success: true,
      cleanup: {
        success: true,
        deletedS3Objects: cleanupResult.deletedS3Count || 0,
        deletedEdges: cleanupResult.deletedCount || 0,
      },
    };
  } catch (error) {
    fatLogger.error('Error deleting memory with cleanup:', 'be', {
      data: error instanceof Error ? error : undefined,
    });
    return { success: false, error: 'Failed to delete memory' };
  }
}
