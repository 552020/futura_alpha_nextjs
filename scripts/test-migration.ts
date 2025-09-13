#!/usr/bin/env tsx

/**
 * Test script for the idempotent migration
 *
 * This script tests that the migration can be run multiple times safely.
 */

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { config } from "dotenv";
import { readFileSync } from "fs";
import { join } from "path";

// Load environment variables
config({ path: ".env.local" });

async function testMigration() {
  const sqlClient = neon(process.env.DATABASE_URL_UNPOOLED!);
  const db = drizzle(sqlClient);

  console.log("🧪 Testing idempotent migration...");
  console.log("==================================");

  try {
    // Read the migration file
    const migrationPath = join(process.cwd(), "src/db/migrations/0023_add_storage_backends_constraint.sql");
    const migrationSQL = readFileSync(migrationPath, "utf8");

    console.log("📄 Running migration SQL...");
    console.log("Migration content:");
    console.log(migrationSQL);
    console.log("\n" + "=".repeat(50));

    // Execute the migration
    await db.execute(sql.raw(migrationSQL));

    console.log("✅ Migration executed successfully!");

    // Verify the constraint exists
    const result = await db.execute(sql`
      SELECT c.conname, t.relname
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      WHERE t.relname = 'user'
        AND c.conname = 'check_storage_backends'
    `);

    if (result.rows.length > 0) {
      console.log("✅ Constraint verification successful!");
      console.log(`   Found constraint: ${result.rows[0].conname} on table: ${result.rows[0].relname}`);
    } else {
      console.log("❌ Constraint not found after migration!");
    }

    console.log("\n🔄 Testing idempotency (running migration again)...");

    // Run the migration again to test idempotency
    await db.execute(sql.raw(migrationSQL));
    console.log("✅ Migration is idempotent - can be run multiple times safely!");
  } catch (error: any) {
    console.error("❌ Migration test failed:", error.message);
    if (error.cause) {
      console.error("Cause:", error.cause.message);
    }
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testMigration();
}

export { testMigration };



