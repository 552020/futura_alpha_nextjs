import { db } from '@/db/db';
import { resourceMembership, memories } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

export type AccessLevel = 'read' | 'write' | 'owner';

export async function getMemoryAccessLevel({
  userId,
  memoryId,
}: {
  userId: string;
  memoryId: string;
}): Promise<AccessLevel | null> {
  // Step 0: Check if user is the owner
  const memory = await db.query.memories.findFirst({
    where: and(eq(memories.id, memoryId), eq(memories.ownerId, userId)),
  });
  if (memory) return 'owner';

  // TODO: Update to use new universal resource sharing system
  // Step 1: Direct user share
  // const directShare = await db.query.resourceMembership.findFirst({
  //   where: and(eq(resourceMembership.resourceId, memoryId), eq(resourceMembership.resourceType, 'memory'), eq(resourceMembership.allUserId, userId)),
  //   columns: { accessLevel: true },
  // });
  // if (directShare) return directShare.accessLevel;

  // Step 2: Group-based share (not implemented in new system yet)
  // Step 3: Relationship-based share (not implemented in new system yet)

  // Temporarily return 'read' for any shared memory until full migration
  const hasShare = await db.query.resourceMembership.findFirst({
    where: and(
      eq(resourceMembership.resourceId, memoryId),
      eq(resourceMembership.resourceType, 'memory'),
      eq(resourceMembership.allUserId, userId)
    ),
  });
  if (hasShare) return 'read';

  // No match found
  return null;
}
