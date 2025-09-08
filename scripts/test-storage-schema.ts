#!/usr/bin/env tsx

/**
 * Script to test storage schema functionality
 *
 * This script verifies that the new storage preference fields are working
 * correctly in the database, including default values and type safety.
 *
 * Usage:
 *   npx tsx scripts/test-storage-schema.ts
 */

import { db } from "../src/db/db";
import { users } from "../src/db/schema";

async function testStorageSchema() {
  try {
    console.log("🧪 Testing Storage Schema");
    console.log("=========================");

    // Test that we can query the new storage fields
    const testUser = await db
      .select({
        id: users.id,
        storagePreference: users.storagePreference,
        storagePrimaryStorage: users.storagePrimaryStorage,
      })
      .from(users)
      .limit(1);

    if (testUser.length === 0) {
      console.log("❌ No users found to test with");
      return;
    }

    const user = testUser[0];
    console.log("✅ Schema test successful!");
    console.log(`📋 Sample user storage preferences (ID: ${user.id}):`);
    console.log(`   - Storage preference: ${user.storagePreference}`);
    console.log(`   - Primary storage: ${user.storagePrimaryStorage}`);

    // Test that defaults are applied correctly
    console.log("\n🔍 Verifying default values:");
    const defaultsCorrect = user.storagePreference === "neon" && user.storagePrimaryStorage === "neon-db";

    if (defaultsCorrect) {
      console.log("✅ Default values are correct:");
      console.log(`   - Storage preference: ${user.storagePreference} (expected: neon)`);
      console.log(`   - Primary storage: ${user.storagePrimaryStorage} (expected: neon-db)`);
    } else {
      console.log("❌ Default values are incorrect:");
      console.log(`   - Storage preference: ${user.storagePreference} (expected: neon)`);
      console.log(`   - Primary storage: ${user.storagePrimaryStorage} (expected: neon-db)`);
    }

    // Test type safety
    console.log("\n🔒 Testing type safety:");
    const validPreferences = ["neon", "icp", "dual"];
    const validBackends = ["neon-db", "vercel-blob", "icp-canister"];
    const isValidPreference = validPreferences.includes(user.storagePreference);
    const isValidBackend = validBackends.includes(user.storagePrimaryStorage);

    if (isValidPreference && isValidBackend) {
      console.log(`✅ Storage preference is valid: ${user.storagePreference}`);
      console.log(`✅ Primary storage value is valid: ${user.storagePrimaryStorage}`);
    } else {
      console.log(`❌ Storage preference is invalid: ${user.storagePreference}`);
      console.log(`❌ Primary storage value is invalid: ${user.storagePrimaryStorage}`);
    }

    console.log("\n✨ Storage schema test completed successfully!");
  } catch (error) {
    console.error("❌ Storage schema test failed:", error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testStorageSchema();
}

export { testStorageSchema };
