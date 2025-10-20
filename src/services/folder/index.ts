import { db } from '@/db/db';
import { folders } from '@/db';
import { and, eq, inArray } from 'drizzle-orm';

export async function getFolderByIdForOwner(folderId: string, ownerAllUserId: string) {
  const folder = await db.query.folders.findFirst({
    where: and(eq(folders.id, folderId), eq(folders.ownerId, ownerAllUserId)),
  });
  return folder;
}

export async function getFolderById(folderId: string) {
  const folder = await db.query.folders.findFirst({
    where: eq(folders.id, folderId),
  });
  return folder;
}

export async function getFoldersByIds(folderIds: string[]) {
  if (folderIds.length === 0) return [];

  const folderRecords = await db.query.folders.findMany({
    where: inArray(folders.id, folderIds),
  });
  return folderRecords;
}

export async function updateFolderRecord(
  folderId: string,
  ownerAllUserId: string,
  params: { title?: string; name?: string }
) {
  const [updated] = await db
    .update(folders)
    .set({
      title: params.title !== undefined ? params.title : undefined,
      name: params.name !== undefined ? params.name : undefined,
      updatedAt: new Date(),
    })
    .where(and(eq(folders.id, folderId), eq(folders.ownerId, ownerAllUserId)))
    .returning();
  return updated;
}
