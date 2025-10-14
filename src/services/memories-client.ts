// Client-side service for memories
// This file should NOT import any database-related code

import { fatLogger } from '@/lib/logger';

// Import types from the main service file
import type { MemoryWithFolder, DashboardItem, FolderItem } from '@/services/memories';

// Re-export types for client components
export type { MemoryWithFolder, DashboardItem, FolderItem };

export interface FetchMemoriesResult {
  data: MemoryWithFolder[];
  hasMore: boolean;
  total: number;
}

/**
 * Fetch memories from API endpoint (client-side only)
 */
export const fetchMemories = async (
  page: number,
  dataSource: 'neon' | 'icp' = 'neon'
): Promise<FetchMemoriesResult> => {
  fatLogger.info(`🔍 Fetching memories for page ${page} from ${dataSource}...`, 'be');

  if (dataSource === 'icp') {
    return await fetchMemoriesFromICP(page);
  } else {
    return await fetchMemoriesFromNeon(page);
  }
};

// Fetch memories from Neon database via API (current implementation)
const fetchMemoriesFromNeon = async (page: number): Promise<FetchMemoriesResult> => {
  const response = await fetch(`/api/memories?page=${page}`, { cache: 'no-store' });
  fatLogger.info(`🔍 API response status: ${response.status} ${response.statusText}`, 'be');

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
  fatLogger.info('API response data', 'be', {
    memoriesCount: data.data?.length || 0,
    hasMore: data.hasMore,
  });

  return data;
};

// Fetch memories from ICP backend
const fetchMemoriesFromICP = async (page: number): Promise<FetchMemoriesResult> => {
  // ICP implementation would go here
  // For now, fallback to Neon
  return await fetchMemoriesFromNeon(page);
};

/**
 * Delete a single memory
 */
export const deleteMemory = async (id: string): Promise<void> => {
  const response = await fetch(`/api/memories/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete memory');
  }
};

/**
 * Delete all memories with options
 */
export const deleteAllMemories = async (options?: {
  type?: 'image' | 'document' | 'note' | 'video' | 'audio';
  folder?: string;
  all?: boolean;
  hostingPreferences?: { backendHosting?: string; blobHosting?: string[] };
}): Promise<{ success: boolean; message: string; deletedCount: number }> => {
  // Check if we should use ICP backend
  const useICP =
    options?.hostingPreferences?.backendHosting === 'icp' || options?.hostingPreferences?.blobHosting?.includes('icp');

  const url = useICP ? '/api/memories/delete-all-icp' : '/api/memories/delete-all';
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    throw new Error('Failed to delete memories');
  }

  return await response.json();
};

/**
 * Process dashboard items (pure function - no API calls)
 */
export const processDashboardItems = (memories: MemoryWithFolder[]): DashboardItem[] => {
  fatLogger.info('🚀 LINE 129: ENTERING processDashboardItems', 'be');
  fatLogger.info('🔍 processDashboardItems - Received memories:', 'be', { count: memories.length });
  fatLogger.info('🔍 All memories with folder info:', 'be', {
    memories: memories.map(m => ({
      id: m.id,
      title: m.title,
      type: m.type,
      folderId: m.folder?.id,
      folderName: m.folder?.name,
    })),
  });

  // Group memories by folder
  const folderGroups = new Map<string, MemoryWithFolder[]>();
  const standaloneMemories: MemoryWithFolder[] = [];

  memories.forEach(memory => {
    if (memory.folder?.id && memory.folder?.name) {
      if (!folderGroups.has(memory.folder.id)) {
        folderGroups.set(memory.folder.id, []);
      }
      folderGroups.get(memory.folder.id)!.push(memory);
    } else {
      standaloneMemories.push(memory);
    }
  });

  const dashboardItems: DashboardItem[] = [];

  // Add folder groups
  folderGroups.forEach((folderMemories, folderId) => {
    const folderName = folderMemories[0]?.folder?.name || 'Unknown Folder';
    dashboardItems.push({
      type: 'folder',
      id: folderId,
      title: folderName,
      description: `${folderMemories.length} memories`,
      itemCount: folderMemories.length,
      memories: folderMemories,
      folderId: folderId,
    } as FolderItem);
  });

  // Add standalone memories
  standaloneMemories.forEach(memory => {
    dashboardItems.push(memory);
  });

  fatLogger.info('🔍 processDashboardItems - Final dashboard items:', 'be', {
    totalItems: dashboardItems.length,
    folderCount: dashboardItems.filter(item => 'folderId' in item).length,
    memoryCount: dashboardItems.filter(item => !('folderId' in item)).length,
  });

  return dashboardItems;
};
