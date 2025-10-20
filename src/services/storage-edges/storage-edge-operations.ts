/**
 * Storage Edge Service Layer - Pure Functions
 *
 * This module provides pure functions for storage edge operations.
 * All functions are stateless and can be easily tested and composed.
 */

import { db } from '@/db/db';
import { storageEdges } from '@/db/tables';
import { type NewDBStorageEdge, type DBStorageEdge } from '@/db/types';
import { eq, and, isNull } from 'drizzle-orm';
import { fatLogger } from '@/lib/logger';

export interface CreateStorageEdgeParams {
  memoryId: string;
  memoryType: 'image' | 'video' | 'note' | 'document' | 'audio';
  artifact: 'metadata' | 'asset';
  locationMetadata?: 'neon' | 'icp';
  locationAsset?: 's3' | 'vercel_blob' | 'icp' | 'arweave' | 'ipfs' | 'neon';
  present?: boolean;
  location?: string;
  contentHash?: string | null;
  sizeBytes?: number | null;
  syncState?: 'idle' | 'migrating' | 'failed';
  syncError?: string | null;
}

export interface StorageEdgeOperationResult {
  success: boolean;
  data?: DBStorageEdge | DBStorageEdge[];
  error?: string;
}

export interface StorageEdgeQueryParams {
  memoryId?: string;
  memoryType?: 'image' | 'video' | 'note' | 'document' | 'audio';
  artifact?: 'metadata' | 'asset';
  locationMetadata?: 'neon' | 'icp';
  locationAsset?: 's3' | 'vercel_blob' | 'icp' | 'arweave' | 'ipfs' | 'neon';
  syncState?: 'idle' | 'migrating' | 'failed';
}

/**
 * Create a new storage edge record in the database
 */
export const createStorageEdge = async (params: CreateStorageEdgeParams): Promise<StorageEdgeOperationResult> => {
  try {
    // Validate that at least one location field is provided
    if (!params.locationMetadata && !params.locationAsset) {
      return {
        success: false,
        error: 'At least one location field must be provided: locationMetadata or locationAsset',
      };
    }

    // Validate artifact-specific location fields
    if (params.artifact === 'metadata' && !params.locationMetadata) {
      return {
        success: false,
        error: 'locationMetadata is required for metadata artifacts',
      };
    }

    if (params.artifact === 'asset' && !params.locationAsset) {
      return {
        success: false,
        error: 'locationAsset is required for asset artifacts',
      };
    }

    const edgeData: NewDBStorageEdge = {
      memoryId: params.memoryId,
      memoryType: params.memoryType,
      artifact: params.artifact,
      locationMetadata: params.locationMetadata,
      locationAsset: params.locationAsset,
      present: params.present ?? false,
      locationUrl: params.location,
      contentHash: params.contentHash,
      sizeBytes: params.sizeBytes,
      syncState: params.syncState ?? 'idle',
      syncError: params.syncError,
      updatedAt: new Date(),
    };

    // First, try to find existing edge to avoid conflicts
    fatLogger.info('Checking for existing storage edge', 'be', {
      memoryId: params.memoryId,
      memoryType: params.memoryType,
      artifact: params.artifact,
      locationMetadata: params.locationMetadata,
      locationAsset: params.locationAsset,
    });

    const existingEdge = await db
      .select()
      .from(storageEdges)
      .where(
        and(
          eq(storageEdges.memoryId, params.memoryId),
          eq(storageEdges.memoryType, params.memoryType),
          eq(storageEdges.artifact, params.artifact),
          params.locationMetadata
            ? eq(storageEdges.locationMetadata, params.locationMetadata)
            : isNull(storageEdges.locationMetadata),
          params.locationAsset
            ? eq(storageEdges.locationAsset, params.locationAsset)
            : isNull(storageEdges.locationAsset)
        )
      )
      .limit(1);

    let createdEdge: DBStorageEdge;

    if (existingEdge.length > 0) {
      // Update existing edge
      fatLogger.info('Updating existing storage edge', 'be', {
        memoryId: params.memoryId,
        existingEdgeId: existingEdge[0].id,
      });

      const [updatedEdge] = await db
        .update(storageEdges)
        .set({
          present: params.present ?? false,
          locationUrl: params.location,
          contentHash: params.contentHash,
          sizeBytes: params.sizeBytes,
          syncState: params.syncState ?? 'idle',
          syncError: params.syncError,
          lastSyncedAt: params.syncState === 'idle' ? new Date() : undefined,
          updatedAt: new Date(),
        })
        .where(eq(storageEdges.id, existingEdge[0].id))
        .returning();

      createdEdge = updatedEdge;
    } else {
      // Create new edge
      fatLogger.info('Creating new storage edge', 'be', {
        memoryId: params.memoryId,
        memoryType: params.memoryType,
        artifact: params.artifact,
      });

      const [newEdge] = await db.insert(storageEdges).values(edgeData).returning();

      createdEdge = newEdge;
    }

    if (!createdEdge) {
      fatLogger.error('Failed to create storage edge - no result returned', 'be', {
        memoryId: params.memoryId,
        memoryType: params.memoryType,
        artifact: params.artifact,
        locationMetadata: params.locationMetadata,
        locationAsset: params.locationAsset,
      });
      return { success: false, error: 'Failed to create storage edge' };
    }

    fatLogger.info('Successfully created storage edge', 'be', {
      memoryId: params.memoryId,
      memoryType: params.memoryType,
      artifact: params.artifact,
      locationMetadata: params.locationMetadata,
      locationAsset: params.locationAsset,
      edgeId: createdEdge.id,
    });

    return { success: true, data: createdEdge };
  } catch (error) {
    fatLogger.error('Failed to create storage edge', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'create_storage_edge',
      memoryId: params.memoryId,
      memoryType: params.memoryType,
      artifact: params.artifact,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Create multiple storage edges for a memory (e.g., metadata + multiple assets)
 */
export const createStorageEdges = async (edges: CreateStorageEdgeParams[]): Promise<StorageEdgeOperationResult[]> => {
  const results: StorageEdgeOperationResult[] = [];

  for (const edge of edges) {
    const result = await createStorageEdge(edge);
    results.push(result);

    // If any edge creation fails, log it but continue with others
    if (!result.success) {
      fatLogger.error('Failed to create storage edge in batch', 'be', {
        memoryId: edge.memoryId,
        error: result.error,
      });
    }
  }

  return results;
};

/**
 * Get storage edges by query parameters
 */
export const getStorageEdges = async (params: StorageEdgeQueryParams): Promise<StorageEdgeOperationResult> => {
  try {
    const conditions = [];

    if (params.memoryId) {
      conditions.push(eq(storageEdges.memoryId, params.memoryId));
    }
    if (params.memoryType) {
      conditions.push(eq(storageEdges.memoryType, params.memoryType));
    }
    if (params.artifact) {
      conditions.push(eq(storageEdges.artifact, params.artifact));
    }
    if (params.locationMetadata) {
      conditions.push(eq(storageEdges.locationMetadata, params.locationMetadata));
    }
    if (params.locationAsset) {
      conditions.push(eq(storageEdges.locationAsset, params.locationAsset));
    }
    if (params.syncState) {
      conditions.push(eq(storageEdges.syncState, params.syncState));
    }

    const result =
      conditions.length > 0
        ? await db
            .select()
            .from(storageEdges)
            .where(and(...conditions))
        : await db.select().from(storageEdges);

    return { success: true, data: result as DBStorageEdge[] };
  } catch (error) {
    fatLogger.error('Failed to get storage edges', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'get_storage_edges',
      params,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Delete storage edges by query parameters
 */
export const deleteStorageEdges = async (params: StorageEdgeQueryParams): Promise<StorageEdgeOperationResult> => {
  try {
    const conditions = [];

    if (params.memoryId) {
      conditions.push(eq(storageEdges.memoryId, params.memoryId));
    }
    if (params.memoryType) {
      conditions.push(eq(storageEdges.memoryType, params.memoryType));
    }
    if (params.artifact) {
      conditions.push(eq(storageEdges.artifact, params.artifact));
    }
    if (params.locationMetadata) {
      conditions.push(eq(storageEdges.locationMetadata, params.locationMetadata));
    }
    if (params.locationAsset) {
      conditions.push(eq(storageEdges.locationAsset, params.locationAsset));
    }
    if (params.syncState) {
      conditions.push(eq(storageEdges.syncState, params.syncState));
    }

    const deletedEdges =
      conditions.length > 0
        ? await db
            .delete(storageEdges)
            .where(and(...conditions))
            .returning()
        : await db.delete(storageEdges).returning();

    fatLogger.info('Deleted storage edges', 'be', {
      operation: 'delete_storage_edges',
      count: deletedEdges.length,
      params,
    });

    return { success: true, data: deletedEdges };
  } catch (error) {
    fatLogger.error('Failed to delete storage edges', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'delete_storage_edges',
      params,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Helper function to create ICP storage edges for a memory
 */
export const createICPStorageEdges = async (
  memoryId: string,
  memoryType: 'image' | 'video' | 'note' | 'document' | 'audio',
  assets: {
    original?: { blobId: string; size: number };
    display?: { blobId: string; size: number };
    thumb?: { blobId: string; size: number };
    placeholder?: { blobId: string; size: number };
  }
): Promise<StorageEdgeOperationResult[]> => {
  const edges: CreateStorageEdgeParams[] = [];

  // 1. Metadata edge
  edges.push({
    memoryId,
    memoryType,
    artifact: 'metadata',
    locationMetadata: 'icp',
    present: true,
    location: `icp://memory/${memoryId}`,
    contentHash: null,
    sizeBytes: null,
    syncState: 'idle',
    syncError: null,
  });

  // 2. Original asset edge
  if (assets.original) {
    edges.push({
      memoryId,
      memoryType,
      artifact: 'asset',
      locationAsset: 'icp',
      present: true,
      location: `icp://blob/${assets.original.blobId}`,
      contentHash: null,
      sizeBytes: assets.original.size,
      syncState: 'idle',
      syncError: null,
    });
  }

  // 3. Derivative asset edges
  if (assets.display) {
    edges.push({
      memoryId,
      memoryType,
      artifact: 'asset',
      locationAsset: 'icp',
      present: true,
      location: `icp://blob/${assets.display.blobId}`,
      contentHash: null,
      sizeBytes: assets.display.size,
      syncState: 'idle',
      syncError: null,
    });
  }

  if (assets.thumb) {
    edges.push({
      memoryId,
      memoryType,
      artifact: 'asset',
      locationAsset: 'icp',
      present: true,
      location: `icp://blob/${assets.thumb.blobId}`,
      contentHash: null,
      sizeBytes: assets.thumb.size,
      syncState: 'idle',
      syncError: null,
    });
  }

  if (assets.placeholder) {
    edges.push({
      memoryId,
      memoryType,
      artifact: 'asset',
      locationAsset: 'icp',
      present: true,
      location: `icp://blob/${assets.placeholder.blobId}`,
      contentHash: null,
      sizeBytes: assets.placeholder.size,
      syncState: 'idle',
      syncError: null,
    });
  }

  return await createStorageEdges(edges);
};
