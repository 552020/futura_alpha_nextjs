#!/usr/bin/env tsx

/**
 * Script to add storage backend constraints to the database
 *
 * This script adds the CHECK constraint that ensures at least one storage backend
 * is enabled for each user. This constraint is required because Drizzle ORM
 * doesn't properly handle CHECK constraints in its migration system.
 *
 * Usage:
 *   npx tsx scripts/add-storage-constraints.ts
 */

import { db } from '../src/db/db';
import { sql } from 'drizzle-orm';

async function addStorageConstraints() {
  try {
    console.log('🔧 Adding storage backend constraints...');

    // Add the constraint to ensure at least one backend is enabled
    await db.execute(sql`
      ALTER TABLE "user" ADD CONSTRAINT check_storage_backends 
      CHECK (storage_icp_enabled OR storage_neon_enabled)
    `);

    console.log('✅ Storage backend constraint added successfully!');
    console.log('   - Prevents both ICP and Neon backends from being disabled');
    console.log('   - Enforces business rule at database level');
  } catch (error: any) {
    const errorMessage = error.message || '';
    const causeMessage = error.cause?.message || '';
    const fullMessage = `${errorMessage} ${causeMessage}`;

    if (fullMessage.includes('already exists') || fullMessage.includes('duplicate key')) {
      console.log('✅ Storage backend constraint already exists!');
    } else {
      console.error('❌ Failed to add storage backend constraint:', error.message);
      console.error('Cause:', error.cause?.message);
      process.exit(1);
    }
  }
}

async function verifyConstraints() {
  try {
    console.log('🔍 Verifying constraints...');

    // Query to check if constraint exists
    const result = await db.execute(sql`
      SELECT constraint_name, constraint_type 
      FROM information_schema.table_constraints 
      WHERE table_name = 'user' 
      AND constraint_name = 'check_storage_backends'
    `);

    if (result.rows.length > 0) {
      console.log('✅ Constraint verification successful!');
      console.log(`   - Found constraint: ${result.rows[0].constraint_name}`);
    } else {
      console.log('⚠️  Constraint not found in database');
    }
  } catch (error: any) {
    console.error('❌ Failed to verify constraints:', error.message);
  }
}

async function main() {
  console.log('🚀 Storage Backend Constraints Setup');
  console.log('=====================================');

  await addStorageConstraints();
  await verifyConstraints();

  console.log('\n✨ Setup complete!');
  console.log('\nNext steps:');
  console.log('1. Run tests: npm run test tests/db/storage-constraints.test.ts');
  console.log('2. Verify constraint behavior in your application');
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

export { addStorageConstraints, verifyConstraints };
