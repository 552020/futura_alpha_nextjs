import { NextRequest, NextResponse } from "next/server";
import pLimit from "p-limit";
import { db } from "@/db/db";
import { images, videos, documents, allUsers, users } from "@/db/schema";
import type { InferInsertModel } from "drizzle-orm";
import { eq } from "drizzle-orm";
import {
  parseMultipleFiles,
  logMultipleFileDetails,
  validateFileType,
  validateFileWithErrorHandling,
  uploadFileToStorageWithErrorHandling,
  createStorageEdgesForMemory,
} from "../utils";
import { isAcceptedMimeType, validateFile, uploadFileToStorage, getMemoryType } from "../utils";
import { auth } from "@/auth";

// Type definitions for database inserts
type ImageInsert = InferInsertModel<typeof images>;
type VideoInsert = InferInsertModel<typeof videos>;
type DocumentInsert = InferInsertModel<typeof documents>;

// Type for upload results
type UploadResult = {
  fileName: string;
  url: string;
  success: boolean;
  userId: string;
  memoryId: string;
};

// Type for successful uploads with discriminated union
type UploadOk =
  | { success: true; memoryType: "image"; fileName: string; url: string; row: ImageInsert }
  | { success: true; memoryType: "video"; fileName: string; url: string; row: VideoInsert }
  | { success: true; memoryType: "document"; fileName: string; url: string; row: DocumentInsert };

type UploadErr = { success: false; fileName: string; error: unknown };

// Helper function to extract folder information from file path
function extractFolderInfo(fileName: string): { originalPath: string; folderName: string } {
  // When using webkitdirectory, fileName contains the full relative path
  // e.g., "Wedding Photos/ceremony/img001.jpg" -> folderName: "Wedding Photos", originalPath: "Wedding Photos/ceremony/img001.jpg"
  const pathParts = fileName.split("/");
  const folderName = pathParts.length > 1 ? pathParts[0] : "Ungrouped";

  return {
    originalPath: fileName,
    folderName: folderName,
  };
}

// Row builder functions that match exact schema types
function buildImageRow(file: File, url: string, ownerId: string): ImageInsert {
  const name = file.name || "Untitled";
  const { originalPath, folderName } = extractFolderInfo(name);

  return {
    ownerId,
    url,
    title: name,
    caption: name,
    description: "",
    ownerSecureCode: crypto.randomUUID(),
    metadata: {
      size: file.size,
      mimeType: file.type,
      originalName: name,
      uploadedAt: new Date().toISOString(),
      originalPath,
      folderName,
    },
  };
}

function buildVideoRow(file: File, url: string, ownerId: string): VideoInsert {
  const name = file.name || "Untitled";
  const { originalPath, folderName } = extractFolderInfo(name);

  return {
    ownerId,
    url,
    title: name,
    description: "",
    mimeType: file.type || "video/mp4",
    size: String(file.size),
    ownerSecureCode: crypto.randomUUID(),
    metadata: {
      originalPath,
      folderName,
    },
  };
}

function buildDocumentRow(file: File, url: string, ownerId: string): DocumentInsert {
  const name = file.name || "Untitled";
  const { originalPath, folderName } = extractFolderInfo(name);

  return {
    ownerId,
    url,
    title: name,
    description: "",
    mimeType: file.type || "application/pdf",
    size: String(file.size),
    ownerSecureCode: crypto.randomUUID(),
    metadata: {
      size: file.size,
      mimeType: file.type,
      originalName: name,
      uploadedAt: new Date().toISOString(),
      originalPath,
      folderName,
    },
  };
}

/**
 * Folder Upload Endpoint
 *
 * **Key Differences from File Upload:**
 * 1. Receives multiple files from a single folder upload
 * 2. Creates ONE temporary user for ALL files in the folder
 * 3. Processes files in parallel for better performance
 * 4. Returns array of results instead of single result
 * 5. Handles folder structure/paths
 *
 * **Request Format:**
 * - Content-Type: multipart/form-data
 * - Body: Multiple files from folder selection
 *
 * **Response Format:**
 * {
 *   results: Array<{ id: string, ownerId: string, fileName: string }>,
 *   totalFiles: number,
 *   successfulUploads: number,
 *   failedUploads: number
 * }
 */

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log("🚀 Starting folder upload process...");

  try {
    // Get user either from session or from provided allUserId
    let allUserId: string;
    const session = await auth();

    // Parse files using the utility function
    const { files, userId: providedAllUserId, error: parseError } = await parseMultipleFiles(request);
    if (parseError) {
      return parseError;
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    logMultipleFileDetails(files);

    // Validate file types for all files
    for (const file of files) {
      const fileTypeError = validateFileType(file, isAcceptedMimeType);
      if (fileTypeError) return fileTypeError;
    }

    if (session?.user?.id) {
      console.log("👤 Looking up authenticated user in users table...");
      // First get the user from users table
      const [permanentUser] = await db.select().from(users).where(eq(users.id, session.user.id));
      console.log("Found permanent user:", { userId: permanentUser?.id });

      if (!permanentUser) {
        console.error("❌ Permanent user not found");
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // Then get their allUserId
      const [allUserRecord] = await db.select().from(allUsers).where(eq(allUsers.userId, permanentUser.id));
      console.log("Found all_users record:", { allUserId: allUserRecord?.id });

      if (!allUserRecord) {
        console.error("❌ No all_users record found for permanent user");
        return NextResponse.json({ error: "User record not found" }, { status: 404 });
      }

      allUserId = allUserRecord.id;
    } else if (providedAllUserId) {
      console.log("👤 Using provided allUserId for temporary user...");
      // For temporary users, directly check the allUsers table
      const [tempUser] = await db.select().from(allUsers).where(eq(allUsers.id, providedAllUserId));
      console.log("Found temporary user:", { allUserId: tempUser?.id, type: tempUser?.type });

      if (!tempUser || tempUser.type !== "temporary") {
        console.error("❌ Valid temporary user not found");
        return NextResponse.json({ error: "Invalid temporary user" }, { status: 404 });
      }

      allUserId = tempUser.id;
    } else {
      console.error("❌ No valid user identification provided");
      return NextResponse.json({ error: "User identification required" }, { status: 401 });
    }

    // Process files in parallel with concurrency limit (validate + upload only)
    const limit = pLimit(5); // max 5 concurrent uploads
    const uploadTasks = files.map((file) =>
      limit(async (): Promise<UploadOk | UploadErr> => {
        try {
          const name = String(file.name || "Untitled"); // Guarantee string type

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

          // Build database row based on memory type
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

          if (memoryType === "image") {
            return {
              success: true,
              memoryType,
              fileName: name,
              url,
              row: buildImageRow(file, url, allUserId),
            };
          }
          if (memoryType === "video") {
            return {
              success: true,
              memoryType,
              fileName: name,
              url,
              row: buildVideoRow(file, url, allUserId),
            };
          }
          return {
            success: true,
            memoryType: "document",
            fileName: name,
            url,
            row: buildDocumentRow(file, url, allUserId),
          };
        } catch (error) {
          const name = String(file.name || "Untitled");
          console.error(`❌ Unexpected error for ${name}:`, error);
          return { success: false, fileName: name, error };
        }
      })
    );

    const results = await Promise.allSettled(uploadTasks);

    // Process results and collect successful rows by type
    const imageRows: ImageInsert[] = [];
    const videoRows: VideoInsert[] = [];
    const documentRows: DocumentInsert[] = [];
    const uploadResults: UploadResult[] = [];

    const ok = results
      .filter((r): r is PromiseFulfilledResult<UploadOk> => r.status === "fulfilled" && r.value.success)
      .map((r) => r.value);

    const failures = results.filter(
      (r) => r.status === "rejected" || (r.status === "fulfilled" && !(r.value as UploadOk | UploadErr).success)
    ).length;

    // Split rows by type using type guards
    ok.forEach((value) => {
      if (value.memoryType === "image") {
        imageRows.push(value.row);
      } else if (value.memoryType === "video") {
        videoRows.push(value.row);
      } else {
        documentRows.push(value.row);
      }

      uploadResults.push({
        fileName: value.fileName,
        url: value.url,
        success: true,
        userId: allUserId,
        memoryId: "", // Will be set after batch insert
      });
    });

    console.log(`✅ ${ok.length} uploads ready for batch insert, ❌ ${failures} failures`);

    // Batch insert all successful files (no transactions - Neon HTTP limitation)
    const insertedIds: string[] = [];

    if (imageRows.length > 0) {
      const imageResults = await db.insert(images).values(imageRows).returning({ id: images.id });
      insertedIds.push(...imageResults.map((r) => r.id));
    }

    if (videoRows.length > 0) {
      const videoResults = await db.insert(videos).values(videoRows).returning({ id: videos.id });
      insertedIds.push(...videoResults.map((r) => r.id));
    }

    if (documentRows.length > 0) {
      const documentResults = await db.insert(documents).values(documentRows).returning({ id: documents.id });
      insertedIds.push(...documentResults.map((r) => r.id));
    }

    // Update uploadResults with actual memory IDs
    uploadResults.forEach((result, index) => {
      if (result.success && insertedIds[index]) {
        result.memoryId = insertedIds[index];
      }
    });

    console.log(`✅ Batch inserted ${insertedIds.length} files into database`);

    // Create storage edges for all successfully inserted memories
    console.log("🔗 Creating storage edges for batch upload...");
    const storageEdgePromises = uploadResults
      .filter((result) => result.success && result.memoryId)
      .map(async (result, index) => {
        const file = files[index];
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

        return createStorageEdgesForMemory({
          memoryId: result.memoryId!,
          memoryType,
          url: result.url,
          size: file.size,
        });
      });

    const storageEdgeResults = await Promise.allSettled(storageEdgePromises);
    const successfulStorageEdges = storageEdgeResults.filter(
      (result) => result.status === "fulfilled" && result.value.success
    ).length;

    console.log(`✅ Created storage edges for ${successfulStorageEdges}/${uploadResults.length} memories`);

    const endTime = Date.now();
    const totalTime = (endTime - startTime) / 1000;
    const averageTime = totalTime / files.length;

    // Calculate total file size
    const totalSize = files.reduce((acc, file) => acc + file.size, 0);
    const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);

    console.log("=== FOLDER UPLOAD COMPLETE ===");
    console.log(`📁 Files processed: ${uploadResults.length}/${files.length} successful`);
    console.log(`📦 Total size: ${totalSizeMB} MB`);
    console.log(`⏱️ Total time: ${totalTime.toFixed(1)} seconds`);
    console.log(`📊 Average: ${averageTime.toFixed(1)} seconds per file`);
    console.log(`🚀 Upload speed: ${(parseFloat(totalSizeMB) / totalTime).toFixed(2)} MB/s`);
    console.log(`👤 User ID: ${allUserId}`);
    console.log(`❌ Failed uploads: ${files.length - uploadResults.length}`);
    console.log("================================");

    return NextResponse.json({
      message: "Folder upload completed successfully",
      status: "success",
      totalFiles: files.length,
      successfulUploads: uploadResults.length,
      failedUploads: files.length - uploadResults.length,
      totalTime: totalTime.toFixed(1),
      averageTime: averageTime.toFixed(1),
      totalSizeMB: totalSizeMB,
      uploadSpeedMBps: (parseFloat(totalSizeMB) / totalTime).toFixed(2),
      userId: allUserId,
      results: uploadResults,
    });
  } catch (error) {
    console.error("❌ Unexpected error:", error);
    return NextResponse.json(
      {
        error: "Unexpected error occurred",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
