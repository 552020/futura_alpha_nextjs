/**
 * BATCH MEMORY UPLOAD API ENDPOINT
 *
 * This endpoint handles batch creation of memories with multiple assets.
 * It supports creating multiple memories with their assets in a single request.
 *
 * USAGE:
 * - POST /api/memories/batch - Create multiple memories with assets
 *
 * REQUEST FORMAT:
 * {
 *   "memories": [
 *     {
 *       "type": "image",
 *       "title": "Beach Photo 1",
 *       "description": "Sunset at the beach",
 *       "fileCreatedAt": "2024-01-15T16:30:00Z",
 *       "isPublic": false,
 *       "parentFolderId": "folder_123",
 *       "assets": [
 *         {
 *           "assetType": "original",
 *           "url": "https://blob.vercel-storage.com/beach1.jpg",
 *           "bytes": 20971520,
 *           "width": 6000,
 *           "height": 4000,
 *           "mimeType": "image/jpeg",
 *           "storageBackend": "vercel_blob",
 *           "storageKey": "beach1.jpg"
 *         },
 *         {
 *           "assetType": "display",
 *           "url": "https://blob.vercel-storage.com/beach1_display.webp",
 *           "bytes": 280314,
 *           "width": 2048,
 *           "height": 1365,
 *           "mimeType": "image/webp",
 *           "storageBackend": "vercel_blob",
 *           "storageKey": "beach1_display.webp"
 *         }
 *       ]
 *     }
 *   ]
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/db";
import { memories, memoryAssets } from "@/db/schema";
import { randomUUID } from "crypto";
import { getAllUserId } from "../utils/memory-creation";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    // Get the allUserId for the authenticated user
    const { allUserId, error } = await getAllUserId(request);
    if (error) {
      return error;
    }

    // Parse request body
    const body = await request.json();
    const { memories: memoriesData } = body;

    if (!memoriesData || !Array.isArray(memoriesData)) {
      return NextResponse.json({ error: "Invalid request: memories array is required" }, { status: 400 });
    }

    if (memoriesData.length === 0) {
      return NextResponse.json({ error: "Invalid request: memories array cannot be empty" }, { status: 400 });
    }

    console.log(`🚀 Starting batch upload for ${memoriesData.length} memories...`);

    const successfulMemories: unknown[] = [];
    const failedMemories: Array<{ index: number; error: string }> = [];

    // Process each memory
    for (let i = 0; i < memoriesData.length; i++) {
      const memoryData = memoriesData[i];

      try {
        // Validate memory data
        if (!memoryData.type || !memoryData.title) {
          throw new Error("Missing required fields: type and title are required");
        }

        if (!["image", "video", "document", "note", "audio"].includes(memoryData.type)) {
          throw new Error(`Invalid memory type: ${memoryData.type}`);
        }

        // Validate assets if provided
        if (memoryData.assets && Array.isArray(memoryData.assets)) {
          for (const asset of memoryData.assets) {
            if (!asset.assetType || !asset.url || !asset.bytes || !asset.mimeType) {
              throw new Error("Invalid asset: assetType, url, bytes, and mimeType are required");
            }

            if (!["original", "display", "thumb", "placeholder", "poster", "waveform"].includes(asset.assetType)) {
              throw new Error(`Invalid assetType: ${asset.assetType}`);
            }
          }
        }

        // Create memory
        const newMemory = {
          ownerId: allUserId,
          type: memoryData.type as "image" | "video" | "document" | "note" | "audio",
          title: memoryData.title,
          description: memoryData.description || "",
          fileCreatedAt: memoryData.fileCreatedAt ? new Date(memoryData.fileCreatedAt) : new Date(),
          isPublic: memoryData.isPublic || false,
          ownerSecureCode: randomUUID(),
          parentFolderId: memoryData.parentFolderId || null,
          tags: memoryData.tags || [],
          recipients: memoryData.recipients || [],
          unlockDate: memoryData.unlockDate ? new Date(memoryData.unlockDate) : null,
          metadata: memoryData.metadata || {},
        };

        const [createdMemory] = await db.insert(memories).values(newMemory).returning();
        console.log(`✅ Memory created: ${createdMemory.id}`);

        // Create assets if provided
        let createdAssets: unknown[] = [];
        if (memoryData.assets && memoryData.assets.length > 0) {
          const assetData = memoryData.assets.map(
            (asset: {
              assetType: string;
              variant?: string;
              url: string;
              storageBackend?: string;
              storageKey?: string;
              bytes: number;
              width?: number;
              height?: number;
              mimeType: string;
              sha256?: string;
              processingStatus?: string;
              processingError?: string;
            }) => ({
              memoryId: createdMemory.id,
              assetType: asset.assetType as "original" | "display" | "thumb" | "placeholder" | "poster" | "waveform",
              variant: asset.variant || null,
              url: asset.url,
              storageBackend: asset.storageBackend || "vercel_blob",
              storageKey: asset.storageKey || asset.url.split("/").pop() || "",
              bytes: asset.bytes,
              width: asset.width || null,
              height: asset.height || null,
              mimeType: asset.mimeType,
              sha256: asset.sha256 || null,
              processingStatus: asset.processingStatus || "completed",
              processingError: asset.processingError || null,
            })
          );

          createdAssets = await db.insert(memoryAssets).values(assetData).returning();
          console.log(`✅ Created ${createdAssets.length} assets for memory ${createdMemory.id}`);
        }

        successfulMemories.push({
          id: createdMemory.id,
          type: createdMemory.type,
          title: createdMemory.title,
          description: createdMemory.description,
          fileCreatedAt: createdMemory.fileCreatedAt,
          isPublic: createdMemory.isPublic,
          parentFolderId: createdMemory.parentFolderId,
          tags: createdMemory.tags,
          recipients: createdMemory.recipients,
          unlockDate: createdMemory.unlockDate,
          metadata: createdMemory.metadata,
          createdAt: createdMemory.createdAt,
          assets: createdAssets,
        });

        console.log(`✅ Successfully processed memory ${i + 1}/${memoriesData.length}`);
      } catch (error) {
        console.error(`❌ Error processing memory ${i + 1}:`, error);
        failedMemories.push({
          index: i,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const duration = Date.now() - startTime;
    const totalAssets = successfulMemories.reduce(
      (sum: number, memory) => sum + ((memory as { assets?: unknown[] }).assets?.length || 0),
      0
    );

    console.log(`✅ Batch upload completed in ${duration}ms`);
    console.log(`📊 Results: ${successfulMemories.length} successful, ${failedMemories.length} failed`);

    return NextResponse.json({
      success: true,
      data: {
        memories: successfulMemories,
        summary: {
          totalMemories: memoriesData.length,
          successfulMemories: successfulMemories.length,
          failedMemories: failedMemories.length,
          totalAssets,
          processingTime: `${duration}ms`,
        },
        errors: failedMemories.length > 0 ? failedMemories : undefined,
      },
    });
  } catch (error) {
    console.error("Error in batch upload:", error);
    return NextResponse.json({ error: "Failed to process batch upload" }, { status: 500 });
  }
}
