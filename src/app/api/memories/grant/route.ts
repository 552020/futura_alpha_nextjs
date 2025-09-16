import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { generateBlobFilename } from "@/lib/storage/blob-config";

/**
 * UPLOAD GRANT API
 *
 * Issues short-lived, scoped tokens for direct-to-blob uploads
 * This allows client-side uploads without exposing server secrets
 */

interface GrantRequest {
  filename: string;
  size: number;
  mimeType: string;
  checksum?: string;
}

interface GrantResponse {
  success: boolean;
  uploadUrl: string;
  token: string;
  expiresAt: string;
  maxSize: number;
  allowedMimeTypes: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: GrantRequest = await request.json();
    const { filename, size, mimeType, checksum } = body;

    // Validate request
    if (!filename || !size || !mimeType) {
      return NextResponse.json({ error: "Missing required fields: filename, size, mimeType" }, { status: 400 });
    }

    // Check file size limits (4MB for small files, 100MB for large files)
    const maxSize = size > 4 * 1024 * 1024 ? 100 * 1024 * 1024 : 4 * 1024 * 1024;
    if (size > maxSize) {
      return NextResponse.json({ error: `File too large. Max size: ${maxSize / (1024 * 1024)}MB` }, { status: 400 });
    }

    // Validate MIME type
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "application/pdf",
      "text/plain",
      "text/markdown",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedMimeTypes.includes(mimeType)) {
      return NextResponse.json({ error: `Unsupported file type: ${mimeType}` }, { status: 400 });
    }

    // Generate unique filename with timestamp
    const uniqueFilename = generateBlobFilename(filename);

    // Generate presigned URL for Vercel Blob
    const blob = await put(uniqueFilename, Buffer.alloc(0), {
      access: "public",
      contentType: mimeType,
    });

    // Create token payload (in a real implementation, this would be signed)
    const tokenPayload = {
      filename: uniqueFilename,
      originalFilename: filename,
      mimeType,
      size,
      checksum,
      expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour expiry
      userId: "temp", // TODO: Get from session/auth
    };

    const response: GrantResponse = {
      success: true,
      uploadUrl: blob.url,
      token: JSON.stringify(tokenPayload), // TODO: Sign this token
      expiresAt: new Date(tokenPayload.expiresAt).toISOString(),
      maxSize,
      allowedMimeTypes,
    };

    console.log(`✅ Upload grant issued for ${filename} (${size} bytes, ${mimeType})`);

    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ Upload grant failed:", error);
    return NextResponse.json({ error: "Failed to generate upload grant" }, { status: 500 });
  }
}
