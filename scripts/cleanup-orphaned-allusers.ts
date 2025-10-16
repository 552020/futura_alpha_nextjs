#!/usr/bin/env tsx

/**
 * Cleanup script to remove orphaned allUsers records
 *
 * This script finds and removes allUsers records that don't have corresponding
 * users or temporaryUsers records, which can cause database inconsistencies.
 */

import { db } from '../src/db/db';
import { allUsers, users, temporaryUsers, businessRelationships } from '../src/db/tables';
import { eq, isNull, and, or } from 'drizzle-orm';

async function cleanupOrphanedAllUsers() {
  console.log('🔍 Starting cleanup of orphaned allUsers records...\n');

  try {
    // Get all allUsers records
    const allAllUsers = await db.query.allUsers.findMany();
    console.log(`📊 Found ${allAllUsers.length} total allUsers records`);

    const orphanedRecords: typeof allAllUsers = [];
    const validRecords: typeof allAllUsers = [];

    // Check each allUsers record
    for (const allUser of allAllUsers) {
      let isValid = false;

      if (allUser.type === 'user' && allUser.userId) {
        // Check if corresponding user exists
        const user = await db.query.users.findFirst({
          where: eq(users.id, allUser.userId),
        });
        isValid = !!user;
      } else if (allUser.type === 'temporary' && allUser.temporaryUserId) {
        // Check if corresponding temporary user exists
        const tempUser = await db.query.temporaryUsers.findFirst({
          where: eq(temporaryUsers.id, allUser.temporaryUserId),
        });
        isValid = !!tempUser;
      } else {
        // Invalid record - no userId or temporaryUserId
        isValid = false;
      }

      if (isValid) {
        validRecords.push(allUser);
      } else {
        orphanedRecords.push(allUser);
      }
    }

    console.log(`✅ Valid records: ${validRecords.length}`);
    console.log(`❌ Orphaned records: ${orphanedRecords.length}`);

    if (orphanedRecords.length === 0) {
      console.log('🎉 No orphaned records found! Database is clean.');
      return;
    }

    // Show orphaned records details
    console.log('\n📋 Orphaned records details:');
    orphanedRecords.forEach((record, index) => {
      console.log(
        `  ${index + 1}. ID: ${record.id}, Type: ${record.type}, UserId: ${record.userId}, TempUserId: ${record.temporaryUserId}`
      );
    });

    // Ask for confirmation
    console.log(`\n⚠️  Found ${orphanedRecords.length} orphaned allUsers records.`);
    console.log('These records will be deleted to clean up the database.');

    // In a real script, you might want to add a confirmation prompt
    // For now, we'll proceed with the cleanup

    // Delete orphaned records with dependency cleanup
    const orphanedIds = orphanedRecords.map(record => record.id);

    if (orphanedIds.length > 0) {
      let deletedCount = 0;
      let skippedCount = 0;

      for (const id of orphanedIds) {
        try {
          // Try to delete directly - let the database handle foreign key constraints
          await db.delete(allUsers).where(eq(allUsers.id, id));
          deletedCount++;
          console.log(`🗑️  Deleted orphaned record: ${id}`);
        } catch (error) {
          // Check if it's a foreign key constraint error
          if (error instanceof Error && error.message.includes('foreign key constraint')) {
            console.log(`⚠️  Skipping ${id} - has foreign key references`);
            skippedCount++;
          } else {
            console.error(`❌ Failed to delete record ${id}:`, error);
            skippedCount++;
          }
        }
      }

      console.log(`\n✅ Successfully deleted ${deletedCount} orphaned allUsers records`);
      if (skippedCount > 0) {
        console.log(`⚠️  Skipped ${skippedCount} records due to foreign key constraints`);
        console.log(`💡 You may need to manually clean up business relationships first`);
      }
    }

    // Verify cleanup
    const remainingAllUsers = await db.query.allUsers.findMany();
    console.log(`📊 Remaining allUsers records: ${remainingAllUsers.length}`);

    console.log('\n🎉 Cleanup completed successfully!');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupOrphanedAllUsers()
  .then(() => {
    console.log('\n✨ Script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
