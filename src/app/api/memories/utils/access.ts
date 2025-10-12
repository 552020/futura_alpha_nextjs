import { db } from '@/db/db';
import { resourceMembership, memories } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

export type AccessLevel = 'read' | 'write' | 'owner';

/**
 * Get user's access level to a memory using the new resourceMembership system
 * 
 * Access hierarchy:
 * 1. Owner - Full control (from memories.ownerId match)
 * 2. Direct membership - Via resourceMembership with 'user' grant source
 * 3. Group membership - Via resourceMembership with 'group' grant source
 * 4. Magic link access - Via resourceMembership with 'magic_link' grant source
 * 5. Public access - Via resourceMembership with 'public_mode' grant source
 */
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

  // Step 1: Check resourceMembership for any access
  const membership = await db.query.resourceMembership.findFirst({
    where: and(
      eq(resourceMembership.resourceType, 'memory'),
      eq(resourceMembership.resourceId, memoryId),
      eq(resourceMembership.allUserId, userId)
    ),
    columns: { role: true, grantSource: true },
  });

  if (membership) {
    // Convert membership role to access level
    switch (membership.role) {
      case 'owner':
      case 'superadmin':
      case 'admin':
        return 'owner';
      case 'member':
        return 'write';
      case 'guest':
        return 'read';
      default:
        return 'read';
    }
  }

  // No access found
  return null;
}
