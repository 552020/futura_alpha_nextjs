import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getAllUserRecord } from '@/services/user';
import { getAllAccessibleGalleries } from '@/services/gallery/gallery-operations';
import { addStorageStatusToGalleries } from './utils';
import { fatLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  // Returns all galleries owned by the authenticated user
  // A gallery is a collection of memories (images, videos, documents, notes, audio)
  // Each gallery can contain the same memory multiple times (unlike folders)

  // Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get the allUserId for the authenticated user
    const allUserResult = await getAllUserRecord(session.user.id);
    if (!allUserResult.success || !allUserResult.data) {
      fatLogger.error('No allUsers record found for user:', 'be', { data: session.user.id });
      return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    }

    const allUserRecord = allUserResult.data as { id: string };

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const offset = (page - 1) * limit;

    // Fetch all accessible galleries (owned + shared)
    const galleriesResult = await getAllAccessibleGalleries(allUserRecord.id);
    if (!galleriesResult.success || !galleriesResult.data) {
      return NextResponse.json({ error: galleriesResult.error || 'Failed to fetch galleries' }, { status: 500 });
    }

    const allGalleries = galleriesResult.data;

    // Apply pagination
    const paginatedGalleries = allGalleries.slice(offset, offset + limit);

    // Add computed storage status to galleries
    const galleriesWithStorageStatus = await addStorageStatusToGalleries(paginatedGalleries);

    return NextResponse.json({
      galleries: galleriesWithStorageStatus,
      hasMore: offset + limit < allGalleries.length,
      totalCount: allGalleries.length,
    });
  } catch (error) {
    fatLogger.error('Error listing galleries:', 'be', { data: error instanceof Error ? error : undefined });
    return NextResponse.json({ error: 'Failed to list galleries' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get the allUserId for the authenticated user
    const allUserResult = await getAllUserRecord(session.user.id);
    if (!allUserResult.success || !allUserResult.data) {
      fatLogger.error('No allUsers record found for user:', 'be', { data: session.user.id });
      return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    }

    const allUserRecord = allUserResult.data as { id: string };
    const body = await request.json();
    const { type, folderName, memories, title, description, isPublic = false } = body;

    fatLogger.info('🔍 Gallery Creation Request:', 'be', {
      type,
      folderName,
      folderNameType: typeof folderName,
      title,
      description,
      isPublic,
      memoriesCount: memories?.length || 0,
      allUserRecordId: allUserRecord.id,
    });

    if (!type || !['from-folder', 'from-memories'].includes(type)) {
      return NextResponse.json({ error: "Type must be 'from-folder' or 'from-memories'" }, { status: 400 });
    }

    let galleryMemories: Array<{ id: string; type: string }> = [];

    if (type === 'from-folder') {
      if (!folderName) {
        return NextResponse.json({ error: 'Folder name is required for from-folder type' }, { status: 400 });
      }

      // Import DB and types for folder lookup
      const { db } = await import('@/db/db');
      const { folders, memories: memoriesTable } = await import('@/db');
      const { eq, and, desc } = await import('drizzle-orm');

      // Find the folder by name
      const allFoldersWithName = await db.query.folders.findMany({
        where: and(eq(folders.name, folderName), eq(folders.ownerId, allUserRecord.id)),
        orderBy: desc(folders.createdAt),
      });

      fatLogger.info('🔍 All folders with name:', 'be', {
        folderName,
        count: allFoldersWithName.length,
        folders: allFoldersWithName.map(f => ({ id: f.id, name: f.name, createdAt: f.createdAt })),
      });

      if (allFoldersWithName.length === 0) {
        return NextResponse.json({ error: `Folder '${folderName}' not found` }, { status: 404 });
      }

      const folder = allFoldersWithName[0];

      // Find all memories in this folder
      const folderMemories = await db.query.memories.findMany({
        where: and(eq(memoriesTable.ownerId, allUserRecord.id), eq(memoriesTable.parentFolderId, folder.id)),
      });

      fatLogger.info('🔍 Found folder memories:', 'be', {
        count: folderMemories.length,
        memories: folderMemories.map(m => ({ id: m.id, title: m.title, parentFolderId: m.parentFolderId })),
      });

      galleryMemories = folderMemories.map(memory => ({
        id: memory.id,
        type: memory.type,
      }));
    } else if (type === 'from-memories') {
      if (!memories || !Array.isArray(memories) || memories.length === 0) {
        return NextResponse.json({ error: 'Memories array is required for from-memories type' }, { status: 400 });
      }

      galleryMemories = memories.map(memory => ({
        id: memory.id,
        type: memory.type,
      }));
    }

    if (galleryMemories.length === 0) {
      return NextResponse.json({ error: 'No memories found' }, { status: 404 });
    }

    // Import service functions
    const { createGalleryRecord, createGalleryItems } = await import('@/services/gallery/gallery-operations');

    // Create gallery using service
    const galleryResult = await createGalleryRecord({
      ownerId: allUserRecord.id,
      title: title || (type === 'from-folder' ? `Gallery from ${folderName}` : 'My Gallery'),
      description: description || '',
      sharingStatus: isPublic ? 'public' : 'private',
      totalMemories: galleryMemories.length,
      storageLocation: ['s3'],
    });

    if (!galleryResult.success || !galleryResult.data) {
      return NextResponse.json({ error: galleryResult.error || 'Failed to create gallery' }, { status: 500 });
    }

    const gallery = galleryResult.data;

    // Add memories to gallery using service
    const galleryItemsData = galleryMemories.map((memory, index) => ({
      galleryId: gallery.id,
      memoryId: memory.id,
      memoryType: memory.type as 'image' | 'video' | 'document' | 'note' | 'audio',
      position: index,
      caption: null,
      isFeatured: false,
      metadata: {},
    }));

    const itemsResult = await createGalleryItems(galleryItemsData);
    if (!itemsResult.success) {
      fatLogger.warn('Failed to create some gallery items', 'be', { error: itemsResult.error });
    }

    return NextResponse.json(
      {
        gallery,
        memoriesCount: galleryMemories.length,
        memories: galleryMemories,
      },
      { status: 201 }
    );
  } catch (error) {
    fatLogger.error('Error creating gallery:', 'be', {
      data: error instanceof Error ? error : undefined,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({
      error: 'Failed to create gallery',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
