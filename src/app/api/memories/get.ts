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

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/db";
import { allUsers, memories, memoryAssets, memoryShares } from "@/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { fetchMemoriesWithGalleries } from "./utils/queries";

/**
 * Main GET handler for memory listing
 * Handles pagination, filtering, and asset inclusion
 */
export async function handleApiMemoryGet(request: NextRequest) {
  // Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // First get the allUserId for the authenticated user
    const allUserRecord = await db.query.allUsers.findFirst({
      where: eq(allUsers.userId, session.user.id),
    });

    if (!allUserRecord) {
      console.error("No allUsers record found for user:", session.user.id);
      return NextResponse.json({ error: "User record not found" }, { status: 404 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const memoryType = searchParams.get("type");
    const includeAssets = searchParams.get("includeAssets") === "true";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");
    const offset = (page - 1) * limit;
    const useOptimizedQuery = searchParams.get("optimized") === "true";

    // Handle legacy type parameter mapping
    let mappedMemoryType = memoryType;
    if (memoryType === "photo") mappedMemoryType = "image";
    if (memoryType === "file") mappedMemoryType = "document";
    if (memoryType === "text") mappedMemoryType = "note";

    // Build where condition
    const whereCondition = mappedMemoryType
      ? and(
          eq(memories.ownerId, allUserRecord.id),
          eq(memories.type, mappedMemoryType as "image" | "video" | "document" | "note" | "audio")
        )
      : eq(memories.ownerId, allUserRecord.id);

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
        console.error("Error with optimized query:", error);
        // Fall back to original implementation
      }
    }

    // Fetch memories with optional assets
    const userMemories = await db.query.memories.findMany({
      where: whereCondition,
      orderBy: desc(memories.createdAt),
      limit: limit,
      offset: offset,
      with: includeAssets
        ? {
            assets: true,
          }
        : undefined,
    });

    // Calculate share counts for each memory (like the old implementation)
    const memoriesWithShareInfo = await Promise.all(
      userMemories.map(async (memory) => {
        const shareCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(memoryShares)
          .where(eq(memoryShares.memoryId, memory.id));

        const sharedWithCount = shareCount[0]?.count || 0;
        const status = memory.isPublic ? "public" : sharedWithCount > 0 ? "shared" : "private";

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
          const thumbAsset = await db.query.memoryAssets.findFirst({
            where: eq(memoryAssets.memoryId, memory.id),
            orderBy: sql`CASE WHEN ${memoryAssets.assetType} = 'thumb' THEN 1 ELSE 2 END`,
          });

          return {
            ...memory,
            assets: thumbAsset ? [thumbAsset] : [],
          };
        })
      );

      // Filter memories by type for backward compatibility
      const images = memoriesWithThumbs.filter((m) => m.type === "image");
      const documents = memoriesWithThumbs.filter((m) => m.type === "document");
      const notes = memoriesWithThumbs.filter((m) => m.type === "note");
      const videos = memoriesWithThumbs.filter((m) => m.type === "video");
      const audio = memoriesWithThumbs.filter((m) => m.type === "audio");

      return NextResponse.json({
        // Legacy format for backward compatibility (includes videos/audio that old GET was missing)
        images,
        documents,
        notes,
        videos,
        audio,
        hasMore: images.length + documents.length + notes.length + videos.length + audio.length === limit,
        // New unified format (additional)
        success: true,
        data: memoriesWithThumbs,
        total: memoriesWithShareInfo.length,
      });
    }

    return NextResponse.json({
      success: true,
      data: memoriesWithShareInfo,
      hasMore: memoriesWithShareInfo.length === limit,
      total: memoriesWithShareInfo.length,
    });
  } catch (error) {
    console.error("Error listing memories:", error);
    return NextResponse.json({ error: "Failed to list memories" }, { status: 500 });
  }
}
