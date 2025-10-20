import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db/db';
import { allUsers, folders } from '@/db';
import { eq, and } from 'drizzle-orm';
import { updateFolderRecord } from '@/services/folder';
import { fatLogger } from '@/lib/logger';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { title, name } = body as { title?: string; name?: string };
  fatLogger.info('[Folders API] Incoming update', 'be', { id, body: { title, name } });

  // Resolve allUserId
  const allUserRecord = await db.query.allUsers.findFirst({ where: eq(allUsers.userId, session.user.id) });
  if (!allUserRecord) {
    fatLogger.error('[Folders API] No allUsers record', 'be', { userId: session.user.id });
    return NextResponse.json({ error: 'User record not found' }, { status: 404 });
  }

  // Ensure folder ownership
  const existing = await db.query.folders.findFirst({
    where: and(eq(folders.id, id), eq(folders.ownerId, allUserRecord.id)),
  });
  if (!existing) {
    fatLogger.error('[Folders API] Folder not found or not owned by user', 'be', { id, ownerId: allUserRecord.id });
    return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
  }

  const updateResult = await updateFolderRecord(id, { title, name });
  if (!updateResult.success || !updateResult.data) {
    fatLogger.error('[Folders API] Failed to update folder', 'be', { id, ownerId: allUserRecord.id, error: updateResult.error });
    return NextResponse.json({ error: 'Failed to update folder' }, { status: 500 });
  }
  fatLogger.info('[Folders API] Folder updated', 'be', { id, updated: { title: updateResult.data.title, name: updateResult.data.name } });
  return NextResponse.json({ success: true, data: updateResult.data });
}
