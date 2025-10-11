import { notFound } from 'next/navigation';
import { db } from '@/db/db';
import { resourceMembership, allUsers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { findMemory } from '@/app/api/memories/utils/memory';
import { MemoryViewer } from '@/components/memory/memory-viewer';
import { Card } from '@/components/ui/card';
import { auth } from '@/auth';

import { fatLogger } from '@/lib/logger';
interface SharedMemoryPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SharedMemoryPage({ params }: SharedMemoryPageProps) {
  const { id } = await params;
  const session = await auth();

  fatLogger.info('🔍 DEBUG SharedMemoryPage - Auth Check:', 'fe', {
    id,
    hasSession: !!session,
    userId: session?.user?.id,
    timestamp: new Date().toISOString(),
  });

  if (!session?.user?.id) {
    fatLogger.info('❌ DEBUG SharedMemoryPage - No authenticated user', 'fe');
    notFound();
  }

  try {
    // Get the allUserId for the authenticated user
    const allUserRecord = await db.query.allUsers.findFirst({
      where: eq(allUsers.userId, session.user.id),
    });

    fatLogger.info('🔍 DEBUG SharedMemoryPage - AllUser Lookup:', 'fe', {
      found: !!allUserRecord,
      userId: session.user.id,
      allUserId: allUserRecord?.id,
      timestamp: new Date().toISOString(),
    });

    if (!allUserRecord) {
      fatLogger.info('❌ DEBUG SharedMemoryPage - No allUser record found', 'fe');
      notFound();
    }

    // First try to find the memory
    const memory = await findMemory(id);
    fatLogger.info('🔍 DEBUG SharedMemoryPage - Memory Lookup:', 'fe', {
      memoryFound: !!memory,
      memoryId: id,
      ownerId: memory?.ownerId,
      timestamp: new Date().toISOString(),
    });

    if (!memory) {
      fatLogger.info('❌ DEBUG SharedMemoryPage - Memory not found', 'fe');
      notFound();
    }

    const isOwner = memory.ownerId === allUserRecord.id;
    fatLogger.info('🔍 DEBUG SharedMemoryPage - Ownership Check:', 'fe', {
      isOwner,
      memoryOwnerId: memory.ownerId,
      currentUserAllId: allUserRecord.id,
      timestamp: new Date().toISOString(),
    });

    // Check if the user has access to this memory using the new universal resource sharing system
    const share = await db.query.resourceMembership.findFirst({
      where: and(
        eq(resourceMembership.resourceId, id),
        eq(resourceMembership.resourceType, 'memory'),
        eq(resourceMembership.allUserId, allUserRecord.id)
      ),
    });

    fatLogger.info('🔍 DEBUG SharedMemoryPage - Share Check:', 'fe', {
      hasShare: !!share,
      shareDetails: share
        ? {
            accessLevel: 'read', // Default access level for shared memories
            allUserId: share.allUserId,
            resourceId: share.resourceId,
          }
        : null,
      timestamp: new Date().toISOString(),
    });

    // User should have access if they are either:
    // 1. The owner of the memory OR
    // 2. Have a share record
    if (!isOwner && !share) {
      fatLogger.info('❌ DEBUG SharedMemoryPage - Access Denied:', 'fe', {
        reason: 'User is not owner and has no share record',
        isOwner,
        hasShare: !!share,
        userId: allUserRecord.id,
        memoryId: id,
        timestamp: new Date().toISOString(),
      });
      notFound();
    }

    fatLogger.info('✅ DEBUG SharedMemoryPage - Access Granted:', 'fe', {
      reason: isOwner ? 'User is owner' : 'User has share record',
      accessLevel: isOwner ? 'write' : share?.role === 'member' ? 'write' : 'read',
      timestamp: new Date().toISOString(),
    });

    const accessLevel = isOwner ? 'write' : share?.role === 'member' ? 'write' : 'read';

    return (
      <div className="container mx-auto py-8">
        <Card className="p-6">
          <div className="mb-4">
            <h1 className="text-2xl font-bold">{isOwner ? 'Your Memory' : 'Shared Memory'}</h1>
            <p className="text-muted-foreground">
              {isOwner ? 'You are viewing this memory as the owner' : `You have ${accessLevel} access to this memory`}
            </p>
          </div>

          <MemoryViewer memory={memory} isOwner={isOwner} accessLevel={accessLevel} />
        </Card>
      </div>
    );
  } catch (error) {
    fatLogger.error('Error accessing shared memory', 'fe', { data: error as Error });
    notFound();
  }
}
