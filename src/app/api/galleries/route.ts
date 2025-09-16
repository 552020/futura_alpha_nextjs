import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db/db';
import { eq, desc, sql } from 'drizzle-orm';
import { galleries, allUsers, images, videos, documents, notes, audio, galleryItems } from '@/db/schema';
import { addStorageStatusToGalleries } from './utils';

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
    const allUserRecord = await db.query.allUsers.findFirst({
      where: eq(allUsers.userId, session.user.id),
    });

    if (!allUserRecord) {
      console.error('No allUsers record found for user:', session.user.id);
      return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const offset = (page - 1) * limit;

    // console.log("Fetching galleries for:", {
    //   sessionUserId: session.user.id,
    //   allUserId: allUserRecord.id,
    //   page,
    //   limit,
    //   offset,
    // });

    // Fetch user's galleries
    const userGalleries = await db.query.galleries.findMany({
      where: eq(galleries.ownerId, allUserRecord.id),
      orderBy: desc(galleries.createdAt),
      limit: limit,
      offset: offset,
    });

    // Add computed storage status to galleries
    const galleriesWithStorageStatus = await addStorageStatusToGalleries(userGalleries);

    // console.log("Fetched galleries:", {
    //   page,
    //   limit,
    //   offset,
    //   galleriesCount: userGalleries.length,
    // });

    return NextResponse.json({
      galleries: galleriesWithStorageStatus,
      hasMore: userGalleries.length === limit,
    });
  } catch (error) {
    console.error('Error listing galleries:', error);
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
    const allUserRecord = await db.query.allUsers.findFirst({
      where: eq(allUsers.userId, session.user.id),
    });

    if (!allUserRecord) {
      console.error('No allUsers record found for user:', session.user.id);
      return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    }

    const body = await request.json();
    const { type, folderName, memories, title, description, isPublic = false } = body;

    if (!type || !['from-folder', 'from-memories'].includes(type)) {
      return NextResponse.json({ error: "Type must be 'from-folder' or 'from-memories'" }, { status: 400 });
    }

    let galleryMemories: Array<{ id: string; type: string }> = [];

    if (type === 'from-folder') {
      if (!folderName) {
        return NextResponse.json({ error: 'Folder name is required for from-folder type' }, { status: 400 });
      }

      // Find all memories that belong to this folder
      const folderCondition = sql`metadata->>'folderName' = ${folderName}`;

      const folderImages = await db.query.images.findMany({
        where: sql`${eq(images.ownerId, allUserRecord.id)} AND ${folderCondition}`,
      });
      galleryMemories.push(...folderImages.map(img => ({ id: img.id, type: 'image' as const })));

      const folderVideos = await db.query.videos.findMany({
        where: sql`${eq(videos.ownerId, allUserRecord.id)} AND ${folderCondition}`,
      });
      galleryMemories.push(...folderVideos.map(vid => ({ id: vid.id, type: 'video' as const })));

      const folderDocuments = await db.query.documents.findMany({
        where: sql`${eq(documents.ownerId, allUserRecord.id)} AND ${folderCondition}`,
      });
      galleryMemories.push(...folderDocuments.map(doc => ({ id: doc.id, type: 'document' as const })));

      const folderNotes = await db.query.notes.findMany({
        where: sql`${eq(notes.ownerId, allUserRecord.id)} AND ${folderCondition}`,
      });
      galleryMemories.push(...folderNotes.map(note => ({ id: note.id, type: 'note' as const })));

      const folderAudio = await db.query.audio.findMany({
        where: sql`${eq(audio.ownerId, allUserRecord.id)} AND ${folderCondition}`,
      });
      galleryMemories.push(...folderAudio.map(aud => ({ id: aud.id, type: 'audio' as const })));
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

    // Create new gallery
    const newGallery = await db
      .insert(galleries)
      .values({
        ownerId: allUserRecord.id,
        title: title || (type === 'from-folder' ? `Gallery from ${folderName}` : 'My Gallery'),
        description:
          description || (type === 'from-folder' ? `Gallery created from folder: ${folderName}` : 'Custom gallery'),
        isPublic,
      })
      .returning();

    const gallery = newGallery[0];

    // Add memories to gallery
    const galleryItemsData = galleryMemories.map((memory, index) => ({
      galleryId: gallery.id,
      memoryId: memory.id,
      memoryType: memory.type as 'image' | 'video' | 'document' | 'note' | 'audio',
      position: index,
      caption: null,
      isFeatured: false,
      metadata: {},
    }));

    // Insert gallery items
    await db.insert(galleryItems).values(galleryItemsData);

    // console.log("Created gallery:", {
    //   type,
    //   folderName,
    //   galleryId: gallery.id,
    //   memoriesCount: galleryMemories.length,
    //   galleryItemsData: galleryItemsData,
    // });

    return NextResponse.json(
      {
        gallery,
        memoriesCount: galleryMemories.length,
        memories: galleryMemories,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating gallery:', error);
    return NextResponse.json({ error: 'Failed to create gallery' }, { status: 500 });
  }
}
