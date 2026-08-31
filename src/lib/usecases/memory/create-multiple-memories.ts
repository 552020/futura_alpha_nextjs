/**
 * Create Multiple Memories - Use Case
 *
 * Orchestrates the batch creation of multiple memories with their associated assets.
 * Uses the memory service layer for all database operations.
 */

import { DBMemory } from '@/db/types';
import {
  createMemoryRecord,
  createAssetRecords,
  type CreateMemoryParams,
  type CreateAssetParams,
} from '@/services/memory';
import { buildStorageKey } from '@/lib/storage/s3';
import { fatLogger } from '@/lib/logger';
import type { AcceptedMimeType } from '@/app/api/memories/utils/file-processing';
import { getMemoryType } from '@/app/api/memories/utils/file-processing';

export interface CreateMultipleMemoriesParams {
  files: File[];
  urls: string[];
  ownerId: string;
  parentFolderId?: string | null;
  assetLocation?: 's3' | 'vercel_blob';
}

export interface CreateMultipleMemoriesResult {
  success: boolean;
  memories: DBMemory[];
  assets: unknown[];
  error?: string;
}

/**
 * Process multiple files and create memories/assets in batch
 *
 * This function handles the batch processing logic for folder uploads.
 * It orchestrates calls to the memory service layer for creating memories and assets.
 *
 * @param params - Parameters for batch creating memories
 * @returns Result containing created memories and assets or error information
 */
export async function createMultipleMemories(
  params: CreateMultipleMemoriesParams
): Promise<CreateMultipleMemoriesResult> {
  const { files, urls, ownerId, parentFolderId, assetLocation = 's3' } = params;

  try {
    // Create memories using service layer
    const memoryPromises = files.map((file) => {
      const memoryParams: CreateMemoryParams = {
        title: file.name.split('.')[0],
        type: getMemoryType(file.type as AcceptedMimeType) as
          | 'image'
          | 'video'
          | 'document'
          | 'note'
          | 'audio',
        ownerId,
        parentFolderId: parentFolderId || null,
        metadata: {
          custom: {
            originalPath: file.name,
            uploadedAt: new Date().toISOString(),
            size: file.size,
            mimeType: file.type,
          },
        },
        storageDuration: null, // null means permanent storage
      };
      return createMemoryRecord(memoryParams);
    });

    const memoryResults = await Promise.all(memoryPromises);

    // Check if any memory creation failed
    const failedMemories = memoryResults.filter((result) => !result.success);
    if (failedMemories.length > 0) {
      const error = `Failed to create ${failedMemories.length} memories: ${failedMemories.map((r) => r.error).join(', ')}`;
      fatLogger.error('❌ Error creating memories:', 'be', { error });
      return {
        success: false,
        memories: [],
        assets: [],
        error,
      };
    }

    const createdMemories = memoryResults.map(
      (result) => result.data as DBMemory
    );
    fatLogger.info(
      `✅ Batch created ${createdMemories.length} memories using service layer`,
      'be'
    );

    // Create assets using service layer
    const assetParams: CreateAssetParams[] = files.map((file, index) => ({
      memoryId: createdMemories[index].id,
      assetType: 'original',
      variant: 'default',
      url: urls[index],
      assetLocation: assetLocation,
      storageKey: buildStorageKey(urls[index], assetLocation),
      bytes: file.size,
      width: null,
      height: null,
      mimeType: file.type,
      sha256: null,
      processingStatus: 'completed',
      processingError: null,
    }));

    const assetResult = await createAssetRecords(assetParams);
    if (!assetResult.success) {
      fatLogger.error('❌ Error creating assets:', 'be', {
        error: assetResult.error,
      });
      return {
        success: false,
        memories: createdMemories,
        assets: [],
        error: assetResult.error,
      };
    }

    const createdAssets = assetResult.data as unknown[];
    fatLogger.info(
      `✅ Batch created ${createdAssets.length} assets using service layer`,
      'be'
    );

    return {
      success: true,
      memories: createdMemories,
      assets: createdAssets,
    };
  } catch (error) {
    fatLogger.error('❌ Error processing multiple files batch:', 'be', {
      data: error instanceof Error ? error : undefined,
    });
    return {
      success: false,
      memories: [],
      assets: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
