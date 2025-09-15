import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/db";
import { eq, desc, sql, and } from "drizzle-orm";
import { allUsers, memories, memoryAssets } from "@/db/schema";
import { NewDBMemory } from "@/db/schema";
import { cleanupStorageEdgesForMemory } from "./upload/utils";
import { randomUUID } from "crypto";

// Helper function to clean up storage edges for deleted memories
async function cleanupStorageEdgesForMemories(memories: Array<{ id: string; type: string }>) {
  const cleanupPromises = memories.map(({ id, type }) =>
    cleanupStorageEdgesForMemory({
      memoryId: id,
      memoryType: type as "image" | "video" | "note" | "document" | "audio",
    })
  );

  const results = await Promise.allSettled(cleanupPromises);

  let successCount = 0;
  let errorCount = 0;

  results.forEach((result) => {
    if (result.status === "fulfilled" && result.value.success) {
      successCount++;
    } else {
      errorCount++;
    }
  });

  return { successCount, errorCount };
}

// GET /api/memories - List memories with optional assets
export async function GET(request: NextRequest) {
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

    // Build where condition
    const whereCondition = memoryType
      ? and(
          eq(memories.ownerId, allUserRecord.id),
          eq(memories.type, memoryType as "image" | "video" | "document" | "note" | "audio")
        )
      : eq(memories.ownerId, allUserRecord.id);

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

    // If includeAssets is false, we still want to include thumbnails for grid view
    if (!includeAssets) {
      // Add thumbnails for grid view
      const memoriesWithThumbs = await Promise.all(
        userMemories.map(async (memory) => {
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
        // New unified format
        success: true,
        data: memoriesWithThumbs,
        hasMore: userMemories.length === limit,
        total: userMemories.length,
        // Legacy format for backward compatibility
        images,
        documents,
        notes,
        videos,
        audio,
      });
    }

    return NextResponse.json({
      success: true,
      data: userMemories,
      hasMore: userMemories.length === limit,
      total: userMemories.length,
    });
  } catch (error) {
    console.error("Error listing memories:", error);
    return NextResponse.json({ error: "Failed to list memories" }, { status: 500 });
  }
}

// POST /api/memories - Create new memory
export async function POST(request: NextRequest) {
  // Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get the allUserId for the authenticated user
    const allUserRecord = await db.query.allUsers.findFirst({
      where: eq(allUsers.userId, session.user.id),
    });

    if (!allUserRecord) {
      console.error("No allUsers record found for user:", session.user.id);
      return NextResponse.json({ error: "User record not found" }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { type, title, description, fileCreatedAt, isPublic, parentFolderId } = body;

    // Validate required fields
    if (!type || !title) {
      return NextResponse.json(
        {
          error: "Missing required fields: type and title are required",
        },
        { status: 400 }
      );
    }

    // Validate memory type
    if (!["image", "video", "document", "note", "audio"].includes(type)) {
      return NextResponse.json(
        {
          error: "Invalid memory type. Must be one of: image, video, document, note, audio",
        },
        { status: 400 }
      );
    }

    // Create memory
    const newMemory: NewDBMemory = {
      ownerId: allUserRecord.id,
      type: type as "image" | "video" | "document" | "note" | "audio",
      title,
      description: description || "",
      fileCreatedAt: fileCreatedAt ? new Date(fileCreatedAt) : new Date(),
      isPublic: isPublic || false,
      ownerSecureCode: randomUUID(),
      parentFolderId: parentFolderId || null,
    };

    const [createdMemory] = await db.insert(memories).values(newMemory).returning();

    return NextResponse.json({
      success: true,
      data: {
        id: createdMemory.id,
        type: createdMemory.type,
        title: createdMemory.title,
        description: createdMemory.description,
        fileCreatedAt: createdMemory.fileCreatedAt,
        isPublic: createdMemory.isPublic,
        parentFolderId: createdMemory.parentFolderId,
        createdAt: createdMemory.createdAt,
        assets: [], // Empty initially
      },
    });
  } catch (error) {
    console.error("Error creating memory:", error);
    return NextResponse.json({ error: "Failed to create memory" }, { status: 500 });
  }
}

// DELETE /api/memories - Bulk delete memories (for testing)
export async function DELETE(request: NextRequest) {
  // Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get the allUserId for the authenticated user
    const allUserRecord = await db.query.allUsers.findFirst({
      where: eq(allUsers.userId, session.user.id),
    });

    if (!allUserRecord) {
      console.error("No allUsers record found for user:", session.user.id);
      return NextResponse.json({ error: "User record not found" }, { status: 404 });
    }

    // Get query parameters for selective deletion
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type");
    const all = searchParams.get("all");

    let deletedCount = 0;

    if (all === "true") {
      // Delete all memories for the user
      const deletedMemories = await db.delete(memories).where(eq(memories.ownerId, allUserRecord.id)).returning();

      deletedCount = deletedMemories.length;

      // Clean up storage edges for deleted memories
      const memoriesToCleanup = deletedMemories.map((memory) => ({
        id: memory.id,
        type: memory.type,
      }));

      if (memoriesToCleanup.length > 0) {
        await cleanupStorageEdgesForMemories(memoriesToCleanup);
      }
    } else if (type) {
      // Delete specific type
      const deletedMemories = await db
        .delete(memories)
        .where(
          and(
            eq(memories.ownerId, allUserRecord.id),
            eq(memories.type, type as "image" | "video" | "document" | "note" | "audio")
          )
        )
        .returning();

      deletedCount = deletedMemories.length;

      // Clean up storage edges for deleted memories
      const memoriesToCleanup = deletedMemories.map((memory) => ({
        id: memory.id,
        type: memory.type,
      }));

      if (memoriesToCleanup.length > 0) {
        await cleanupStorageEdgesForMemories(memoriesToCleanup);
      }
    } else {
      return NextResponse.json(
        {
          error: "Missing parameter. Use 'all=true' or 'type=<memory_type>'",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deletedCount} memories`,
      deletedCount,
      type,
      all,
    });
  } catch (error) {
    console.error("Error in bulk delete:", error);
    return NextResponse.json({ error: "Failed to delete memories" }, { status: 500 });
  }
}
