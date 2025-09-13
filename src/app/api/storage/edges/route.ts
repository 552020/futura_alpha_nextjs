import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { storageEdges } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { memoryId, memoryType, artifact, backend, present, location, contentHash, sizeBytes, syncState, syncError } =
      body;

    // Validate required fields
    if (!memoryId || !memoryType || !artifact || !backend) {
      return NextResponse.json(
        { error: "Missing required fields: memoryId, memoryType, artifact, backend" },
        { status: 400 }
      );
    }

    // Validate enum values
    const validMemoryTypes = ["image", "video", "note", "document", "audio"];
    const validArtifacts = ["metadata", "asset"];
    const validBackends = ["neon-db", "vercel-blob", "icp-canister"];
    const validSyncStates = ["idle", "migrating", "failed"];

    if (!validMemoryTypes.includes(memoryType)) {
      return NextResponse.json(
        { error: `Invalid memoryType. Must be one of: ${validMemoryTypes.join(", ")}` },
        { status: 400 }
      );
    }

    if (!validArtifacts.includes(artifact)) {
      return NextResponse.json(
        { error: `Invalid artifact. Must be one of: ${validArtifacts.join(", ")}` },
        { status: 400 }
      );
    }

    if (!validBackends.includes(backend)) {
      return NextResponse.json(
        { error: `Invalid backend. Must be one of: ${validBackends.join(", ")}` },
        { status: 400 }
      );
    }

    if (syncState && !validSyncStates.includes(syncState)) {
      return NextResponse.json(
        { error: `Invalid syncState. Must be one of: ${validSyncStates.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate UUID format for memoryId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(memoryId)) {
      return NextResponse.json({ error: "Invalid memoryId format. Must be a valid UUID" }, { status: 400 });
    }

    // Prepare the data for upsert
    const edgeData = {
      memoryId,
      memoryType: memoryType as "image" | "video" | "note" | "document" | "audio",
      artifact: artifact as "metadata" | "asset",
      backend: backend as "neon-db" | "vercel-blob" | "icp-canister",
      present: present ?? false,
      location,
      contentHash,
      sizeBytes: sizeBytes ? Number(sizeBytes) : undefined,
      syncState: (syncState as "idle" | "migrating" | "failed") ?? "idle",
      syncError,
      updatedAt: new Date(),
    };

    // Upsert the storage edge
    const result = await db
      .insert(storageEdges)
      .values(edgeData)
      .onConflictDoUpdate({
        target: [storageEdges.memoryId, storageEdges.memoryType, storageEdges.artifact, storageEdges.backend],
        set: {
          present: present ?? false,
          location,
          contentHash,
          sizeBytes: sizeBytes ? Number(sizeBytes) : undefined,
          syncState: (syncState as "idle" | "migrating" | "failed") ?? "idle",
          syncError,
          lastSyncedAt: syncState === "idle" ? new Date() : undefined,
          updatedAt: new Date(),
        },
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: result[0],
    });
  } catch (error) {
    console.error("Error upserting storage edge:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memoryId = searchParams.get("memoryId");
    const memoryType = searchParams.get("memoryType");
    const backend = searchParams.get("backend");
    const artifact = searchParams.get("artifact");
    const syncState = searchParams.get("syncState");

    // Build conditions array
    const conditions = [];
    if (memoryId) {
      conditions.push(eq(storageEdges.memoryId, memoryId));
    }
    if (memoryType) {
      conditions.push(eq(storageEdges.memoryType, memoryType as "image" | "video" | "note" | "document" | "audio"));
    }
    if (backend) {
      conditions.push(eq(storageEdges.backend, backend as "neon-db" | "vercel-blob" | "icp-canister"));
    }
    if (artifact) {
      conditions.push(eq(storageEdges.artifact, artifact as "metadata" | "asset"));
    }
    if (syncState) {
      conditions.push(eq(storageEdges.syncState, syncState as "idle" | "migrating" | "failed"));
    }

    // Execute query with conditions
    const result =
      conditions.length > 0
        ? await db
            .select()
            .from(storageEdges)
            .where(and(...conditions))
        : await db.select().from(storageEdges);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error querying storage edges:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
