import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/db";
import { eq, and } from "drizzle-orm";
import { allUsers, memories } from "@/db/schema";

// GET /api/memories/[id] - Get memory with all assets
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id: memoryId } = await params;

    // Fetch memory with all assets
    const memory = await db.query.memories.findFirst({
      where: and(eq(memories.id, memoryId), eq(memories.ownerId, allUserRecord.id)),
      with: {
        assets: true,
      },
    });

    if (!memory) {
      return NextResponse.json({ error: "Memory not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: memory,
    });
  } catch (error) {
    console.error("Error fetching memory:", error);
    return NextResponse.json({ error: "Failed to fetch memory" }, { status: 500 });
  }
}

// PUT /api/memories/[id] - Update memory
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id: memoryId } = await params;

    // Check if memory exists and belongs to user
    const existingMemory = await db.query.memories.findFirst({
      where: and(eq(memories.id, memoryId), eq(memories.ownerId, allUserRecord.id)),
    });

    if (!existingMemory) {
      return NextResponse.json({ error: "Memory not found" }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { title, description, takenAt, isPublic, parentFolderId } = body;

    // Update memory
    const [updatedMemory] = await db
      .update(memories)
      .set({
        title: title || existingMemory.title,
        description: description !== undefined ? description : existingMemory.description,
        fileCreatedAt: takenAt ? new Date(takenAt) : existingMemory.fileCreatedAt,
        isPublic: isPublic !== undefined ? isPublic : existingMemory.isPublic,
        parentFolderId: parentFolderId !== undefined ? parentFolderId : existingMemory.parentFolderId,
        updatedAt: new Date(),
      })
      .where(eq(memories.id, memoryId))
      .returning();

    return NextResponse.json({
      success: true,
      data: updatedMemory,
    });
  } catch (error) {
    console.error("Error updating memory:", error);
    return NextResponse.json({ error: "Failed to update memory" }, { status: 500 });
  }
}

// DELETE /api/memories/[id] - Delete memory
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id: memoryId } = await params;

    // Check if memory exists and belongs to user
    const existingMemory = await db.query.memories.findFirst({
      where: and(eq(memories.id, memoryId), eq(memories.ownerId, allUserRecord.id)),
    });

    if (!existingMemory) {
      return NextResponse.json({ error: "Memory not found" }, { status: 404 });
    }

    // Delete memory (this will cascade delete assets due to foreign key constraint)
    await db.delete(memories).where(eq(memories.id, memoryId));

    // Clean up storage edges
    const { cleanupStorageEdgesForMemory } = await import("../utils/memory-database");
    await cleanupStorageEdgesForMemory({
      memoryId,
      memoryType: existingMemory.type,
    });

    return NextResponse.json({
      success: true,
      message: "Memory deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting memory:", error);
    return NextResponse.json({ error: "Failed to delete memory" }, { status: 500 });
  }
}
