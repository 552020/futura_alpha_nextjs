/**
 * LEGACY DATABASE UTILITIES - OLD SCHEMA
 *
 * This module contains deprecated functions that use the old separate tables schema.
 * These functions are kept for backward compatibility but should not be used in new code.
 *
 * DEPRECATED: Use memory-database.ts functions instead
 *
 * @deprecated Use storeInNewDatabase() from memory-database.ts instead
 */

import { db } from "@/db/db";
import { memories } from "@/db/schema";
// import { NewDBMemory, NewDBMemoryAsset } from "@/db/schema"; // Unused in legacy functions
import crypto from "crypto";
import type { AcceptedMimeType } from "./file-processing";

/**
 * @deprecated Use storeInNewDatabase() from memory-database.ts instead
 * Legacy function that stores in the old schema structure
 */
export async function storeInDatabase(params: {
  type: "document" | "image" | "video";
  ownerId: string;
  url: string;
  file: File;
  metadata: {
    uploadedAt: string;
    originalName: string;
    size: number;
    mimeType: AcceptedMimeType;
  };
}) {
  const { type, ownerId, url, file, metadata } = params;

  // Generate a secure code for the owner
  const ownerSecureCode = crypto.randomUUID();

  let memoryData: { id: string; ownerId: string };

  if (type === "image") {
    const [image] = await db
      .insert(memories)
      .values({
        ownerId,
        type: "image",
        title: file.name.split(".")[0],
        description: "",
        fileCreatedAt: new Date(),
        isPublic: false,
        parentFolderId: null,
        ownerSecureCode,
      })
      .returning();
    memoryData = image;
  } else if (type === "video") {
    const [video] = await db
      .insert(memories)
      .values({
        ownerId,
        type: "video",
        title: file.name.split(".")[0],
        description: "",
        fileCreatedAt: new Date(),
        isPublic: false,
        parentFolderId: null,
        ownerSecureCode,
      })
      .returning();
    memoryData = video;
  } else {
    const [document] = await db
      .insert(memories)
      .values({
        ownerId,
        type: "document",
        title: file.name.split(".")[0],
        description: "",
        fileCreatedAt: new Date(),
        isPublic: false,
        parentFolderId: null,
        ownerSecureCode,
      })
      .returning();
    memoryData = document;
  }

  // Create storage edges for the newly created memory
  const { createStorageEdgesForMemory } = await import("./memory-database");
  const storageEdgeResult = await createStorageEdgesForMemory({
    memoryId: memoryData.id,
    memoryType: type,
    url,
    size: metadata.size,
  });

  if (!storageEdgeResult.success) {
    console.warn("⚠️ Failed to create storage edges for memory:", memoryData.id, storageEdgeResult.error);
    // Don't fail the upload if storage edge creation fails
  }

  return { type, data: memoryData };
}

/**
 * @deprecated Use storeInNewDatabase() from memory-database.ts instead
 * Legacy wrapper function for database storage with error handling
 */
export async function storeFileInDatabaseWithErrorHandling(
  file: File,
  url: string,
  ownerId: string,
  getMemoryType: (mimeType: AcceptedMimeType) => "document" | "image" | "video",
  storeInDatabase: (params: {
    type: "image" | "video" | "document";
    ownerId: string;
    url: string;
    file: File;
    metadata: {
      uploadedAt: string;
      originalName: string;
      size: number;
      mimeType: AcceptedMimeType;
    };
  }) => Promise<{ type: string; data: { id: string; ownerId: string } }>
): Promise<{ result: { type: string; data: { id: string; ownerId: string } } | null; error: string | null }> {
  try {
    // console.log("💾 Storing file metadata in database...");
    const result = await storeInDatabase({
      type: getMemoryType(file.type as AcceptedMimeType),
      ownerId,
      url,
      file,
      metadata: {
        uploadedAt: new Date().toISOString(),
        originalName: file.name,
        size: file.size,
        mimeType: file.type as AcceptedMimeType,
      },
    });
    // console.log("✅ File metadata stored successfully");
    return { result, error: null };
  } catch (dbError) {
    console.error("❌ Database error:", dbError);
    return {
      result: null,
      error: dbError instanceof Error ? dbError.message : String(dbError),
    };
  }
}
