import { allUsers, users, memories, memoryAssets, memoryShares } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { db } from '@/db/db';

export async function getSharedMemories(userId: string) {
  // Get all memory shares for this user
  const shares = await db.query.memoryShares.findMany({
    where: eq(memoryShares.sharedWithId, userId),
  });

  // Fetch the actual memories
  const sharedMemories = await Promise.all(
    shares.map(async share => {
      const memory = await db.query.memories.findFirst({
        where: eq(memories.id, share.memoryId),
      });
      if (!memory) return null;

      // Get thumbnail URL from assets (prefer thumb, fallback to original)
      const assets = await db.query.memoryAssets.findMany({
        where: eq(memoryAssets.memoryId, share.memoryId),
      });
      const thumbnailAsset =
        assets.find(asset => asset.assetType === 'thumb') || assets.find(asset => asset.assetType === 'original');
      const thumbnailUrl = thumbnailAsset?.url || null;

      return {
        id: share.memoryId,
        type: share.memoryType,
        title: memory.title,
        thumbnailUrl,
        createdAt: memory.createdAt,
        ownerId: share.ownerId,
        sharedBy: {
          id: share.ownerId,
          name: await getOwnerName(share.ownerId),
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
