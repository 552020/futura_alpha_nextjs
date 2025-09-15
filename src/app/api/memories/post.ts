/**
 * MEMORY CREATION HANDLER
 *
 * This module handles all memory creation scenarios:
 * - JSON requests (memory creation without files)
 * - Single file uploads
 * - Multiple file uploads (folder uploads)
 * - Onboarding context support
 *
 * This replaces the need for separate upload routes and provides
 * a unified interface for all memory creation operations.
 */

import { NextRequest, NextResponse } from "next/server";

// Import organized utilities
import {
  // File processing
  parseMultipleFiles,
  validateFile,
  validateFileWithErrorHandling,
  validateFileType,
  isAcceptedMimeType,
  getMemoryType,
  toAcceptedMimeType,
  logFileDetails,

  // Storage
  uploadFileToStorage,
  uploadFileToStorageWithErrorHandling,

  // Database
  storeInNewDatabase,

  // Memory creation
  getAllUserId,
  createMemoryFromJson,
  createUploadResponse,

  // Types
  type AcceptedMimeType,
} from "./utils";

// Import new folder upload utilities
import { getUserIdForUpload } from "./utils/user-management";
import {
  formatFolderUploadResponse,
  formatErrorResponse,
  calculateUploadStats,
  type UploadResult,
} from "./utils/response-formatting";

/**
 * Main POST handler for memory creation
 * Handles both JSON requests and file uploads
 */
export async function handleApiMemoryPost(request: NextRequest) {
  console.log("🚀 Starting memory creation process...");

  try {
    // Check if this is a file upload (multipart/form-data) or JSON request
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      // Check if this is a folder upload (multiple files) or single file
      const formData = await request.formData();
      const files = formData.getAll("file") as File[];

      if (files.length > 1) {
        // Handle folder upload using new streamlined approach
        return await handleFolderUpload(request);
      } else {
        // Handle single file upload (legacy)
        const { allUserId, error } = await getAllUserId(request);
        if (error) {
          return error;
        }
        return await handleFileUpload(request, allUserId);
      }
    } else {
      // For JSON requests, check if this is an onboarding request
      const body = await request.json();
      const { isOnboarding } = body;

      if (isOnboarding) {
        console.log("🎯 Onboarding JSON request detected - bypassing authentication");
        // For onboarding, we don't need authentication - createMemoryFromJson will handle temporary user creation
        return await createMemoryFromJson(request, ""); // Pass empty string, function will create temporary user
      } else {
        // For regular JSON requests, get the allUserId for the user (authenticated or temporary)
        const { allUserId, error } = await getAllUserId(request);
        if (error) {
          return error;
        }
        return await createMemoryFromJson(request, allUserId);
      }
    }
  } catch (error) {
    console.error("Error in memory creation:", error);
    return NextResponse.json({ error: "Failed to create memory" }, { status: 500 });
  }
}

/**
 * Handle folder upload requests using new blob-first approach with multiple assets support
 */
async function handleFolderUpload(request: NextRequest) {
  const startTime = Date.now();
  console.log("🚀 Starting folder upload process with blob-first approach...");

  try {
    // Parse files using the utility function
    const { files, userId: providedAllUserId, error: parseError } = await parseMultipleFiles(request);
    if (parseError) {
      return parseError;
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    console.log(`📁 Processing ${files.length} files with blob-first approach...`);

    // Validate file types for all files
    for (const file of files) {
      const fileTypeError = validateFileType(file, isAcceptedMimeType);
      if (fileTypeError) return fileTypeError;
    }

    // Get user ID using extracted utility
    const { allUserId, error: userError } = await getUserIdForUpload({ providedUserId: providedAllUserId });
    if (userError) {
      return userError;
    }

    // Import the uploadFiles service for blob-first approach
    const { uploadFiles } = await import("@/services/upload");

    // Use the new blob-first uploadFiles service which handles multiple assets for images
    const uploadResults = await uploadFiles(
      files,
      false, // isOnboarding - will be determined by the service
      allUserId, // existingUserId
      "folder", // mode
      "vercel_blob", // storageBackend
      "neon" // userStoragePreference - default to neon for now
    );

    // Calculate statistics
    const stats = calculateUploadStats(files, startTime);

    // Convert upload results to the expected format
    const formattedResults: UploadResult[] = uploadResults.map((result, index) => ({
      fileName: files[index]?.name || "Unknown",
      url: result.data.assets?.[0]?.url || "", // Use first asset URL
      success: result.success,
      userId: allUserId,
      memoryId: result.data.id,
      assetId: result.data.assets?.[0]?.id || "",
    }));

    const successfulUploads = uploadResults.filter((r) => r.success).length;
    const failedUploads = uploadResults.length - successfulUploads;

    console.log("=== FOLDER UPLOAD COMPLETE (BLOB-FIRST) ===");
    console.log(`📁 Files processed: ${successfulUploads}/${files.length} successful`);
    console.log(`📦 Total size: ${stats.totalSizeMB} MB`);
    console.log(`⏱️ Total time: ${stats.totalTime.toFixed(1)} seconds`);
    console.log(`📊 Average: ${stats.averageTime.toFixed(1)} seconds per file`);
    console.log(`🚀 Upload speed: ${stats.uploadSpeedMBps} MB/s`);
    console.log(`👤 User ID: ${allUserId}`);
    console.log(`❌ Failed uploads: ${failedUploads}`);
    console.log("=============================================");

    // Use extracted response formatting utility
    return NextResponse.json(
      formatFolderUploadResponse({
        results: formattedResults,
        totalFiles: files.length,
        totalTime: stats.totalTime,
        totalSize: stats.totalSize,
        userId: allUserId,
      })
    );
  } catch (error) {
    return formatErrorResponse(error);
  }
}

/**
 * Handle file upload requests (single or multiple files)
 */
async function handleFileUpload(request: NextRequest, ownerId: string) {
  const startTime = Date.now();

  // Parse form data to determine if single or multiple files
  const { files, error: parseError } = await parseMultipleFiles(request);
  if (parseError) {
    return NextResponse.json({ error: parseError }, { status: 400 });
  }

  if (!files || files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  console.log(`📁 Processing ${files.length} file(s)...`);

  // Log file details for debugging
  files.forEach((file, index) => {
    console.log(`📄 File ${index + 1}:`, {
      name: file.name,
      type: file.type,
      size: file.size,
    });
  });

  // Process files in parallel (limit to 5 concurrent uploads)
  const pLimit = (await import("p-limit")).default;
  const limit = pLimit(5);

  const uploadTasks = files.map((file) =>
    limit(async () => {
      try {
        const name = String(file.name || "Untitled");

        // Log file details
        logFileDetails(file);

        // Validate file type first
        const fileTypeError = validateFileType(file, isAcceptedMimeType);
        if (fileTypeError) {
          console.error(`❌ File type validation failed for ${name}:`, fileTypeError);
          return { success: false, fileName: name, error: fileTypeError };
        }

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
        const memoryType = getMemoryType(file.type as AcceptedMimeType);

        // Store in database using the new unified schema
        const mimeType = toAcceptedMimeType(file.type);
        const result = await storeInNewDatabase({
          type: memoryType,
          ownerId,
          url,
          file,
          metadata: {
            uploadedAt: new Date().toISOString(),
            originalName: file.name,
            size: file.size,
            mimeType,
          },
        });

        return {
          success: true,
          fileName: name,
          url,
          memory: result.data,
        };
      } catch (error) {
        const name = String(file.name || "Untitled");
        console.error(`❌ Unexpected error for ${name}:`, error);
        return { success: false, fileName: name, error };
      }
    })
  );

  const results = await Promise.allSettled(uploadTasks);

  // Process results
  const successfulUploads: Array<{
    success: true;
    fileName: string;
    url: string;
    memory: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  }> = [];
  const failedUploads: Array<{
    success: false;
    fileName: string;
    error: unknown;
  }> = [];

  for (const result of results) {
    if (result.status === "fulfilled" && result.value.success === true) {
      successfulUploads.push(result.value as (typeof successfulUploads)[0]);
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

  const duration = Date.now() - startTime;
  console.log(`✅ Memory creation completed in ${duration}ms`);

  return createUploadResponse(successfulUploads, failedUploads, files.length, duration);
}
