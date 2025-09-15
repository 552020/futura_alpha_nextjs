// import { db } from "@/db/db";
// import { memories, memoryAssets } from "@/db/schema";
// import { NewDBMemory, NewDBMemoryAsset, DBMemory } from "@/db/schema";
// import { put } from "@vercel/blob";
// import { fileTypeFromBuffer } from "file-type";
// import crypto from "crypto";
// import { NextRequest, NextResponse } from "next/server";
// import { and, eq } from "drizzle-orm";

// // Constants
// export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
// export const MAX_VIDEO_SIZE = 25 * 1024 * 1024; // 25MB
// // Self written notes are dealt in another route
// export const ACCEPTED_MIME_TYPES = {
//   image: [
//     "image/jpeg", // .jpg, .jpeg
//     "image/png", // .png
//     "image/gif", // .gif
//     "image/webp", // .webp
//     "image/tiff", // .tiff
//   ],
//   document: [
//     "application/pdf", // .pdf
//     "application/msword", // .doc
//     "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
//     "application/rtf", // .rtf
//     "application/epub+zip", // .epub

//     // OpenDocument
//     "application/vnd.oasis.opendocument.text", // .odt

//     // Plain text and markdown
//     "text/plain", // .txt
//     "text/markdown", // .md
//     "text/x-markdown", // .md

//     // Org mode
//     "text/x-org", // .org
//   ],
//   video: [
//     "video/mp4", // .mp4
//     "video/quicktime", // .mov
//     "video/x-msvideo", // .avi
//     "video/webm", // .webm
//   ],
// } as const;

// export type UploadResponse = {
//   type: "image" | "document" | "video";
//   data: DBMemory;
// };

// export type AcceptedMimeType =
//   | (typeof ACCEPTED_MIME_TYPES.image)[number]
//   | (typeof ACCEPTED_MIME_TYPES.document)[number]
//   | (typeof ACCEPTED_MIME_TYPES.video)[number];

// export function isAcceptedMimeType(mime: string): mime is AcceptedMimeType {
//   return [...ACCEPTED_MIME_TYPES.image, ...ACCEPTED_MIME_TYPES.document, ...ACCEPTED_MIME_TYPES.video].includes(
//     mime as AcceptedMimeType
//   );
// }

// /**
//  * Safely convert a string to AcceptedMimeType
//  * Only use this after validating with isAcceptedMimeType()
//  */
// export function toAcceptedMimeType(mime: string): AcceptedMimeType {
//   if (!isAcceptedMimeType(mime)) {
//     throw new Error(`Invalid mime type: ${mime}`);
//   }
//   return mime;
// }

// export function getMemoryType(mime: AcceptedMimeType): "document" | "image" | "video" {
//   if (ACCEPTED_MIME_TYPES.image.includes(mime as (typeof ACCEPTED_MIME_TYPES.image)[number])) return "image";
//   if (ACCEPTED_MIME_TYPES.video.includes(mime as (typeof ACCEPTED_MIME_TYPES.video)[number])) return "video";
//   return "document";
// }

// export async function uploadFileToStorage(file: File, existingBuffer?: Buffer): Promise<string> {
//   const buffer = existingBuffer || Buffer.from(await file.arrayBuffer());
//   const safeFileName = file.name.replace(/[^a-zA-Z0-9-_\.]/g, "_");

//   const { url } = await put(`uploads/${Date.now()}-${safeFileName}`, buffer, {
//     access: "public",
//     contentType: file.type,
//   });

//   return url;
// }

// export async function storeInDatabase(params: {
//   type: "document" | "image" | "video";
//   ownerId: string;
//   url: string;
//   file: File;
//   metadata: {
//     uploadedAt: string;
//     originalName: string;
//     size: number;
//     mimeType: AcceptedMimeType;
//   };
// }) {
//   const { type, ownerId, url, file, metadata } = params;

//   // Generate a secure code for the owner
//   const ownerSecureCode = crypto.randomUUID();

//   let memoryData: { id: string; ownerId: string };

//   if (type === "image") {
//     const [image] = await db
//       .insert(memories)
//       .values({
//         ownerId,
//         type: "image",
//         title: file.name.split(".")[0],
//         description: "",
//         fileCreatedAt: new Date(),
//         isPublic: false,
//         parentFolderId: null,
//         ownerSecureCode,
//       })
//       .returning();
//     memoryData = image;
//   } else if (type === "video") {
//     const [video] = await db
//       .insert(memories)
//       .values({
//         ownerId,
//         type: "video",
//         title: file.name.split(".")[0],
//         description: "",
//         fileCreatedAt: new Date(),
//         isPublic: false,
//         parentFolderId: null,
//         ownerSecureCode,
//       })
//       .returning();
//     memoryData = video;
//   } else {
//     const [document] = await db
//       .insert(memories)
//       .values({
//         ownerId,
//         type: "document",
//         title: file.name.split(".")[0],
//         description: "",
//         fileCreatedAt: new Date(),
//         isPublic: false,
//         parentFolderId: null,
//         ownerSecureCode,
//       })
//       .returning();
//     memoryData = document;
//   }

//   // Create storage edges for the newly created memory
//   const storageEdgeResult = await createStorageEdgesForMemory({
//     memoryId: memoryData.id,
//     memoryType: type,
//     url,
//     size: metadata.size,
//   });

//   if (!storageEdgeResult.success) {
//     console.warn("⚠️ Failed to create storage edges for memory:", memoryData.id, storageEdgeResult.error);
//     // Don't fail the upload if storage edge creation fails
//   }

//   return { type, data: memoryData };
// }

// // New function to store in the new unified schema
// export async function storeInNewDatabase(params: {
//   type: "document" | "image" | "video" | "note" | "audio";
//   ownerId: string;
//   url: string;
//   file: File;
//   metadata: {
//     uploadedAt: string;
//     originalName: string;
//     size: number;
//     mimeType: AcceptedMimeType;
//   };
//   parentFolderId?: string | null;
// }) {
//   const { type, ownerId, url, file, metadata, parentFolderId } = params;

//   // Create memory in the new unified table
//   const newMemory: NewDBMemory = {
//     ownerId,
//     type: type as "image" | "video" | "document" | "note" | "audio",
//     title: file.name.split(".")[0],
//     description: "",
//     fileCreatedAt: new Date(),
//     isPublic: false,
//     parentFolderId: parentFolderId || null,
//     ownerSecureCode: crypto.randomUUID(),
//   };

//   const [createdMemory] = await db.insert(memories).values(newMemory).returning();

//   // Create original asset
//   const newAsset: NewDBMemoryAsset = {
//     memoryId: createdMemory.id,
//     assetType: "original",
//     variant: "default",
//     url,
//     storageBackend: "vercel_blob",
//     storageKey: url.split("/").pop() || "",
//     bytes: metadata.size,
//     width: null, // Will be populated by client-side processing
//     height: null, // Will be populated by client-side processing
//     mimeType: metadata.mimeType,
//     sha256: null, // Will be populated by client-side processing
//     processingStatus: "completed",
//     processingError: null,
//   };

//   const [createdAsset] = await db.insert(memoryAssets).values(newAsset).returning();

//   // Create storage edges for the newly created memory
//   const storageEdgeResult = await createStorageEdgesForMemory({
//     memoryId: createdMemory.id,
//     memoryType: type,
//     url,
//     size: metadata.size,
//   });

//   if (!storageEdgeResult.success) {
//     console.warn("⚠️ Failed to create storage edges for memory:", createdMemory.id, storageEdgeResult.error);
//     // Don't fail the upload if storage edge creation fails
//   }

//   return {
//     type,
//     data: {
//       id: createdMemory.id,
//       ownerId: createdMemory.ownerId,
//       assets: [createdAsset],
//     },
//   };
// }

// export type FileValidationResult = {
//   isValid: boolean;
//   error?: string;
//   fileType?: { mime: AcceptedMimeType };
//   metadata?: {
//     uploadedAt: string;
//     originalName: string;
//     size: number;
//     mimeType: AcceptedMimeType;
//   };
//   buffer?: Buffer;
// };

// export async function validateFile(file: File): Promise<{ isValid: boolean; error?: string; buffer?: Buffer }> {
//   // Check file size
//   const isVideo = file.type.startsWith("video/");
//   const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_FILE_SIZE;
//   if (file.size > maxSize) {
//     return { isValid: false, error: "File too large" };
//   }

//   // Check mime type
//   if (!isAcceptedMimeType(file.type)) {
//     return { isValid: false, error: "Invalid file type" };
//   }

//   // Get file buffer
//   const buffer = Buffer.from(await file.arrayBuffer());

//   // Skip file type validation for text files (like .md, .txt) because:
//   // 1. Text files don't have a specific binary signature (magic numbers)
//   // 2. file-type package can't reliably detect text file types
//   // 3. We already validated the mime type above, which is sufficient for text files
//   if (file.type.startsWith("text/")) {
//     return { isValid: true, buffer };
//   }

//   // Validate file type for non-text files
//   const fileType = await fileTypeFromBuffer(buffer);
//   if (!fileType) {
//     return { isValid: false, error: "Could not determine file type" };
//   }

//   // Check if the detected mime type matches the file's mime type
//   const memoryType = getMemoryType(file.type);
//   if (memoryType === "video" && !fileType.mime.startsWith("video/")) {
//     return { isValid: false, error: "Invalid video file" };
//   }
//   if (memoryType === "image" && !fileType.mime.startsWith("image/")) {
//     return { isValid: false, error: "Invalid image file" };
//   }

//   return { isValid: true, buffer };
// }

// /**
//  * Create storage edges for a newly created memory
//  * This function creates the necessary storage edge records to track where the memory is stored
//  */
// export async function createStorageEdgesForMemory(params: {
//   memoryId: string;
//   memoryType: "image" | "video" | "note" | "document" | "audio";
//   url: string;
//   size: number;
//   contentHash?: string;
// }) {
//   const { memoryId, memoryType, url, size, contentHash } = params;

//   try {
//     // console.log("🔗 Creating storage edges for memory:", { memoryId, memoryType });

//     // Create metadata edge for neon-db (always present when memory is created)
//     const metadataEdge = {
//       memoryId,
//       memoryType,
//       artifact: "metadata" as const,
//       backend: "neon-db" as const,
//       present: true,
//       location: null, // Metadata is stored in the main memory table
//       contentHash: null,
//       sizeBytes: null, // Metadata size is negligible
//       syncState: "idle" as const,
//       syncError: null,
//     };

//     // Create asset edge for vercel-blob (present when file is uploaded)
//     const assetEdge = {
//       memoryId,
//       memoryType,
//       artifact: "asset" as const,
//       backend: "vercel-blob" as const,
//       present: true,
//       location: url, // The blob URL
//       contentHash: contentHash || null,
//       sizeBytes: size,
//       syncState: "idle" as const,
//       syncError: null,
//     };

//     // Import the storage edges table
//     const { storageEdges } = await import("@/db/schema");

//     // Insert both edges
//     const [metadataResult, assetResult] = await Promise.all([
//       db.insert(storageEdges).values(metadataEdge).returning(),
//       db.insert(storageEdges).values(assetEdge).returning(),
//     ]);

//     // console.log("✅ Storage edges created successfully:", {
//     //   metadataEdgeId: metadataResult[0]?.id,
//     //   assetEdgeId: assetResult[0]?.id,
//     // });

//     return {
//       success: true,
//       metadataEdge: metadataResult[0],
//       assetEdge: assetResult[0],
//     };
//   } catch (error) {
//     console.error("❌ Error creating storage edges:", error);
//     return {
//       success: false,
//       error: error instanceof Error ? error.message : String(error),
//     };
//   }
// }

// /**
//  * Clean up storage edges for a deleted memory
//  * This function removes all storage edge records for a given memory
//  */
// export async function cleanupStorageEdgesForMemory(params: {
//   memoryId: string;
//   memoryType: "image" | "video" | "note" | "document" | "audio";
// }) {
//   const { memoryId, memoryType } = params;

//   try {
//     // console.log("🧹 Cleaning up storage edges for memory:", { memoryId, memoryType });

//     // Import the storage edges table
//     const { storageEdges } = await import("@/db/schema");

//     // Delete all storage edges for this memory
//     const deletedEdges = await db
//       .delete(storageEdges)
//       .where(and(eq(storageEdges.memoryId, memoryId), eq(storageEdges.memoryType, memoryType)))
//       .returning();

//     // console.log("✅ Storage edges cleaned up successfully:", {
//     //   memoryId,
//     //   memoryType,
//     //   deletedCount: deletedEdges.length,
//     // });

//     return {
//       success: true,
//       deletedCount: deletedEdges.length,
//       deletedEdges,
//     };
//   } catch (error) {
//     console.error("❌ Error cleaning up storage edges:", error);
//     return {
//       success: false,
//       error: error instanceof Error ? error.message : String(error),
//     };
//   }
// }

// // ============================================================================
// // UPLOAD UTILITY FUNCTIONS (Extracted from onboarding/utils.ts)
// // ============================================================================

// /**
//  * Parse form data and extract a single file
//  * Used for single file uploads
//  */
// export async function parseSingleFile(
//   request: NextRequest
// ): Promise<{ file: File | null; formData: FormData | null; error: NextResponse | null }> {
//   // console.log("📦 Parsing form data...");

//   try {
//     const formData = await request.formData();
//     const file = formData.get("file") as File;

//     if (!file) {
//       console.error("❌ No file found in form data");
//       return {
//         file: null,
//         formData: null,
//         error: NextResponse.json({ error: "Missing file" }, { status: 400 }),
//       };
//     }

//     return { file, formData, error: null };
//   } catch (error) {
//     console.error("❌ Error parsing form data:", error);
//     return {
//       file: null,
//       formData: null,
//       error: NextResponse.json({ error: "Invalid form data" }, { status: 400 }),
//     };
//   }
// }

// /**
//  * Parse form data and extract multiple files
//  * Used for folder uploads
//  */
// export async function parseMultipleFiles(
//   request: NextRequest
// ): Promise<{ files: File[]; userId?: string; error: NextResponse | null }> {
//   // console.log("📦 Parsing form data for folder upload...");

//   try {
//     const formData = await request.formData();
//     const files = formData.getAll("file") as File[];
//     const userId = formData.get("userId") as string | null;

//     if (!files || files.length === 0) {
//       console.error("❌ No files found in form data");
//       return {
//         files: [],
//         error: NextResponse.json({ error: "Missing files" }, { status: 400 }),
//       };
//     }

//     // console.log(`📁 Found ${files.length} files in folder upload`);
//     return { files, userId: userId || undefined, error: null };
//   } catch (error) {
//     console.error("❌ Error parsing form data:", error);
//     return {
//       files: [],
//       error: NextResponse.json({ error: "Invalid form data" }, { status: 400 }),
//     };
//   }
// }

// /**
//  * Log file details for debugging
//  * Used for both single file and folder uploads
//  */
// // eslint-disable-next-line @typescript-eslint/no-unused-vars
// export function logFileDetails(file: File): void {
//   // console.log("📄 File details:", {
//   //   name: file.name,
//   //   type: file.type,
//   //   size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
//   // });
// }

// /**
//  * Log multiple file details for debugging
//  * Used for folder uploads
//  */
// export function logMultipleFileDetails(files: File[]): void {
//   // console.log(`📁 Folder contains ${files.length} files:`);
//   // eslint-disable-next-line @typescript-eslint/no-unused-vars
//   files.forEach((_file, _index) => {
//     // console.log(`  ${_index + 1}. `);
//   });
// }

// /**
//  * Validate file MIME type
//  * Returns error response if file type is not accepted
//  */
// export function validateFileType(file: File, isAcceptedMimeType: (mime: string) => boolean): NextResponse | null {
//   if (!isAcceptedMimeType(file.type)) {
//     return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
//   }
//   return null;
// }

// /**
//  * Perform comprehensive file validation with error handling
//  * Returns validation result or error response
//  */
// export async function validateFileWithErrorHandling(
//   file: File,
//   validateFile: (file: File) => Promise<{ isValid: boolean; error?: string; buffer?: Buffer }>
// ): Promise<{
//   validationResult: { isValid: boolean; error?: string; buffer?: Buffer } | null;
//   error: NextResponse | null;
// }> {
//   let validationResult;
//   try {
//     // console.log("🔍 Starting file validation...");
//     validationResult = await validateFile(file);
//     if (!validationResult.isValid) {
//       console.error("❌ File validation failed:", validationResult.error);
//       return {
//         validationResult: null,
//         error: NextResponse.json({ error: validationResult.error }, { status: 400 }),
//       };
//     }
//     // console.log("✅ File validation successful:", {
//     //   type: file.type,
//     //   size: file.size,
//     // });
//     return { validationResult, error: null };
//   } catch (validationError) {
//     console.error("❌ Validation error:", validationError);
//     return {
//       validationResult: null,
//       error: NextResponse.json(
//         {
//           error: "File validation failed",
//           step: "validation",
//           details: validationError instanceof Error ? validationError.message : String(validationError),
//         },
//         { status: 500 }
//       ),
//     };
//   }
// }

// /**
//  * Upload file to storage with error handling
//  * Returns URL or error response
//  */
// export async function uploadFileToStorageWithErrorHandling(
//   file: File,
//   buffer: Buffer,
//   uploadFileToStorage: (file: File, buffer?: Buffer) => Promise<string>
// ): Promise<{ url: string; error: NextResponse | null }> {
//   let url;
//   try {
//     // console.log("📤 Starting file upload to storage...");
//     url = await uploadFileToStorage(file, buffer);
//     // console.log("✅ File uploaded successfully to:", url);
//     return { url, error: null };
//   } catch (uploadError) {
//     console.error("❌ Upload error:", uploadError);
//     return {
//       url: "",
//       error: NextResponse.json(
//         {
//           error: "File upload failed",
//           step: "upload",
//           details: uploadError instanceof Error ? uploadError.message : String(uploadError),
//         },
//         { status: 500 }
//       ),
//     };
//   }
// }

// /**
//  * Store file metadata in database with error handling
//  * Returns database result or error response
//  */
// export async function storeFileInDatabaseWithErrorHandling(
//   file: File,
//   url: string,
//   ownerId: string,
//   getMemoryType: (mimeType: AcceptedMimeType) => "document" | "image" | "video",
//   storeInDatabase: (params: {
//     type: "image" | "video" | "document";
//     ownerId: string;
//     url: string;
//     file: File;
//     metadata: {
//       uploadedAt: string;
//       originalName: string;
//       size: number;
//       mimeType: AcceptedMimeType;
//     };
//   }) => Promise<{ type: string; data: { id: string; ownerId: string } }>
// ): Promise<{ result: { type: string; data: { id: string; ownerId: string } } | null; error: NextResponse | null }> {
//   try {
//     // console.log("💾 Storing file metadata in database...");
//     const result = await storeInDatabase({
//       type: getMemoryType(file.type as AcceptedMimeType),
//       ownerId,
//       url,
//       file,
//       metadata: {
//         uploadedAt: new Date().toISOString(),
//         originalName: file.name,
//         size: file.size,
//         mimeType: file.type as AcceptedMimeType,
//       },
//     });
//     // console.log("✅ File metadata stored successfully");
//     return { result, error: null };
//   } catch (dbError) {
//     console.error("❌ Database error:", dbError);
//     return {
//       result: null,
//       error: NextResponse.json(
//         {
//           error: "Failed to store file metadata",
//           step: "database",
//           details: dbError instanceof Error ? dbError.message : String(dbError),
//         },
//         { status: 500 }
//       ),
//     };
//   }
// }

// /**
//  * Create temporary user with error handling
//  * Returns user or error response
//  */
// export async function createTemporaryUserWithErrorHandling(
//   createTemporaryUserBase: (role: "inviter" | "invitee") => Promise<{ allUser: { id: string } }>
// ): Promise<{ allUser: { id: string }; error: NextResponse | null }> {
//   try {
//     // console.log("👤 Creating temporary user...");
//     const { allUser } = await createTemporaryUserBase("inviter");
//     // console.log("✅ Temporary user created:", { userId: allUser.id });
//     return { allUser, error: null };
//   } catch (userError) {
//     console.error("❌ User creation error:", userError);
//     return {
//       allUser: { id: "" },
//       error: NextResponse.json(
//         {
//           error: "Failed to create temporary user",
//           step: "user_creation",
//           details: userError instanceof Error ? userError.message : String(userError),
//         },
//         { status: 500 }
//       ),
//     };
//   }
// }
