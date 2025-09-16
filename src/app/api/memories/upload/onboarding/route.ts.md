// import { NextRequest, NextResponse } from "next/server";
// import { storeInDatabase, uploadFileToStorage, validateFile, isAcceptedMimeType, getMemoryType } from "../utils";
// import { createTemporaryUserBase } from "../../../utils";

// export async function POST(request: NextRequest) {
// // console.log("🚀 Starting onboarding file upload process...");
// try {
// // console.log("📦 Parsing form data...");
// const formData = await request.formData();
// const file = formData.get("file") as File;

// if (!file) {
// console.error("❌ No file found in form data");
// return NextResponse.json({ error: "Missing file" }, { status: 400 });
// }

// // console.log("📄 File details:", {
// // name: file.name,
// // type: file.type,
// // size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
// // });

// if (!isAcceptedMimeType(file.type)) {
// return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
// }

// // Validate file
// let validationResult;
// try {
// // console.log("🔍 Starting file validation...");
// validationResult = await validateFile(file);
// if (!validationResult.isValid) {
// console.error("❌ File validation failed:", validationResult.error);
// return NextResponse.json({ error: validationResult.error }, { status: 400 });
// }
// // console.log("✅ File validation successful:", {
// // type: file.type,
// // size: file.size,
// // });
// } catch (validationError) {
// console.error("❌ Validation error:", validationError);
// return NextResponse.json(
// {
// error: "File validation failed",
// step: "validation",
// details: validationError instanceof Error ? validationError.message : String(validationError),
// },
// { status: 500 }
// );
// }

// // Upload file to storage
// let url;
// try {
// // console.log("📤 Starting file upload to storage...");
// url = await uploadFileToStorage(file, validationResult.buffer);
// // console.log("✅ File uploaded successfully to:", url);
// } catch (uploadError) {
// console.error("❌ Upload error:", uploadError);
// return NextResponse.json(
// {
// error: "File upload failed",
// step: "upload",
// details: uploadError instanceof Error ? uploadError.message : String(uploadError),
// },
// { status: 500 }
// );
// }

// // Create temporary user or use existing one
// let allUser;
// const existingUserId = formData.get("existingUserId") as string;

// if (existingUserId) {
// // console.log("👤 Using existing user:", existingUserId);
// // TODO: Fetch existing user from database
// allUser = { id: existingUserId };
// } else {
// // console.log("👤 Creating temporary user...");
// const result = await createTemporaryUserBase("inviter");
// allUser = result.allUser;
// // console.log("✅ Temporary user created:", { userId: allUser.id });
// }

// // Store in database
// try {
// // console.log("💾 Storing file metadata in database...");
// const result = await storeInDatabase({
// type: getMemoryType(file.type),
// ownerId: allUser.id,
// url,
// file,
// metadata: {
// uploadedAt: new Date().toISOString(),
// originalName: file.name,
// size: file.size,
// mimeType: file.type,
// },
// });
// // console.log("✅ File metadata stored successfully");

// return NextResponse.json({
// ...result,
// ownerId: allUser.id,
// });
// } catch (dbError) {
// console.error("❌ Database error:", dbError);
// return NextResponse.json(
// {
// error: "Failed to store file metadata",
// step: "database",
// details: dbError instanceof Error ? dbError.message : String(dbError),
// },
// { status: 500 }
// );
// }
// } catch (error) {
// console.error("❌ Unexpected error:", error);
// return NextResponse.json(
// {
// error: "Unexpected error occurred",
// details: error instanceof Error ? error.message : String(error),
// },
// { status: 500 }
// );
// }
// }
