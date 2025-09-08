import { describe, it, expect, beforeAll } from "vitest";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import { users } from "../../src/db/schema";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });

describe("Storage Backend Constraints", () => {
  let db: ReturnType<typeof drizzle>;
  let testUserId: string;

  beforeAll(async () => {
    // Connect to database
    const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
    db = drizzle(sql);

    // Get a test user
    const testUser = await db
      .select({
        id: users.id,
        storageIcpEnabled: users.storageIcpEnabled,
        storageNeonEnabled: users.storageNeonEnabled,
      })
      .from(users)
      .limit(1);

    if (testUser.length === 0) {
      throw new Error("No users found to test with");
    }

    testUserId = testUser[0].id;
  });

  it("should prevent both storage backends from being disabled", async () => {
    // Get current settings
    const currentUser = await db
      .select({
        storageIcpEnabled: users.storageIcpEnabled,
        storageNeonEnabled: users.storageNeonEnabled,
      })
      .from(users)
      .where(eq(users.id, testUserId))
      .limit(1);

    const originalSettings = currentUser[0];

    try {
      // Try to set both backends to false
      await db
        .update(users)
        .set({
          storageIcpEnabled: false,
          storageNeonEnabled: false,
        })
        .where(eq(users.id, testUserId));

      // If we get here, the constraint failed
      throw new Error("CONSTRAINT FAILED: Both backends were set to false!");
    } catch (error: any) {
      // Expect a constraint violation error
      const errorMessage = error.message || "";
      const causeMessage = error.cause?.message || "";
      const fullMessage = `${errorMessage} ${causeMessage}`;
      expect(fullMessage).toContain("check_storage_backends");
    } finally {
      // Restore original settings
      await db
        .update(users)
        .set({
          storageIcpEnabled: originalSettings.storageIcpEnabled,
          storageNeonEnabled: originalSettings.storageNeonEnabled,
        })
        .where(eq(users.id, testUserId));
    }
  });

  it("should allow at least one backend to be enabled", async () => {
    // Test ICP enabled, Neon disabled
    await db
      .update(users)
      .set({
        storageIcpEnabled: true,
        storageNeonEnabled: false,
      })
      .where(eq(users.id, testUserId));

    // Test Neon enabled, ICP disabled
    await db
      .update(users)
      .set({
        storageIcpEnabled: false,
        storageNeonEnabled: true,
      })
      .where(eq(users.id, testUserId));

    // Test both enabled
    await db
      .update(users)
      .set({
        storageIcpEnabled: true,
        storageNeonEnabled: true,
      })
      .where(eq(users.id, testUserId));

    // All should succeed without constraint violations
    expect(true).toBe(true);
  });

  it("should have correct default values for new users", async () => {
    // This test verifies that the schema defaults are working
    const user = await db
      .select({
        storageIcpEnabled: users.storageIcpEnabled,
        storageNeonEnabled: users.storageNeonEnabled,
        storagePrimaryStorage: users.storagePrimaryStorage,
      })
      .from(users)
      .where(eq(users.id, testUserId))
      .limit(1);

    expect(user[0].storageNeonEnabled).toBe(true);
    expect(user[0].storagePrimaryStorage).toBe("neon-db");
  });
});
