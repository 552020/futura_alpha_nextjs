// import { normalizeMemories } from "@/utils/normalizeMemories"; // Unused
import { Memory } from '@/types/memory';
import type { MemoryHeader, MemoryType } from '@/ic/declarations/backend/backend.did';

import { fatLogger } from '@/lib/logger';
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
  storageStatus?: {
    storageLocations: string[]; // Array of storage locations: ['icp'], ['neon'], ['icp', 'neon']
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
  storageSummary?: {
    storageLocations: string[]; // Array of storage locations: ['icp'], ['neon'], ['icp', 'neon']
  };
}

export type DashboardItem = MemoryWithFolder | FolderItem;

export interface FetchMemoriesResult {
  memories: MemoryWithFolder[];
  hasMore: boolean;
}

export const fetchMemories = async (
  page: number,
  dataSource: 'neon' | 'icp' = 'neon'
): Promise<FetchMemoriesResult> => {
  fatLogger.info(`🔍 Fetching memories for page ${page} from ${dataSource}...`, 'be');

  if (dataSource === 'icp') {
    try {
      return await fetchMemoriesFromICP(page);
    } catch (error) {
      fatLogger.warn(`⚠️ ICP fetch failed, falling back to Neon:`, 'be', { error: error instanceof Error ? error.message : String(error) });
      // Gracefully fall back to Neon when ICP fails
      return await fetchMemoriesFromNeon(page);
    }
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

// Fetch memories from ICP canister directly
const fetchMemoriesFromICP = async (page: number): Promise<FetchMemoriesResult> => {
  try {
    const { backendActor } = await import('@/ic/backend');
    const actor = await backendActor();

    // Get user's capsule ID
    const capsuleResult = await actor.capsules_read_basic([]);
    if (!('Ok' in capsuleResult)) {
      throw new Error('Failed to get user capsule');
    }
    const capsuleId = capsuleResult.Ok.capsule_id;

    // Calculate cursor from page (ICP uses cursor-based pagination)
    const limit: [] | [number] = [12];
    const cursor: [] | [string] = page > 1 ? [((page - 1) * 12).toString()] : [];

    // Call ICP canister
    const result = await actor.memories_list(capsuleId, cursor, limit);

    if ('Ok' in result) {
      const icpPage = result.Ok;

      // Transform ICP MemoryHeader to Neon MemoryWithFolder format
      const memories = icpPage.items.map(header => transformICPMemoryHeaderToNeon(header));

      return {
        memories,
        hasMore: icpPage.next_cursor !== null,
      };
    } else {
      throw new Error(`ICP canister error: ${JSON.stringify(result.Err)}`);
    }
  } catch (error) {
    fatLogger.error('Failed to fetch memories from ICP:', 'be', { data: error instanceof Error ? error : new Error(String(error)) });
    throw error;
  }
};

// Transform ICP MemoryHeader to Neon MemoryWithFolder format
const transformICPMemoryHeaderToNeon = (header: MemoryHeader): MemoryWithFolder => {
  return {
    // Core identification
    id: header.id,
    ownerId: 'icp-user', // ICP users don't have ownerId in same way

    // Memory metadata
    type: mapICPMemoryTypeToNeon(header.memory_type),
    title: (header.title.length > 0 ? header.title[0] : null) || header.name || 'Untitled',
    description: header.description.length > 0 ? header.description[0] : undefined,
    isPublic: header.is_public,

    // Organization
    parentFolderId: header.parent_folder_id.length > 0 ? header.parent_folder_id[0] : undefined,
    tags: header.tags || [],
    recipients: [], // TODO: Extract from access if needed

    // Timestamps (convert nanoseconds to ISO strings)
    createdAt: new Date(Number(header.created_at / BigInt(1000000))).toISOString(),
    updatedAt: new Date(Number(header.updated_at / BigInt(1000000))).toISOString(),
    fileCreatedAt: undefined, // Not available in MemoryHeader
    unlockDate: undefined, // ICP doesn't have unlock dates
    deletedAt: undefined, // Not available in MemoryHeader

    // Storage information
    metadata: {
      originalPath: undefined,
    },

    // Sharing information (from pre-computed fields)
    status: header.sharing_status as 'public' | 'shared' | 'private',
    sharedWithCount: header.shared_count,

    // Folder information
    folder:
      header.parent_folder_id.length > 0
        ? {
            id: header.parent_folder_id[0]!,
            name: 'ICP Folder', // TODO: Get actual folder name
            ownerId: 'icp-user',
            parentFolderId: undefined,
            createdAt: new Date(Number(header.created_at / BigInt(1000000))),
            updatedAt: new Date(Number(header.updated_at / BigInt(1000000))),
          }
        : undefined,

    // Legacy fields
    thumbnail: header.thumbnail_url.length > 0 ? header.thumbnail_url[0] : undefined,
    url: header.primary_asset_url.length > 0 ? header.primary_asset_url[0] : undefined,
  };
};

// Helper function to map ICP memory types to Neon types
const mapICPMemoryTypeToNeon = (icpType: MemoryType): 'image' | 'video' | 'note' | 'document' | 'audio' => {
  // Handle ICP enum format: { Image: null }, { Video: null }, etc.
  if (typeof icpType === 'object' && icpType !== null) {
    if ('Image' in icpType) return 'image';
    if ('Video' in icpType) return 'video';
    if ('Note' in icpType) return 'note';
    if ('Document' in icpType) return 'document';
    if ('Audio' in icpType) return 'audio';
  }
  return 'document'; // Default fallback
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
  fatLogger.info('🚀 LINE 129: ENTERING processDashboardItems', 'be');
  fatLogger.info('🔍 processDashboardItems - Received memories:', 'be', { count: memories.length });
  fatLogger.info('🔍 All memories with folder info:', 'be', {
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
      fatLogger.info(`🔍 Processing memory "${memory.title}" with parentFolderId: ${parentFolderId}`, 'be');
      if (parentFolderId) {
        if (!groups[parentFolderId]) {
          groups[parentFolderId] = [];
          fatLogger.info(`📁 Created new folder group for: ${parentFolderId}`, 'be');
        }
        groups[parentFolderId].push(memory);
        fatLogger.info(
          `📁 Added "${memory.title}" to folder ${parentFolderId}. Group now has ${groups[parentFolderId].length} items`,
          'be'
        );
      } else {
        fatLogger.info(`🔍 Memory "${memory.title}" has no parentFolderId - will be individual`, 'be');
      }
      return groups;
    },
    {} as Record<string, MemoryWithFolder[]>
  );

  fatLogger.info('🔍 Final folder groups:', 'be', {
    folderGroups: Object.entries(folderGroups).map(([folderId, memories]) => ({
      folderId,
      folderName: memories[0]?.folder?.name || 'Unknown',
      count: memories.length,
      memories: memories.map(m => m.title),
    })),
  });

  // Step 2: Create FolderItems for each group
  const folderItems: FolderItem[] = Object.entries(folderGroups).map(([folderId, folderMemories]) => {
    // Compute storage summary from existing memory data (using NEW array approach)
    const allStorageLocations = new Set<string>();

    folderMemories.forEach(memory => {
      // Check if memory has storageStatus with storageLocations
      if (memory.storageStatus?.storageLocations) {
        memory.storageStatus.storageLocations.forEach(location => allStorageLocations.add(location));
      }
    });

    return {
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
      storageSummary: {
        storageLocations: Array.from(allStorageLocations),
      },
    };
  });

  fatLogger.info('🔍 Created folder items:', 'be', { folderItems });

  // Step 3: Get individual memories (not in folders)
  const individualMemories = memories.filter(memory => !memory.parentFolderId);

  // fatLogger.info("🔍 Individual memories:", individualMemories.length);

  // Step 4: Combine and return
  const result = [...individualMemories, ...folderItems];
  fatLogger.info('🔍 Final result:', 'be', { count: result.length, type: 'items' });
  fatLogger.info('🔍 Individual memories count:', 'be', { count: individualMemories.length });
  fatLogger.info('🔍 Folder items count:', 'be', { count: folderItems.length });

  fatLogger.info('✅ LINE 180: EXITING processDashboardItems', 'be');
  return result;
};

export const memoryActions = {
  delete: deleteMemory,

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  share: async (id: string) => {
    // TODO: Implement share logic
    // fatLogger.info("Sharing memory:", id);
  },

  navigate: (memory: Memory, lang: string, segment: string) => {
    return `/${lang}/${segment}/dashboard/${memory.id}`;
  },
};
