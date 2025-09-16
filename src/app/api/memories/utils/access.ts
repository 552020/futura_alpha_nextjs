import { db } from '@/db/db';
import { memoryShares, groupMember, relationship, allUsers, memories } from '@/db/schema';
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

  // Step 1: Direct user share
  const directShare = await db.query.memoryShares.findFirst({
    where: and(eq(memoryShares.memoryId, memoryId), eq(memoryShares.sharedWithId, userId)),
    columns: { accessLevel: true },
  });
  if (directShare) return directShare.accessLevel;

  // Step 2: Group-based share
  const groupShare = await db
    .select({ accessLevel: memoryShares.accessLevel })
    .from(memoryShares)
    .innerJoin(groupMember, eq(memoryShares.groupId, groupMember.groupId))
    .where(and(eq(memoryShares.memoryId, memoryId), eq(groupMember.userId, userId)))
    .limit(1);
  if (groupShare.length > 0) return groupShare[0].accessLevel;

  // Step 3: Relationship-based share
  const relShare = await db
    .select({ accessLevel: memoryShares.accessLevel })
    .from(memoryShares)
    .innerJoin(allUsers, eq(memoryShares.ownerId, allUsers.id))
    .innerJoin(
      relationship,
      and(
        eq(relationship.relatedUserId, userId),
        eq(relationship.userId, memoryShares.ownerId),
        eq(relationship.status, 'accepted'),
        eq(relationship.type, memoryShares.sharedRelationshipType)
      )
    )
    .where(and(eq(memoryShares.memoryId, memoryId), eq(memoryShares.sharedWithType, 'relationship')))
    .limit(1);
  if (relShare.length > 0) return relShare[0].accessLevel;

  // No match found
  return null;
}
