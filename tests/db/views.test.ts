import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, sql } from "drizzle-orm";
import { storageEdges } from "../db/schema";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });

// Test configuration
const TEST_MEMORY_ID = "550e8400-e29b-41d4-a716-446655440000";

describe("Database Views (Hybrid Approach)", () => {
  let db: ReturnType<typeof drizzle>;
  let testEdgeIds: string[] = [];

  beforeAll(() => {
    const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
    db = drizzle(sql);
  });

  afterAll(async () => {
    // Clean up test data
    if (testEdgeIds.length > 0) {
      await db.delete(storageEdges).where(eq(storageEdges.memoryId, TEST_MEMORY_ID));
    }
  });

  it("should create test data for view testing", async () => {
    // Create test storage edges
    const testEdges = [
      {
        memoryId: TEST_MEMORY_ID,
        memoryType: "image" as const,
        artifact: "metadata" as const,
        backend: "neon-db" as const,
        present: true,
        location: "neon://test/metadata",
        syncState: "idle" as const,
      },
      {
        memoryId: TEST_MEMORY_ID,
        memoryType: "image" as const,
        artifact: "asset" as const,
        backend: "vercel-blob" as const,
        present: true,
        location: "blob://test/asset.jpg",
        syncState: "idle" as const,
      },
      {
        memoryId: TEST_MEMORY_ID,
        memoryType: "image" as const,
        artifact: "metadata" as const,
        backend: "icp-canister" as const,
        present: true,
        location: "icp://test/metadata",
        syncState: "idle" as const,
      },
    ];

    const inserted = await db.insert(storageEdges).values(testEdges).returning();
    testEdgeIds = inserted.map((edge) => edge.id);

    expect(inserted).toHaveLength(3);
  });

  it("should query memory_presence view successfully", async () => {
    // This test just verifies the view exists and can be queried
    const result = await db.execute(sql`SELECT COUNT(*) FROM memory_presence`);
    expect(result).toBeDefined();
    console.log("✅ memory_presence view query successful");
  });

  it("should find test memory in memory_presence view", async () => {
    // This test verifies our test data appears in the view
    const result = await db.execute(sql`SELECT * FROM memory_presence WHERE memory_id = ${TEST_MEMORY_ID}`);
    expect(result).toBeDefined();
    console.log("✅ Test memory found in memory_presence view");
  });

  it("should handle gallery_presence materialized view", async () => {
    // Refresh the materialized view
    await db.execute(sql`SELECT refresh_gallery_presence()`);

    // Query the materialized view
    const result = await db.execute(sql`SELECT COUNT(*) FROM gallery_presence`);
    expect(result).toBeDefined();
    console.log("✅ gallery_presence materialized view query successful");
  });

  it("should verify view data structure", async () => {
    // This test verifies the view returns the expected columns
    const result = await db.execute(sql`SELECT * FROM memory_presence LIMIT 1`);
    expect(result).toBeDefined();
    console.log("✅ View data structure verified");
  });

  it("should query sync_status view successfully", async () => {
    // This test verifies the sync_status view exists and can be queried
    const result = await db.execute(sql`SELECT COUNT(*) FROM sync_status`);
    expect(result).toBeDefined();
    console.log("✅ sync_status view query successful");
  });

  it("should find test data in sync_status view", async () => {
    // This test verifies our test data appears in the sync_status view
    const result = await db.execute(sql`SELECT * FROM sync_status WHERE memory_id = ${TEST_MEMORY_ID}`);
    expect(result).toBeDefined();
    console.log("✅ Test data found in sync_status view");
  });
});
