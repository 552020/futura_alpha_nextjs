import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { isAdmin } from '@/config/admin';
import { db } from '@/db/db';
import { allUsers, users } from '@/db';
import { eq } from 'drizzle-orm';

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
    let deletedCount = 0;

    // Find and delete test users (users with @example.com email)
    const testUsers = await db.query.users.findMany({
      where: (users, { like }) => like(users.email, '%@example.com'),
    });

    for (const testUser of testUsers) {
      // Delete from allUsers table
      await db.delete(allUsers).where(eq(allUsers.userId, testUser.id));

      // Delete from users table
      await db.delete(users).where(eq(users.id, testUser.id));

      deletedCount++;
    }

    return NextResponse.json({
      success: true,
      deleted: deletedCount,
    });
  } catch (error) {
    console.error('❌ Test users cleanup failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
