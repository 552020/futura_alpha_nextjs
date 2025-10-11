/**
 * Create Memory Storage Edges - Use Case
 * 
 * Orchestrates the creation of storage edge records for a newly created memory.
 * Uses the storage edges service layer for all database operations.
 */

import { createStorageEdge } from '@/services/storage-edges';
import { fatLogger } from '@/lib/logger';

export interface CreateMemoryStorageEdgesParams {
  memoryId: string;
  memoryType: 'image' | 'video' | 'note' | 'document' | 'audio';
  url: string;
  size: number;
  contentHash?: string;
}

export interface CreateMemoryStorageEdgesResult {
  success: boolean;
  metadataEdge?: unknown;
  assetEdge?: unknown;
  error?: string;
}

/**
 * Create storage edges for a newly created memory
 * 
 * This function creates the necessary storage edge records to track where the memory is stored.
 * It orchestrates calls to the storage edges service layer.
 * 
 * @param params - Parameters for creating storage edges
 * @returns Result containing created edges or error information
 */
export async function createMemoryStorageEdges(params: CreateMemoryStorageEdgesParams): Promise<CreateMemoryStorageEdgesResult> {
  const { memoryId, memoryType, url, size, contentHash } = params;

  try {
    // Create metadata edge for neon-db (always present when memory is created)
    const metadataResult = await createStorageEdge({
      memoryId,
      memoryType,
      artifact: 'metadata',
      locationMetadata: 'neon',
      present: true,
      location: undefined, // Metadata is stored in the main memory table
      contentHash: null,
      sizeBytes: null, // Metadata size is negligible
      syncState: 'idle',
      syncError: null,
    });

    // Create asset edge for vercel-blob (present when file is uploaded)
    const assetResult = await createStorageEdge({
      memoryId,
      memoryType,
      artifact: 'asset',
      locationAsset: 'vercel_blob',
      present: true,
      location: url, // The blob URL
      contentHash: contentHash || null,
      sizeBytes: size,
      syncState: 'idle',
      syncError: null,
    });

    if (!metadataResult.success || !assetResult.success) {
      const error = `Failed to create storage edges: ${metadataResult.error || assetResult.error}`;
      fatLogger.error('❌ Error creating storage edges:', 'be', { error });
      return {
        success: false,
        error,
      };
    }

    return {
      success: true,
      metadataEdge: metadataResult.data,
      assetEdge: assetResult.data,
    };
  } catch (error) {
    fatLogger.error('❌ Error creating storage edges:', 'be', { data: error instanceof Error ? error : undefined });
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

