import { NextRequest, NextResponse } from "next/server";

/**
 * UPLOAD COMPLETION API
 *
 * Handles completion of direct-to-blob uploads
 * Validates the upload and creates memory record
 */

interface CompletionRequest {
  token: string;
  url: string;
  size: number;
  mimeType: string;
  checksum?: string;
  metadata?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    const body: CompletionRequest = await request.json();
    const { token, url, size, mimeType, checksum, metadata } = body;

    // Validate request
    if (!token || !url || !size || !mimeType) {
      return NextResponse.json({ error: "Missing required fields: token, url, size, mimeType" }, { status: 400 });
    }

    // Parse and validate token (in a real implementation, this would be verified)
    let tokenPayload;
    try {
      tokenPayload = JSON.parse(token);
    } catch {
      return NextResponse.json({ error: "Invalid token format" }, { status: 400 });
    }

    // Check token expiry
    if (Date.now() > tokenPayload.expiresAt) {
      return NextResponse.json({ error: "Upload token expired" }, { status: 400 });
    }

    // Validate upload matches token
    if (tokenPayload.size !== size || tokenPayload.mimeType !== mimeType) {
      return NextResponse.json({ error: "Upload does not match token parameters" }, { status: 400 });
    }

    // Create memory record using existing API
    const memoryData = {
      type: getMemoryTypeFromMimeType(mimeType),
      title: tokenPayload.originalFilename.split(".")[0] || "Untitled",
      description: "",
      fileCreatedAt: new Date().toISOString(),
      isPublic: false,
      isOnboarding: true, // TODO: Determine from context
      mode: "files",
      existingUserId: tokenPayload.userId,
      assets: [
        {
          assetType: "original",
          url: url,
          bytes: size,
          mimeType: mimeType,
          storageBackend: "vercel_blob",
          storageKey: tokenPayload.filename,
          sha256: checksum,
          variant: null,
          ...metadata,
        },
      ],
    };

    // Call the existing memory creation API
    const memoryResponse = await fetch(`${request.nextUrl.origin}/api/memories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(memoryData),
    });

    if (!memoryResponse.ok) {
      const errorData = await memoryResponse.json();
      throw new Error(errorData.error || "Failed to create memory record");
    }

    const memoryResult = await memoryResponse.json();

    console.log(`✅ Upload completed and memory created: ${memoryResult.data.id}`);

    return NextResponse.json({
      success: true,
      memory: memoryResult.data,
      message: "Upload completed successfully",
    });
  } catch (error) {
    console.error("❌ Upload completion failed:", error);
    return NextResponse.json({ error: "Failed to complete upload" }, { status: 500 });
  }
}

function getMemoryTypeFromMimeType(mimeType: string): "image" | "video" | "document" | "note" | "audio" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "document";
}
