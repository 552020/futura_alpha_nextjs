/**
 * STORAGE UTILITIES
 *
 * This module handles file uploads to external storage services.
 * Currently supports Vercel Blob storage.
 *
 * USAGE:
 * - Upload files to Vercel Blob
 * - Handle upload errors gracefully
 * - Manage file storage operations
 */

import { put } from "@vercel/blob";

export async function uploadFileToStorage(file: File, existingBuffer?: Buffer): Promise<string> {
  const buffer = existingBuffer || Buffer.from(await file.arrayBuffer());
  const safeFileName = file.name.replace(/[^a-zA-Z0-9-_\.]/g, "_");

  const { url } = await put(`uploads/${Date.now()}-${safeFileName}`, buffer, {
    access: "public",
    contentType: file.type,
  });

  return url;
}

/**
 * Upload file to storage with error handling
 * Returns URL or error response
 */
export async function uploadFileToStorageWithErrorHandling(
  file: File,
  buffer: Buffer,
  uploadFileToStorage: (file: File, buffer?: Buffer) => Promise<string>
): Promise<{ url: string; error: string | null }> {
  let url;
  try {
    // console.log("📤 Starting file upload to storage...");
    url = await uploadFileToStorage(file, buffer);
    // console.log("✅ File uploaded successfully to:", url);
    return { url, error: null };
  } catch (uploadError) {
    console.error("❌ Upload error:", uploadError);
    return {
      url: "",
      error: uploadError instanceof Error ? uploadError.message : String(uploadError),
    };
  }
}
