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
    const { getAuthClient } = await import('@/ic/ii');

    // Get authenticated identity
    const authClient = await getAuthClient();
    if (!authClient.isAuthenticated()) {
      throw new Error('Please connect your Internet Identity to fetch ICP memories');
    }

    const identity = authClient.getIdentity();
    const actor = await backendActor(identity);

    // Get user's capsule ID
    const capsuleResult = await actor.capsules_read_basic([]);
    if (!('Ok' in capsuleResult)) {
      console.log('Capsule result (expected for new users):', capsuleResult);

      // Check if this is a "no capsule" error (expected for new users)
      if (capsuleResult.Err && typeof capsuleResult.Err === 'object' && 'NotFound' in capsuleResult.Err) {
        console.log('No capsule found - user likely has no memories yet, returning empty result');
        return {
          memories: [],
          hasMore: false,
        };
      }

      // For any other capsule errors, also return empty result (don't throw)
      console.log('Capsule error, returning empty result:', capsuleResult.Err);
      return {
        memories: [],
        hasMore: false,
      };
    }
    const capsuleId = capsuleResult.Ok.capsule_id;
    console.log('Using capsule ID:', capsuleId);

    // Calculate cursor from page (ICP uses cursor-based pagination)
    const limit: [] | [number] = [12];
    const cursor: [] | [string] = page > 1 ? [((page - 1) * 12).toString()] : [];

    // Call ICP canister using the new memories_list_by_capsule function
    console.log('Calling memories_list_by_capsule with:', { capsuleId, cursor, limit });
    const result = await actor.memories_list_by_capsule(capsuleId, cursor, limit);
    console.log('memories_list_by_capsule result:', result);

    if ('Ok' in result) {
      const icpPage = result.Ok;

      // Transform ICP MemoryHeader to Neon MemoryWithFolder format
      const memories = icpPage.items.map((header: MemoryHeader) => transformICPMemoryHeaderToNeon(header));

      return {
        memories,
        hasMore: icpPage.next_cursor !== null,
      };
    } else {
      console.log('ICP canister result (expected for new users):', result.Err);

      // Check if this is a "no capsule" error (expected for new users)
      if (result.Err && typeof result.Err === 'object' && 'NotFound' in result.Err) {
        console.log('No capsule found - user likely has no memories yet, returning empty result');
        return {
          memories: [],
          hasMore: false,
        };
      }

      // For any other errors, also return empty result (don't throw)
      console.log('ICP canister error, returning empty result:', result.Err);
      return {
        memories: [],
        hasMore: false,
      };
    }
  } catch (error) {
    fatLogger.error('Failed to fetch memories from ICP:', 'be', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
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
    isPublic: 'Public' in header.sharing_status,

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
    status: 'Public' in header.sharing_status ? 'public' : 'Private' in header.sharing_status ? 'private' : 'shared',
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

    // NEW: Storage location information
    storageStatus: (() => {
      // DEBUG: Log the raw storage edges data
      console.log('🔍 [transformICPMemoryHeaderToNeon] memoryId:', header.id);
      console.log(
        '🔍 [transformICPMemoryHeaderToNeon] database_storage_edges length:',
        header.database_storage_edges.length
      );
      console.log('🔍 [transformICPMemoryHeaderToNeon] database_storage_edges:', header.database_storage_edges);

      const storageLocations = header.database_storage_edges.map((edge, index) => {
        console.log(`🔍 [transformICPMemoryHeaderToNeon] Edge ${index}:`, edge);
        console.log(`🔍 [transformICPMemoryHeaderToNeon] Edge ${index} has 'Icp':`, 'Icp' in edge);
        console.log(`🔍 [transformICPMemoryHeaderToNeon] Edge ${index} has 'Neon':`, 'Neon' in edge);

        return 'Icp' in edge ? 'icp' : 'Neon' in edge ? 'neon' : 'unknown';
      });

      console.log('🔍 [transformICPMemoryHeaderToNeon] mapped storageLocations:', storageLocations);

      // TEMPORARY FIX: If this is an ICP memory (UUID v7 format) and we get 'neon' storage locations,
      // it's likely a backend bug where ICP memories are incorrectly marked as Neon.
      // For now, force ICP memories to show as 'icp' storage.
      const isUuidV7 = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(header.id);
      const finalStorageLocations =
        isUuidV7 && storageLocations.includes('neon') && !storageLocations.includes('icp')
          ? ['icp'] // Force ICP memories to show as 'icp' storage
          : storageLocations;

      console.log('🔍 [transformICPMemoryHeaderToNeon] final storageLocations:', finalStorageLocations);

      return {
        storageLocations: finalStorageLocations,
      };
    })(),
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
