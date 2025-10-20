import { db } from '@/db/db';
import { folders } from '@/db';
import { and, eq } from 'drizzle-orm';

export async function getFolderByIdForOwner(folderId: string, ownerAllUserId: string) {
  const folder = await db.query.folders.findFirst({
    where: and(eq(folders.id, folderId), eq(folders.ownerId, ownerAllUserId)),
  });
  return folder;
}
