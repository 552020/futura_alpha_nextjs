#!/usr/bin/env tsx

/**
 * CI Script to verify database constraints exist
 *
 * This script checks that required database constraints are present.
 * It's designed to be run in CI/CD pipelines to ensure database integrity.
 *
 * Usage:
 *   npx tsx scripts/verify-constraints.ts
 *
 * Exit codes:
 *   0 - All constraints verified successfully
 *   1 - One or more constraints missing
 */

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });

interface ConstraintCheck {
  name: string;
  table: string;
  description: string;
}

const REQUIRED_CONSTRAINTS: ConstraintCheck[] = [
  {
    name: "check_storage_backends",
    table: "user",
    description: "Ensures at least one storage backend is enabled for each user",
  },
];

async function verifyConstraints() {
  const sqlClient = neon(process.env.DATABASE_URL_UNPOOLED!);
  const db = drizzle(sqlClient);

  console.log("🔍 Verifying database constraints...");
  console.log("=====================================");

  let allConstraintsPresent = true;

  for (const constraint of REQUIRED_CONSTRAINTS) {
    try {
      const result = await db.execute(sql`
        SELECT c.conname, t.relname
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        WHERE t.relname = ${constraint.table}
          AND c.conname = ${constraint.name}
      `);

      if (result.rows.length > 0) {
        console.log(`✅ ${constraint.name} - ${constraint.description}`);
      } else {
        console.log(`❌ ${constraint.name} - MISSING`);
        console.log(`   Table: ${constraint.table}`);
        console.log(`   Description: ${constraint.description}`);
        allConstraintsPresent = false;
      }
    } catch (error: any) {
      console.error(`❌ Error checking constraint ${constraint.name}:`, error.message);
      allConstraintsPresent = false;
    }
  }

  console.log("\n" + "=".repeat(40));

  if (allConstraintsPresent) {
    console.log("✅ All required constraints are present!");
    console.log("Database integrity verified.");
    return 0;
  } else {
    console.log("❌ One or more required constraints are missing!");
    console.log("Run the appropriate migration scripts to add missing constraints.");
    return 1;
  }
}

// Run the verification
if (require.main === module) {
  verifyConstraints()
    .then((exitCode) => {
      process.exit(exitCode);
    })
    .catch((error) => {
      console.error("❌ Constraint verification failed:", error);
      process.exit(1);
    });
}

export { verifyConstraints, REQUIRED_CONSTRAINTS };



