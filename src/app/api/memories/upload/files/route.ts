import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/db";
import { allUsers, users } from "@/db/schema";
import { eq } from "drizzle-orm";
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
} from "../utils";

/**
 * Sequential Upload Endpoint (/api/memories/upload/files)
 * ----------------------------------------------------------
 * - Processes files one by one in sequence
 * - Good for smaller batches where controlled processing is needed
 * - Provides detailed error handling for each file
 *
 * NOTE: A Batch Upload option could be added for higher performance
 * (e.g., /api/memories/upload/batch) which would use Promise.allSettled
 * to process files concurrently. This would be faster for large batches
 * but would also consume more resources.
 */

export async function POST(request: NextRequest) {
  console.log("🚀 Starting multiple files upload process...");
  try {
    // Parse form data and extract files
    const {
      files,
      userId: providedAllUserId,
      error,
    } = await parseMultipleFiles(request);
    if (error) return error;
    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    console.log(`📁 Processing ${files.length} files for upload`);
    logMultipleFileDetails(files);

    // Get user either from session or from provided allUserId
    let allUserId: string;
    const session = await auth();

    if (session?.user?.id) {
      console.log("👤 Looking up authenticated user in users table...");
      // First get the user from users table
      const [permanentUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, session.user.id));
      console.log("Found permanent user:", { userId: permanentUser?.id });

      if (!permanentUser) {
        console.error("❌ Permanent user not found");
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // Then get their allUserId
      const [allUserRecord] = await db
        .select()
        .from(allUsers)
        .where(eq(allUsers.userId, permanentUser.id));
      console.log("Found all_users record:", { allUserId: allUserRecord?.id });

      if (!allUserRecord) {
        console.error("❌ No all_users record found for permanent user");
        return NextResponse.json(
          { error: "User record not found" },
          { status: 404 }
        );
      }

      allUserId = allUserRecord.id;
    } else if (providedAllUserId) {
      console.log("👤 Using provided allUserId for temporary user...");
      // For temporary users, directly check the allUsers table
      const [tempUser] = await db
        .select()
        .from(allUsers)
        .where(eq(allUsers.id, providedAllUserId));
      console.log("Found temporary user:", {
        allUserId: tempUser?.id,
        type: tempUser?.type,
      });

      if (!tempUser || tempUser.type !== "temporary") {
        console.error("❌ Valid temporary user not found");
        return NextResponse.json(
          { error: "Invalid temporary user" },
          { status: 404 }
        );
      }

      allUserId = tempUser.id;
    } else {
      console.error("❌ No valid user identification provided");
      return NextResponse.json(
        { error: "User identification required" },
        { status: 401 }
      );
    }

    // Process all files
    const results = [];
    const errors = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`📄 Processing file ${i + 1}/${files.length}: ${file.name}`);

      try {
        // Validate file type
        const fileTypeError = validateFileType(file, isAcceptedMimeType);
        if (fileTypeError) {
          errors.push({
            fileName: file.name,
            error: "Invalid file type",
            index: i,
          });
          continue;
        }

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
            allUserId,
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
          ...result,
        });

        console.log(
          `✅ File ${i + 1}/${files.length} uploaded successfully: ${file.name}`
        );
      } catch (fileError) {
        console.error(`❌ Error processing file ${file.name}:`, fileError);
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
    };

    console.log("📊 Upload summary:", {
      totalFiles: files.length,
      successful: results.length,
      failed: errors.length,
    });

    // Return appropriate status code
    if (errors.length === 0) {
      // All files uploaded successfully
      console.log("🎉 All files uploaded successfully!");
      return NextResponse.json(response, { status: 200 });
    } else if (results.length === 0) {
      // All files failed
      console.log("❌ All files failed to upload");
      return NextResponse.json(response, { status: 400 });
    } else {
      // Partial success
      console.log("⚠️ Some files uploaded successfully, some failed");
      return NextResponse.json(response, { status: 207 }); // 207 Multi-Status
    }
  } catch (error) {
    console.error("❌ Error uploading files:", {
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
