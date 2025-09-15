import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/db";
import { eq, desc, sql, and } from "drizzle-orm";
import { allUsers, memories, memoryAssets } from "@/db/schema";
import { NewDBMemory, NewDBMemoryAsset } from "@/db/schema";
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

// POST /api/memories - Create new memory with optional file upload
export async function POST(request: NextRequest) {
  console.log("🚀 Starting memory creation process...");

  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the allUserId for the authenticated user
    const allUserRecord = await db.query.allUsers.findFirst({
      where: eq(allUsers.userId, session.user.id),
    });

    if (!allUserRecord) {
      console.error("No allUsers record found for user:", session.user.id);
      return NextResponse.json({ error: "User record not found" }, { status: 404 });
    }

    // Check if this is a file upload (multipart/form-data) or JSON request
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      // Handle file upload
      return await handleFileUpload(request, allUserRecord.id);
    } else {
      // Handle JSON request (create memory without file)
      return await handleJsonRequest(request, allUserRecord.id);
    }
  } catch (error) {
    console.error("Error in memory creation:", error);
    return NextResponse.json({ error: "Failed to create memory" }, { status: 500 });
  }
}

// Handle JSON request for creating memory without file upload
async function handleJsonRequest(request: NextRequest, ownerId: string) {
  const body = await request.json();
  const { type, title, description, fileCreatedAt, isPublic, parentFolderId, tags, recipients, unlockDate, metadata } =
    body;

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
    ownerId,
    type: type as "image" | "video" | "document" | "note" | "audio",
    title,
    description: description || "",
    fileCreatedAt: fileCreatedAt ? new Date(fileCreatedAt) : new Date(),
    isPublic: isPublic || false,
    ownerSecureCode: randomUUID(),
    parentFolderId: parentFolderId || null,
    tags: tags || [],
    recipients: recipients || [],
    unlockDate: unlockDate ? new Date(unlockDate) : null,
    metadata: metadata || {},
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
      tags: createdMemory.tags,
      recipients: createdMemory.recipients,
      unlockDate: createdMemory.unlockDate,
      metadata: createdMemory.metadata,
      createdAt: createdMemory.createdAt,
      assets: [], // Empty initially
    },
  });
}

// Handle file upload (single file or multiple files)
async function handleFileUpload(request: NextRequest, ownerId: string) {
  const startTime = Date.now();
  // Import upload utilities
  const {
    parseMultipleFiles,
    validateFile,
    uploadFileToStorage,
    validateFileWithErrorHandling,
    uploadFileToStorageWithErrorHandling,
    getMemoryType,
  } = await import("./upload/utils");

  // Parse form data
  const { files, error: parseError } = await parseMultipleFiles(request);
  if (parseError) return parseError;

  if (!files || files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  console.log(`📁 Processing ${files.length} file(s)...`);

  // Process files in parallel (limit to 5 concurrent uploads)
  const pLimit = (await import("p-limit")).default;
  const limit = pLimit(5);

  const uploadTasks = files.map((file) =>
    limit(async () => {
      try {
        const name = String(file.name || "Untitled");

        // Validate file
        const { validationResult, error: validationError } = await validateFileWithErrorHandling(file, validateFile);
        if (validationError) {
          console.error(`❌ Validation failed for ${name}:`, validationError);
          return { success: false, fileName: name, error: validationError };
        }

        // Upload file to storage
        const { url, error: uploadError } = await uploadFileToStorageWithErrorHandling(
          file,
          validationResult!.buffer!,
          uploadFileToStorage
        );
        if (uploadError) {
          console.error(`❌ Upload failed for ${name}:`, uploadError);
          return { success: false, fileName: name, error: uploadError };
        }

        // Determine memory type from file
        const memoryType = getMemoryType(
          file.type as
            | "image/jpeg"
            | "image/png"
            | "image/gif"
            | "image/webp"
            | "video/mp4"
            | "video/webm"
            | "application/pdf"
            | "application/msword"
            | "text/plain"
            | "text/markdown"
        );

        // Create memory record
        const newMemory: NewDBMemory = {
          ownerId,
          type: memoryType,
          title: name.split(".")[0], // Use filename without extension as title
          description: "",
          fileCreatedAt: new Date(),
          isPublic: false,
          ownerSecureCode: randomUUID(),
          parentFolderId: null,
          tags: [],
          recipients: [],
          metadata: {
            originalPath: name,
          },
        };

        // Create memory asset record
        const newAsset: NewDBMemoryAsset = {
          memoryId: "", // Will be set after memory creation
          assetType: "original",
          url,
          storageBackend: "vercel_blob", // Default storage backend
          storageKey: url, // Use URL as storage key for now
          bytes: file.size,
          mimeType: file.type,
          processingStatus: "completed",
        };

        return {
          success: true,
          fileName: name,
          url,
          memory: newMemory,
          asset: newAsset,
        };
      } catch (error) {
        const name = String(file.name || "Untitled");
        console.error(`❌ Unexpected error for ${name}:`, error);
        return { success: false, fileName: name, error };
      }
    })
  );

  const results = await Promise.allSettled(uploadTasks);

  // Process results and create database records
  const successfulUploads: Array<{
    success: true;
    fileName: string;
    url: string;
    memory: NewDBMemory;
    asset: NewDBMemoryAsset;
  }> = [];
  const failedUploads: Array<{
    success: false;
    fileName: string;
    error: unknown;
  }> = [];

  for (const result of results) {
    if (result.status === "fulfilled" && result.value.success === true) {
      successfulUploads.push(result.value as typeof successfulUploads[0]);
    } else {
      if (result.status === "fulfilled") {
        failedUploads.push({
          success: false,
          fileName: result.value.fileName,
          error: result.value.error,
        });
      } else {
        failedUploads.push({
          success: false,
          fileName: "unknown",
          error: result.reason,
        });
      }
    }
  }

  // Create memory and asset records for successful uploads
  const createdMemories = [];
  for (const upload of successfulUploads) {
    try {
      // Create memory record
      const [createdMemory] = await db.insert(memories).values(upload.memory).returning();

      // Create asset record with memory ID
      const assetWithMemoryId = { ...upload.asset, memoryId: createdMemory.id };
      const [createdAsset] = await db.insert(memoryAssets).values(assetWithMemoryId).returning();

      createdMemories.push({
        id: createdMemory.id,
        type: createdMemory.type,
        title: createdMemory.title,
        fileName: upload.fileName,
        url: upload.url,
        asset: createdAsset,
      });
    } catch (error) {
      console.error(`❌ Database error for ${upload.fileName}:`, error);
      failedUploads.push({ success: false, fileName: upload.fileName, error });
    }
  }

  const duration = Date.now() - startTime;
  console.log(`✅ Memory creation completed in ${duration}ms`);

  return NextResponse.json({
    success: true,
    data: createdMemories,
    summary: {
      totalFiles: files.length,
      successfulUploads: createdMemories.length,
      failedUploads: failedUploads.length,
      duration: `${duration}ms`,
    },
    errors: failedUploads.length > 0 ? failedUploads : undefined,
  });
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
