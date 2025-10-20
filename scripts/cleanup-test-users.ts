#!/usr/bin/env tsx

import { db } from '../src/db/db';
import { users, allUsers } from '../src/db/tables';
import { like, inArray } from 'drizzle-orm';

/**
 * Cleanup script to delete all test users with @example.com email addresses
 * This helps keep the database clean during development and testing
 */

async function cleanupTestUsers() {
  console.log('🧹 Starting cleanup of test users with @example.com addresses...');

  try {
    // Find all users with @example.com emails
    const testUsers = await db.select().from(users).where(like(users.email, '%@example.com'));

    console.log(`📊 Found ${testUsers.length} test users to delete`);

    if (testUsers.length === 0) {
      console.log('✅ No test users found. Database is clean!');
      return;
    }

    // Show which users will be deleted
    console.log('🗑️  Users to be deleted:');
    testUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (ID: ${user.id})`);
    });

    // Delete from allUsers table first (due to foreign key constraints)
    // Get user IDs to delete from allUsers
    const userIdsToDelete = testUsers.map(user => user.id);

    const allUsersToDelete = await db.select().from(allUsers).where(inArray(allUsers.userId, userIdsToDelete));

    console.log(`📊 Found ${allUsersToDelete.length} allUsers records to delete`);

    if (allUsersToDelete.length > 0) {
      await db.delete(allUsers).where(inArray(allUsers.userId, userIdsToDelete));

      console.log(`✅ Deleted ${allUsersToDelete.length} allUsers records`);
    }

    // Delete from users table
    await db.delete(users).where(like(users.email, '%@example.com'));

    console.log(`✅ Deleted ${testUsers.length} users records`);

    // Verify cleanup
    const remainingTestUsers = await db.select().from(users).where(like(users.email, '%@example.com'));

    if (remainingTestUsers.length === 0) {
      console.log('🎉 Successfully cleaned up all test users!');
    } else {
      console.log(`⚠️  Warning: ${remainingTestUsers.length} test users still remain`);
    }
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
}

// Run the cleanup
cleanupTestUsers()
  .then(() => {
    console.log('✨ Cleanup completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Cleanup failed:', error);
    process.exit(1);
  });
