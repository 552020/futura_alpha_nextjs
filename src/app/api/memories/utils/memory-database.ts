/**
 * MEMORY DATABASE UTILITIES - UNIFIED SCHEMA
 *
 * This module handles database operations for the unified memories schema.
 * It replaces the old separate tables with a single memories table.
 *
 * USAGE:
 * - Store memories in the unified database
 * - Create and manage storage edges
 * - Handle memory asset creation
 *
 * FUNCTIONS:
 * - storeInNewDatabase(): Store memory with unified schema
 * - createStorageEdgesForMemory(): Track storage locations
 * - cleanupStorageEdgesForMemory(): Clean up storage tracking
 */

import { db } from '@/db/db';
import { memories, memoryAssets } from '@/db/schema';
import { NewDBMemory, NewDBMemoryAsset, DBMemory } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import crypto from 'crypto';
import { randomUUID } from 'crypto';
import type { AcceptedMimeType } from './file-processing';
import { getMemoryType } from './file-processing';

export type UploadResponse = {
  type: 'image' | 'video' | 'document' | 'note' | 'audio';
  data: DBMemory;
};

/**
 * Build memory and asset data for the unified schema
 * This function creates the database row data for both memories and memoryAssets tables
 */
export function buildNewMemoryAndAsset(
  file: File,
  url: string,
  ownerId: string
): { memory: NewDBMemory; asset: NewDBMemoryAsset } {
  const name = file.name || 'Untitled';

  const memory: NewDBMemory = {
    ownerId,
    type: getMemoryType(file.type as AcceptedMimeType) as 'image' | 'video' | 'document' | 'note' | 'audio',
    title: name,
    description: '',
    fileCreatedAt: new Date(),
    isPublic: false,
    parentFolderId: null,
    ownerSecureCode: randomUUID(),
  };

  const asset: NewDBMemoryAsset = {
    memoryId: '', // Will be set after memory is created
    assetType: 'original',
    variant: 'default',
    url,
    storageBackend: 'vercel_blob',
    storageKey: url.split('/').pop() || '',
    bytes: file.size,
    width: null,
    height: null,
    mimeType: file.type,
    sha256: null,
    processingStatus: 'completed',
    processingError: null,
  };

  return { memory, asset };
}

/**
 * Process multiple files and create memories/assets in batch
 * This function handles the batch processing logic for folder uploads
 */
export async function processMultipleFilesBatch(params: { files: File[]; urls: string[]; ownerId: string }): Promise<{
  success: boolean;
  memories: DBMemory[];
  assets: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  error?: string;
}> {
  const { files, urls, ownerId } = params;

  try {
    // Build memory and asset data for all files
    const memoryRows: NewDBMemory[] = [];
    const assetRows: NewDBMemoryAsset[] = [];

    files.forEach((file, index) => {
      const { memory, asset } = buildNewMemoryAndAsset(file, urls[index], ownerId);
      memoryRows.push(memory);
      assetRows.push(asset);
    });

    // Batch insert memories first
    const insertedMemories = await db.insert(memories).values(memoryRows).returning();
    console.log(`✅ Batch inserted ${insertedMemories.length} memories into database`);

    // Update asset memoryIds and insert assets
    const assetsWithMemoryIds = assetRows.map((asset, index) => ({
      ...asset,
      memoryId: insertedMemories[index].id,
    }));

    const insertedAssets = await db.insert(memoryAssets).values(assetsWithMemoryIds).returning();
    console.log(`✅ Batch inserted ${insertedAssets.length} assets into database`);

    return {
      success: true,
      memories: insertedMemories,
      assets: insertedAssets,
    };
  } catch (error) {
    console.error('❌ Error processing multiple files batch:', error);
    return {
      success: false,
      memories: [],
      assets: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// New function to store in the new unified schema
export async function storeInNewDatabase(params: {
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
}) {
  const { type, ownerId, url, file, metadata, parentFolderId } = params;

  // Create memory in the new unified table
  const newMemory: NewDBMemory = {
    ownerId,
    type: type as 'image' | 'video' | 'document' | 'note' | 'audio',
    title: file.name.split('.')[0],
    description: '',
    fileCreatedAt: new Date(),
    isPublic: false,
    parentFolderId: parentFolderId || null,
    ownerSecureCode: crypto.randomUUID(),
    metadata: {},
    // Storage status fields - default to web2 storage for new memories
    storageLocations: ['neon-db', 'vercel-blob'] as ('neon-db' | 'vercel-blob' | 'icp-canister' | 'aws-s3')[],
    storageDuration: null, // null means permanent storage
    storageCount: 2, // neon-db + vercel-blob
  };

  const [createdMemory] = await db.insert(memories).values(newMemory).returning();

  // Create original asset
  const newAsset: NewDBMemoryAsset = {
    memoryId: createdMemory.id,
    assetType: 'original',
    variant: 'default',
    url,
    storageBackend: 'vercel_blob',
    storageKey: url.split('/').pop() || '',
    bytes: metadata.size,
    width: null, // Will be populated by client-side processing
    height: null, // Will be populated by client-side processing
    mimeType: metadata.mimeType,
    sha256: null, // Will be populated by client-side processing
    processingStatus: 'completed',
    processingError: null,
  };

  const [createdAsset] = await db.insert(memoryAssets).values(newAsset).returning();

  // Create storage edges for the newly created memory
  const storageEdgeResult = await createStorageEdgesForMemory({
    memoryId: createdMemory.id,
    memoryType: type,
    url,
    size: metadata.size,
  });

  if (!storageEdgeResult.success) {
    console.warn('⚠️ Failed to create storage edges for memory:', createdMemory.id, storageEdgeResult.error);
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

/**
 * Create storage edges for a newly created memory
 * This function creates the necessary storage edge records to track where the memory is stored
 */
export async function createStorageEdgesForMemory(params: {
  memoryId: string;
  memoryType: 'image' | 'video' | 'note' | 'document' | 'audio';
  url: string;
  size: number;
  contentHash?: string;
}) {
  const { memoryId, memoryType, url, size, contentHash } = params;

  try {
    // console.log("🔗 Creating storage edges for memory:", { memoryId, memoryType });

    // Create metadata edge for neon-db (always present when memory is created)
    const metadataEdge = {
      memoryId,
      memoryType,
      artifact: 'metadata' as const,
      backend: 'neon-db' as const,
      present: true,
      location: null, // Metadata is stored in the main memory table
      contentHash: null,
      sizeBytes: null, // Metadata size is negligible
      syncState: 'idle' as const,
      syncError: null,
    };

    // Create asset edge for vercel-blob (present when file is uploaded)
    const assetEdge = {
      memoryId,
      memoryType,
      artifact: 'asset' as const,
      backend: 'vercel-blob' as const,
      present: true,
      location: url, // The blob URL
      contentHash: contentHash || null,
      sizeBytes: size,
      syncState: 'idle' as const,
      syncError: null,
    };

    // Import the storage edges table
    const { storageEdges } = await import('@/db/schema');

    // Insert both edges
    const [metadataResult, assetResult] = await Promise.all([
      db.insert(storageEdges).values(metadataEdge).returning(),
      db.insert(storageEdges).values(assetEdge).returning(),
    ]);

    // console.log("✅ Storage edges created successfully:", {
    //   metadataEdgeId: metadataResult[0]?.id,
    //   assetEdgeId: assetResult[0]?.id,
    // });

    return {
      success: true,
      metadataEdge: metadataResult[0],
      assetEdge: assetResult[0],
    };
  } catch (error) {
    console.error('❌ Error creating storage edges:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Clean up storage edges for a deleted memory
 * This function removes all storage edge records for a given memory
 */
export async function cleanupStorageEdgesForMemory(params: {
  memoryId: string;
  memoryType: 'image' | 'video' | 'note' | 'document' | 'audio';
}) {
  const { memoryId, memoryType } = params;

  try {
    // console.log("🧹 Cleaning up storage edges for memory:", { memoryId, memoryType });

    // Import the storage edges table
    const { storageEdges } = await import('@/db/schema');

    // Delete all storage edges for this memory
    const deletedEdges = await db
      .delete(storageEdges)
      .where(and(eq(storageEdges.memoryId, memoryId), eq(storageEdges.memoryType, memoryType)))
      .returning();

    // console.log("✅ Storage edges cleaned up successfully:", {
    //   memoryId,
    //   memoryType,
    //   deletedCount: deletedEdges.length,
    // });

    return {
      success: true,
      deletedCount: deletedEdges.length,
      deletedEdges,
    };
  } catch (error) {
    console.error('❌ Error cleaning up storage edges:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
