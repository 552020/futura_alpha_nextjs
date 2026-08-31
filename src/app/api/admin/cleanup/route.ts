import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { isAdmin } from '@/config/admin';
import { db } from '@/db/db';
import { allUsers, temporaryUsers, memories, memoryAssets } from '@/db';
import { eq, inArray as drizzleInArray } from 'drizzle-orm';
import { fatLogger } from '@/lib/logger';

export async function POST() {
  // Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user is admin
  const userIsAdmin = isAdmin(
    session.user?.email ?? undefined,
    session.user?.role
  );

  if (!userIsAdmin) {
    return NextResponse.json(
      { error: 'Forbidden - Admin access required' },
      { status: 403 }
    );
  }
  try {
    // 1. Find all temporary allUsers records
    const temporaryAllUsers = await db.query.allUsers.findMany({
      where: eq(allUsers.type, 'temporary'),
    });

    if (temporaryAllUsers.length === 0) {
      return NextResponse.json({
        success: true,
        deleted: { allUsers: 0, memories: 0, assets: 0 },
        message: 'No temporary users to clean up',
      });
    }

    const allUserIds = temporaryAllUsers.map((au) => au.id);

    // 2. Find memories owned by these temporary users
    const memoriesToDelete = await db.query.memories.findMany({
      where: (memories, { inArray }) => inArray(memories.ownerId, allUserIds),
    });

    const memoryIds = memoriesToDelete.map((m) => m.id);

    // 3. Find assets for these memories
    let assetsToDelete: (typeof memoryAssets.$inferSelect)[] = [];
    if (memoryIds.length > 0) {
      assetsToDelete = await db.query.memoryAssets.findMany({
        where: (memoryAssets, { inArray: _inArray }) =>
          drizzleInArray(memoryAssets.memoryId, memoryIds),
      });
    }

    // 4. Delete in correct order (foreign key constraints)
    let deletedAssets = 0;
    let deletedMemories = 0;
    let deletedTemporaryUsers = 0;
    let deletedAllUsers = 0;

    // Delete assets
    for (const asset of assetsToDelete) {
      await db.delete(memoryAssets).where(eq(memoryAssets.id, asset.id));
      deletedAssets++;
    }

    // Delete memories
    for (const memory of memoriesToDelete) {
      await db.delete(memories).where(eq(memories.id, memory.id));
      deletedMemories++;
    }

    // Delete temporary users
    for (const allUser of temporaryAllUsers) {
      if (allUser.temporaryUserId) {
        await db
          .delete(temporaryUsers)
          .where(eq(temporaryUsers.id, allUser.temporaryUserId));
        deletedTemporaryUsers++;
      }
    }

    // Delete allUsers records
    for (const allUser of temporaryAllUsers) {
      await db.delete(allUsers).where(eq(allUsers.id, allUser.id));
      deletedAllUsers++;
    }

    return NextResponse.json({
      success: true,
      deleted: {
        allUsers: deletedAllUsers,
        temporaryUsers: deletedTemporaryUsers,
        memories: deletedMemories,
        assets: deletedAssets,
      },
      message: 'Cleanup completed successfully',
    });
  } catch (error) {
    fatLogger.error('Admin cleanup failed', 'be', { error });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
