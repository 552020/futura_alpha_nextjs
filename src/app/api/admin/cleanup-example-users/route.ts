import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { isAdmin } from '@/config/admin';
import { db } from '@/db/db';
import { allUsers, users, memories, memoryAssets } from '@/db';
import { eq, like } from 'drizzle-orm';

export async function POST() {
  // Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user is admin
  const userIsAdmin = isAdmin(session.user?.email ?? undefined, session.user?.role);

  if (!userIsAdmin) {
    return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
  }

  try {
    console.log('🧹 Starting admin cleanup of @example.com users...');

    // Find all users with @example.com emails
    const exampleUsers = await db.query.users.findMany({
      where: like(users.email, '%@example.com'),
    });

    console.log(`📋 Found ${exampleUsers.length} users with @example.com emails`);

    if (exampleUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No @example.com users found to clean up',
        deleted: {
          users: 0,
          allUsers: 0,
          memories: 0,
          assets: 0,
        },
      });
    }

    const userIds = exampleUsers.map(user => user.id);

    // Find allUsers records for these users
    const allUsersToDelete = await db.query.allUsers.findMany({
      where: (allUsers, { inArray }) => inArray(allUsers.userId, userIds),
    });

    const allUserIds = allUsersToDelete.map(au => au.id);

    // Find memories owned by these users
    const memoriesToDelete = await db.query.memories.findMany({
      where: (memories, { inArray }) => inArray(memories.ownerId, allUserIds),
    });

    const memoryIds = memoriesToDelete.map(m => m.id);

    // Find assets for these memories
    let assetsToDelete: typeof memoryAssets.$inferSelect[] = [];
    if (memoryIds.length > 0) {
      assetsToDelete = await db.query.memoryAssets.findMany({
        where: (memoryAssets, { inArray }) => inArray(memoryAssets.memoryId, memoryIds),
      });
    }

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

    console.log('✅ @example.com users cleanup completed successfully!');

    return NextResponse.json({
      success: true,
      message: `Successfully cleaned up ${exampleUsers.length} @example.com users`,
      deleted: {
        users: exampleUsers.length,
        allUsers: allUsersToDelete.length,
        memories: memoriesToDelete.length,
        assets: assetsToDelete.length,
      },
    });
  } catch (error) {
    console.error('❌ Admin @example.com users cleanup failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
