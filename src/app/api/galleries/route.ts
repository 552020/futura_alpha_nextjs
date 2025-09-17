import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db/db';
import { eq, desc, and, inArray } from 'drizzle-orm';
import { galleries, allUsers, memories as memoriesTable, folders, galleryItems } from '@/db/schema';
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

      // First, find the folder by name to get its ID
      const folder = await db.query.folders.findFirst({
        where: and(eq(folders.name, folderName), eq(folders.ownerId, allUserRecord.id)),
      });

      if (!folder) {
        return NextResponse.json({ error: `Folder '${folderName}' not found` }, { status: 404 });
      }

      // Find all memories that belong to this folder using the unified memories table
      const folderMemories = await db.query.memories.findMany({
        where: and(eq(memoriesTable.ownerId, allUserRecord.id), eq(memoriesTable.parentFolderId, folder.id)),
      });

      // Convert to gallery memory format
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

    // Create new gallery
    const newGallery = await db
      .insert(galleries)
      .values({
        ownerId: allUserRecord.id,
        title: title || (type === 'from-folder' ? `Gallery from ${folderName}` : 'My Gallery'),
        description:
          description || (type === 'from-folder' ? `Gallery created from folder: ${folderName}` : 'Custom gallery'),
        isPublic,
        // Storage status fields - will be calculated from memories
        totalMemories: galleryMemories.length,
        storageLocations: [], // Will be calculated from memories
        averageStorageDuration: null, // Will be calculated from memories
        storageDistribution: {}, // Will be calculated from memories
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

    // Calculate storage status from memories
    const memoryIds = galleryMemories.map(m => m.id);
    const memoriesWithStorage = await db.query.memories.findMany({
      where: and(eq(memoriesTable.ownerId, allUserRecord.id), inArray(memoriesTable.id, memoryIds)),
    });

    // Calculate storage distribution
    const storageDistribution: Record<string, number> = {};
    const allStorageLocations = new Set<'neon-db' | 'vercel-blob' | 'icp-canister' | 'aws-s3'>();
    let totalDuration = 0;
    let permanentCount = 0;

    memoriesWithStorage.forEach(memory => {
      memory.storageLocations?.forEach(location => {
        allStorageLocations.add(location);
        storageDistribution[location] = (storageDistribution[location] || 0) + 1;
      });

      if (memory.storageDuration === null) {
        permanentCount++;
      } else {
        totalDuration += memory.storageDuration;
      }
    });

    const averageStorageDuration =
      permanentCount === memoriesWithStorage.length
        ? null
        : Math.round(totalDuration / (memoriesWithStorage.length - permanentCount));

    // Update gallery with calculated storage status
    await db
      .update(galleries)
      .set({
        storageLocations: Array.from(allStorageLocations),
        averageStorageDuration,
        storageDistribution,
      })
      .where(eq(galleries.id, gallery.id));

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
