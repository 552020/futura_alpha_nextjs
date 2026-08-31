import { db } from './db.ts';
import { allUsers, users, memories, memoryAssets } from './index.ts';
import { eq, like } from 'drizzle-orm';

async function cleanupExampleUsers() {
  console.log('🧹 Starting cleanup of users with @example.com emails...');

  try {
    // Find all users with @example.com emails
    const exampleUsers = await db.query.users.findMany({
      where: like(users.email, '%@example.com'),
    });

    console.log(
      `📋 Found ${exampleUsers.length} users with @example.com emails`
    );

    if (exampleUsers.length === 0) {
      console.log('✅ No @example.com users to clean up');
      return;
    }

    const userIds = exampleUsers.map((user) => user.id);
    console.log('🔍 User IDs to delete:', userIds);

    // Find allUsers records for these users
    const allUsersToDelete = await db.query.allUsers.findMany({
      where: (allUsers, { inArray }) => inArray(allUsers.userId, userIds),
    });

    console.log(
      `📋 Found ${allUsersToDelete.length} allUsers records to delete`
    );

    const allUserIds = allUsersToDelete.map((au) => au.id);

    // Find memories owned by these users
    const memoriesToDelete = await db.query.memories.findMany({
      where: (memories, { inArray }) => inArray(memories.ownerId, allUserIds),
    });

    console.log(`📋 Found ${memoriesToDelete.length} memories to delete`);
    const memoryIds = memoriesToDelete.map((m) => m.id);

    // Find assets for these memories
    let assetsToDelete = [];
    if (memoryIds.length > 0) {
      assetsToDelete = await db.query.memoryAssets.findMany({
        where: (memoryAssets, { inArray }) =>
          inArray(memoryAssets.memoryId, memoryIds),
      });
    }

    console.log(`📋 Found ${assetsToDelete.length} assets to delete`);

    // Delete in reverse order (assets -> memories -> allUsers -> users)
    console.log('🗑️ Deleting assets...');
    for (const asset of assetsToDelete) {
      await db.delete(memoryAssets).where(eq(memoryAssets.id, asset.id));
    }

    console.log('🗑️ Deleting memories...');
    for (const memory of memoriesToDelete) {
      await db.delete(memories).where(eq(memories.id, memory.id));
    }

    console.log('🗑️ Deleting allUsers records...');
    for (const allUser of allUsersToDelete) {
      await db.delete(allUsers).where(eq(allUsers.id, allUser.id));
    }

    console.log('🗑️ Deleting users...');
    for (const user of exampleUsers) {
      await db.delete(users).where(eq(users.id, user.id));
    }

    console.log('✅ Cleanup completed successfully!');
    console.log(`📊 Summary:`);
    console.log(
      `   - Deleted ${exampleUsers.length} users with @example.com emails`
    );
    console.log(`   - Deleted ${allUsersToDelete.length} allUsers records`);
    console.log(`   - Deleted ${memoriesToDelete.length} memories`);
    console.log(`   - Deleted ${assetsToDelete.length} assets`);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

cleanupExampleUsers();
