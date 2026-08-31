import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { resourceMembership, allUsers } from '@/db';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/auth';
import { findMemory } from '@/app/api/memories/utils/memory';

import { fatLogger } from '@/lib/logger';
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

    // Get the allUserId for the authenticated user
    const allUserRecord = await db.query.allUsers.findFirst({
      where: eq(allUsers.userId, session.user.id),
    });

    if (!allUserRecord) {
      return NextResponse.json(
        { error: 'User record not found' },
        { status: 404 }
      );
    }

    // Find the membership record for this user
    const membership = await db.query.resourceMembership.findFirst({
      where: and(
        eq(resourceMembership.resourceType, 'memory'),
        eq(resourceMembership.resourceId, id),
        eq(resourceMembership.allUserId, allUserRecord.id)
      ),
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'Membership not found' },
        { status: 404 }
      );
    }

    // For now, return a simple response since the old secure code system
    // may not be directly applicable to the new resourceMembership system
    return NextResponse.json({
      message: 'Access granted via resourceMembership',
      role: membership.role,
      grantSource: membership.grantSource,
    });
  } catch (error) {
    fatLogger.error('Error getting membership info:', 'be', {
      data: error instanceof Error ? error : undefined,
    });
    return NextResponse.json(
      { error: 'Failed to get membership info' },
      { status: 500 }
    );
  }
}
