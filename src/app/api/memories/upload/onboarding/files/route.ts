import { NextRequest, NextResponse } from "next/server";
import {
  storeInDatabase,
  uploadFileToStorage,
  validateFile,
  isAcceptedMimeType,
  getMemoryType,
  parseMultipleFiles,
  logMultipleFileDetails,
  validateFileType,
  validateFileWithErrorHandling,
  uploadFileToStorageWithErrorHandling,
  storeFileInDatabaseWithErrorHandling,
  createTemporaryUserWithErrorHandling,
} from "../../utils";
import { createTemporaryUserBase } from "../../../../utils";

/**
 * Onboarding Multiple Files Upload Endpoint (/api/memories/upload/onboarding/files)
 * ----------------------------------------------------------
 * - Processes multiple files for onboarding users
 * - Creates one temporary user for all files
 * - Processes files sequentially for controlled onboarding experience
 * - Provides detailed error handling for each file
 */

export async function POST(request: NextRequest) {
  console.log("🚀 Starting onboarding multiple files upload process...");
  try {
    // Parse form data and extract files
    const { files, error } = await parseMultipleFiles(request);
    if (error) return error;
    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    console.log(`📁 Processing ${files.length} files for onboarding upload`);
    logMultipleFileDetails(files);

    // Validate file types for all files
    for (const file of files) {
      const fileTypeError = validateFileType(file, isAcceptedMimeType);
      if (fileTypeError) return fileTypeError;
    }

    // Create one temporary user for all files
    const { allUser, error: userError } =
      await createTemporaryUserWithErrorHandling(createTemporaryUserBase);
    if (userError) return userError;

    // Process all files sequentially for onboarding
    const results = [];
    const errors = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(
        `📄 Processing onboarding file ${i + 1}/${files.length}: ${file.name}`
      );

      try {
        // Validate file
        const { validationResult, error: validationError } =
          await validateFileWithErrorHandling(file, validateFile);
        if (validationError) {
          errors.push({
            fileName: file.name,
            error: "File validation failed",
            index: i,
          });
          continue;
        }

        // Upload file to storage
        const { url, error: uploadError } =
          await uploadFileToStorageWithErrorHandling(
            file,
            validationResult!.buffer!,
            uploadFileToStorage
          );
        if (uploadError) {
          errors.push({
            fileName: file.name,
            error: "Upload to storage failed",
            index: i,
          });
          continue;
        }

        // Store in database
        const { result, error: dbError } =
          await storeFileInDatabaseWithErrorHandling(
            file,
            url,
            allUser.id,
            getMemoryType,
            storeInDatabase
          );
        if (dbError) {
          errors.push({
            fileName: file.name,
            error: "Database storage failed",
            index: i,
          });
          continue;
        }

        // Success case
        results.push({
          fileName: file.name,
          index: i,
          data: {
            id: result!.data.id,
            ownerId: allUser.id,
          },
        });

        console.log(
          `✅ Onboarding file ${i + 1}/${files.length} uploaded successfully: ${
            file.name
          }`
        );
      } catch (fileError) {
        console.error(
          `❌ Error processing onboarding file ${file.name}:`,
          fileError
        );
        errors.push({
          fileName: file.name,
          error:
            fileError instanceof Error ? fileError.message : String(fileError),
          index: i,
        });
      }
    }

    // Prepare response
    const response = {
      totalFiles: files.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors,
      userId: allUser.id, // Include the temporary user ID for onboarding context
    };

    console.log("📊 Onboarding upload summary:", {
      totalFiles: files.length,
      successful: results.length,
      failed: errors.length,
      userId: allUser.id,
    });

    // Return appropriate status code
    if (errors.length === 0) {
      // All files uploaded successfully
      console.log("🎉 All onboarding files uploaded successfully!");
      return NextResponse.json(response, { status: 200 });
    } else if (results.length === 0) {
      // All files failed
      console.log("❌ All onboarding files failed to upload");
      return NextResponse.json(response, { status: 400 });
    } else {
      // Partial success
      console.log(
        "⚠️ Some onboarding files uploaded successfully, some failed"
      );
      return NextResponse.json(response, { status: 207 }); // 207 Multi-Status
    }
  } catch (error) {
    console.error("❌ Error uploading onboarding files:", {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
