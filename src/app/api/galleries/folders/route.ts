import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/db";
import { eq, sql } from "drizzle-orm";
import { allUsers, images, videos, documents, notes, audio } from "@/db/schema";
import { FolderInfo } from "@/types/gallery";

export async function GET() {
  // Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get the allUserId for the authenticated user
    const allUserRecord = await db.query.allUsers.findFirst({
      where: eq(allUsers.userId, session.user.id),
    });

    if (!allUserRecord) {
      console.error("No allUsers record found for user:", session.user.id);
      return NextResponse.json({ error: "User record not found" }, { status: 404 });
    }

    // console.log("Fetching folders for user:", {
    //   sessionUserId: session.user.id,
    //   allUserId: allUserRecord.id,
    //   useMockData,
    // });

    // Get all memories for the user and extract unique folder names
    const folderCondition = sql`metadata->>'folderName' IS NOT NULL AND metadata->>'folderName' != ''`;

    // Get images with folder names
    const folderImages = await db.query.images.findMany({
      where: sql`${eq(images.ownerId, allUserRecord.id)} AND ${folderCondition}`,
      columns: {
        id: true,
        metadata: true,
      },
    });

    // Get videos with folder names
    const folderVideos = await db.query.videos.findMany({
      where: sql`${eq(videos.ownerId, allUserRecord.id)} AND ${folderCondition}`,
      columns: {
        id: true,
        metadata: true,
      },
    });

    // Get documents with folder names
    const folderDocuments = await db.query.documents.findMany({
      where: sql`${eq(documents.ownerId, allUserRecord.id)} AND ${folderCondition}`,
      columns: {
        id: true,
        metadata: true,
      },
    });

    // Get notes with folder names
    const folderNotes = await db.query.notes.findMany({
      where: sql`${eq(notes.ownerId, allUserRecord.id)} AND ${folderCondition}`,
      columns: {
        id: true,
        metadata: true,
      },
    });

    // Get audio with folder names
    const folderAudio = await db.query.audio.findMany({
      where: sql`${eq(audio.ownerId, allUserRecord.id)} AND ${folderCondition}`,
      columns: {
        id: true,
        metadata: true,
      },
    });

    // Combine all memories and group by folder name
    const allMemories = [
      ...folderImages.map((img) => ({ ...img, type: "image" as const })),
      ...folderVideos.map((vid) => ({ ...vid, type: "video" as const })),
      ...folderDocuments.map((doc) => ({ ...doc, type: "document" as const })),
      ...folderNotes.map((note) => ({ ...note, type: "note" as const })),
      ...folderAudio.map((aud) => ({ ...aud, type: "audio" as const })),
    ];

    // Group memories by folder name
    const folderMap = new Map<string, typeof allMemories>();

    allMemories.forEach((memory) => {
      const folderName = memory.metadata?.folderName;
      if (folderName && typeof folderName === "string") {
        if (!folderMap.has(folderName)) {
          folderMap.set(folderName, []);
        }
        folderMap.get(folderName)!.push(memory);
      }
    });

    // Convert to FolderInfo format
    const folders: FolderInfo[] = Array.from(folderMap.entries()).map(([folderName, memories]) => {
      // Get preview images (first 2 images from the folder)
      const previewImages = memories
        .filter((memory) => memory.type === "image")
        .slice(0, 2)
        .map((memory) => {
          // Extract image URL from metadata
          const metadata = memory.metadata as Record<string, unknown>;
          return (metadata?.url as string) || (metadata?.imageUrl as string) || "";
        })
        .filter((url) => url);

      return {
        name: folderName,
        imageCount: memories.length,
        previewImages: previewImages.length > 0 ? previewImages : [],
        hasImages: memories.some((memory) => memory.type === "image"),
      };
    });

    // Sort folders by name
    folders.sort((a, b) => a.name.localeCompare(b.name));

    // console.log("Found folders:", {
    //   count: folders.length,
    //   folders: folders.map(f => ({ name: f.name, count: f.count })),
    // });

    return NextResponse.json(folders);
  } catch (error) {
    console.error("Error fetching folders:", error);
    return NextResponse.json({ error: "Failed to fetch folders" }, { status: 500 });
  }
}
