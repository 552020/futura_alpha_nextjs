import { db } from '@/db/db';
import { memories, allUsers, type MemoryType } from '@/db/schema';
import { eq, and, desc, asc, isNull } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { randomBytes } from 'crypto';
import { fatLogger } from '@/lib/logger';
import type { MemoryWithGalleries } from './types';

export interface CreateMemoryParams {
  title: string;
  type: MemoryType;
  ownerId: string;
  parentFolderId?: string | null;
  tags?: string[];
  recipients?: string[];
  unlockDate?: Date | null;
  metadata?: {
    originalPath?: string;
    custom?: Record<string, unknown>;
  };
  storageDuration?: number | null;
  isOnboarding?: boolean;
}

export interface UpdateMemoryParams {
  title?: string;
  type?: MemoryType;
  parentFolderId?: string | null;
  tags?: string[];
  recipients?: string[];
  unlockDate?: Date | null;
  metadata?: {
    originalPath?: string;
    custom?: Record<string, unknown>;
  };
  storageDuration?: number | null;
}

export interface MemoryQueryParams {
  ownerId?: string;
  type?: MemoryType;
  parentFolderId?: string | null;
  tags?: string[];
  includeDeleted?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: 'createdAt' | 'updatedAt' | 'title';
  orderDirection?: 'asc' | 'desc';
}

export interface MemoryOperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Create a new memory record in the database
 *
 * ⚠️  NOTE: This only creates a DATABASE record.
 * The actual files must be uploaded to storage separately.
 */
export const createMemoryRecord = async (
  params: CreateMemoryParams
): Promise<MemoryOperationResult<typeof memories.$inferSelect>> => {
  try {
    // Resolve owner ID (handles onboarding case)
    const ownerResult = await resolveOwnerId(params.ownerId, params.isOnboarding);
    if (!ownerResult.success || !ownerResult.data) {
      return { success: false, error: ownerResult.error || 'Failed to resolve owner ID' };
    }
    const ownerId = ownerResult.data;

    const [createdMemory] = await db
      .insert(memories)
      .values({
        title: params.title,
        type: params.type,
        ownerId: ownerId,
        parentFolderId: params.parentFolderId || null,
        tags: params.tags || [],
        recipients: params.recipients || [],
        unlockDate: params.unlockDate || null,
        metadata: params.metadata || { custom: {} },
        storageDuration: params.storageDuration || null,
        ownerSecureCode: randomBytes(16).toString('hex'),
      })
      .returning();

    fatLogger.info('Created memory', 'be', {
      operation: 'create_memory',
      memoryId: createdMemory.id,
      ownerId: ownerId,
      type: params.type,
      title: params.title,
    });

    return { success: true, data: createdMemory };
  } catch (error) {
    fatLogger.error('Failed to create memory', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'create_memory',
      ownerId: params.ownerId,
      type: params.type,
      title: params.title,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Update an existing memory record in the database
 *
 * ⚠️  NOTE: This only updates the DATABASE record.
 * The actual files in storage are not modified.
 */
export const updateMemoryRecord = async (
  memoryId: string,
  params: UpdateMemoryParams
): Promise<MemoryOperationResult> => {
  try {
    const [updatedMemory] = await db
      .update(memories)
      .set({
        ...params,
        updatedAt: new Date(),
      })
      .where(eq(memories.id, memoryId))
      .returning();

    if (!updatedMemory) {
      return { success: false, error: 'Memory not found' };
    }

    fatLogger.info('Updated memory', 'be', {
      operation: 'update_memory',
      memoryId,
      updates: Object.keys(params),
    });

    return { success: true, data: updatedMemory };
  } catch (error) {
    fatLogger.error('Failed to update memory', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'update_memory',
      memoryId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Read a single memory record by ID
 */
export const getMemoryRecord = async (memoryId: string, includeAssets = false): Promise<MemoryOperationResult> => {
  try {
    const memory = await db.query.memories.findFirst({
      where: eq(memories.id, memoryId),
      with: includeAssets
        ? {
            assets: true,
          }
        : undefined,
    });

    if (!memory) {
      return { success: false, error: 'Memory not found' };
    }

    return { success: true, data: memory };
  } catch (error) {
    fatLogger.error('Failed to get memory', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'get_memory',
      memoryId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Read memory records by query parameters
 */
export const getMemoryRecords = async (
  params: MemoryQueryParams,
  includeAssets = false
): Promise<MemoryOperationResult> => {
  try {
    const whereConditions = [];

    if (params.ownerId) {
      whereConditions.push(eq(memories.ownerId, params.ownerId));
    }
    if (params.type) {
      whereConditions.push(eq(memories.type, params.type));
    }
    if (params.parentFolderId !== undefined) {
      if (params.parentFolderId === null) {
        whereConditions.push(isNull(memories.parentFolderId));
      } else {
        whereConditions.push(eq(memories.parentFolderId, params.parentFolderId));
      }
    }
    if (!params.includeDeleted) {
      whereConditions.push(isNull(memories.deletedAt));
    }

    // Build order by clause
    let orderByClause;
    if (params.orderBy) {
      const direction = params.orderDirection === 'asc' ? asc : desc;
      orderByClause = direction(memories[params.orderBy]);
    } else {
      orderByClause = desc(memories.createdAt);
    }

    const memoriesList = await db.query.memories.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      orderBy: orderByClause,
      limit: params.limit,
      offset: params.offset,
      with: includeAssets
        ? {
            assets: true,
          }
        : undefined,
    });

    return { success: true, data: memoriesList };
  } catch (error) {
    fatLogger.error('Failed to get memories', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'get_memories',
      params,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Get memory records by owner
 */
export const getMemoryRecordsByOwner = async (
  ownerId: string,
  includeAssets = false
): Promise<MemoryOperationResult> => {
  return getMemoryRecords({ ownerId }, includeAssets);
};

/**
 * Get memory records by folder
 */
export const getMemoryRecordsByFolder = async (
  parentFolderId: string | null,
  includeAssets = false
): Promise<MemoryOperationResult> => {
  return getMemoryRecords({ parentFolderId }, includeAssets);
};

/**
 * Get memory records by type
 */
export const getMemoryRecordsByType = async (
  type: MemoryType,
  includeAssets = false
): Promise<MemoryOperationResult> => {
  return getMemoryRecords({ type }, includeAssets);
};

/**
 * Get memory records with their associated galleries
 * This function performs a complex JOIN query to get memories with gallery information
 */
export const getMemoryRecordsWithGalleries = async (
  ownerId: string
): Promise<MemoryOperationResult<MemoryWithGalleries[]>> => {
  try {
    const { sql } = await import('drizzle-orm');

    const { rows } = await db.execute(sql`
      SELECT
        m.type,
        m.id,
        m.owner_id,
        m.title,
        m.description,
        m.url,
        m.created_at,
        m.updated_at,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT('id', g.id, 'title', g.title)
          ) FILTER (WHERE g.id IS NOT NULL),
          '[]'::json
        ) AS galleries
      FROM "memories" m
      LEFT JOIN "gallery_item" gi
        ON gi.memory_id = m.id AND gi.memory_type = m.type
      LEFT JOIN "gallery" g
        ON g.id = gi.gallery_id
      WHERE m.owner_id = ${ownerId}
      GROUP BY
        m.type, m.id, m.owner_id, m.title, m.description, m.url, m.created_at, m.updated_at
      ORDER BY m.created_at DESC
    `);

    // Normalize the data to typed structure
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const memoriesWithGalleries = rows.map((r: any) => ({
      id: r.id,
      type: r.type,
      owner_id: r.owner_id,
      title: r.title ?? null,
      description: r.description ?? null,
      url: r.url ?? '',
      created_at: r.created_at?.toISOString ? r.created_at.toISOString() : String(r.created_at),
      updated_at: r.updated_at ? (r.updated_at.toISOString ? r.updated_at.toISOString() : String(r.updated_at)) : null,
      galleries: Array.isArray(r.galleries) ? r.galleries : JSON.parse(r.galleries ?? '[]'),
    })) as MemoryWithGalleries[];

    fatLogger.info('Retrieved memories with galleries', 'be', {
      operation: 'get_memories_with_galleries',
      ownerId,
      count: memoriesWithGalleries.length,
    });

    return { success: true, data: memoriesWithGalleries };
  } catch (error) {
    fatLogger.error('Failed to get memories with galleries', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'get_memories_with_galleries',
      ownerId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Create a memory with assets in a single operation
 * This is a higher-level function that combines memory and asset creation
 */
export const createMemoryWithAssets = async (params: {
  // Memory parameters
  title: string;
  type: MemoryType;
  ownerId: string;
  description?: string;
  fileCreatedAt?: Date;
  isPublic?: boolean;
  parentFolderId?: string | null;
  tags?: string[];
  recipients?: string[];
  unlockDate?: Date | null;
  metadata?: Record<string, unknown>;
  storageDuration?: number | null;
  isOnboarding?: boolean;
  mode?: string;

  // Asset parameters
  assets?: Array<{
    assetType: 'original' | 'display' | 'thumb' | 'placeholder' | 'poster' | 'waveform';
    variant?: string;
    url: string;
    assetLocation: 's3' | 'vercel_blob' | 'icp' | 'arweave' | 'ipfs' | 'neon';
    bucket?: string;
    storageKey: string;
    bytes: number;
    width?: number;
    height?: number;
    mimeType: string;
    sha256?: string;
    processingStatus?: 'failed' | 'pending' | 'processing' | 'completed';
    processingError?: string;
  }>;
}): Promise<MemoryOperationResult<{ memoryId: string; assets?: unknown[] }>> => {
  try {
    // Import asset operations
    const { createAssetRecord } = await import('./asset-operations');

    // Create memory record
    const memoryResult = await createMemoryRecord({
      title: params.title,
      type: params.type,
      ownerId: params.ownerId,
      parentFolderId: params.parentFolderId,
      tags: params.tags,
      recipients: params.recipients,
      unlockDate: params.unlockDate,
      metadata: params.metadata,
      storageDuration: params.storageDuration,
      isOnboarding: params.isOnboarding,
    });

    if (!memoryResult.success || !memoryResult.data) {
      return { success: false, error: memoryResult.error || 'Failed to create memory' };
    }

    const createdMemory = memoryResult.data;
    const createdAssets: unknown[] = [];

    // Create assets if provided
    if (params.assets && params.assets.length > 0 && createdMemory) {
      for (const asset of params.assets) {
        const assetResult = await createAssetRecord({
          memoryId: createdMemory.id,
          assetType: asset.assetType,
          variant: asset.variant || null,
          url: asset.url,
          assetLocation: asset.assetLocation,
          bucket: asset.bucket || null,
          storageKey: asset.storageKey,
          bytes: asset.bytes,
          width: asset.width || null,
          height: asset.height || null,
          mimeType: asset.mimeType,
          sha256: asset.sha256 || null,
          processingStatus: asset.processingStatus || 'completed',
          processingError: asset.processingError || null,
        });

        if (assetResult.success && assetResult.data) {
          createdAssets.push(assetResult.data);
        } else {
          fatLogger.warn('Failed to create asset', 'be', {
            operation: 'create_memory_with_assets',
            memoryId: createdMemory.id,
            assetType: asset.assetType,
            error: assetResult.error,
          });
        }
      }
    }

    fatLogger.info('Created memory with assets', 'be', {
      operation: 'create_memory_with_assets',
      memoryId: createdMemory.id,
      assetsCount: createdAssets.length,
    });

    return {
      success: true,
      data: {
        memoryId: createdMemory.id,
        assets: createdAssets.length > 0 ? createdAssets : undefined,
      },
    };
  } catch (error) {
    fatLogger.error('Failed to create memory with assets', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'create_memory_with_assets',
      ownerId: params.ownerId,
      type: params.type,
      title: params.title,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Soft delete a memory record (set deletedAt timestamp)
 *
 * ⚠️  WARNING: This only deletes the DATABASE record.
 * The actual files remain in storage (S3, ICP, Vercel Blob, etc.).
 * Use MemoryOrchestrationService.deleteMemory() for complete deletion.
 */
export const deleteMemoryRecord = async (memoryId: string): Promise<MemoryOperationResult> => {
  try {
    const [deletedMemory] = await db
      .update(memories)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(memories.id, memoryId))
      .returning();

    if (!deletedMemory) {
      return { success: false, error: 'Memory not found' };
    }

    fatLogger.info('Deleted memory', 'be', {
      operation: 'delete_memory',
      memoryId,
      ownerId: deletedMemory.ownerId,
    });

    return { success: true, data: deletedMemory };
  } catch (error) {
    fatLogger.error('Failed to delete memory', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'delete_memory',
      memoryId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Hard delete a memory record (permanent removal from database)
 *
 * ⚠️  WARNING: This only deletes the DATABASE record.
 * The actual files remain in storage (S3, ICP, Vercel Blob, etc.).
 * Use MemoryOrchestrationService.deleteMemory() for complete deletion.
 */
export const hardDeleteMemoryRecord = async (memoryId: string): Promise<MemoryOperationResult> => {
  try {
    const [deletedMemory] = await db.delete(memories).where(eq(memories.id, memoryId)).returning();

    if (!deletedMemory) {
      return { success: false, error: 'Memory not found' };
    }

    fatLogger.info('Hard deleted memory', 'be', {
      operation: 'hard_delete_memory',
      memoryId,
      ownerId: deletedMemory.ownerId,
    });

    return { success: true, data: deletedMemory };
  } catch (error) {
    fatLogger.error('Failed to hard delete memory', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'hard_delete_memory',
      memoryId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Check if user has access to a memory record
 */
export const checkMemoryRecordAccess = async (
  memoryId: string,
  userId: string
): Promise<MemoryOperationResult<boolean>> => {
  try {
    const memory = await db.query.memories.findFirst({
      where: and(eq(memories.id, memoryId), eq(memories.ownerId, userId), isNull(memories.deletedAt)),
    });

    return { success: true, data: !!memory };
  } catch (error) {
    fatLogger.error('Failed to check memory access', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'check_memory_access',
      memoryId,
      userId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Resolve owner ID (handles onboarding case)
 */
export const resolveOwnerId = async (
  userId: string,
  isOnboarding?: boolean
): Promise<MemoryOperationResult<string>> => {
  try {
    // Check if the user exists in the all_user table
    const existingUser = await db.query.allUsers.findFirst({
      where: (users, { eq, and: andFn }) => {
        return andFn(eq(users.userId, userId), eq(users.type, 'user'));
      },
    });

    if (existingUser) {
      return { success: true, data: existingUser.id };
    }

    // Create a new all_user record for this user
    const newUserId = randomUUID();
    await db.insert(allUsers).values({
      id: newUserId,
      type: 'user',
      userId: userId,
      createdAt: new Date(),
    });

    return { success: true, data: newUserId };
  } catch (error) {
    fatLogger.error('Failed to resolve owner ID', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'resolve_owner_id',
      userId,
      isOnboarding,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

import { detectMemoryType as _detectMemoryType } from '@/utils/memory-type';

/**
 * Extract memory type from MIME type or file extension
 * @deprecated Use detectMemoryType from @/utils/memory-type instead
 */
export const extractMemoryType = (mimeType: string, fileName?: string): MemoryType => {
  // Re-export the utility function for backward compatibility
  return _detectMemoryType(mimeType, fileName);
};

/**
 * Get memory record statistics for a user
 */
export const getMemoryRecordStats = async (ownerId: string): Promise<MemoryOperationResult> => {
  try {
    const stats = await db.query.memories.findMany({
      where: and(eq(memories.ownerId, ownerId), isNull(memories.deletedAt)),
      columns: {
        type: true,
        createdAt: true,
      },
    });

    const typeCounts = stats.reduce(
      (acc, memory) => {
        acc[memory.type] = (acc[memory.type] || 0) + 1;
        return acc;
      },
      {} as Record<MemoryType, number>
    );

    const totalCount = stats.length;
    const recentCount = stats.filter(m => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return m.createdAt > thirtyDaysAgo;
    }).length;

    return {
      success: true,
      data: {
        total: totalCount,
        recent: recentCount,
        byType: typeCounts,
      },
    };
  } catch (error) {
    fatLogger.error('Failed to get memory stats', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'get_memory_stats',
      ownerId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
