// import { NextRequest, NextResponse } from "next/server";
// import pLimit from "p-limit";
// import {
//   parseMultipleFiles,
//   logMultipleFileDetails,
//   validateFileType,
//   validateFileWithErrorHandling,
//   uploadFileToStorageWithErrorHandling,
//   createStorageEdgesForMemory,
// } from "../utils";
// import { getUserIdForUpload } from "@/app/api/memories/utils/user-management";
// import { processMultipleFilesBatch } from "@/app/api/memories/utils/memory-database";
// import {
//   formatFolderUploadResponse,
//   formatErrorResponse,
//   calculateUploadStats,
//   type UploadResult,
// } from "@/app/api/memories/utils/response-formatting";
// import { isAcceptedMimeType, validateFile, uploadFileToStorage, getMemoryType } from "../utils";

// // Type for upload results
// type NewUploadOk = {
//   success: true;
//   memoryType: "image" | "video" | "document" | "note" | "audio";
//   fileName: string;
//   url: string;
//   memory: any; // Will be filled by processMultipleFilesBatch
//   asset: any; // Will be filled by processMultipleFilesBatch
// };

// type NewUploadErr = { success: false; fileName: string; error: unknown };

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
//   console.log("🚀 Starting folder upload process...");

//   try {
//     // Parse files using the utility function
//     const { files, userId: providedAllUserId, error: parseError } = await parseMultipleFiles(request);
//     if (parseError) {
//       return parseError;
//     }

//     if (!files || files.length === 0) {
//       return NextResponse.json({ error: "No files provided" }, { status: 400 });
//     }

//     logMultipleFileDetails(files);

//     // Validate file types for all files
//     for (const file of files) {
//       const fileTypeError = validateFileType(file, isAcceptedMimeType);
//       if (fileTypeError) return fileTypeError;
//     }

//     // Get user ID using extracted utility
//     const { allUserId, error: userError } = await getUserIdForUpload({ providedUserId: providedAllUserId });
//     if (userError) {
//       return userError;
//     }

//     // Process files in parallel with concurrency limit (validate + upload only)
//     const limit = pLimit(5); // max 5 concurrent uploads
//     const uploadTasks = files.map((file) =>
//       limit(async (): Promise<NewUploadOk | NewUploadErr> => {
//         try {
//           const name = String(file.name || "Untitled");

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

//           const memoryType = getMemoryType(file.type as any) as "image" | "video" | "document" | "note" | "audio";

//           return {
//             success: true,
//             memoryType,
//             fileName: name,
//             url,
//             memory: null, // Will be filled by batch processing
//             asset: null, // Will be filled by batch processing
//           };
//         } catch (error) {
//           const name = String(file.name || "Untitled");
//           console.error(`❌ Unexpected error for ${name}:`, error);
//           return { success: false, fileName: name, error };
//         }
//       })
//     );

//     const results = await Promise.allSettled(uploadTasks);

//     // Process results and collect successful data
//     const ok = results
//       .filter((r): r is PromiseFulfilledResult<NewUploadOk> => r.status === "fulfilled" && r.value.success)
//       .map((r) => r.value);

//     const failures = results.filter(
//       (r) => r.status === "rejected" || (r.status === "fulfilled" && !(r.value as NewUploadOk | NewUploadErr).success)
//     ).length;

//     console.log(`✅ ${ok.length} uploads ready for batch insert, ❌ ${failures} failures`);

//     // Extract successful files and URLs for batch processing
//     const successfulFiles = ok.map((result) => files.find((f) => f.name === result.fileName)!);
//     const successfulUrls = ok.map((result) => result.url);

//     // Use extracted batch processing utility
//     const batchResult = await processMultipleFilesBatch({
//       files: successfulFiles,
//       urls: successfulUrls,
//       ownerId: allUserId,
//     });

//     if (!batchResult.success) {
//       return NextResponse.json({ error: batchResult.error }, { status: 500 });
//     }

//     // Create upload results with actual IDs
//     const uploadResults: UploadResult[] = ok.map((result, index) => ({
//       fileName: result.fileName,
//       url: result.url,
//       success: true,
//       userId: allUserId,
//       memoryId: batchResult.memories[index]?.id || "",
//       assetId: batchResult.assets[index]?.id || "",
//     }));

//     // Create storage edges for all successfully inserted memories
//     console.log("🔗 Creating storage edges for batch upload...");
//     const storageEdgePromises = uploadResults
//       .filter((result) => result.success && result.memoryId)
//       .map(async (result, index) => {
//         const file = successfulFiles[index];
//         const memoryType = getMemoryType(file.type as any) as "image" | "video" | "document" | "note" | "audio";

//         return createStorageEdgesForMemory({
//           memoryId: result.memoryId!,
//           memoryType,
//           url: result.url,
//           size: file.size,
//         });
//       });

//     const storageEdgeResults = await Promise.allSettled(storageEdgePromises);
//     const successfulStorageEdges = storageEdgeResults.filter(
//       (result) => result.status === "fulfilled" && result.value.success
//     ).length;

//     console.log(`✅ Created storage edges for ${successfulStorageEdges}/${uploadResults.length} memories`);

//     // Calculate statistics using extracted utility
//     const stats = calculateUploadStats(files, startTime);

//     console.log("=== FOLDER UPLOAD COMPLETE ===");
//     console.log(`📁 Files processed: ${uploadResults.length}/${files.length} successful`);
//     console.log(`📦 Total size: ${stats.totalSizeMB} MB`);
//     console.log(`⏱️ Total time: ${stats.totalTime.toFixed(1)} seconds`);
//     console.log(`📊 Average: ${stats.averageTime.toFixed(1)} seconds per file`);
//     console.log(`🚀 Upload speed: ${stats.uploadSpeedMBps} MB/s`);
//     console.log(`👤 User ID: ${allUserId}`);
//     console.log(`❌ Failed uploads: ${files.length - uploadResults.length}`);
//     console.log("================================");

//     // Use extracted response formatting utility
//     return NextResponse.json(
//       formatFolderUploadResponse({
//         results: uploadResults,
//         totalFiles: files.length,
//         totalTime: stats.totalTime,
//         totalSize: stats.totalSize,
//         userId: allUserId,
//       })
//     );
//   } catch (error) {
//     return formatErrorResponse(error);
//   }
// }
