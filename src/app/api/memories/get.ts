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
      console.error('No allUsers record found for user:', session.user.id);
      return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    }

    console.log('🔍 API: Found allUserRecord:', allUserRecord.id);

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

    console.log('🔍 API: Built whereCondition for ownerId:', allUserRecord.id);

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
        console.error('Error with optimized query:', error);
        // Fall back to original implementation
      }
    }

    // Fetch memories with optional assets and folder information
    console.log('🔍 API: Fetching memories with whereCondition:', whereCondition);
    console.log('🔍 API: Pagination params - limit:', limit, 'offset:', offset, 'page:', page);

    // First, let's check total count without pagination
    const totalCount = await db.query.memories.findMany({
      where: whereCondition,
    });
    console.log('🔍 API: Total memories count (no pagination):', totalCount.length);
    console.log(
      '🔍 API: Total memories by folder:',
      totalCount.reduce(
        (acc, m) => {
          const folderId = m.parentFolderId || 'no-folder';
          acc[folderId] = (acc[folderId] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      )
    );

    // For dashboard, we need ALL memories to properly group into folders
    // The limit should be applied to the final dashboard items, not raw memories
    const userMemories = await db.query.memories.findMany({
      where: whereCondition,
      orderBy: desc(memories.createdAt),
      // Remove limit and offset - we need all memories to group properly
      with: includeAssets
        ? {
            assets: true,
            folder: true, // Include folder information
          }
        : {
            folder: true, // Always include folder information for dashboard grouping
          },
    });
    console.log('🔍 API: Found memories:', userMemories.length);
    console.log(
      '🔍 API: All memories with folder info:',
      userMemories.map(m => ({
        id: m.id,
        title: m.title,
        parentFolderId: m.parentFolderId,
        folderName: m.folder?.name,
      }))
    );
    console.log('🔍 API: Sample memory:', userMemories[0]);

    // Calculate share counts for each memory (like the old implementation)
    const memoriesWithShareInfo = await Promise.all(
      userMemories.map(async memory => {
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
        memoriesWithShareInfo.map(async memory => {
          console.log(`🔍 Processing memory ${memory.id} for thumbnail`);

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

          console.log(`📸 Found asset for memory ${memory.id}:`, {
            assetType: thumbOrFallback?.assetType,
            url: thumbOrFallback?.url,
            assetLocation: thumbOrFallback?.assetLocation,
            storageKey: thumbOrFallback?.storageKey,
            bucket: thumbOrFallback?.bucket,
          });

          // Generate presigned URL for thumbnail if asset exists
          let thumbnailUrl = null;
          if (thumbOrFallback) {
            try {
              thumbnailUrl = await generateBestAssetUrl(thumbOrFallback);
              console.log(`🎯 Generated thumbnail URL for memory ${memory.id}:`, thumbnailUrl);
            } catch (error) {
              console.warn(`Failed to generate thumbnail URL for memory ${memory.id}:`, error);
              thumbnailUrl = thumbOrFallback.url; // Fallback to direct URL
              console.log(`🔄 Using fallback URL for memory ${memory.id}:`, thumbnailUrl);
            }
          } else {
            console.log(`❌ No asset found for memory ${memory.id}`);
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

    console.log('🔍 API: Returning memories:', memoriesWithShareInfo.length);
    console.log('🔍 API: Sample returned memory:', memoriesWithShareInfo[0]);

    return NextResponse.json({
      success: true,
      data: memoriesWithShareInfo,
      hasMore: false, // No pagination for now - dashboard needs all memories to group properly
      total: memoriesWithShareInfo.length,
    });
  } catch (error) {
    console.error('Error listing memories:', error);
    return NextResponse.json({ error: 'Failed to list memories' }, { status: 500 });
  }
}
