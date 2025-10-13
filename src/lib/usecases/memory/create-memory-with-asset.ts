/**
 * Create Memory with Asset - Use Case
 *
 * Orchestrates the creation of a single memory with its associated asset and storage edges.
 * Uses the memory and storage edges service layers for all database operations.
 */

import { DBMemory } from '@/db/schema';
import {
  createMemoryRecord,
  createAssetRecords,
  type CreateMemoryParams,
  type CreateAssetParams,
} from '@/services/memory';
import { createMemoryStorageEdges } from './create-memory-storage-edges';
import { buildStorageKey } from '@/lib/storage/s3';
import { fatLogger } from '@/lib/logger';
import type { AcceptedMimeType } from '@/app/api/memories/utils/file-processing';

export interface CreateMemoryWithAssetParams {
  type: 'document' | 'image' | 'video' | 'note' | 'audio';
  ownerId: string;
  url: string;
  file: File;
  metadata: {
    uploadedAt: string;
    originalName: string;
    size: number;
    mimeType: AcceptedMimeType;
  };
  parentFolderId?: string | null;
  assetLocation?: string;
}

export interface CreateMemoryWithAssetResult {
  type: 'document' | 'image' | 'video' | 'note' | 'audio';
  data: {
    id: string;
    ownerId: string;
    assets: unknown[];
  };
}

/**
 * Create a single memory with its asset and storage edges
 *
 * This function orchestrates the creation of:
 * 1. Memory record using the memory service
 * 2. Asset record using the memory service
 * 3. Storage edges using the storage edges service
 *
 * @param params - Parameters for creating the memory with asset
 * @returns Result containing the created memory data
 */
export async function createMemoryWithAsset(params: CreateMemoryWithAssetParams): Promise<CreateMemoryWithAssetResult> {
  const { type, ownerId, url, file, metadata, parentFolderId, assetLocation = 's3' } = params;

  // Create memory using service layer
  const memoryParams: CreateMemoryParams = {
    title: file.name.split('.')[0],
    type: type as 'image' | 'video' | 'document' | 'note' | 'audio',
    ownerId,
    parentFolderId: parentFolderId || null,
    metadata: {
      custom: {
        originalPath: file.name,
        uploadedAt: metadata.uploadedAt,
        size: metadata.size,
        mimeType: metadata.mimeType,
      },
    },
    storageDuration: null, // null means permanent storage
  };

  const memoryResult = await createMemoryRecord(memoryParams);
  if (!memoryResult.success) {
    throw new Error(`Failed to create memory: ${memoryResult.error}`);
  }

  const createdMemory = memoryResult.data as DBMemory;

  // Create original asset using service layer
  const assetParams: CreateAssetParams = {
    memoryId: createdMemory.id,
    assetType: 'original',
    variant: 'default',
    url,
    assetLocation: assetLocation as 'vercel_blob' | 's3' | 'icp' | 'arweave' | 'ipfs' | 'neon',
    storageKey: buildStorageKey(url, assetLocation as 's3' | 'vercel_blob' | 'icp' | 'arweave' | 'ipfs' | 'neon'),
    bytes: metadata.size,
    width: null, // Will be populated by client-side processing
    height: null, // Will be populated by client-side processing
    mimeType: metadata.mimeType,
    sha256: null, // Will be populated by client-side processing
    processingStatus: 'completed',
    processingError: null,
  };

  const assetResult = await createAssetRecords([assetParams]);
  if (!assetResult.success) {
    throw new Error(`Failed to create asset: ${assetResult.error}`);
  }

  const createdAssets = assetResult.data as unknown[];
  const createdAsset = createdAssets[0];

  // Create storage edges for the newly created memory
  const storageEdgeResult = await createMemoryStorageEdges({
    memoryId: createdMemory.id,
    memoryType: type,
    url,
    size: metadata.size,
  });

  if (!storageEdgeResult.success) {
    fatLogger.warn('⚠️ Failed to create storage edges for memory:', 'be', {
      memoryId: createdMemory.id,
      error: storageEdgeResult.error,
    });
    // Don't fail the upload if storage edge creation fails
  }

  return {
    type,
    data: {
      id: createdMemory.id,
      ownerId: createdMemory.ownerId,
      assets: [createdAsset],
    },
  };
}
