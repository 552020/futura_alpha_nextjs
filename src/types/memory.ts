export interface Memory {
  id: string;
  type: 'image' | 'video' | 'note' | 'audio' | 'document' | 'folder';
  title: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
  thumbnail?: string;
  content?: string;
  url?: string;
  mimeType?: string;
  ownerId?: string;
  ownerName?: string;
  isPublic?: boolean;
  parentFolderId?: string | null;
  // Tags and people
  tags?: string[];
  people?: PersonInMemory[];
  // Universal fields
  recipients?: string[];
  fileCreatedAt?: string;
  unlockDate?: string;
  deletedAt?: string;
  // Flexible metadata
  metadata?: {
    originalPath?: string;
    custom?: Record<string, unknown>;
  };
  // Folder-specific properties
  itemCount?: number;
  memories?: Memory[];
}

export interface PersonInMemory {
  id: string;
  memoryId: string;
  allUserId: string;
  role?: string; // "subject", "photographer", "witness", etc.
  createdAt: string;
  // Person details (from allUsers -> users or temporaryUsers)
  person?: {
    id: string;
    name?: string;
    email?: string;
    avatar?: string;
    isTemporary?: boolean;
  };
}
