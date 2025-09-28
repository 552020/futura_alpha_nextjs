import { notFound } from 'next/navigation';
import { db } from '@/db/db';
import { memoryShares, allUsers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { findMemory } from '@/app/api/memories/utils/memory';
import { MemoryViewer } from '@/components/memory/memory-viewer';
import { Card } from '@/components/ui/card';
import { auth } from '@/auth';

import { logger } from '@/lib/logger';
interface SharedMemoryPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SharedMemoryPage({ params }: SharedMemoryPageProps) {
  const { id } = await params;
  const session = await auth();

  logger.info('🔍 DEBUG SharedMemoryPage - Auth Check:', {
    id,
    hasSession: !!session,
    userId: session?.user?.id,
    timestamp: new Date().toISOString(),
  });

  if (!session?.user?.id) {
    logger.info('❌ DEBUG SharedMemoryPage - No authenticated user');
    notFound();
  }

  try {
    // Get the allUserId for the authenticated user
    const allUserRecord = await db.query.allUsers.findFirst({
      where: eq(allUsers.userId, session.user.id),
    });

    logger.info('🔍 DEBUG SharedMemoryPage - AllUser Lookup:', {
      found: !!allUserRecord,
      userId: session.user.id,
      allUserId: allUserRecord?.id,
      timestamp: new Date().toISOString(),
    });

    if (!allUserRecord) {
      logger.info('❌ DEBUG SharedMemoryPage - No allUser record found');
      notFound();
    }

    // First try to find the memory
    const memory = await findMemory(id);
    logger.info('🔍 DEBUG SharedMemoryPage - Memory Lookup:', {
      memoryFound: !!memory,
      memoryId: id,
      ownerId: memory?.ownerId,
      timestamp: new Date().toISOString(),
    });

    if (!memory) {
      logger.info('❌ DEBUG SharedMemoryPage - Memory not found');
      notFound();
    }

    const isOwner = memory.ownerId === allUserRecord.id;
    logger.info('🔍 DEBUG SharedMemoryPage - Ownership Check:', {
      isOwner,
      memoryOwnerId: memory.ownerId,
      currentUserAllId: allUserRecord.id,
      timestamp: new Date().toISOString(),
    });

    // Check if the user has access to this memory
    const share = await db.query.memoryShares.findFirst({
      where: and(eq(memoryShares.memoryId, id), eq(memoryShares.sharedWithId, allUserRecord.id)),
    });

    logger.info('🔍 DEBUG SharedMemoryPage - Share Check:', {
      hasShare: !!share,
      shareDetails: share
        ? {
            accessLevel: share.accessLevel,
            sharedWithId: share.sharedWithId,
            memoryId: share.memoryId,
          }
        : null,
      timestamp: new Date().toISOString(),
    });

    // User should have access if they are either:
    // 1. The owner of the memory OR
    // 2. Have a share record
    if (!isOwner && !share) {
      logger.info('❌ DEBUG SharedMemoryPage - Access Denied:', {
        reason: 'User is not owner and has no share record',
        isOwner,
        hasShare: !!share,
        userId: allUserRecord.id,
        memoryId: id,
        timestamp: new Date().toISOString(),
      });
      notFound();
    }

    logger.info('✅ DEBUG SharedMemoryPage - Access Granted:', {
      reason: isOwner ? 'User is owner' : 'User has share record',
      accessLevel: isOwner ? 'write' : share?.accessLevel || 'read',
      timestamp: new Date().toISOString(),
    });

    const accessLevel = isOwner ? 'write' : share?.accessLevel || 'read';

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
    logger.error('Error accessing shared memory', undefined, { data: error as Error });
    notFound();
  }
}
