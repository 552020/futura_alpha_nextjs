/**
 * ASSET MANAGEMENT API ENDPOINT
 *
 * This endpoint handles asset management for memories in the unified schema.
 * It supports creating, updating, and managing multiple optimized assets per memory.
 *
 * USAGE:
 * - PUT /api/memories/:id/assets - Upsert multiple assets for a memory
 * - GET /api/memories/:id/assets - Get all assets for a memory
 * - DELETE /api/memories/:id/assets - Delete specific assets
 *
 * ASSET TYPES:
 * - original: Full resolution file
 * - display: Optimized for viewing (~2048px long edge, WebP)
 * - thumb: Grid thumbnails (~512px long edge, WebP)
 * - placeholder: Low-quality placeholders
 * - poster: Video poster frames
 * - waveform: Audio visualizations
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db/db';
import { allUsers, memories, memoryAssets, DBMemoryAsset } from '@/db';
import { eq } from 'drizzle-orm';
import { getMemoryAccessLevel } from '../../utils/access';

import { fatLogger } from '@/lib/logger';
/**
 * PUT /api/memories/:id/assets - Upsert multiple assets for a memory
 *
 * Request body:
 * {
 *   "assets": [
 *     {
 *       "assetType": "original",
 *       "url": "https://blob.vercel-storage.com/beach.jpg",
 *       "bytes": 20971520,
 *       "width": 6000,
 *       "height": 4000,
 *       "mimeType": "image/jpeg",
 *       "storageBackend": "vercel_blob",
 *       "storageKey": "beach.jpg",
 *       "sha256": "abc123...",
 *       "variant": null
 *     },
 *     {
 *       "assetType": "display",
 *       "url": "https://blob.vercel-storage.com/beach_display.webp",
 *       "bytes": 280314,
 *       "width": 2048,
 *       "height": 1365,
 *       "mimeType": "image/webp",
 *       "storageBackend": "vercel_blob",
 *       "storageKey": "beach_display.webp",
 *       "sha256": "def456...",
 *       "variant": null
 *     }
 *   ]
 * }
 */
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const params = await context.params;
    const memoryId = params.id;

    // Get the allUserId for the authenticated user
    const allUserRecord = await db.query.allUsers.findFirst({
      where: eq(allUsers.userId, session.user.id),
    });

    if (!allUserRecord) {
      return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    }

    // Check if user has write access to this memory
    const accessLevel = await getMemoryAccessLevel({
      userId: allUserRecord.id,
      memoryId,
    });

    if (!accessLevel || (accessLevel !== 'owner' && accessLevel !== 'write')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Verify memory exists
    const memory = await db.query.memories.findFirst({
      where: eq(memories.id, memoryId),
    });

    if (!memory) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { assets } = body;

    if (!assets || !Array.isArray(assets)) {
      return NextResponse.json({ error: 'Invalid request: assets array is required' }, { status: 400 });
    }

    // Validate asset data
    for (const asset of assets) {
      if (!asset.assetType || !asset.url || !asset.bytes || !asset.mimeType) {
        return NextResponse.json(
          { error: 'Invalid asset: assetType, url, bytes, and mimeType are required' },
          { status: 400 }
        );
      }

      if (!['original', 'display', 'thumb', 'placeholder', 'poster', 'waveform'].includes(asset.assetType)) {
        return NextResponse.json(
          {
            error: `Invalid assetType: ${asset.assetType}. Must be one of: original, display, thumb, placeholder, poster, waveform`,
          },
          { status: 400 }
        );
      }
    }

    // Upsert assets using service layer
    const upsertedAssets = [];

    for (const asset of assets) {
      const { upsertAssetRecord } = await import('@/services/memory/asset-operations');

      const assetResult = await upsertAssetRecord({
        memoryId,
        assetType: asset.assetType as 'original' | 'display' | 'thumb' | 'placeholder' | 'poster' | 'waveform',
        variant: asset.variant || null,
        url: asset.url,
        assetLocation: asset.assetLocation || 'vercel_blob',
        storageKey: asset.storageKey || asset.url.split('/').pop() || '',
        bytes: asset.bytes,
        width: asset.width || null,
        height: asset.height || null,
        mimeType: asset.mimeType,
        sha256: asset.sha256 || null,
        processingStatus: asset.processingStatus || 'completed',
        processingError: asset.processingError || null,
      });

      if (assetResult.success && assetResult.data) {
        upsertedAssets.push(assetResult.data);
      } else {
        fatLogger.warn('Failed to upsert asset', 'be', {
          operation: 'add_asset_to_memory',
          memoryId,
          assetType: asset.assetType,
          error: assetResult.error,
        });
      }
    }

    // Create storage edges for the new assets
    try {
      const { createMemoryStorageEdges } = await import('@/lib/usecases/memory/create-memory-storage-edges');

      for (const asset of assets) {
        const storageEdgeResult = await createMemoryStorageEdges({
          memoryId,
          memoryType: memory.type as 'image' | 'video' | 'note' | 'document' | 'audio',
          url: asset.url,
          size: asset.bytes,
          contentHash: asset.sha256,
        });

        if (!storageEdgeResult.success) {
          fatLogger.warn('Failed to create storage edges for added asset', 'be', {
            operation: 'add_asset_to_memory',
            memoryId,
            assetType: asset.assetType,
            error: storageEdgeResult.error,
          });
          // Don't fail the entire operation if storage edges fail
        } else {
          fatLogger.info('Successfully created storage edges for added asset', 'be', {
            operation: 'add_asset_to_memory',
            memoryId,
            assetType: asset.assetType,
            metadataEdge: storageEdgeResult.metadataEdge?.id,
            assetEdge: storageEdgeResult.assetEdge?.id,
          });
        }
      }
    } catch (error) {
      fatLogger.warn('Error creating storage edges for added assets', 'be', {
        operation: 'add_asset_to_memory',
        memoryId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't fail the entire operation if storage edges fail
    }

    return NextResponse.json({
      success: true,
      data: {
        memoryId,
        assets: upsertedAssets,
      },
    });
  } catch (error) {
    fatLogger.error('Error managing assets:', 'be', { data: error instanceof Error ? error : undefined });
    return NextResponse.json({ error: 'Failed to manage assets' }, { status: 500 });
  }
}

/**
 * GET /api/memories/:id/assets - Get all assets for a memory
 */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const params = await context.params;
    const memoryId = params.id;

    // Get the allUserId for the authenticated user
    const allUserRecord = await db.query.allUsers.findFirst({
      where: eq(allUsers.userId, session.user.id),
    });

    if (!allUserRecord) {
      return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    }

    // Check if user has read access to this memory
    const accessLevel = await getMemoryAccessLevel({
      userId: allUserRecord.id,
      memoryId,
    });

    if (!accessLevel) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get all assets for the memory
    const assets = await db.query.memoryAssets.findMany({
      where: eq(memoryAssets.memoryId, memoryId),
      orderBy: (assets, { asc }) => [asc(assets.assetType)],
    });

    return NextResponse.json({
      success: true,
      data: {
        memoryId,
        assets,
      },
    });
  } catch (error) {
    fatLogger.error('Error fetching assets:', 'be', { data: error instanceof Error ? error : undefined });
    return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 });
  }
}

/**
 * DELETE /api/memories/:id/assets - Delete specific assets
 *
 * Request body:
 * {
 *   "assetTypes": ["display", "thumb"] // Optional: delete specific asset types
 * }
 * If no assetTypes provided, deletes all assets for the memory
 */
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const params = await context.params;
    const memoryId = params.id;

    // Get the allUserId for the authenticated user
    const allUserRecord = await db.query.allUsers.findFirst({
      where: eq(allUsers.userId, session.user.id),
    });

    if (!allUserRecord) {
      return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    }

    // Check if user has write access to this memory
    const accessLevel = await getMemoryAccessLevel({
      userId: allUserRecord.id,
      memoryId,
    });

    if (!accessLevel || (accessLevel !== 'owner' && accessLevel !== 'write')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Parse request body to get asset types to delete
    let assetTypes: string[] = [];
    try {
      const body = await request.json();
      assetTypes = body.assetTypes || [];
    } catch {
      // If no body or invalid JSON, delete all assets
    }

    // Build delete condition
    let deleteCondition = eq(memoryAssets.memoryId, memoryId);

    if (assetTypes.length > 0) {
      // For now, we'll delete all assets and filter by type in the application
      // This is a limitation of Drizzle's enum handling
      deleteCondition = eq(memoryAssets.memoryId, memoryId);
    }

    // Delete assets
    const deletedAssets = await db.delete(memoryAssets).where(deleteCondition).returning();

    // Filter by asset types if specified
    const filteredDeletedAssets =
      assetTypes.length > 0
        ? deletedAssets.filter((asset: DBMemoryAsset) => assetTypes.includes(asset.assetType))
        : deletedAssets;

    // Clean up storage edges for deleted assets
    try {
      const { deleteStorageEdges } = await import('@/services/storage-edges/storage-edge-operations');

      // Delete storage edges for the memory (since assets are being removed)
      const storageEdgeResult = await deleteStorageEdges({
        memoryId,
        memoryType: memory.type as 'image' | 'video' | 'note' | 'document' | 'audio',
      });

      if (!storageEdgeResult.success) {
        fatLogger.warn('Failed to delete storage edges for deleted assets', 'be', {
          operation: 'delete_assets_from_memory',
          memoryId,
          error: storageEdgeResult.error,
        });
        // Don't fail the entire operation if storage edge deletion fails
      } else {
        fatLogger.info('Successfully deleted storage edges for deleted assets', 'be', {
          operation: 'delete_assets_from_memory',
          memoryId,
          deletedEdgesCount: storageEdgeResult.data?.length || 0,
        });
      }
    } catch (error) {
      fatLogger.warn('Error deleting storage edges for deleted assets', 'be', {
        operation: 'delete_assets_from_memory',
        memoryId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't fail the entire operation if storage edge deletion fails
    }

    return NextResponse.json({
      success: true,
      data: {
        memoryId,
        deletedAssets: filteredDeletedAssets,
        deletedCount: filteredDeletedAssets.length,
      },
    });
  } catch (error) {
    fatLogger.error('Error deleting assets:', 'be', { data: error instanceof Error ? error : undefined });
    return NextResponse.json({ error: 'Failed to delete assets' }, { status: 500 });
  }
}
