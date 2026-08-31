import { db } from '@/db/db';
import { folders, memories } from '@/db';
import { and, eq } from 'drizzle-orm';
import { fatLogger } from '@/lib/logger';
import { cleanupMemoryAndStorage } from '@/lib/usecases/memory/cleanup-memory-and-storage';

export interface DeleteFolderAndContentsResult {
  success: boolean;
  deletedMemories: number;
  deletedS3Objects: number;
  deletedEdges: number;
  error?: string;
}

export async function deleteFolderAndContents(
  folderId: string,
  ownerAllUserId: string
): Promise<DeleteFolderAndContentsResult> {
  try {
    fatLogger.info(
      `🗑️ [Folder Deletion] Starting deletion for folder: ${folderId}`,
      'be'
    );

    // 1) Validate ownership
    const folder = await db.query.folders.findFirst({
      where: and(eq(folders.id, folderId), eq(folders.ownerId, ownerAllUserId)),
    });
    if (!folder) {
      return {
        success: false,
        deletedMemories: 0,
        deletedS3Objects: 0,
        deletedEdges: 0,
        error: 'Folder not found',
      };
    }

    // 2) List child memories with assets
    const childMemories = await db.query.memories.findMany({
      where: and(
        eq(memories.parentFolderId, folderId),
        eq(memories.ownerId, ownerAllUserId)
      ),
      with: { assets: true },
    });

    let deletedMemoriesCount = 0;
    let totalDeletedS3Objects = 0;
    let totalDeletedEdges = 0;

    // 3) Delete each memory and cleanup storage
    for (const memory of childMemories) {
      try {
        await db.delete(memories).where(eq(memories.id, memory.id));

        const cleanupResult = await cleanupMemoryAndStorage({
          memoryId: memory.id,
          memoryType: memory.type as
            | 'image'
            | 'video'
            | 'note'
            | 'document'
            | 'audio',
          memoryData: memory as unknown as {
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
          },
        });

        if (cleanupResult.success) {
          totalDeletedS3Objects += cleanupResult.deletedS3Count || 0;
          totalDeletedEdges += cleanupResult.deletedCount || 0;
        }

        deletedMemoriesCount++;
      } catch (error) {
        fatLogger.error(
          `❌ Failed to delete memory ${memory.id} during folder deletion:`,
          'be',
          {
            data: error instanceof Error ? error : undefined,
          }
        );
      }
    }

    // 4) Delete the folder itself
    await db.delete(folders).where(eq(folders.id, folderId));

    fatLogger.info(`✅ [Folder Deletion] Completed for ${folderId}`, 'be', {
      deletedMemories: deletedMemoriesCount,
      deletedS3Objects: totalDeletedS3Objects,
      deletedEdges: totalDeletedEdges,
    });

    return {
      success: true,
      deletedMemories: deletedMemoriesCount,
      deletedS3Objects: totalDeletedS3Objects,
      deletedEdges: totalDeletedEdges,
    };
  } catch (error) {
    fatLogger.error('❌ [Folder Deletion] Error:', 'be', {
      folderId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return {
      success: false,
      deletedMemories: 0,
      deletedS3Objects: 0,
      deletedEdges: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
