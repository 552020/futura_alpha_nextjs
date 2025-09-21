import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { folders } from '@/db/schema';
import { getUserIdForUpload } from '../memories/utils/user-management';

export async function POST(request: NextRequest) {
  try {
    const { folderName, parentFolderId } = await request.json();

    if (!folderName) {
      return NextResponse.json({ error: 'Missing folderName' }, { status: 400 });
    }

    const { allUserId, error } = await getUserIdForUpload({});
    if (error) {
      return error;
    }

    const [createdFolder] = await db
      .insert(folders)
      .values({
        ownerId: allUserId,
        name: folderName,
        parentFolderId: parentFolderId || null,
      })
      .returning();

    return NextResponse.json({ folder: createdFolder });
  } catch (error) {
    console.error('Error creating folder:', error);
    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
  }
}
