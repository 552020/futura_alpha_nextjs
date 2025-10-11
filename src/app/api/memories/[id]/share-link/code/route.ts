import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { findMemory } from '@/app/api/memories/utils/memory';

import { fatLogger } from '@/lib/logger';
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

    // TODO: Update to use new universal resource sharing system
    // Find the share record for this user
    // const share = await db.query.resourceMembership.findFirst({
    //   where: and(eq(resourceMembership.resourceId, id), eq(resourceMembership.resourceType, 'memory'), eq(resourceMembership.allUserId, session.user.id)),
    // });

    // if (!share) {
    //   return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    // }

    // Return the secure code
    // return NextResponse.json({
    //   code: share.inviteeSecureCode,
    // });

    // Temporarily return error until sharing system is fully migrated
    return NextResponse.json({ error: 'Sharing system under migration' }, { status: 503 });
  } catch (error) {
    fatLogger.error('Error getting share code:', 'be', { data: error instanceof Error ? error : undefined });
    return NextResponse.json({ error: 'Failed to get share code' }, { status: 500 });
  }
}
