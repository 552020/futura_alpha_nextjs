import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { isAdmin } from '@/config/admin';
import { db } from '@/db/db';
import { allUsers, users, temporaryUsers } from '@/db';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
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
    // Get all users with their details
    const allUsersList = await db.query.allUsers.findMany({
      orderBy: [desc(allUsers.createdAt)],
    });

    const usersList = [];
    let permanentCount = 0;
    let temporaryCount = 0;

    for (const allUser of allUsersList) {
      if (allUser.type === 'user' && allUser.userId) {
        // Get permanent user details
        const user = await db.query.users.findFirst({
          where: eq(users.id, allUser.userId),
        });

        if (user) {
          usersList.push({
            id: user.id,
            allUserId: allUser.id,
            name: user.name,
            email: user.email,
            role: user.role || 'user',
            emailVerified: user.emailVerified,
            createdAt: user.createdAt.toISOString(),
            type: 'user' as const,
          });
          permanentCount++;
        }
      } else if (allUser.type === 'temporary' && allUser.temporaryUserId) {
        // Get temporary user details
        const tempUser = await db.query.temporaryUsers.findFirst({
          where: eq(temporaryUsers.id, allUser.temporaryUserId),
        });

        if (tempUser) {
          usersList.push({
            id: tempUser.id,
            allUserId: allUser.id,
            name: tempUser.name,
            email: tempUser.email,
            role: 'temporary',
            emailVerified: null,
            createdAt: tempUser.createdAt.toISOString(),
            type: 'temporary' as const,
          });
          temporaryCount++;
        }
      }
    }

    // Deduplicate users by ID to prevent React key conflicts
    const uniqueUsers = usersList.filter((user, index, self) => index === self.findIndex(u => u.id === user.id));

    return NextResponse.json({
      totalUsers: uniqueUsers.length,
      permanentUsers: permanentCount,
      temporaryUsers: temporaryCount,
      users: uniqueUsers,
    });
  } catch (error) {
    console.error('❌ Admin users fetch failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
