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
 *
 * FIXED: Now retrieves memory data BEFORE deletion to ensure S3 cleanup works properly
 */
import { deleteS3Object } from '@/lib/s3-utils';

/**
 * FIXED: Clean up storage edges for a deleted memory
 * This function removes all storage edge records for a given memory
 *
 * KEY FIX: Now properly uses the passed memoryData instead of trying to fetch from DB
 */
export async function cleanupStorageEdgesForMemory(params: {
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
      storageBackend: string; 
      storageKey: string;
      url?: string;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  } | null;
}) {
  const { memoryId, memoryType, memoryData } = params;
  const results: {
    deletedEdges: Array<{ id: string }>;
    deletedS3Objects: string[];
    errors: string[];
  } = {
    deletedEdges: [],
    deletedS3Objects: [],
    errors: [],
  };

  try {
    console.log('🔄 Starting cleanup for memory:', memoryId);

    // Import the storage edges and memory assets tables
    const { storageEdges, memoryAssets } = await import('@/db/schema');

    // FIXED: Use the provided memory data directly (don't try to fetch from DB)
    const memory = memoryData;

    console.log('🔍 Memory record for cleanup:', {
      memoryId,
      found: !!memory,
      hasMetadata: !!memory?.metadata,
      storageKey: memory?.metadata?.custom?.storageKey || 'not found',
      storageBackend: memory?.metadata?.custom?.storageBackend || 'not found',
      timestamp: new Date().toISOString(),
    });

    // If we don't have memory data, we can't do proper cleanup
    if (!memory) {
      console.error('❌ No memory data provided for cleanup - cannot determine S3 storage key');
      return {
        success: false,
        error: 'No memory data provided for cleanup',
        deletedCount: 0,
        deletedS3Count: 0,
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
      console.log('✅ Found S3 storage info in memory metadata:', {
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
      console.log('⚠️ No S3 storage info found in memory metadata:', {
        hasMetadata: !!memory?.metadata,
        hasCustom: !!memory?.metadata?.custom,
        storageBackend: memory?.metadata?.custom?.storageBackend,
        storageKey: memory.metadata?.custom?.storageKey,
      });
    }

    // Also check memory_assets table and storage edges as before
    const dbAssets = await db.select().from(memoryAssets).where(eq(memoryAssets.memoryId, memoryId));
    console.log(`🔍 Found ${dbAssets.length} assets in memory_assets table`);
    
    // Type assertion for dbAssets
    const typedDbAssets = dbAssets as Array<{
      id: string;
      memoryId: string;
      storageBackend: string;
      storageKey: string;
      [key: string]: unknown;
    }>;

    const edges = await db
      .select()
      .from(storageEdges)
      .where(and(eq(storageEdges.memoryId, memoryId), eq(storageEdges.memoryType, memoryType)));

    console.log(`🔍 Found ${edges.length} storage edges`);

    // Filter and add S3 assets from database
    const s3DbAssets = typedDbAssets.filter(asset => {
      const backend = String(asset.storageBackend || '')
        .toLowerCase()
        .trim();
      return backend === 's3' || backend === 'aws-s3' || backend.includes('s3');
    });

    // Add S3 edges - handle potential type mismatch with the backend enum
    const s3Edges = edges.filter(edge => {
      const backend = String(edge.backend).toLowerCase();
      return backend === 'aws-s3' || backend === 's3' || backend.includes('s3');
    });

    // Combine all S3 assets
    const allS3Assets = [
      ...s3Assets,
      ...s3DbAssets.map(asset => ({
        id: asset.id,
        memoryId: asset.memoryId,
        storageKey: asset.storageKey,
        storageBackend: asset.storageBackend,
        bytes: asset.bytes,
        mimeType: asset.mimeType,
      })),
      ...s3Edges.map(edge => ({
        id: `edge-${edge.id}`,
        memoryId,
        storageKey: extractS3KeyFromUrl(edge.location || ''),
        storageBackend: 's3',
        bytes: edge.sizeBytes,
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

    console.log(
      `🗑️ Found ${uniqueS3Assets.length} unique S3 assets to delete:`,
      uniqueS3Assets.map(a => ({ id: a.id, key: a.storageKey }))
    );

    // Delete S3 objects
    const s3DeletePromises = uniqueS3Assets.map(async asset => {
      if (!asset.storageKey) return;

      try {
        console.log(`🔄 Attempting to delete S3 object: ${asset.storageKey}`);
        const success = await deleteS3Object(asset.storageKey);

        if (success) {
          console.log(`✅ Successfully deleted S3 object: ${asset.storageKey}`);
          results.deletedS3Objects.push(asset.storageKey);
        } else {
          const msg = `Failed to delete S3 object: ${asset.storageKey}`;
          console.error(msg);
          results.errors.push(msg);
        }
      } catch (error) {
        const errorMsg = `Error deleting S3 object ${asset.storageKey}: ${error}`;
        console.error(errorMsg);
        results.errors.push(errorMsg);
      }
    });

    await Promise.all(s3DeletePromises);

    // Delete storage edges and memory assets from database
    const deletedEdges = await db
      .delete(storageEdges)
      .where(and(eq(storageEdges.memoryId, memoryId), eq(storageEdges.memoryType, memoryType)))
      .returning();

    const deletedAssets = await db.delete(memoryAssets).where(eq(memoryAssets.memoryId, memoryId)).returning();

    results.deletedEdges = deletedEdges;

    console.log(`🗑️ Deleted ${deletedEdges.length} storage edges and ${deletedAssets.length} assets from database`);

    return {
      success: results.errors.length === 0,
      deletedCount: deletedEdges.length,
      deletedS3Count: results.deletedS3Objects.length,
      deletedEdges: results.deletedEdges,
      deletedS3Objects: results.deletedS3Objects,
      errors: results.errors.length > 0 ? results.errors : undefined,
    };
  } catch (error) {
    console.error('❌ Error cleaning up storage:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      deletedS3Objects: results.deletedS3Objects,
      errors: results.errors,
    };
  }
}

// Helper function to extract S3 key from URL
function extractS3KeyFromUrl(url: string): string {
  if (!url) return '';

  const s3Domain = '.s3.amazonaws.com/';
  const s3UrlIndex = url.indexOf(s3Domain);

  if (s3UrlIndex > -1) {
    return url.substring(s3UrlIndex + s3Domain.length).split('?')[0];
  }

  // If it's already just a key, return as-is
  return url;
}

/**
 * FIXED: Get memory data before deletion for cleanup purposes
 * This function retrieves all necessary memory information before the memory is deleted
 */
export async function getMemoryDataForCleanup(memoryId: string) {
  try {
    console.log(`📋 Retrieving memory data for cleanup: ${memoryId}`);

    const memory = await db.query.memories.findFirst({
      where: eq(memories.id, memoryId),
      with: {
        assets: true,
        folder: true,
      },
    });

    if (!memory) {
      console.warn(`❌ Memory ${memoryId} not found for cleanup data retrieval`);
      return null;
    }

    console.log('✅ Retrieved memory data for cleanup:', {
      id: memory.id,
      type: memory.type,
      hasMetadata: !!memory.metadata,
      hasCustomMetadata: !!(memory.metadata as { custom?: Record<string, unknown> })?.custom,
      storageBackend: (memory.metadata as { custom?: { storageBackend?: string } })?.custom?.storageBackend,
      storageKey: (memory.metadata as { custom?: { storageKey?: string } })?.custom?.storageKey,
      storageLocations: memory.storageLocations,
      assetsCount: memory.assets?.length || 0,
    });

    return memory;
  } catch (error) {
    console.error('❌ Error retrieving memory data for cleanup:', error);
    return null;
  }
}

/**
 * Usage example for the DELETE endpoint:
 *
 * // In your DELETE memory API endpoint:
 * export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
 *   // ... authentication checks ...
 *
 *   // 1. Get memory data BEFORE deleting it
 *   const memoryData = await getMemoryDataForCleanup(params.id);
 *
 *   // 2. Delete the memory from the main table
 *   await db.delete(memories).where(eq(memories.id, params.id));
 *
 *   // 3. Clean up storage with the retrieved data
 *   const cleanupResult = await cleanupStorageEdgesForMemory({
 *     memoryId: params.id,
 *     memoryType: memoryData?.type || 'image', // fallback type
 *     memoryData: memoryData // pass the data we retrieved earlier
 *   });
 *
 *   // ... return response ...
 * }
 */
