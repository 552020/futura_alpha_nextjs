// import { normalizeMemories } from "@/utils/normalizeMemories"; // Unused
import { Memory } from '@/types/memory';

// Removed old interfaces - now using unified format

export interface NormalizedMemory extends Memory {
  status: 'private' | 'shared' | 'public';
  sharedWithCount?: number;
  metadata?: {
    originalPath?: string;
    folderName?: string;
  };
}

export interface FolderItem {
  id: string;
  type: 'folder';
  title: string;
  description: string;
  itemCount: number;
  memories: NormalizedMemory[];
  createdAt: string;
  url?: string;
  thumbnail?: string;
  status: 'private' | 'shared' | 'public';
  sharedWithCount?: number;
}

export type DashboardItem = NormalizedMemory | FolderItem;

export interface FetchMemoriesResult {
  memories: NormalizedMemory[];
  hasMore: boolean;
}

export const fetchMemories = async (page: number): Promise<FetchMemoriesResult> => {
  const response = await fetch(`/api/memories?page=${page}`);

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

export const processDashboardItems = (memories: NormalizedMemory[]): DashboardItem[] => {
  // console.log("🚀 LINE 129: ENTERING processDashboardItems");
  // console.log("🔍 processDashboardItems - Received memories:", memories.length);

  // Step 1: Group memories by folderName
  const folderGroups = memories.reduce(
    (groups, memory) => {
      const folderName = memory.metadata?.folderName;
      if (folderName) {
        if (!groups[folderName]) {
          groups[folderName] = [];
        }
        groups[folderName].push(memory);
      }
      return groups;
    },
    {} as Record<string, NormalizedMemory[]>
  );

  // console.log("🔍 Folder groups:", folderGroups);

  // Step 2: Create FolderItems for each group
  const folderItems: FolderItem[] = Object.entries(folderGroups).map(([folderName, folderMemories]) => ({
    id: `folder-${folderName}`,
    type: 'folder' as const,
    title: folderName,
    description: `${folderMemories.length} items`,
    itemCount: folderMemories.length,
    memories: folderMemories,
    createdAt: folderMemories[0]?.createdAt || new Date().toISOString(),
    url: folderMemories[0]?.url || '',
    thumbnail: folderMemories[0]?.thumbnail || '',
    status: 'private' as const,
    sharedWithCount: 0,
  }));

  // console.log("🔍 Created folder items:", folderItems);

  // Step 3: Get individual memories (not in folders)
  const individualMemories = memories.filter(memory => !memory.metadata?.folderName);

  // console.log("🔍 Individual memories:", individualMemories.length);

  // Step 4: Combine and return
  const result = [...individualMemories, ...folderItems];
  // console.log("🔍 Final result:", result.length, "items");

  // console.log("✅ LINE 180: EXITING processDashboardItems");
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
