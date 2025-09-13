export interface Memory {
  id: string;
  type: "image" | "video" | "note" | "audio" | "document" | "folder";
  title: string;
  description?: string;
  createdAt: string;
  thumbnail?: string;
  content?: string;
  url?: string;
  mimeType?: string;
  ownerId?: string;
  ownerName?: string;
  metadata?: {
    originalPath?: string;
    folderName?: string;
  };
  // Folder-specific properties
  itemCount?: number;
  memories?: Memory[];
}
