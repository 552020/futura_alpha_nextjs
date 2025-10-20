/**
 * MEMORY LISTING HANDLER
 *
 * This module handles memory listing and retrieval operations:
 * - List user's memories with pagination
 * - Filter by memory type
 * - Include/exclude assets
 * - Backward compatibility with legacy format
 *
 * USAGE:
 * - GET /api/memories - List all memories
 * - GET /api/memories?type=image - Filter by type
 * - GET /api/memories?includeAssets=true - Include full assets
 * - GET /api/memories?page=1&limit=12 - Pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db/db';
import { allUsers, memories, memoryAssets, resourceMembership } from '@/db';
import { eq, desc, sql, and, ne } from 'drizzle-orm';
import { fetchMemoriesWithGalleries } from './utils/queries';
import { generateBestAssetUrl } from '@/lib/presigned-url-utils';
import crypto from 'node:crypto';

import { fatLogger } from '@/lib/logger';

function etagOf(obj: unknown) {
  const hash = crypto.createHash('sha1').update(JSON.stringify(obj)).digest('hex');
  return `W/"${hash}"`;
}
/**
 * Main GET handler for memory listing
 * Handles pagination, filtering, and asset inclusion
 */
export async function handleApiMemoryGet(request: NextRequest): Promise<NextResponse> {
  // Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Test fatLogger
  fatLogger.info('🧪 FATLOGGER TEST - This should appear if fatLogger is working', 'be', {
    userId: session.user.id,
    timestamp: new Date().toISOString(),
  });

  try {
    // First get the allUserId for the authenticated user
    const allUserRecord = await db.query.allUsers.findFirst({
      where: eq(allUsers.userId, session.user.id),
    });

    if (!allUserRecord) {
      fatLogger.error('No allUsers record found for user', 'be', { userId: session.user.id });
      return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    }

    fatLogger.info('Found allUserRecord', 'be', { userId: allUserRecord.id });

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const memoryType = searchParams.get('type');
    const includeAssets = searchParams.get('includeAssets') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const offset = (page - 1) * limit;
    const useOptimizedQuery = searchParams.get('optimized') === 'true';

    // Handle legacy type parameter mapping
    let mappedMemoryType = memoryType;
    if (memoryType === 'photo') mappedMemoryType = 'image';
    if (memoryType === 'file') mappedMemoryType = 'document';
    if (memoryType === 'text') mappedMemoryType = 'note';

    // Build where condition
    const whereCondition = mappedMemoryType
      ? and(
          eq(memories.ownerId, allUserRecord.id),
          eq(memories.type, mappedMemoryType as 'image' | 'video' | 'document' | 'note' | 'audio')
        )
      : eq(memories.ownerId, allUserRecord.id);

    fatLogger.debug('Built whereCondition', 'be', { ownerId: allUserRecord.id });

    // Handle optimized query with galleries
    if (useOptimizedQuery) {
      try {
        const memoriesWithGalleries = await fetchMemoriesWithGalleries(allUserRecord.id);

        // Apply pagination
        const paginatedMemories = memoriesWithGalleries.slice(offset, offset + limit);

        return NextResponse.json({
          data: paginatedMemories,
          hasMore: memoriesWithGalleries.length > offset + limit,
          total: memoriesWithGalleries.length,
        });
      } catch (error) {
        fatLogger.error('Error with optimized query', 'be', {
          error: error instanceof Error ? error : new Error(String(error)),
          query: 'optimized',
          userId: allUserRecord.id,
        });
        // Fall back to original implementation
      }
    }

    // Fetch memories with optional assets and folder information
    fatLogger.debug('Fetching memories with whereCondition', 'be', {
      whereCondition,
      pagination: { limit, offset, page },
    });
    // First, let's check total count without pagination
    const totalCount = await db.query.memories.findMany({
      where: whereCondition,
    });
    fatLogger.debug('Total memories count (no pagination)', 'be', { count: totalCount.length });
    const folderCounts = totalCount.reduce(
      (acc, m) => {
        const folderId = m.parentFolderId || 'no-folder';
        acc[folderId] = (acc[folderId] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    fatLogger.debug('Total memories by folder', 'be', { counts: folderCounts });

    // For dashboard, we need ALL memories to properly group into folders
    // The limit should be applied to the final dashboard items, not raw memories
    const userMemories = await db.query.memories.findMany({
      where: whereCondition,
      orderBy: desc(memories.createdAt),
      with: includeAssets
        ? {
            assets: true,
          }
        : {
            folder: true, // Always include folder information for dashboard grouping
          },
    });

    // Calculate share counts for each memory using resourceMembership
    const memoriesWithShareInfo = await Promise.all(
      userMemories.map(async memory => {
        let sharedWithCount = 0;
        try {
          // Count memberships for this memory (excluding the owner)
          const shareCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(resourceMembership)
            .where(
              and(
                eq(resourceMembership.resourceType, 'memory'),
                eq(resourceMembership.resourceId, memory.id),
                // Don't count the owner's own membership
                ne(resourceMembership.allUserId, memory.ownerId)
              )
            );
          sharedWithCount = shareCount[0]?.count || 0;
        } catch (error) {
          // Handle potential issues gracefully
          fatLogger.debug('resourceMembership query failed, assuming no shares', 'be', {
            memoryId: memory.id,
            error: error instanceof Error ? error.message : String(error),
          });
          sharedWithCount = 0;
        }

        const status = memory.sharingStatus === 'public' ? 'public' : sharedWithCount > 0 ? 'shared' : 'private';

        return {
          ...memory,
          status,
          sharedWithCount,
        };
      })
    );

    // Normalize folder name to prefer latest folders.title when present (when folder is included)
    const normalizedMemories = memoriesWithShareInfo.map(memory => {
      const m = memory as typeof memory & { folder?: { id: string; name?: string; title?: string } };
      const f = m.folder;
      if (f?.title) {
        return {
          ...m,
          folder: {
            ...f,
            name: f.title ?? f.name,
          },
        };
      }
      return m;
    });

    // If includeAssets is false, we still want to include thumbnails for grid view
    if (!includeAssets) {
      // Add thumbnails for grid view
      const memoriesWithThumbs = await Promise.all(
        normalizedMemories.map(async memory => {
          fatLogger.debug('Processing memory for thumbnail', 'be', { memoryId: memory.id });

          // Get thumb asset and placeholder asset for better UX
          const [thumbAsset, displayAsset, originalAsset, placeholderAsset] = await Promise.all([
            db.query.memoryAssets.findFirst({
              where: and(eq(memoryAssets.memoryId, memory.id), eq(memoryAssets.assetType, 'thumb')),
            }),
            db.query.memoryAssets.findFirst({
              where: and(eq(memoryAssets.memoryId, memory.id), eq(memoryAssets.assetType, 'display')),
            }),
            db.query.memoryAssets.findFirst({
              where: and(eq(memoryAssets.memoryId, memory.id), eq(memoryAssets.assetType, 'original')),
            }),
            db.query.memoryAssets.findFirst({
              where: and(eq(memoryAssets.memoryId, memory.id), eq(memoryAssets.assetType, 'placeholder')),
            }),
          ]);

          // Use thumb if available, otherwise fallback to display, then original
          const thumbOrFallback = thumbAsset || displayAsset || originalAsset;
          let thumbnailUrl = null;

          if (thumbOrFallback) {
            fatLogger.info('🔍 Processing asset for thumbnail generation', 'be', {
              memoryId: memory.id,
              assetId: thumbOrFallback.id,
              assetType: thumbOrFallback.assetType,
              assetLocation: thumbOrFallback.assetLocation,
              storageKey: thumbOrFallback.storageKey,
              bucket: thumbOrFallback.bucket,
              url: thumbOrFallback.url,
            });

            try {
              fatLogger.info('🚀 Starting generateBestAssetUrl for S3 asset', 'be', {
                memoryId: memory.id,
                assetLocation: thumbOrFallback.assetLocation,
                isS3Asset: thumbOrFallback.assetLocation === 's3',
              });

              thumbnailUrl = await generateBestAssetUrl(thumbOrFallback);

              fatLogger.info('✅ Successfully generated thumbnail URL', 'be', {
                memoryId: memory.id,
                thumbnailUrl: thumbnailUrl ? thumbnailUrl.substring(0, 100) + '...' : 'null',
                urlLength: thumbnailUrl?.length || 0,
              });
            } catch (error) {
              const errorObj = error instanceof Error ? error : new Error(String(error));
              fatLogger.error('❌ CRITICAL: Failed to generate thumbnail URL for S3 asset', 'be', {
                memoryId: memory.id,
                assetId: thumbOrFallback.id,
                assetLocation: thumbOrFallback.assetLocation,
                storageKey: thumbOrFallback.storageKey,
                bucket: thumbOrFallback.bucket,
                error: errorObj.message,
                errorStack: errorObj.stack,
                errorName: errorObj.name,
              });

              fatLogger.warn('🔄 Falling back to direct URL', 'be', {
                memoryId: memory.id,
                fallbackUrl: thumbOrFallback.url,
              });

              thumbnailUrl = thumbOrFallback.url;
            }
          } else {
            fatLogger.warn('⚠️ No asset found for memory', 'be', {
              memoryId: memory.id,
              hasThumbAsset: !!thumbAsset,
              hasDisplayAsset: !!displayAsset,
              hasOriginalAsset: !!originalAsset,
              hasPlaceholderAsset: !!placeholderAsset,
            });
          }

          return {
            ...memory,
            // include a minimal assets array for potential client fallbacks (thumb + placeholder)
            assets: [thumbOrFallback, placeholderAsset].filter(Boolean),
            // surface a top-level thumbnail URL for UI compatibility (presigned for S3)
            thumbnail: thumbnailUrl,
          };
        })
      );

      return NextResponse.json({
        success: true,
        data: memoriesWithThumbs,
        hasMore: false, // No pagination for now - dashboard needs all memories to group properly
        total: normalizedMemories.length,
      });
    }

    fatLogger.debug('Returning memories', 'be', {
      count: memoriesWithShareInfo.length,
      sample: memoriesWithShareInfo[0] || null,
    });

    const responseData = {
      success: true,
      data: normalizedMemories,
      hasMore: false, // No pagination for now - dashboard needs all memories to group properly
      total: normalizedMemories.length,
    };

    const etag = etagOf(responseData);
    const ifNoneMatch = request.headers.get('if-none-match');

    if (ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400',
          ETag: etag,
        },
      });
    }

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400',
        ETag: etag,
      },
    });
  } catch (error) {
    const listError = error instanceof Error ? error : new Error(String(error));
    fatLogger.error('💥 CRITICAL ERROR in /api/memories GET handler', 'be', {
      error: listError.message,
      errorStack: listError.stack,
      errorName: listError.name,
      userId: session?.user?.id,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer'),
    });
    fatLogger.error('Error listing memories', 'be', {
      error: listError,
      userId: session?.user?.id,
    });
    return NextResponse.json(
      {
        error: 'Failed to list memories',
        details: listError.message,
      },
      { status: 500 }
    );
  }
}
