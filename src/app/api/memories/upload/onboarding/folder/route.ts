// import { NextRequest, NextResponse } from "next/server";
// import pLimit from "p-limit";
// import { db } from "@/db/db";
// import { images, videos, documents } from "@/db/schema";
// import {
//   parseMultipleFiles,
//   logMultipleFileDetails,
//   validateFileType,
//   validateFileWithErrorHandling,
//   uploadFileToStorageWithErrorHandling,
//   createTemporaryUserWithErrorHandling,
// } from "../../utils";
// import { isAcceptedMimeType, validateFile, uploadFileToStorage, getMemoryType } from "../../utils";
// import { createTemporaryUserBase } from "../../../../utils";

// // Type definitions for database inserts
// type ImageInsert = typeof images.$inferInsert;
// type VideoInsert = typeof videos.$inferInsert;
// type DocumentInsert = typeof documents.$inferInsert;

// // Type for upload results
// type UploadResult = {
//   fileName: string;
//   url: string;
//   success: boolean;
//   userId: string;
//   memoryId: string;
// };

// // Type for successful uploads with discriminated union
// type UploadOk =
//   | { success: true; memoryType: "image"; fileName: string; url: string; row: ImageInsert }
//   | { success: true; memoryType: "video"; fileName: string; url: string; row: VideoInsert }
//   | { success: true; memoryType: "document"; fileName: string; url: string; row: DocumentInsert };

// type UploadErr = { success: false; fileName: string; error: unknown };

// // TODO: These functions need to be updated to work with the new unified schema
// // For now, they are commented out to make the build pass

// /**
//  * Folder Upload Endpoint
//  *
//  * **Key Differences from File Upload:**
//  * 1. Receives multiple files from a single folder upload
//  * 2. Creates ONE temporary user for ALL files in the folder
//  * 3. Processes files in parallel for better performance
//  * 4. Returns array of results instead of single result
//  * 5. Handles folder structure/paths
//  *
//  * **Request Format:**
//  * - Content-Type: multipart/form-data
//  * - Body: Multiple files from folder selection
//  *
//  * **Response Format:**
//  * {
//  *   results: Array<{ id: string, ownerId: string, fileName: string }>,
//  *   totalFiles: number,
//  *   successfulUploads: number,
//  *   failedUploads: number
//  * }
//  */

// export async function POST(request: NextRequest) {
//   const startTime = Date.now();
//   // console.log("🚀 Starting onboarding folder upload process...");

//   try {
//     // Parse form data and extract files
//     const { files, error } = await parseMultipleFiles(request);
//     if (error) return error;
//     if (!files || files.length === 0) {
//       return NextResponse.json({ error: "No files provided" }, { status: 400 });
//     }

//     logMultipleFileDetails(files);

//     // Validate file types for all files
//     for (const file of files) {
//       const fileTypeError = validateFileType(file, isAcceptedMimeType);
//       if (fileTypeError) return fileTypeError;
//     }

//     // Create one temporary user for all files
//     const { allUser, error: userError } = await createTemporaryUserWithErrorHandling(createTemporaryUserBase);
//     if (userError) return userError;

//     // Process files in parallel with concurrency limit (validate + upload only)
//     const limit = pLimit(5); // max 5 concurrent uploads
//     const uploadTasks = files.map((file) =>
//       limit(async (): Promise<UploadOk | UploadErr> => {
//         try {
//           const name = String(file.name || "Untitled"); // Guarantee string type

//           // Validate file
//           const { validationResult, error: validationError } = await validateFileWithErrorHandling(file, validateFile);
//           if (validationError) {
//             console.error(`❌ Validation failed for ${name}:`, validationError);
//             return { success: false, fileName: name, error: validationError };
//           }

//           // Upload file to storage
//           const { url, error: uploadError } = await uploadFileToStorageWithErrorHandling(
//             file,
//             validationResult!.buffer!,
//             uploadFileToStorage
//           );
//           if (uploadError) {
//             console.error(`❌ Upload failed for ${name}:`, uploadError);
//             return { success: false, fileName: name, error: uploadError };
//           }

//           // Build database row based on memory type
//           const memoryType = getMemoryType(
//             file.type as
//               | "image/jpeg"
//               | "image/png"
//               | "image/gif"
//               | "image/webp"
//               | "video/mp4"
//               | "video/webm"
//               | "application/pdf"
//               | "application/msword"
//               | "text/plain"
//               | "text/markdown"
//           );

//           if (memoryType === "image") {
//             return {
//               success: true,
//               memoryType,
//               fileName: name,
//               url,
//               row: {} as ImageInsert,
//             };
//           }
//           if (memoryType === "video") {
//             return {
//               success: true,
//               memoryType,
//               fileName: name,
//               url,
//               row: {} as VideoInsert,
//             };
//           }
//           return {
//             success: true,
//             memoryType: "document",
//             fileName: name,
//             url,
//             row: {} as DocumentInsert,
//           };
//         } catch (error) {
//           const name = String(file.name || "Untitled");
//           console.error(`❌ Unexpected error for ${name}:`, error);
//           return { success: false, fileName: name, error };
//         }
//       })
//     );

//     const results = await Promise.allSettled(uploadTasks);

//     // Process results and collect successful rows by type
//     const imageRows: ImageInsert[] = [];
//     const videoRows: VideoInsert[] = [];
//     const documentRows: DocumentInsert[] = [];
//     const uploadResults: UploadResult[] = [];

//     const ok = results
//       .filter((r): r is PromiseFulfilledResult<UploadOk> => r.status === "fulfilled" && r.value.success)
//       .map((r) => r.value);

//     // Split rows by type using type guards
//     ok.forEach((value) => {
//       if (value.memoryType === "image") {
//         imageRows.push(value.row);
//       } else if (value.memoryType === "video") {
//         videoRows.push(value.row);
//       } else {
//         documentRows.push(value.row);
//       }

//       uploadResults.push({
//         fileName: value.fileName,
//         url: value.url,
//         success: true,
//         userId: allUser.id,
//         memoryId: "", // Will be set after batch insert
//       });
//     });

//     // Batch insert all successful files (no transactions - Neon HTTP limitation)
//     const insertedIds: string[] = [];

//     if (imageRows.length > 0) {
//       const imageResults = await db.insert(images).values(imageRows).returning({ id: images.id });
//       insertedIds.push(...imageResults.map((r) => r.id));
//     }

//     if (videoRows.length > 0) {
//       const videoResults = await db.insert(videos).values(videoRows).returning({ id: videos.id });
//       insertedIds.push(...videoResults.map((r) => r.id));
//     }

//     if (documentRows.length > 0) {
//       const documentResults = await db.insert(documents).values(documentRows).returning({ id: documents.id });
//       insertedIds.push(...documentResults.map((r) => r.id));
//     }

//     // Update uploadResults with actual memory IDs
//     uploadResults.forEach((result, index) => {
//       if (result.success && insertedIds[index]) {
//         result.memoryId = insertedIds[index];
//       }
//     });

//     // console.log(`✅ Batch inserted ${insertedIds.length} files into database`);

//     const endTime = Date.now();
//     const totalTime = (endTime - startTime) / 1000;
//     const averageTime = totalTime / files.length;

//     // Calculate total file size
//     const totalSize = files.reduce((acc, file) => acc + file.size, 0);
//     const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);

//     // console.log("=== FOLDER UPLOAD COMPLETE ===");
//     // console.log(`📁 Files processed: ${uploadResults.length}/${files.length} successful`);
//     // console.log(`📦 Total size: ${totalSizeMB} MB`);
//     // console.log(`⏱️ Total time: ${totalTime.toFixed(1)} seconds`);
//     // console.log(`📊 Average: ${averageTime.toFixed(1)} seconds per file`);
//     // console.log(`🚀 Upload speed: ${(parseFloat(totalSizeMB) / totalTime).toFixed(2)} MB/s`);
//     // console.log(`👤 User ID: ${allUser.id}`);
//     // console.log(`❌ Failed uploads: ${files.length - uploadResults.length}`);
//     // console.log("================================");

//     return NextResponse.json({
//       message: "Folder upload completed successfully",
//       status: "success",
//       totalFiles: files.length,
//       successfulUploads: uploadResults.length,
//       failedUploads: files.length - uploadResults.length,
//       totalTime: totalTime.toFixed(1),
//       averageTime: averageTime.toFixed(1),
//       totalSizeMB: totalSizeMB,
//       uploadSpeedMBps: (parseFloat(totalSizeMB) / totalTime).toFixed(2),
//       userId: allUser.id,
//       results: uploadResults,
//     });
//   } catch (error) {
//     console.error("❌ Unexpected error:", error);
//     return NextResponse.json(
//       {
//         error: "Unexpected error occurred",
//         details: error instanceof Error ? error.message : String(error),
//       },
//       { status: 500 }
//     );
//   }
// }
