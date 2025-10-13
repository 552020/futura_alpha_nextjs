/**
 * Cleanup Memory and Storage - Use Case
 *
 * Orchestrates the cleanup of memory storage including S3 objects, storage edges, and memory assets.
 * Uses the memory and storage edges service layers for all database operations.
 */

import { getAssetRecordsByMemory, hardDeleteAssetRecord } from '@/services/memory';
import { getStorageEdges, deleteStorageEdges } from '@/services/storage-edges';
import { deleteS3Object } from '@/lib/s3-utils';
import { extractS3KeyFromUrl } from '@/lib/storage/s3';
import { fatLogger } from '@/lib/logger';

export interface CleanupMemoryAndStorageParams {
  memoryId: string;
  memoryType: 'image' | 'video' | 'note' | 'document' | 'audio';
  memoryData?: {
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
    storageLocations?: string[] | null;
    assets?: Array<{
      assetLocation: string;
      storageKey: string;
      url?: string;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  } | null;
}

export interface CleanupMemoryAndStorageResult {
  success: boolean;
  deletedCount: number;
  deletedS3Count: number;
  deletedEdges: unknown[];
  deletedS3Objects: string[];
  errors?: string[];
  error?: string;
}

/**
 * Clean up storage edges and assets for a deleted memory
 *
 * This function orchestrates the cleanup of:
 * 1. S3 objects (using S3 utils)
 * 2. Storage edges (using storage edges service)
 * 3. Memory assets (using memory service)
 *
 * @param params - Parameters for cleanup operation
 * @returns Result containing cleanup statistics and any errors
 */
export async function cleanupMemoryAndStorage(
  params: CleanupMemoryAndStorageParams
): Promise<CleanupMemoryAndStorageResult> {
  const { memoryId, memoryType, memoryData } = params;
  const results: {
    deletedEdges: unknown[];
    deletedS3Objects: string[];
    errors: string[];
  } = {
    deletedEdges: [],
    deletedS3Objects: [],
    errors: [],
  };

  try {
    fatLogger.info('🔄 Starting cleanup for memory:', 'be', { memoryId });

    // Use the provided memory data directly (don't try to fetch from DB)
    const memory = memoryData;

    fatLogger.info('🔍 Memory record for cleanup:', 'be', {
      memoryId,
      found: !!memory,
      hasMetadata: !!memory?.metadata,
      storageKey: memory?.metadata?.custom?.storageKey || 'not found',
      storageBackend: memory?.metadata?.custom?.storageBackend || 'not found',
      timestamp: new Date().toISOString(),
    });

    // If we don't have memory data, we can't do proper cleanup
    if (!memory) {
      fatLogger.error('❌ No memory data provided for cleanup - cannot determine S3 storage key', 'be');
      return {
        success: false,
        error: 'No memory data provided for cleanup',
        deletedCount: 0,
        deletedS3Count: 0,
        deletedEdges: [],
        deletedS3Objects: [],
      };
    }

    // Collect S3 assets from memory metadata
    const s3Assets = [];

    // Check if memory has S3 storage info in metadata
    const metadata = memory?.metadata;
    const custom = metadata?.custom;
    const storageBackend = custom?.storageBackend;
    const storageKey = custom?.storageKey;
    const hasS3Metadata = storageBackend === 's3' && storageKey;

    if (hasS3Metadata && storageKey) {
      fatLogger.info('✅ Found S3 storage info in memory metadata:', 'be', {
        storageKey,
        backend: storageBackend,
        timestamp: new Date().toISOString(),
      });

      s3Assets.push({
        id: 'metadata-asset',
        memoryId,
        storageKey: storageKey,
        storageBackend: 's3',
        bytes: memory.metadata?.size,
        mimeType: memory.metadata?.mimeType as string | undefined,
      });
    } else {
      fatLogger.info('⚠️ No S3 storage info found in memory metadata:', 'be', {
        hasMetadata: !!memory?.metadata,
        hasCustom: !!memory?.metadata?.custom,
        storageBackend: memory?.metadata?.custom?.storageBackend,
        storageKey: memory.metadata?.custom?.storageKey,
      });
    }

    // Get assets from memory service
    const assetsResult = await getAssetRecordsByMemory(memoryId);
    if (!assetsResult.success) {
      fatLogger.error('❌ Failed to get assets for cleanup:', 'be', { error: assetsResult.error });
      return {
        success: false,
        error: `Failed to get assets: ${assetsResult.error}`,
        deletedCount: 0,
        deletedS3Count: 0,
        deletedEdges: [],
        deletedS3Objects: [],
      };
    }
    const dbAssets = assetsResult.data as unknown[];
    fatLogger.info(`🔍 Found ${dbAssets.length} assets in memory_assets table`, 'be');

    // Get storage edges from storage edges service
    const edgesResult = await getStorageEdges({
      memoryId,
      memoryType,
    });
    if (!edgesResult.success) {
      fatLogger.error('❌ Failed to get storage edges for cleanup:', 'be', { error: edgesResult.error });
      return {
        success: false,
        error: `Failed to get storage edges: ${edgesResult.error}`,
        deletedCount: 0,
        deletedS3Count: 0,
        deletedEdges: [],
        deletedS3Objects: [],
      };
    }
    const edges = edgesResult.data as unknown[];
    fatLogger.info(`🔍 Found ${edges.length} storage edges`, 'be');

    // Type assertion for dbAssets
    const typedDbAssets = dbAssets as Array<{
      id: string;
      memoryId: string;
      assetLocation: string;
      storageKey: string;
      [key: string]: unknown;
    }>;

    // Filter and add S3 assets from database
    const s3DbAssets = typedDbAssets.filter(asset => {
      const backend = String(asset.assetLocation || '')
        .toLowerCase()
        .trim();
      return backend === 's3' || backend === 'aws-s3' || backend.includes('s3');
    });

    // Add S3 edges - using new storage edges structure
    const s3Edges = edges.filter(edge => {
      return (edge as { locationAsset?: string }).locationAsset === 's3';
    });

    // Combine all S3 assets
    const allS3Assets = [
      ...s3Assets,
      ...s3DbAssets.map(asset => ({
        id: asset.id,
        memoryId: asset.memoryId,
        storageKey: asset.storageKey,
        storageBackend: asset.assetLocation,
        bytes: asset.bytes,
        mimeType: asset.mimeType,
      })),
      ...s3Edges.map(edge => ({
        id: `edge-${(edge as { id: string }).id}`,
        memoryId,
        storageKey: extractS3KeyFromUrl((edge as { locationUrl?: string }).locationUrl || ''),
        storageBackend: 's3',
        bytes: (edge as { sizeBytes?: number }).sizeBytes,
        mimeType: null,
      })),
    ];

    // Remove duplicates based on storageKey
    const uniqueS3Assets = allS3Assets.reduce(
      (unique, asset) => {
        if (asset.storageKey && !unique.find(u => u.storageKey === asset.storageKey)) {
          unique.push(asset);
        }
        return unique;
      },
      [] as typeof allS3Assets
    );

    fatLogger.info(`🗑️ Found ${uniqueS3Assets.length} unique S3 assets to delete:`, 'be', {
      assets: uniqueS3Assets.map(a => ({ id: a.id, key: a.storageKey })),
    });

    // Delete S3 objects
    const s3DeletePromises = uniqueS3Assets.map(async asset => {
      if (!asset.storageKey) return;

      try {
        fatLogger.info(`🔄 Attempting to delete S3 object: ${asset.storageKey}`, 'be');
        const success = await deleteS3Object(asset.storageKey);

        if (success) {
          fatLogger.info(`✅ Successfully deleted S3 object: ${asset.storageKey}`, 'be');
          results.deletedS3Objects.push(asset.storageKey);
        } else {
          const msg = `Failed to delete S3 object: ${asset.storageKey}`;
          fatLogger.error(msg, 'be');
          results.errors.push(msg);
        }
      } catch (error) {
        const errorMsg = `Error deleting S3 object ${asset.storageKey}: ${error}`;
        fatLogger.error(errorMsg, 'be');
        results.errors.push(errorMsg);
      }
    });

    await Promise.all(s3DeletePromises);

    // Delete storage edges using service layer
    const deletedEdgesResult = await deleteStorageEdges({
      memoryId,
      memoryType,
    });

    if (!deletedEdgesResult.success) {
      fatLogger.error('❌ Failed to delete storage edges:', 'be', { error: deletedEdgesResult.error });
      results.errors.push(`Failed to delete storage edges: ${deletedEdgesResult.error}`);
    } else {
      results.deletedEdges = deletedEdgesResult.data as unknown[];
    }

    // Delete memory assets using service layer
    const deletedAssetsPromises = dbAssets.map(asset => hardDeleteAssetRecord((asset as { id: string }).id));
    const deletedAssetsResults = await Promise.all(deletedAssetsPromises);

    const deletedAssets = deletedAssetsResults.filter(result => result.success).map(result => result.data);

    const failedAssetDeletions = deletedAssetsResults.filter(result => !result.success);
    if (failedAssetDeletions.length > 0) {
      const error = `Failed to delete ${failedAssetDeletions.length} assets: ${failedAssetDeletions.map(r => r.error).join(', ')}`;
      fatLogger.error('❌ Failed to delete some assets:', 'be', { error });
      results.errors.push(error);
    }

    fatLogger.info(
      `🗑️ Deleted ${results.deletedEdges.length} storage edges and ${deletedAssets.length} assets from database`,
      'be'
    );

    return {
      success: results.errors.length === 0,
      deletedCount: results.deletedEdges.length,
      deletedS3Count: results.deletedS3Objects.length,
      deletedEdges: results.deletedEdges,
      deletedS3Objects: results.deletedS3Objects,
      errors: results.errors.length > 0 ? results.errors : undefined,
    };
  } catch (error) {
    fatLogger.error('❌ Error cleaning up storage:', 'be', { data: error instanceof Error ? error : undefined });
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      deletedS3Objects: results.deletedS3Objects,
      errors: results.errors,
      deletedCount: 0,
      deletedEdges: [],
      deletedS3Count: results.deletedS3Objects.length,
    };
  }
}
