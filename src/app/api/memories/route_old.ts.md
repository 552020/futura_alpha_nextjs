## **WHERE THESE FUNCTIONS ARE CALLED:**

### **GET /api/memories - Memory Listing:**

#### **Frontend Services:**

- **`src/services/memories.ts`** - `fetchMemories()` function (line 66)
- **`src/services/memories.ts`** - `fetchAndNormalizeMemories()` function (line 82)

#### **Frontend Pages:**

- **`src/app/[lang]/shared/page.tsx`** - Shared memories page (line 41)

#### **Frontend Components:**

- **`src/components/memory/memory-viewer.tsx`** - Memory viewer component (line 49)

### **DELETE /api/memories - Memory Deletion:**

#### **Frontend Services:**

- **`src/services/memories.ts`** - `deleteAllMemories()` function (line 129)

#### **Frontend Pages:**

- **`src/app/[lang]/shared/page.tsx`** - Individual memory deletion (line 128)
- **`src/app/[lang]/shared/page.tsx`** - Folder deletion (line 115)

#### **Test Scripts:**

- **`scripts/test-bulk-delete.sh`** - Bulk deletion testing (lines 25-61)

### **API Usage Pattern:**

```typescript
// Basic pagination
const response = await fetch(`/api/memories?page=${page}`);

// With type filtering
const response = await fetch(`/api/memories?type=image&page=${page}`);

// With folder filtering
const response = await fetch(`/api/memories?folder=${folderName}`);

// With optimized query
const response = await fetch(`/api/memories?optimized=true`);
```

### **Response Format Expected:**

```typescript
{
  images: Array<DBImage & { status: "private"|"shared"|"public"; sharedWithCount: number }>,
  documents: Array<DBDocument & { status: "private"|"shared"|"public"; sharedWithCount: number }>,
  notes: Array<DBNote & { status: "private"|"shared"|"public"; sharedWithCount: number }>,
  hasMore: boolean
}
```

---

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db/db';
import { eq, desc, sql } from 'drizzle-orm';
// import { files, photos, texts, Photo, File, Text } from "@/db/schema";
import { images, documents, notes, videos, audio, allUsers, memoryShares } from '@/db/schema';
import { DBImage, DBDocument, DBNote } from '@/db/schema';
import { fetchMemoriesWithGalleries } from './queries';
import { cleanupStorageEdgesForMemory } from './upload/utils';

// Helper function to clean up storage edges for deleted memories
async function cleanupStorageEdgesForMemories(memories: Array<{ id: string; type: string }>) {
  const cleanupPromises = memories.map(({ id, type }) =>
    cleanupStorageEdgesForMemory({
      memoryId: id,
      memoryType: type as 'image' | 'video' | 'note' | 'document' | 'audio',
    })
  );

  const results = await Promise.allSettled(cleanupPromises);

  let successCount = 0;
  let errorCount = 0;

  results.forEach(result => {
    if (result.status === 'fulfilled' && result.value.success) {
      successCount++;
    } else {
      errorCount++;
    }
  });

  // console.log(`Storage edge cleanup: ${successCount} successful, ${errorCount} failed`);

  return { successCount, errorCount };
}

export async function GET(request: NextRequest) {
  // Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // First get the allUserId for the authenticated user
    const allUserRecord = await db.query.allUsers.findFirst({
      where: eq(allUsers.userId, session.user.id),
    });

    if (!allUserRecord) {
      console.error('No allUsers record found for user:', session.user.id);
      return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const fileType = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const offset = (page - 1) * limit;
    const useOptimizedQuery = searchParams.get('optimized') === 'true';

    // console.log("Fetching memories for:", {
    //   sessionUserId: session.user.id,
    //   allUserId: allUserRecord.id,
    //   page,
    //   limit,
    //   offset,
    //   useOptimizedQuery,
    // });

    // Use optimized query if requested
    if (useOptimizedQuery) {
      try {
        const memoriesWithGalleries = await fetchMemoriesWithGalleries(allUserRecord.id);

        // Apply pagination
        const paginatedMemories = memoriesWithGalleries.slice(offset, offset + limit);

        // console.log("Optimized query results:", {
        //   total: memoriesWithGalleries.length,
        //   paginated: paginatedMemories.length,
        //   hasMore: memoriesWithGalleries.length > offset + limit,
        // });

        return NextResponse.json({
          data: paginatedMemories,
          hasMore: memoriesWithGalleries.length > offset + limit,
          total: memoriesWithGalleries.length,
        });
      } catch (error) {
        console.error('Error with optimized query:', error);
        // Fall back to original implementation
      }
    }

    let userImages: (DBImage & { status: 'private' | 'shared' | 'public'; sharedWithCount: number })[] = [];
    let userDocuments: (DBDocument & { status: 'private' | 'shared' | 'public'; sharedWithCount: number })[] = [];
    let userNotes: (DBNote & { status: 'private' | 'shared' | 'public'; sharedWithCount: number })[] = [];

    // If no specific type is requested or photos are requested
    if (!fileType || fileType === 'photo') {
      const fetchedImages = await db.query.images.findMany({
        where: eq(images.ownerId, allUserRecord.id),
        orderBy: desc(images.createdAt),
        limit: limit,
        offset: offset,
      });

      // Get share counts for each image
      const shareCounts = await Promise.all(
        fetchedImages.map(async (image: DBImage) => {
          const count = await db
            .select({ count: sql<number>`count(*)` })
            .from(memoryShares)
            .where(eq(memoryShares.memoryId, image.id));
          return {
            id: image.id,
            count: count[0].count,
            isPublic: image.isPublic,
          };
        })
      );

      userImages = fetchedImages.map((image: DBImage) => {
        const shareInfo = shareCounts.find(s => s.id === image.id);
        return {
          ...image,
          status: image.isPublic ? 'public' : shareInfo?.count ? 'shared' : 'private',
          sharedWithCount: shareInfo?.count || 0,
        };
      });
    }

    // If no specific type is requested or files are requested
    if (!fileType || fileType === 'file') {
      const fetchedDocuments = await db.query.documents.findMany({
        where: eq(documents.ownerId, allUserRecord.id),
        orderBy: desc(documents.createdAt),
        limit: limit,
        offset: offset,
      });

      // Get share counts for each document
      const shareCounts = await Promise.all(
        fetchedDocuments.map(async (document: DBDocument) => {
          const count = await db
            .select({ count: sql<number>`count(*)` })
            .from(memoryShares)
            .where(eq(memoryShares.memoryId, document.id));
          return {
            id: document.id,
            count: count[0].count,
            isPublic: document.isPublic,
          };
        })
      );

      userDocuments = fetchedDocuments.map((document: DBDocument) => {
        const shareInfo = shareCounts.find(s => s.id === document.id);
        return {
          ...document,
          status: document.isPublic ? 'public' : shareInfo?.count ? 'shared' : 'private',
          sharedWithCount: shareInfo?.count || 0,
        };
      });
    }

    // If no specific type is requested or texts are requested
    if (!fileType || fileType === 'text') {
      const fetchedNotes = await db.query.notes.findMany({
        where: eq(notes.ownerId, allUserRecord.id),
        orderBy: desc(notes.createdAt),
        limit: limit,
        offset: offset,
      });

      // Get share counts for each note
      const shareCounts = await Promise.all(
        fetchedNotes.map(async (note: DBNote) => {
          const count = await db
            .select({ count: sql<number>`count(*)` })
            .from(memoryShares)
            .where(eq(memoryShares.memoryId, note.id));
          return {
            id: note.id,
            count: count[0].count,
            isPublic: note.isPublic,
          };
        })
      );

      userNotes = fetchedNotes.map((note: DBNote) => {
        const shareInfo = shareCounts.find(s => s.id === note.id);
        return {
          ...note,
          status: note.isPublic ? 'public' : shareInfo?.count ? 'shared' : 'private',
          sharedWithCount: shareInfo?.count || 0,
        };
      });
    }

    // console.log("Fetched memories:", {
    //   page,
    //   limit,
    //   offset,
    //   imagesCount: userImages.length,
    //   documentsCount: userDocuments.length,
    //   notesCount: userNotes.length,
    // });

    return NextResponse.json({
      images: userImages,
      documents: userDocuments,
      notes: userNotes,
      hasMore: userImages.length + userDocuments.length + userNotes.length === limit,
    });
  } catch (error) {
    console.error('Error listing files:', error);
    return NextResponse.json({ error: 'Failed to list files' }, { status: 500 });
  }
}

// Bulk delete endpoint for testing purposes
export async function DELETE(request: NextRequest) {
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

    // Get query parameters for selective deletion
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type'); // "image", "document", "note", "video", "audio"
    const folder = searchParams.get('folder'); // folder name to delete
    const all = searchParams.get('all'); // "true" to delete all memories

    // console.log("Bulk delete request:", {
    //   sessionUserId: session.user.id,
    //   allUserId: allUserRecord.id,
    //   type,
    //   folder,
    //   all,
    // });

    let deletedCount = 0;

    // Delete based on parameters
    if (all === 'true') {
      // Delete all memories for the user
      const deletedImages = await db.delete(images).where(eq(images.ownerId, allUserRecord.id)).returning();
      const deletedDocuments = await db.delete(documents).where(eq(documents.ownerId, allUserRecord.id)).returning();
      const deletedNotes = await db.delete(notes).where(eq(notes.ownerId, allUserRecord.id)).returning();
      const deletedVideos = await db.delete(videos).where(eq(videos.ownerId, allUserRecord.id)).returning();
      const deletedAudio = await db.delete(audio).where(eq(audio.ownerId, allUserRecord.id)).returning();

      deletedCount =
        deletedImages.length +
        deletedDocuments.length +
        deletedNotes.length +
        deletedVideos.length +
        deletedAudio.length;

      // Clean up storage edges for deleted memories
      const memoriesToCleanup = [
        ...deletedImages.map(img => ({ id: img.id, type: 'image' })),
        ...deletedDocuments.map(doc => ({ id: doc.id, type: 'document' })),
        ...deletedNotes.map(note => ({ id: note.id, type: 'note' })),
        ...deletedVideos.map(video => ({ id: video.id, type: 'video' })),
        ...deletedAudio.map(audio => ({ id: audio.id, type: 'audio' })),
      ];

      if (memoriesToCleanup.length > 0) {
        await cleanupStorageEdgesForMemories(memoriesToCleanup);
      }
    } else if (type) {
      // Delete specific type
      let memoriesToCleanup: Array<{ id: string; type: string }> = [];

      switch (type) {
        case 'image':
          const deletedImages = await db.delete(images).where(eq(images.ownerId, allUserRecord.id)).returning();
          deletedCount = deletedImages.length;
          memoriesToCleanup = deletedImages.map(img => ({ id: img.id, type: 'image' }));
          break;
        case 'document':
          const deletedDocuments = await db
            .delete(documents)
            .where(eq(documents.ownerId, allUserRecord.id))
            .returning();
          deletedCount = deletedDocuments.length;
          memoriesToCleanup = deletedDocuments.map(doc => ({ id: doc.id, type: 'document' }));
          break;
        case 'note':
          const deletedNotes = await db.delete(notes).where(eq(notes.ownerId, allUserRecord.id)).returning();
          deletedCount = deletedNotes.length;
          memoriesToCleanup = deletedNotes.map(note => ({ id: note.id, type: 'note' }));
          break;
        case 'video':
          const deletedVideos = await db.delete(videos).where(eq(videos.ownerId, allUserRecord.id)).returning();
          deletedCount = deletedVideos.length;
          memoriesToCleanup = deletedVideos.map(video => ({ id: video.id, type: 'video' }));
          break;
        case 'audio':
          const deletedAudio = await db.delete(audio).where(eq(audio.ownerId, allUserRecord.id)).returning();
          deletedCount = deletedAudio.length;
          memoriesToCleanup = deletedAudio.map(audio => ({ id: audio.id, type: 'audio' }));
          break;
        default:
          return NextResponse.json({ error: `Invalid type: ${type}` }, { status: 400 });
      }

      // Clean up storage edges for deleted memories
      if (memoriesToCleanup.length > 0) {
        await cleanupStorageEdgesForMemories(memoriesToCleanup);
      }
    } else if (folder) {
      // Delete memories in specific folder (using metadata.folderName)
      const folderCondition = sql`metadata->>'folderName' = ${folder}`;

      const deletedImages = await db
        .delete(images)
        .where(sql`${eq(images.ownerId, allUserRecord.id)} AND ${folderCondition}`)
        .returning();
      const deletedDocuments = await db
        .delete(documents)
        .where(sql`${eq(documents.ownerId, allUserRecord.id)} AND ${folderCondition}`)
        .returning();
      const deletedNotes = await db
        .delete(notes)
        .where(sql`${eq(notes.ownerId, allUserRecord.id)} AND ${folderCondition}`)
        .returning();
      const deletedVideos = await db
        .delete(videos)
        .where(sql`${eq(videos.ownerId, allUserRecord.id)} AND ${folderCondition}`)
        .returning();
      const deletedAudio = await db
        .delete(audio)
        .where(sql`${eq(audio.ownerId, allUserRecord.id)} AND ${folderCondition}`)
        .returning();

      deletedCount =
        deletedImages.length +
        deletedDocuments.length +
        deletedNotes.length +
        deletedVideos.length +
        deletedAudio.length;

      // Clean up storage edges for deleted memories
      const memoriesToCleanup = [
        ...deletedImages.map(img => ({ id: img.id, type: 'image' })),
        ...deletedDocuments.map(doc => ({ id: doc.id, type: 'document' })),
        ...deletedNotes.map(note => ({ id: note.id, type: 'note' })),
        ...deletedVideos.map(video => ({ id: video.id, type: 'video' })),
        ...deletedAudio.map(audio => ({ id: audio.id, type: 'audio' })),
      ];

      if (memoriesToCleanup.length > 0) {
        await cleanupStorageEdgesForMemories(memoriesToCleanup);
      }
    } else {
      return NextResponse.json(
        {
          error: "Missing parameter. Use 'all=true', 'type=<memory_type>', or 'folder=<folder_name>'",
        },
        { status: 400 }
      );
    }

    // console.log("Bulk delete completed:", { deletedCount, type, folder, all });

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deletedCount} memories`,
      deletedCount,
      type,
      folder,
      all,
    });
  } catch (error) {
    console.error('Error in bulk delete:', error);
    return NextResponse.json({ error: 'Failed to delete memories' }, { status: 500 });
  }
}
```
