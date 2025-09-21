import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { memoryShares } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/auth';
import { findMemory } from '@/app/api/memories/utils/memory';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  // Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    // First try to find the memory
    const memory = await findMemory(id);
    if (!memory) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }

    // Find the share record for this user
    const share = await db.query.memoryShares.findFirst({
      where: and(eq(memoryShares.memoryId, id), eq(memoryShares.sharedWithId, session.user.id)),
    });

    if (!share) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }

    // Return the secure code
    return NextResponse.json({
      code: share.inviteeSecureCode,
    });
  } catch (error) {
    console.error('Error getting share code:', error);
    return NextResponse.json({ error: 'Failed to get share code' }, { status: 500 });
  }
}
