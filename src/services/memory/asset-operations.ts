import { db } from '@/db/db';
import { memoryAssets, type AssetType, type ProcessingStatus } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { fatLogger } from '@/lib/logger';

export interface CreateAssetParams {
  memoryId: string;
  assetType: AssetType;
  variant?: string | null;
  url: string;
  assetLocation: 's3' | 'vercel_blob' | 'icp' | 'arweave' | 'ipfs' | 'neon';
  storageKey: string;
  bucket?: string | null;
  bytes: number;
  width?: number | null;
  height?: number | null;
  mimeType: string;
  sha256?: string | null;
  processingStatus?: ProcessingStatus;
  processingError?: string | null;
}

export interface UpdateAssetParams {
  url?: string;
  assetLocation?: 's3' | 'vercel_blob' | 'icp' | 'arweave' | 'ipfs' | 'neon';
  storageKey?: string;
  bucket?: string | null;
  bytes?: number;
  width?: number | null;
  height?: number | null;
  mimeType?: string;
  sha256?: string | null;
  processingStatus?: ProcessingStatus;
  processingError?: string | null;
}

export type UpsertAssetParams = CreateAssetParams;

export interface AssetQueryParams {
  memoryId?: string;
  assetType?: AssetType;
  variant?: string;
  processingStatus?: ProcessingStatus;
}

export interface AssetOperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Create a new asset record in the database
 *
 * ⚠️  NOTE: This only creates a DATABASE record.
 * The actual file must be uploaded to storage separately.
 */
export const createAssetRecord = async (params: CreateAssetParams): Promise<AssetOperationResult> => {
  try {
    const assetId = randomUUID();

    const [createdAsset] = await db
      .insert(memoryAssets)
      .values({
        id: assetId,
        memoryId: params.memoryId,
        assetType: params.assetType,
        variant: params.variant || null,
        url: params.url,
        assetLocation: params.assetLocation,
        storageKey: params.storageKey,
        bucket: params.bucket || null,
        bytes: params.bytes,
        width: params.width || null,
        height: params.height || null,
        mimeType: params.mimeType,
        sha256: params.sha256 || null,
        processingStatus: params.processingStatus || 'completed',
        processingError: params.processingError || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    fatLogger.info('Created asset', 'be', {
      operation: 'create_asset',
      assetId: createdAsset.id,
      memoryId: params.memoryId,
      assetType: params.assetType,
    });

    return { success: true, data: createdAsset };
  } catch (error) {
    fatLogger.error('Failed to create asset', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'create_asset',
      memoryId: params.memoryId,
      assetType: params.assetType,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Update an existing asset record in the database
 *
 * ⚠️  NOTE: This only updates the DATABASE record.
 * The actual file in storage is not modified.
 */
export const updateAssetRecord = async (assetId: string, params: UpdateAssetParams): Promise<AssetOperationResult> => {
  try {
    const [updatedAsset] = await db
      .update(memoryAssets)
      .set({
        ...params,
        updatedAt: new Date(),
      })
      .where(eq(memoryAssets.id, assetId))
      .returning();

    if (!updatedAsset) {
      return { success: false, error: 'Asset not found' };
    }

    fatLogger.info('Updated asset', 'be', {
      operation: 'update_asset',
      assetId,
      updates: Object.keys(params),
    });

    return { success: true, data: updatedAsset };
  } catch (error) {
    fatLogger.error('Failed to update asset', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'update_asset',
      assetId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Upsert an asset record (insert or update if exists)
 * Uses memoryId + assetType + variant as unique key
 *
 * ⚠️  NOTE: This only handles DATABASE records.
 * The actual file in storage is not modified.
 */
export const upsertAssetRecord = async (params: UpsertAssetParams): Promise<AssetOperationResult> => {
  try {
    const [upsertedAsset] = await db
      .insert(memoryAssets)
      .values({
        id: randomUUID(),
        memoryId: params.memoryId,
        assetType: params.assetType,
        variant: params.variant || null,
        url: params.url,
        assetLocation: params.assetLocation,
        storageKey: params.storageKey,
        bucket: params.bucket || null,
        bytes: params.bytes,
        width: params.width || null,
        height: params.height || null,
        mimeType: params.mimeType,
        sha256: params.sha256 || null,
        processingStatus: params.processingStatus || 'completed',
        processingError: params.processingError || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [memoryAssets.memoryId, memoryAssets.assetType, memoryAssets.variant],
        set: {
          url: params.url,
          assetLocation: params.assetLocation,
          storageKey: params.storageKey,
          bucket: params.bucket || null,
          bytes: params.bytes,
          width: params.width || null,
          height: params.height || null,
          mimeType: params.mimeType,
          sha256: params.sha256 || null,
          processingStatus: params.processingStatus || 'completed',
          processingError: params.processingError || null,
          updatedAt: new Date(),
        },
      })
      .returning();

    fatLogger.info('Upserted asset', 'be', {
      operation: 'upsert_asset',
      assetId: upsertedAsset.id,
      memoryId: params.memoryId,
      assetType: params.assetType,
    });

    return { success: true, data: upsertedAsset };
  } catch (error) {
    fatLogger.error('Failed to upsert asset', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'upsert_asset',
      memoryId: params.memoryId,
      assetType: params.assetType,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Read a single asset record by ID
 */
export const getAssetRecord = async (assetId: string): Promise<AssetOperationResult> => {
  try {
    const asset = await db.query.memoryAssets.findFirst({
      where: eq(memoryAssets.id, assetId),
    });

    if (!asset) {
      return { success: false, error: 'Asset not found' };
    }

    return { success: true, data: asset };
  } catch (error) {
    fatLogger.error('Failed to get asset', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'get_asset',
      assetId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Read asset records by query parameters
 */
export const getAssetRecords = async (params: AssetQueryParams): Promise<AssetOperationResult> => {
  try {
    const whereConditions = [];

    if (params.memoryId) {
      whereConditions.push(eq(memoryAssets.memoryId, params.memoryId));
    }
    if (params.assetType) {
      whereConditions.push(eq(memoryAssets.assetType, params.assetType));
    }
    if (params.variant) {
      whereConditions.push(eq(memoryAssets.variant, params.variant));
    }
    if (params.processingStatus) {
      whereConditions.push(eq(memoryAssets.processingStatus, params.processingStatus));
    }

    const assets = await db.query.memoryAssets.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
    });

    return { success: true, data: assets };
  } catch (error) {
    fatLogger.error('Failed to get assets', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'get_assets',
      params,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Get all asset records for a specific memory
 */
export const getAssetRecordsByMemory = async (memoryId: string): Promise<AssetOperationResult> => {
  return getAssetRecords({ memoryId });
};

/**
 * Get a specific asset type record for a memory (e.g., thumbnail)
 */
export const getAssetRecordByType = async (
  memoryId: string,
  assetType: AssetType,
  variant?: string
): Promise<AssetOperationResult> => {
  return getAssetRecords({ memoryId, assetType, variant });
};

/**
 * Soft delete an asset record (set deletedAt timestamp)
 *
 * ⚠️  WARNING: This only deletes the DATABASE record.
 * The actual file remains in storage (S3, ICP, Vercel Blob, etc.).
 * Use MemoryOrchestrationService.deleteMemory() for complete deletion.
 */
export const deleteAssetRecord = async (assetId: string): Promise<AssetOperationResult> => {
  try {
    const [deletedAsset] = await db
      .update(memoryAssets)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(memoryAssets.id, assetId))
      .returning();

    if (!deletedAsset) {
      return { success: false, error: 'Asset not found' };
    }

    fatLogger.info('Deleted asset', 'be', {
      operation: 'delete_asset',
      assetId,
      memoryId: deletedAsset.memoryId,
    });

    return { success: true, data: deletedAsset };
  } catch (error) {
    fatLogger.error('Failed to delete asset', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'delete_asset',
      assetId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Hard delete an asset record (permanent removal from database)
 *
 * ⚠️  WARNING: This only deletes the DATABASE record.
 * The actual file remains in storage (S3, ICP, Vercel Blob, etc.).
 * Use MemoryOrchestrationService.deleteMemory() for complete deletion.
 */
export const hardDeleteAssetRecord = async (assetId: string): Promise<AssetOperationResult> => {
  try {
    const [deletedAsset] = await db.delete(memoryAssets).where(eq(memoryAssets.id, assetId)).returning();

    if (!deletedAsset) {
      return { success: false, error: 'Asset not found' };
    }

    fatLogger.info('Hard deleted asset', 'be', {
      operation: 'hard_delete_asset',
      assetId,
      memoryId: deletedAsset.memoryId,
    });

    return { success: true, data: deletedAsset };
  } catch (error) {
    fatLogger.error('Failed to hard delete asset', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'hard_delete_asset',
      assetId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Batch create multiple asset records for a memory
 *
 * ⚠️  NOTE: This only creates DATABASE records.
 * The actual files must be uploaded to storage separately.
 */
export const createAssetRecords = async (assets: CreateAssetParams[]): Promise<AssetOperationResult> => {
  try {
    const assetData = assets.map(asset => ({
      id: randomUUID(),
      memoryId: asset.memoryId,
      assetType: asset.assetType,
      variant: asset.variant || null,
      url: asset.url,
      assetLocation: asset.assetLocation,
      storageKey: asset.storageKey,
      bucket: asset.bucket || null,
      bytes: asset.bytes,
      width: asset.width || null,
      height: asset.height || null,
      mimeType: asset.mimeType,
      sha256: asset.sha256 || null,
      processingStatus: asset.processingStatus || 'completed',
      processingError: asset.processingError || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const createdAssets = await db.insert(memoryAssets).values(assetData).returning();

    fatLogger.info('Created multiple assets', 'be', {
      operation: 'create_assets',
      count: createdAssets.length,
      memoryIds: [...new Set(assets.map(a => a.memoryId))],
    });

    return { success: true, data: createdAssets };
  } catch (error) {
    fatLogger.error('Failed to create assets', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'create_assets',
      count: assets.length,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
