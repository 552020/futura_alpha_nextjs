import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/db";
import { eq } from "drizzle-orm";
import { allUsers, memories, memoryAssets } from "@/db/schema";
import { NewDBMemory, NewDBMemoryAsset } from "@/db/schema";
import { randomUUID } from "crypto";

// POST /api/memories/batch - Create multiple memories with assets
export async function POST(request: NextRequest) {
  // Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get the allUserId for the authenticated user
    const allUserRecord = await db.query.allUsers.findFirst({
      where: eq(allUsers.userId, session.user.id),
    });

    if (!allUserRecord) {
      console.error("No allUsers record found for user:", session.user.id);
      return NextResponse.json({ error: "User record not found" }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { memories: memoriesData } = body;

    if (!memoriesData || !Array.isArray(memoriesData)) {
      return NextResponse.json(
        {
          error: "Missing or invalid memories array",
        },
        { status: 400 }
      );
    }

    if (memoriesData.length === 0) {
      return NextResponse.json(
        {
          error: "Memories array cannot be empty",
        },
        { status: 400 }
      );
    }

    // Validate each memory
    for (const memoryData of memoriesData) {
      if (!memoryData.type || !memoryData.title) {
        return NextResponse.json(
          {
            error: "Each memory must have type and title",
          },
          { status: 400 }
        );
      }

      // Validate memory type
      if (!["image", "video", "document", "note", "audio"].includes(memoryData.type)) {
        return NextResponse.json(
          {
            error: `Invalid memory type: ${memoryData.type}. Must be one of: image, video, document, note, audio`,
          },
          { status: 400 }
        );
      }

      // Validate assets if provided
      if (memoryData.assets && Array.isArray(memoryData.assets)) {
        for (const asset of memoryData.assets) {
          if (!asset.assetType || !asset.url || !asset.storageBackend) {
            return NextResponse.json(
              {
                error: "Each asset must have assetType, url, and storageBackend",
              },
              { status: 400 }
            );
          }

          // Validate asset type
          if (!["original", "display", "thumb", "placeholder", "poster", "waveform"].includes(asset.assetType)) {
            return NextResponse.json(
              {
                error: `Invalid asset type: ${asset.assetType}. Must be one of: original, display, thumb, placeholder, poster, waveform`,
              },
              { status: 400 }
            );
          }

          // Validate storage backend
          if (!["vercel_blob", "s3", "icp", "arweave", "ipfs", "neon"].includes(asset.storageBackend)) {
            return NextResponse.json(
              {
                error: `Invalid storage backend: ${asset.storageBackend}. Must be one of: vercel_blob, s3, icp, arweave, ipfs, neon`,
              },
              { status: 400 }
            );
          }
        }
      }
    }

    const startTime = Date.now();
    const createdMemories = [];
    let totalAssets = 0;

    // Process each memory
    for (const memoryData of memoriesData) {
      // Create memory
      const newMemory: NewDBMemory = {
        ownerId: allUserRecord.id,
        type: memoryData.type as "image" | "video" | "document" | "note" | "audio",
        title: memoryData.title,
        description: memoryData.description || "",
        fileCreatedAt: memoryData.takenAt ? new Date(memoryData.takenAt) : new Date(),
        isPublic: memoryData.isPublic || false,
        parentFolderId: memoryData.parentFolderId || null,
        ownerSecureCode: randomUUID(),
      };

      const [createdMemory] = await db.insert(memories).values(newMemory).returning();

      // Process assets if provided
      const createdAssets = [];
      if (memoryData.assets && Array.isArray(memoryData.assets)) {
        for (const asset of memoryData.assets) {
          const newAsset: NewDBMemoryAsset = {
            memoryId: createdMemory.id,
            assetType: asset.assetType as "original" | "display" | "thumb" | "placeholder" | "poster" | "waveform",
            variant: asset.variant || "default",
            url: asset.url,
            storageBackend: asset.storageBackend as "vercel_blob" | "s3" | "icp" | "arweave" | "ipfs" | "neon",
            storageKey: asset.storageKey || null,
            bytes: typeof asset.bytes === "bigint" ? asset.bytes : BigInt(asset.bytes || 0),
            width: asset.width || null,
            height: asset.height || null,
            mimeType: asset.mimeType || null,
            sha256: asset.sha256 || null,
            processingStatus: asset.processingStatus || "completed",
            processingError: asset.processingError || null,
          };

          const [createdAsset] = await db.insert(memoryAssets).values(newAsset).returning();
          createdAssets.push(createdAsset);
          totalAssets++;
        }
      }

      createdMemories.push({
        ...createdMemory,
        assets: createdAssets,
      });
    }

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);

    return NextResponse.json({
      success: true,
      data: {
        memories: createdMemories,
        summary: {
          totalMemories: createdMemories.length,
          totalAssets,
          processingTime: `${processingTime}s`,
        },
      },
    });
  } catch (error) {
    console.error("Error creating batch memories:", error);
    return NextResponse.json({ error: "Failed to create batch memories" }, { status: 500 });
  }
}
