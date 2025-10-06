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
import { allUsers, memories, memoryAssets, memoryShares } from '@/db/schema';
import { eq, desc, sql, and } from 'drizzle-orm';
import { fetchMemoriesWithGalleries } from './utils/queries';
import { generateBestAssetUrl } from '@/lib/presigned-url-utils';
import crypto from 'node:crypto';

import { logger } from '@/lib/logger';

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

  try {
    // First get the allUserId for the authenticated user
    const allUserRecord = await db.query.allUsers.findFirst({
      where: eq(allUsers.userId, session.user.id),
    });

    if (!allUserRecord) {
      logger.database('be').error('No allUsers record found for user', { userId: session.user.id });
      return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    }

    logger.database('be').info('Found allUserRecord', { userId: allUserRecord.id });

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

    logger.database('be').debug('Built whereCondition', { ownerId: allUserRecord.id });

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
        logger.database('be').error('Error with optimized query', error instanceof Error ? error : new Error(String(error)), {
          query: 'optimized',
          userId: allUserRecord.id
        });
        // Fall back to original implementation
      }
    }

    // Fetch memories with optional assets and folder information
    logger.database('be').debug('Fetching memories with whereCondition', { 
      whereCondition,
      pagination: { limit, offset, page } 
    });
    // First, let's check total count without pagination
    const totalCount = await db.query.memories.findMany({
      where: whereCondition,
    });
    logger.database('be').debug('Total memories count (no pagination)', { count: totalCount.length });
    const folderCounts = totalCount.reduce((acc, m) => {
      const folderId = m.parentFolderId || 'no-folder';
      acc[folderId] = (acc[folderId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    logger.database('be').debug('Total memories by folder', { counts: folderCounts });

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

    // Calculate share counts for each memory
    const memoriesWithShareInfo = await Promise.all(
      userMemories.map(async (memory) => {
        const shareCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(memoryShares)
          .where(eq(memoryShares.memoryId, memory.id));

        const sharedWithCount = shareCount[0]?.count || 0;
        const status = memory.isPublic ? 'public' : sharedWithCount > 0 ? 'shared' : 'private';

        return {
          ...memory,
          status,
          sharedWithCount,
        };
      })
    );

    // If includeAssets is false, we still want to include thumbnails for grid view
    if (!includeAssets) {
      // Add thumbnails for grid view
      const memoriesWithThumbs = await Promise.all(
        memoriesWithShareInfo.map(async (memory) => {
          logger.asset('be').debug('Processing memory for thumbnail', { memoryId: memory.id });

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
            try {
              thumbnailUrl = await generateBestAssetUrl(thumbOrFallback);
              logger.s3('be').info('Generated thumbnail URL', { 
                memoryId: memory.id, 
                thumbnailUrl 
              });
            } catch (error) {
              const errorObj = error instanceof Error ? error : new Error(String(error));
              logger.asset('be').warn('Failed to generate thumbnail URL', {
                memoryId: memory.id,
                error: errorObj
              });
              thumbnailUrl = thumbOrFallback.url;
              logger.asset('be').debug('Using fallback URL', { 
                memoryId: memory.id, 
                thumbnailUrl 
              });
            }
          } else {
            logger.asset('be').warn('No asset found for memory', { memoryId: memory.id });
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
        total: memoriesWithShareInfo.length,
      });
    }

    logger.database('be').debug('Returning memories', { 
      count: memoriesWithShareInfo.length,
      sample: memoriesWithShareInfo[0] || null
    });

    const responseData = {
      success: true,
      data: memoriesWithShareInfo,
      hasMore: false, // No pagination for now - dashboard needs all memories to group properly
      total: memoriesWithShareInfo.length,
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
    logger.database('be').error('Error listing memories', listError, {
      userId: session?.user?.id
    });
    return NextResponse.json({ error: 'Failed to list memories' }, { status: 500 });
  }
}
