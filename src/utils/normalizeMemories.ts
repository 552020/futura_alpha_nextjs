import { Memory } from "@/types/memory";

interface RawMemoryData {
  images: Array<{
    id: string;
    title?: string;
    description?: string;
    createdAt: string;
    url: string;
    metadata?: {
      originalPath?: string;
      folderName?: string;
    };
  }>;
  documents: Array<{
    id: string;
    title?: string;
    description?: string;
    createdAt: string;
    url: string;
    mimeType: string;
    metadata?: {
      originalPath?: string;
      folderName?: string;
    };
  }>;
  notes: Array<{
    id: string;
    title: string;
    content: string;
    createdAt: string;
    metadata?: {
      originalPath?: string;
      folderName?: string;
    };
  }>;
  videos: Array<{
    id: string;
    title: string;
    description?: string;
    createdAt: string;
    url: string;
    mimeType: string;
    metadata?: {
      originalPath?: string;
      folderName?: string;
    };
  }>;
}

// Helper function to extract filename from full path
const extractFilename = (title: string, metadata?: { originalPath?: string; folderName?: string }): string => {
  // If we have originalPath metadata, extract just the filename
  if (metadata?.originalPath) {
    const pathParts = metadata.originalPath.split("/");
    return pathParts[pathParts.length - 1] || title;
  }
  return title;
};

export const normalizeMemories = (data: RawMemoryData): Memory[] => {
  return [
    ...data.images.map((img) => ({
      id: img.id,
      type: "image" as const,
      title: extractFilename(img.title || "Untitled Image", img.metadata),
      description: img.description,
      createdAt: img.createdAt,
      thumbnail: img.url,
      metadata: img.metadata,
    })),
    ...data.videos.map((video) => ({
      id: video.id,
      type: "video" as const,
      title: extractFilename(video.title || "Untitled Video", video.metadata),
      description: video.description,
      createdAt: video.createdAt,
      thumbnail: video.url,
      url: video.url,
      mimeType: video.mimeType,
      metadata: video.metadata,
    })),
    ...data.documents.map((doc) => ({
      id: doc.id,
      type: "document" as const,
      title: extractFilename(doc.title || "Untitled Document", doc.metadata),
      description: doc.description,
      createdAt: doc.createdAt,
      url: doc.url,
      mimeType: doc.mimeType,
      metadata: doc.metadata,
    })),
    ...data.notes.map((note) => ({
      id: note.id,
      type: "note" as const,
      title: extractFilename(note.title, note.metadata),
      description: note.content.substring(0, 100) + "...",
      createdAt: note.createdAt,
      content: note.content,
      metadata: note.metadata,
    })),
  ];
};
