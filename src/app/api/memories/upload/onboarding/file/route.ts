import { NextRequest, NextResponse } from "next/server";
import { storeInDatabase, uploadFileToStorage, validateFile, isAcceptedMimeType, getMemoryType } from "../../utils";
import { createTemporaryUserBase } from "../../../../utils";
import {
  parseSingleFile,
  logFileDetails,
  validateFileType,
  validateFileWithErrorHandling,
  uploadFileToStorageWithErrorHandling,
  storeFileInDatabaseWithErrorHandling,
  createTemporaryUserWithErrorHandling,
} from "../../utils";

export async function POST(request: NextRequest) {
  // console.log("🚀 Starting onboarding file upload process...");
  try {
    // Parse form data and extract file
    const { file, error } = await parseSingleFile(request);
    if (error) return error;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    logFileDetails(file);

    const fileTypeError = validateFileType(file, isAcceptedMimeType);
    if (fileTypeError) return fileTypeError;

    // Validate file
    const { validationResult, error: validationError } = await validateFileWithErrorHandling(file, validateFile);
    if (validationError) return validationError;

    // Upload file to storage
    const { url, error: uploadError } = await uploadFileToStorageWithErrorHandling(
      file,
      validationResult!.buffer!,
      uploadFileToStorage
    );
    if (uploadError) return uploadError;

    // Create temporary user
    const { allUser, error: userError } = await createTemporaryUserWithErrorHandling(createTemporaryUserBase);
    if (userError) return userError;

    // Store in database
    const { result, error: dbError } = await storeFileInDatabaseWithErrorHandling(
      file,
      url,
      allUser.id,
      getMemoryType,
      storeInDatabase
    );
    if (dbError) return dbError;

    return NextResponse.json({
      ...result,
      ownerId: allUser.id,
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
