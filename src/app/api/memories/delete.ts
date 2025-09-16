/**
 * MEMORY DELETION HANDLER
 *
 * This module handles memory deletion operations:
 * - Bulk delete all memories for a user
 * - Delete memories by type
 * - Clean up storage edges
 * - Handle cascading deletions
 *
 * USAGE:
 * - DELETE /api/memories?all=true - Delete all memories
 * - DELETE /api/memories?type=image - Delete all images
 * - DELETE /api/memories?type=video - Delete all videos
 * - DELETE /api/memories?folder=<folderName> - Delete all memories in folder
 *
 * SECURITY:
 * - Only deletes memories owned by the authenticated user
 * - Validates user permissions before deletion
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/db";
import { allUsers, memories } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// Helper function to clean up storage edges for deleted memories
async function cleanupStorageEdgesForMemories(memories: Array<{ id: string; type: string }>) {
  const { cleanupStorageEdgesForMemory } = await import("./utils");

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

/**
 * Main DELETE handler for memory deletion
 * Handles bulk deletion and type-specific deletion
 */
export async function handleApiMemoryDelete(request: NextRequest): Promise<NextResponse> {
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
    const folder = searchParams.get("folder"); // folder name to delete
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
    } else if (folder) {
      // Delete memories in specific folder (using parentFolderId)
      const deletedMemories = await db
        .delete(memories)
        .where(and(eq(memories.ownerId, allUserRecord.id), eq(memories.parentFolderId, folder)))
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
          error: "Missing parameter. Use 'all=true', 'type=<memory_type>', or 'folder=<folder_name>'",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deletedCount} memories`,
      deletedCount,
      type,
      folder,
      all,
    });
  } catch (error) {
    console.error("Error in bulk delete:", error);
    return NextResponse.json({ error: "Failed to delete memories" }, { status: 500 });
  }
}
