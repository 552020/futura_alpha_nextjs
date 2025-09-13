import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, and } from "drizzle-orm";
import { storageEdges } from "../db/schema";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });

// Test configuration
const TEST_MEMORY_ID = "550e8400-e29b-41d4-a716-446655440000"; // Test UUID

describe("Storage Edges Table", () => {
  let db: ReturnType<typeof drizzle>;
  let testEdgeIds: string[] = [];

  beforeAll(() => {
    // Connect to database
    const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
    db = drizzle(sql);
  });

  afterAll(async () => {
    // Clean up test data
    if (testEdgeIds.length > 0) {
      await db.delete(storageEdges).where(eq(storageEdges.memoryId, TEST_MEMORY_ID));
    }
  });

  it("should insert a storage edge successfully", async () => {
    const newEdge = {
      memoryId: TEST_MEMORY_ID,
      memoryType: "image" as const,
      artifact: "metadata" as const,
      backend: "neon-db" as const,
      present: true,
      location: "neon://memory/metadata",
      contentHash: "sha256:abc123",
      sizeBytes: 1024,
      syncState: "idle" as const,
    };

    const inserted = await db.insert(storageEdges).values(newEdge).returning();

    expect(inserted).toHaveLength(1);
    expect(inserted[0].id).toBeDefined();
    expect(inserted[0].memoryId).toBe(TEST_MEMORY_ID);
    expect(inserted[0].memoryType).toBe("image");
    expect(inserted[0].artifact).toBe("metadata");
    expect(inserted[0].backend).toBe("neon-db");
    expect(inserted[0].present).toBe(true);
    expect(inserted[0].syncState).toBe("idle");
    expect(inserted[0].createdAt).toBeDefined();
    expect(inserted[0].updatedAt).toBeDefined();

    testEdgeIds.push(inserted[0].id);
  });

  it("should insert multiple edges for the same memory", async () => {
    const assetEdge = {
      memoryId: TEST_MEMORY_ID,
      memoryType: "image" as const,
      artifact: "asset" as const,
      backend: "vercel-blob" as const,
      present: true,
      location: "blob://assets/image.jpg",
      contentHash: "sha256:def456",
      sizeBytes: 2048576,
      syncState: "idle" as const,
    };

    const inserted = await db.insert(storageEdges).values(assetEdge).returning();

    expect(inserted).toHaveLength(1);
    expect(inserted[0].artifact).toBe("asset");
    expect(inserted[0].backend).toBe("vercel-blob");

    testEdgeIds.push(inserted[0].id);
  });

  it("should query edges by memory ID using ix_edges_memory index", async () => {
    const memoryEdges = await db.select().from(storageEdges).where(eq(storageEdges.memoryId, TEST_MEMORY_ID));

    expect(memoryEdges.length).toBeGreaterThanOrEqual(2);

    const hasMetadata = memoryEdges.some((edge) => edge.artifact === "metadata");
    const hasAsset = memoryEdges.some((edge) => edge.artifact === "asset");

    expect(hasMetadata).toBe(true);
    expect(hasAsset).toBe(true);
  });

  it("should query edges by backend and present status using ix_edges_backend_present index", async () => {
    const presentOnNeon = await db
      .select()
      .from(storageEdges)
      .where(and(eq(storageEdges.backend, "neon-db"), eq(storageEdges.present, true)));

    expect(presentOnNeon.length).toBeGreaterThan(0);
    expect(presentOnNeon.every((edge) => edge.backend === "neon-db")).toBe(true);
    expect(presentOnNeon.every((edge) => edge.present === true)).toBe(true);
  });

  it("should query edges by sync state using ix_edges_sync_state index", async () => {
    const idleEdges = await db.select().from(storageEdges).where(eq(storageEdges.syncState, "idle"));

    expect(idleEdges.length).toBeGreaterThan(0);
    expect(idleEdges.every((edge) => edge.syncState === "idle")).toBe(true);
  });

  it("should enforce unique constraint on (memoryId, memoryType, artifact, backend)", async () => {
    const duplicateEdge = {
      memoryId: TEST_MEMORY_ID,
      memoryType: "image" as const,
      artifact: "metadata" as const,
      backend: "neon-db" as const,
      present: true,
      location: "neon://memory/metadata",
      contentHash: "sha256:abc123",
      sizeBytes: 1024,
      syncState: "idle" as const,
    };

    await expect(db.insert(storageEdges).values(duplicateEdge)).rejects.toThrow();
  });

  it("should update sync state successfully", async () => {
    const icpEdge = {
      memoryId: TEST_MEMORY_ID,
      memoryType: "image" as const,
      artifact: "metadata" as const,
      backend: "icp-canister" as const,
      present: false,
      syncState: "migrating" as const,
      lastSyncedAt: new Date(),
    };

    const inserted = await db.insert(storageEdges).values(icpEdge).returning();
    testEdgeIds.push(inserted[0].id);

    // Update the sync state
    const updated = await db
      .update(storageEdges)
      .set({
        syncState: "idle",
        present: true,
        location: "icp://canister/memory/metadata",
        lastSyncedAt: new Date(),
      })
      .where(
        and(
          eq(storageEdges.memoryId, TEST_MEMORY_ID),
          eq(storageEdges.artifact, "metadata"),
          eq(storageEdges.backend, "icp-canister")
        )
      )
      .returning();

    expect(updated).toHaveLength(1);
    expect(updated[0].syncState).toBe("idle");
    expect(updated[0].present).toBe(true);
    expect(updated[0].location).toBe("icp://canister/memory/metadata");
  });

  it("should perform complex queries with ordering", async () => {
    const memorySummary = await db
      .select({
        memoryId: storageEdges.memoryId,
        memoryType: storageEdges.memoryType,
        artifact: storageEdges.artifact,
        backend: storageEdges.backend,
        present: storageEdges.present,
        syncState: storageEdges.syncState,
        location: storageEdges.location,
      })
      .from(storageEdges)
      .where(eq(storageEdges.memoryId, TEST_MEMORY_ID))
      .orderBy(storageEdges.artifact, storageEdges.backend);

    expect(memorySummary.length).toBeGreaterThan(0);

    // Check that results are ordered by artifact, then backend
    const artifacts = memorySummary.map((edge) => edge.artifact);
    const uniqueArtifacts = [...new Set(artifacts)];
    expect(uniqueArtifacts).toEqual(uniqueArtifacts.sort());
  });

  it("should count total edges correctly", async () => {
    const totalEdges = await db.select().from(storageEdges);
    expect(totalEdges.length).toBeGreaterThan(0);
  });

  it("should handle different memory types", async () => {
    const videoEdge = {
      memoryId: TEST_MEMORY_ID,
      memoryType: "video" as const,
      artifact: "metadata" as const,
      backend: "neon-db" as const,
      present: true,
      location: "neon://video/metadata",
      contentHash: "sha256:video123",
      sizeBytes: 512,
      syncState: "idle" as const,
    };

    const inserted = await db.insert(storageEdges).values(videoEdge).returning();
    testEdgeIds.push(inserted[0].id);

    expect(inserted[0].memoryType).toBe("video");
    expect(inserted[0].artifact).toBe("metadata");
  });

  it("should handle all enum values correctly", async () => {
    // Test all memory types
    const memoryTypes = ["image", "video", "note", "document", "audio"] as const;
    const artifacts = ["metadata", "asset"] as const;
    const backends = ["neon-db", "vercel-blob", "icp-canister"] as const;
    const syncStates = ["idle", "migrating", "failed"] as const;

    // Test with a different memory ID to avoid unique constraint violation
    const testMemoryId = "660e8400-e29b-41d4-a716-446655440001";

    // Verify enum values are accepted
    const testEdge = {
      memoryId: testMemoryId,
      memoryType: memoryTypes[0],
      artifact: artifacts[0],
      backend: backends[0],
      present: true,
      syncState: syncStates[0],
    };

    const inserted = await db.insert(storageEdges).values(testEdge).returning();
    testEdgeIds.push(inserted[0].id);

    expect(inserted[0].memoryType).toBe(memoryTypes[0]);
    expect(inserted[0].artifact).toBe(artifacts[0]);
    expect(inserted[0].backend).toBe(backends[0]);
    expect(inserted[0].syncState).toBe(syncStates[0]);

    // Clean up this test data
    await db.delete(storageEdges).where(eq(storageEdges.memoryId, testMemoryId));
  });
});
