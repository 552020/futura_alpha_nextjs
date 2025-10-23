#!/usr/bin/env node

/**
 * Cleanup script for temporary users
 * Removes all temporary users and their related records from the database
 */

import { db } from './db.ts';
import { allUsers, temporaryUsers, memories, memoryAssets } from './index.ts';
import { eq } from 'drizzle-orm';

async function cleanupTemporaryUsers() {
  console.log('🧹 Starting cleanup of temporary users...');

  try {
    // 1. Find all temporary allUsers records
    const temporaryAllUsers = await db.query.allUsers.findMany({
      where: eq(allUsers.type, 'temporary'),
    });

    console.log(`📋 Found ${temporaryAllUsers.length} temporary allUsers records`);

    if (temporaryAllUsers.length === 0) {
      console.log('✅ No temporary users to clean up');
      return;
    }

    // 2. Get all allUser IDs for deletion
    const allUserIds = temporaryAllUsers.map(au => au.id);
    console.log('🔍 AllUser IDs to delete:', allUserIds);

    // 3. Find all memories owned by these temporary users
    const memoriesToDelete = await db.query.memories.findMany({
      where: (memories, { inArray }) => inArray(memories.ownerId, allUserIds),
    });

    console.log(`📋 Found ${memoriesToDelete.length} memories to delete`);

    // 4. Get all asset IDs from these memories
    const memoryIds = memoriesToDelete.map(m => m.id);
    let assetsToDelete = [];
    if (memoryIds.length > 0) {
      assetsToDelete = await db.query.memoryAssets.findMany({
        where: (memoryAssets, { inArray }) => inArray(memoryAssets.memoryId, memoryIds),
      });
    }

    console.log(`📋 Found ${assetsToDelete.length} assets to delete`);

    // 5. Delete in correct order (foreign key constraints)
    console.log('🗑️ Deleting assets...');
    for (const asset of assetsToDelete) {
      await db.delete(memoryAssets).where(eq(memoryAssets.id, asset.id));
    }

    console.log('🗑️ Deleting memories...');
    for (const memory of memoriesToDelete) {
      await db.delete(memories).where(eq(memories.id, memory.id));
    }

    console.log('🗑️ Deleting temporary users...');
    for (const allUser of temporaryAllUsers) {
      if (allUser.temporaryUserId) {
        await db.delete(temporaryUsers).where(eq(temporaryUsers.id, allUser.temporaryUserId));
      }
    }

    console.log('🗑️ Deleting allUsers records...');
    for (const allUser of temporaryAllUsers) {
      await db.delete(allUsers).where(eq(allUsers.id, allUser.id));
    }

    console.log('✅ Cleanup completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Deleted ${allUserIds.length} allUsers records`);
    console.log(`   - Deleted ${memoriesToDelete.length} memories`);
    console.log(`   - Deleted ${assetsToDelete.length} assets`);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupTemporaryUsers()
  .then(() => {
    console.log('🎉 Cleanup script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Cleanup script failed:', error);
    process.exit(1);
  });
