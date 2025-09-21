// import { normalizeMemories } from "@/utils/normalizeMemories"; // Unused
import { Memory } from '@/types/memory';

// Removed old interfaces - now using unified format

export interface MemoryWithFolder extends Omit<Memory, 'parentFolderId'> {
  status: 'private' | 'shared' | 'public';
  sharedWithCount?: number;
  parentFolderId?: string | null; // Allow null for database compatibility
  folder?: {
    id: string;
    name: string;
    ownerId: string;
    parentFolderId?: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  metadata?: {
    originalPath?: string;
    folderName?: string; // Keep for backward compatibility
  };
}

export interface FolderItem {
  id: string;
  type: 'folder';
  title: string;
  description: string;
  itemCount: number;
  memories: MemoryWithFolder[];
  folderId: string; // Store actual folder ID for navigation
  createdAt: string;
  url?: string;
  thumbnail?: string;
  status: 'private' | 'shared' | 'public';
  sharedWithCount?: number;
}

export type DashboardItem = MemoryWithFolder | FolderItem;

export interface FetchMemoriesResult {
  memories: MemoryWithFolder[];
  hasMore: boolean;
}

export const fetchMemories = async (page: number): Promise<FetchMemoriesResult> => {
  console.log(`🔍 Fetching memories for page ${page}...`);
  const response = await fetch(`/api/memories?page=${page}`);
  console.log(`🔍 API response status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    // Try to get error details from the response
    let errorMessage = 'Failed to fetch memories';
    let errorDetails: Record<string, unknown> = {};

    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
      errorDetails = errorData;
    } catch {
      // If we can't parse the error response, use the status text
      errorMessage = response.statusText || errorMessage;
    }

    const error = new Error(errorMessage);
    // Attach additional error details for debugging
    (error as Error & { status?: number; statusText?: string; details?: Record<string, unknown> }).status =
      response.status;
    (error as Error & { status?: number; statusText?: string; details?: Record<string, unknown> }).statusText =
      response.statusText;
    (error as Error & { status?: number; statusText?: string; details?: Record<string, unknown> }).details =
      errorDetails;

    throw error;
  }

  const data = await response.json();
  console.log(`🔍 API response data:`, {
    memoriesCount: data.data?.length || 0,
    hasMore: data.hasMore,
    total: data.total,
  });

  // Use new unified format - memories already have status and sharedWithCount
  const memories = data.data.map((memory: Memory & { status?: string; sharedWithCount?: number }) => ({
    ...memory,
    // Ensure we have the expected properties
    status: memory.status || 'private',
    sharedWithCount: memory.sharedWithCount || 0,
  }));

  return {
    memories,
    hasMore: data.hasMore,
  };
};

export const deleteMemory = async (id: string): Promise<void> => {
  const response = await fetch(`/api/memories/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete memory');
  }
};

export const deleteAllMemories = async (options?: {
  type?: 'image' | 'document' | 'note' | 'video' | 'audio';
  folder?: string;
  all?: boolean;
}): Promise<{ success: boolean; message: string; deletedCount: number }> => {
  const params = new URLSearchParams();

  if (options?.type) {
    params.append('type', options.type);
  }
  if (options?.folder) {
    params.append('folder', options.folder);
  }
  if (options?.all) {
    params.append('all', 'true');
  }

  const response = await fetch(`/api/memories?${params.toString()}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete memories');
  }

  return response.json();
};

export const processDashboardItems = (memories: MemoryWithFolder[]): DashboardItem[] => {
  console.log('🚀 LINE 129: ENTERING processDashboardItems');
  console.log('🔍 processDashboardItems - Received memories:', memories.length);
  console.log('🔍 Sample memory with folder info:', memories[0]);

  // Step 1: Group memories by parentFolderId
  const folderGroups = memories.reduce(
    (groups, memory) => {
      const parentFolderId = memory.parentFolderId;
      if (parentFolderId) {
        if (!groups[parentFolderId]) {
          groups[parentFolderId] = [];
        }
        groups[parentFolderId].push(memory);
      }
      return groups;
    },
    {} as Record<string, MemoryWithFolder[]>
  );

  console.log('🔍 Folder groups:', folderGroups);

  // Step 2: Create FolderItems for each group
  const folderItems: FolderItem[] = Object.entries(folderGroups).map(([folderId, folderMemories]) => ({
    id: `folder-${folderId}`,
    type: 'folder' as const,
    title: folderMemories[0]?.folder?.name || 'Unknown Folder',
    description: `${folderMemories.length} items`,
    itemCount: folderMemories.length,
    memories: folderMemories,
    folderId: folderId, // Store actual folder ID
    createdAt: folderMemories[0]?.createdAt || new Date().toISOString(),
    url: folderMemories[0]?.url || '',
    thumbnail: folderMemories[0]?.thumbnail || '',
    status: 'private' as const,
    sharedWithCount: 0,
  }));

  console.log('🔍 Created folder items:', folderItems);

  // Step 3: Get individual memories (not in folders)
  const individualMemories = memories.filter(memory => !memory.parentFolderId);

  // console.log("🔍 Individual memories:", individualMemories.length);

  // Step 4: Combine and return
  const result = [...individualMemories, ...folderItems];
  console.log('🔍 Final result:', result.length, 'items');
  console.log('🔍 Individual memories count:', individualMemories.length);
  console.log('🔍 Folder items count:', folderItems.length);

  console.log('✅ LINE 180: EXITING processDashboardItems');
  return result;
};

export const memoryActions = {
  delete: deleteMemory,

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  share: async (id: string) => {
    // TODO: Implement share logic
    // console.log("Sharing memory:", id);
  },

  navigate: (memory: Memory, lang: string, segment: string) => {
    return `/${lang}/${segment}/dashboard/${memory.id}`;
  },
};
