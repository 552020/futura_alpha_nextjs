import { allUsers, users, memories, memoryAssets, resourceMembership } from '@/db';
import { eq } from 'drizzle-orm';
import { db } from '@/db/db';

export async function getSharedMemories(userId: string) {
  // Get all memory shares for this user using the new universal resource sharing system
  const shares = await db.query.resourceMembership.findMany({
    where: eq(resourceMembership.allUserId, userId),
  });

  // Filter for memory resources only
  const memoryShares = shares.filter(share => share.resourceType === 'memory');

  // Fetch the actual memories
  const sharedMemories = await Promise.all(
    memoryShares.map(async share => {
      const memory = await db.query.memories.findFirst({
        where: eq(memories.id, share.resourceId),
      });
      if (!memory) return null;

      // Get thumbnail URL from assets (prefer thumb, fallback to original)
      const assets = await db.query.memoryAssets.findMany({
        where: eq(memoryAssets.memoryId, share.resourceId),
      });
      const thumbnailAsset =
        assets.find(asset => asset.assetType === 'thumb') || assets.find(asset => asset.assetType === 'original');
      const thumbnailUrl = thumbnailAsset?.url || null;

      return {
        id: share.resourceId,
        type: memory.type,
        title: memory.title,
        thumbnailUrl,
        createdAt: memory.createdAt,
        ownerId: memory.ownerId,
        sharedBy: {
          id: memory.ownerId,
          name: await getOwnerName(memory.ownerId),
        },
      };
    })
  );

  // Filter out null values and group by type
  const validMemories = sharedMemories.filter((m): m is NonNullable<typeof m> => m !== null);

  return {
    images: validMemories.filter(m => m.type === 'image'),
    videos: validMemories.filter(m => m.type === 'video'),
    documents: validMemories.filter(m => m.type === 'document'),
    notes: validMemories.filter(m => m.type === 'note'),
  };
}

async function getOwnerName(ownerId: string): Promise<string> {
  const owner = await db.query.allUsers.findFirst({
    where: eq(allUsers.id, ownerId),
  });

  if (!owner) return 'Unknown';

  if (owner.type === 'user' && owner.userId) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, owner.userId),
    });
    return user?.name || 'Unknown';
  }

  return 'Unknown';
}
