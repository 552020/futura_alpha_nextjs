// import { normalizeMemories } from "@/utils/normalizeMemories"; // Unused
import { Memory } from '@/types/memory';

import { logger } from '@/lib/logger';
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
  logger.info(`🔍 Fetching memories for page ${page}...`);
  const response = await fetch(`/api/memories?page=${page}`);
  logger.info(`🔍 API response status: ${response.status} ${response.statusText}`);

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
  logger.info(`🔍 API response data:`, {
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
  logger.info('🚀 LINE 129: ENTERING processDashboardItems');
  logger.info('🔍 processDashboardItems - Received memories:', { count: memories.length });
  logger.info('🔍 All memories with folder info:', {
    memories: memories.map(m => ({
      id: m.id,
      title: m.title,
      parentFolderId: m.parentFolderId,
      folderName: m.folder?.name,
    })),
  });

  // Step 1: Group memories by parentFolderId
  const folderGroups = memories.reduce(
    (groups, memory) => {
      const parentFolderId = memory.parentFolderId;
      logger.info(`🔍 Processing memory "${memory.title}" with parentFolderId: ${parentFolderId}`);
      if (parentFolderId) {
        if (!groups[parentFolderId]) {
          groups[parentFolderId] = [];
          logger.info(`📁 Created new folder group for: ${parentFolderId}`);
        }
        groups[parentFolderId].push(memory);
        logger.info(
          `📁 Added "${memory.title}" to folder ${parentFolderId}. Group now has ${groups[parentFolderId].length} items`
        );
      } else {
        logger.info(`🔍 Memory "${memory.title}" has no parentFolderId - will be individual`);
      }
      return groups;
    },
    {} as Record<string, MemoryWithFolder[]>
  );

  logger.info('🔍 Final folder groups:', {
    folderGroups: Object.entries(folderGroups).map(([folderId, memories]) => ({
      folderId,
      folderName: memories[0]?.folder?.name || 'Unknown',
      count: memories.length,
      memories: memories.map(m => m.title),
    })),
  });

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
    // Prefer the first memory's best available asset for a folder thumbnail
    thumbnail:
      (
        folderMemories[0] as (typeof folderMemories)[0] & { assets?: Array<{ assetType: string; url: string }> }
      )?.assets?.find?.(a => a.assetType === 'thumb')?.url ||
      (
        folderMemories[0] as (typeof folderMemories)[0] & { assets?: Array<{ assetType: string; url: string }> }
      )?.assets?.find?.(a => a.assetType === 'display')?.url ||
      (
        folderMemories[0] as (typeof folderMemories)[0] & { assets?: Array<{ assetType: string; url: string }> }
      )?.assets?.find?.(a => a.assetType === 'original')?.url ||
      folderMemories[0]?.thumbnail ||
      '',
    status: 'private' as const,
    sharedWithCount: 0,
  }));

  logger.info('🔍 Created folder items:', { folderItems });

  // Step 3: Get individual memories (not in folders)
  const individualMemories = memories.filter(memory => !memory.parentFolderId);

  // logger.info("🔍 Individual memories:", individualMemories.length);

  // Step 4: Combine and return
  const result = [...individualMemories, ...folderItems];
  logger.info('🔍 Final result:', { count: result.length, type: 'items' });
  logger.info('🔍 Individual memories count:', { count: individualMemories.length });
  logger.info('🔍 Folder items count:', { count: folderItems.length });

  logger.info('✅ LINE 180: EXITING processDashboardItems');
  return result;
};

export const memoryActions = {
  delete: deleteMemory,

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  share: async (id: string) => {
    // TODO: Implement share logic
    // logger.info("Sharing memory:", id);
  },

  navigate: (memory: Memory, lang: string, segment: string) => {
    return `/${lang}/${segment}/dashboard/${memory.id}`;
  },
};
