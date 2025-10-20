import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { isAdmin } from '@/config/admin';
import { db } from '@/db/db';
import { allUsers, memories, memoryAssets } from '@/db';
import { eq, desc, sql } from 'drizzle-orm';

export async function GET() {
  // Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user is admin
  console.log('🔍 [DEBUG] API Admin check:', {
    email: session.user?.email,
    role: session.user?.role,
    user: session.user,
  });

  const userIsAdmin = isAdmin(session.user?.email ?? undefined, session.user?.role);

  console.log('🔍 [DEBUG] API Is admin:', userIsAdmin);

  if (!userIsAdmin) {
    return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
  }
  try {
    // Get user counts
    const [allUsersCount] = await db.select({ count: sql<number>`count(*)` }).from(allUsers);
    const [temporaryUsersCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(allUsers)
      .where(eq(allUsers.type, 'temporary'));
    const [permanentUsersCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(allUsers)
      .where(eq(allUsers.type, 'user'));

    // Get memory and asset counts
    const [memoriesCount] = await db.select({ count: sql<number>`count(*)` }).from(memories);
    const [assetsCount] = await db.select({ count: sql<number>`count(*)` }).from(memoryAssets);

    // Get recent uploads
    const recentUploads = await db.query.memories.findMany({
      orderBy: [desc(memories.createdAt)],
      limit: 10,
      columns: {
        id: true,
        title: true,
        type: true,
        createdAt: true,
        ownerId: true,
      },
    });

    return NextResponse.json({
      totalUsers: allUsersCount.count,
      temporaryUsers: temporaryUsersCount.count,
      permanentUsers: permanentUsersCount.count,
      totalMemories: memoriesCount.count,
      totalAssets: assetsCount.count,
      recentUploads: recentUploads.map(upload => ({
        id: upload.id,
        title: upload.title,
        type: upload.type,
        createdAt: upload.createdAt.toISOString(),
        ownerId: upload.ownerId,
      })),
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
