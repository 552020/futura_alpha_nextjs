// import { normalizeMemories } from "@/utils/normalizeMemories"; // Unused
import { Memory } from '@/types/memory';
import type { MemoryHeader, MemoryType } from '@/ic/declarations/backend/backend.did.d';

import { fatLogger } from '@/lib/logger';
import { getHttpBaseUrl } from '@/lib/http-token-manager';
// Removed old interfaces - now using unified format

/**
 * Format bytes in human-readable format
 */
function formatBytes(bytes: number | bigint | [] | [bigint]): string {
  let bytesNum: number;

  if (Array.isArray(bytes)) {
    if (bytes.length === 0) return '0 B';
    bytesNum = typeof bytes[0] === 'bigint' ? Number(bytes[0]) : bytes[0];
  } else {
    bytesNum = typeof bytes === 'bigint' ? Number(bytes) : bytes;
  }

  if (bytesNum === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytesNum) / Math.log(k));

  return parseFloat((bytesNum / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Debug function to check asset sizes for all memories in a page
 */
async function debugMemoriesPage(memoriesPage: { items: MemoryHeader[] }): Promise<void> {
  console.log('🔍 [DEBUG] Entering debugMemoriesPage');
  console.log('🔍 [DEBUG] Full memoriesPage object:', memoriesPage);
  console.log('🔍 [DEBUG] Memories page contains', memoriesPage.items.length, 'memories');

  const assetSummary: Array<{
    memoryId: string;
    display: { bytes: number; size: string } | null;
    thumbnail: { bytes: number; size: string } | null;
    placeholder: { bytes: number; size: string } | null;
  }> = [];

  memoriesPage.items.forEach((header: MemoryHeader, index: number) => {
    console.log(`🔍 [DEBUG] Memory ${index + 1}/${memoriesPage.items.length}:`, header.id);
    console.log('🔍 [DEBUG] Raw header.assets:', header.assets);
    console.log('🔍 [DEBUG] Thumbnail assets count:', header.assets.thumbnail.length);
    console.log('🔍 [DEBUG] Display assets count:', header.assets.display.length);
    console.log('🔍 [DEBUG] Original assets count:', header.assets.original.length);

    const memoryAssets = {
      memoryId: header.id,
      display: null as { bytes: number; size: string } | null,
      thumbnail: null as { bytes: number; size: string } | null,
      placeholder: null as { bytes: number; size: string } | null,
    };

    // Debug original asset
    if (header.assets.original.length > 0 && header.assets.original[0]) {
      const originalAsset = header.assets.original[0];
      console.log('🔍 [DEBUG] Original asset details:', {
        path: originalAsset.path,
        asset_id: originalAsset.asset_id,
        asset_kind: originalAsset.asset_kind,
        content_type: originalAsset.content_type,
        width: originalAsset.width,
        height: originalAsset.height,
        bytes: `${formatBytes(originalAsset.bytes)} (${Array.isArray(originalAsset.bytes) ? originalAsset.bytes[0] || 0 : originalAsset.bytes} bytes)`,
        expires_at_ns: originalAsset.expires_at_ns,
        token: originalAsset.token.substring(0, 50) + '...',
      });
    }

    // Debug thumbnail asset
    if (header.assets.thumbnail.length > 0 && header.assets.thumbnail[0]) {
      const thumbnailAsset = header.assets.thumbnail[0];
      const thumbnailBytes = Array.isArray(thumbnailAsset.bytes)
        ? Number(thumbnailAsset.bytes[0] || 0)
        : Number(thumbnailAsset.bytes);
      const thumbnailSize = formatBytes(thumbnailAsset.bytes);

      console.log('🔍 [DEBUG] Thumbnail asset details:', {
        path: thumbnailAsset.path,
        asset_id: thumbnailAsset.asset_id,
        asset_kind: thumbnailAsset.asset_kind,
        content_type: thumbnailAsset.content_type,
        width: thumbnailAsset.width,
        height: thumbnailAsset.height,
        bytes: `${thumbnailSize} (${thumbnailBytes} bytes)`,
        expires_at_ns: thumbnailAsset.expires_at_ns,
        token: thumbnailAsset.token.substring(0, 50) + '...',
      });

      memoryAssets.thumbnail = { bytes: thumbnailBytes, size: thumbnailSize };
    }

    // Debug display asset
    if (header.assets.display.length > 0 && header.assets.display[0]) {
      const displayAsset = header.assets.display[0];
      const displayBytes = Array.isArray(displayAsset.bytes)
        ? Number(displayAsset.bytes[0] || 0)
        : Number(displayAsset.bytes);
      const displaySize = formatBytes(displayAsset.bytes);

      console.log('🔍 [DEBUG] Display asset details:', {
        path: displayAsset.path,
        asset_id: displayAsset.asset_id,
        asset_kind: displayAsset.asset_kind,
        content_type: displayAsset.content_type,
        width: displayAsset.width,
        height: displayAsset.height,
        bytes: `${displaySize} (${displayBytes} bytes)`,
        expires_at_ns: displayAsset.expires_at_ns,
        token: displayAsset.token.substring(0, 50) + '...',
      });

      // Validate display asset size
      if (displayBytes < 50000) {
        // Less than 50KB
        console.log(
          `⚠️ [WARNING] Display asset is suspiciously small: ${displaySize} (${displayBytes} bytes) - should be > 50KB`
        );
      }

      memoryAssets.display = { bytes: displayBytes, size: displaySize };
    }

    // Debug placeholder data
    if (header.placeholder_data.length > 0) {
      const placeholderData = header.placeholder_data[0];
      console.log('🔍 [DEBUG] Placeholder data found for memory:', header.id);
      console.log('🔍 [DEBUG] Placeholder data length:', placeholderData!.length, 'characters');

      try {
        const placeholderBytes = atob(placeholderData!);
        const placeholderSize = formatBytes(placeholderBytes.length);
        console.log('🔍 [ASSET SIZE CHECK] PLACEHOLDER for memory', header.id, ':');
        console.log('🔍 [ASSET SIZE CHECK] Base64 length:', placeholderData!.length, 'characters');
        console.log('🔍 [ASSET SIZE CHECK] Decoded size:', `${placeholderSize} (${placeholderBytes.length} bytes)`);
        console.log('🔍 [ASSET SIZE CHECK] Data URL:', placeholderData!.substring(0, 50) + '...');

        memoryAssets.placeholder = { bytes: placeholderBytes.length, size: placeholderSize };
      } catch (error) {
        console.log('❌ [ASSET SIZE CHECK] Failed to decode placeholder data:', error);
      }
    } else {
      console.log('🔍 [DEBUG] No placeholder data found for memory:', header.id);
    }

    // Check actual asset sizes by fetching URLs
    checkAllAssetSizes(header);

    // Add to summary
    assetSummary.push(memoryAssets);
  });

  // Print asset size summary before exiting
  console.log('🔍 [DEBUG] === ASSET SIZE SUMMARY ===');
  assetSummary.forEach((assets, index) => {
    console.log(`🔍 [SUMMARY] Memory ${index + 1} (${assets.memoryId}):`);
    if (assets.display) {
      console.log(`🔍 [SUMMARY]   Display: ${assets.display.size} (${assets.display.bytes} bytes)`);
    } else {
      console.log(`🔍 [SUMMARY]   Display: MISSING`);
    }
    if (assets.thumbnail) {
      console.log(`🔍 [SUMMARY]   Thumbnail: ${assets.thumbnail.size} (${assets.thumbnail.bytes} bytes)`);
    } else {
      console.log(`🔍 [SUMMARY]   Thumbnail: MISSING`);
    }
    if (assets.placeholder) {
      console.log(`🔍 [SUMMARY]   Placeholder: ${assets.placeholder.size} (${assets.placeholder.bytes} bytes)`);
    } else {
      console.log(`🔍 [SUMMARY]   Placeholder: MISSING`);
    }
  });
  console.log('🔍 [DEBUG] === END ASSET SIZE SUMMARY ===');

  // Fetch and compare actual vs expected sizes
  console.log('🔍 [DEBUG] === FETCHING ACTUAL ASSET SIZES ===');
  for (const assets of assetSummary) {
    const memory = memoriesPage.items.find(h => h.id === assets.memoryId);
    if (!memory) continue;

    console.log(`🔍 [FETCH] Memory ${assets.memoryId}:`);

    // Fetch display asset
    if (memory.assets.display.length > 0 && memory.assets.display[0]) {
      const displayUrl = `${getHttpBaseUrl()}${memory.assets.display[0].path}?token=${memory.assets.display[0].token}`;
      console.log(`🔍 [FETCH] Display URL: ${displayUrl}`);
      try {
        const response = await fetch(displayUrl);
        const blob = await response.blob();
        const actualSize = formatBytes(blob.size);
        const expectedSize = assets.display?.size || 'UNKNOWN';
        console.log(`🔍 [FETCH] Display: Expected ${expectedSize} vs Actual ${actualSize} (${blob.size} bytes)`);
        if (blob.size <= 2000) {
          console.log(`🚨 [FETCH] Display appears to be placeholder-sized!`);
        }
      } catch (error) {
        console.log(`❌ [FETCH] Failed to fetch display:`, error);
      }
    }

    // Fetch thumbnail asset
    if (memory.assets.thumbnail.length > 0 && memory.assets.thumbnail[0]) {
      const thumbnailUrl = `${getHttpBaseUrl()}${memory.assets.thumbnail[0].path}?token=${memory.assets.thumbnail[0].token}`;
      console.log(`🔍 [FETCH] Thumbnail URL: ${thumbnailUrl}`);
      try {
        const response = await fetch(thumbnailUrl);
        const blob = await response.blob();
        const actualSize = formatBytes(blob.size);
        const expectedSize = assets.thumbnail?.size || 'UNKNOWN';
        console.log(`🔍 [FETCH] Thumbnail: Expected ${expectedSize} vs Actual ${actualSize} (${blob.size} bytes)`);
        if (blob.size <= 2000) {
          console.log(`🚨 [FETCH] Thumbnail appears to be placeholder-sized!`);
        }
      } catch (error) {
        console.log(`❌ [FETCH] Failed to fetch thumbnail:`, error);
      }
    }
  }
  console.log('🔍 [DEBUG] === END FETCHING ACTUAL ASSET SIZES ===');

  console.log('🔍 [DEBUG] Exiting debugMemoriesPage');
}

/**
 * Check the actual size of all assets for a memory by fetching their URLs
 */
function checkAllAssetSizes(header: MemoryHeader): void {
  // Check thumbnail
  if (header.assets.thumbnail.length > 0 && header.assets.thumbnail[0]) {
    const thumbnailUrl = `${getHttpBaseUrl()}${header.assets.thumbnail[0].path}?token=${header.assets.thumbnail[0].token}`;
    console.log('🔍 [Transform] Generated thumbnail URL for memory:', header.id);
    console.log('🔍 [Transform] Full URL:', thumbnailUrl);
    console.log('🔍 [Transform] 🧪 TEST THIS URL IN BROWSER:', thumbnailUrl);
    checkAssetSize(thumbnailUrl, 'THUMBNAIL', header.id);
  }

  // Check display
  if (header.assets.display.length > 0 && header.assets.display[0]) {
    const displayUrl = `${getHttpBaseUrl()}${header.assets.display[0].path}?token=${header.assets.display[0].token}`;
    console.log('🔍 [Transform] Generated display URL for memory:', header.id);
    console.log('🔍 [Transform] Full URL:', displayUrl);
    console.log('🔍 [Transform] 🧪 TEST THIS URL IN BROWSER:', displayUrl);
    checkAssetSize(displayUrl, 'DISPLAY', header.id);
  }

  // Check original
  if (header.assets.original.length > 0 && header.assets.original[0]) {
    const originalUrl = `${getHttpBaseUrl()}${header.assets.original[0].path}?token=${header.assets.original[0].token}`;
    console.log('🔍 [Transform] Generated original URL for memory:', header.id);
    console.log('🔍 [Transform] Full URL:', originalUrl);
    console.log('🔍 [Transform] 🧪 TEST THIS URL IN BROWSER:', originalUrl);
    checkAssetSize(originalUrl, 'ORIGINAL', header.id);
  }
}

/**
 * Check the actual size of an asset by fetching it
 */
async function checkAssetSize(url: string, assetType: string, memoryId: string): Promise<void> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();

    // Create image element to get dimensions
    const img = document.createElement('img');
    img.onload = () => {
      console.log(`🔍 [ASSET SIZE CHECK] ${assetType} for memory ${memoryId}:`);
      console.log(`🔍 [ASSET SIZE CHECK] URL: ${url}`);
      console.log(`🔍 [ASSET SIZE CHECK] Actual dimensions: ${img.naturalWidth}x${img.naturalHeight}`);
      console.log(`🔍 [ASSET SIZE CHECK] Actual file size: ${formatBytes(blob.size)} (${blob.size} bytes)`);
      console.log(`🔍 [ASSET SIZE CHECK] Content type: ${blob.type}`);

      // Check if this looks like a placeholder
      if (img.naturalWidth <= 32 && img.naturalHeight <= 32 && blob.size <= 2000) {
        console.log(`🚨 [ASSET SIZE CHECK] PLACEHOLDER DETECTED for ${assetType}!`);
      } else {
        console.log(`✅ [ASSET SIZE CHECK] ${assetType} looks correct`);
      }
    };
    img.src = URL.createObjectURL(blob);
  } catch (error) {
    console.log(`❌ [ASSET SIZE CHECK] Failed to check ${assetType} for memory ${memoryId}:`, error);
  }
}

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
  // NEW: Placeholder data for instant loading
  placeholder?: string; // Base64 placeholder data
  // NEW: Original asset URL
  originalUrl?: string;
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
      // Handle capsule not found (expected for new users)

      // Check if this is a "no capsule" error (expected for new users)
      if (capsuleResult.Err && typeof capsuleResult.Err === 'object' && 'NotFound' in capsuleResult.Err) {
        // No capsule found - user likely has no memories yet
        return {
          memories: [],
          hasMore: false,
        };
      }

      // For any other capsule errors, also return empty result (don't throw)
      // Capsule error, returning empty result
      return {
        memories: [],
        hasMore: false,
      };
    }
    const capsuleId = capsuleResult.Ok.capsule_id;

    // Calculate cursor from page (ICP uses cursor-based pagination)
    const limit: [] | [number] = [12];
    const cursor: [] | [string] = page > 1 ? [((page - 1) * 12).toString()] : [];

    // Call ICP canister using the new memories_list_by_capsule function
    const result = await actor.memories_list_by_capsule(capsuleId, cursor, limit);

    if ('Ok' in result) {
      const memoriesPage = result.Ok;

      // Debug the memories page and check asset sizes
      await debugMemoriesPage(memoriesPage);

      // Transform ICP MemoryHeader to Neon MemoryWithFolder format
      const memories = memoriesPage.items.map((header: MemoryHeader) => transformICPMemoryHeaderToNeon(header));

      return {
        memories,
        hasMore: memoriesPage.next_cursor !== null,
      };
    } else {
      // Handle ICP canister errors (expected for new users)

      // Check if this is a "no capsule" error (expected for new users)
      if (result.Err && typeof result.Err === 'object' && 'NotFound' in result.Err) {
        // No capsule found - user likely has no memories yet
        return {
          memories: [],
          hasMore: false,
        };
      }

      // For any other errors, also return empty result (don't throw)
      // ICP canister error, returning empty result
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

    // Asset URLs - using new AssetLinks structure
    thumbnail:
      header.assets.thumbnail.length > 0 && header.assets.thumbnail[0]
        ? `${getHttpBaseUrl()}${header.assets.thumbnail[0].path}?token=${header.assets.thumbnail[0].token}`
        : undefined,
    url:
      header.assets.display.length > 0 && header.assets.display[0]
        ? `${getHttpBaseUrl()}${header.assets.display[0].path}?token=${header.assets.display[0].token}`
        : undefined,

    // NEW: Placeholder data for instant loading
    placeholder: (() => {
      const placeholderData = header.placeholder_data.length > 0 ? header.placeholder_data[0] : undefined;
      if (placeholderData) {
        console.log('🔍 [DEBUG] Placeholder data found for memory:', header.id);
        console.log('🔍 [DEBUG] Placeholder data length:', placeholderData.length, 'characters');

        // Check placeholder size (it's base64 encoded)
        try {
          const placeholderBytes = atob(placeholderData);
          console.log('🔍 [ASSET SIZE CHECK] PLACEHOLDER for memory', header.id, ':');
          console.log('🔍 [ASSET SIZE CHECK] Base64 length:', placeholderData.length, 'characters');
          console.log(
            '🔍 [ASSET SIZE CHECK] Decoded size:',
            `${formatBytes(placeholderBytes.length)} (${placeholderBytes.length} bytes)`
          );
          console.log('🔍 [ASSET SIZE CHECK] Data URL:', placeholderData.substring(0, 50) + '...');
        } catch (error) {
          console.log('❌ [ASSET SIZE CHECK] Failed to decode placeholder data:', error);
        }
      } else {
        console.log('🔍 [DEBUG] No placeholder data found for memory:', header.id);
      }
      return placeholderData;
    })(),

    // Original asset URL
    originalUrl: (() => {
      const originalUrl =
        header.assets.original.length > 0 && header.assets.original[0]
          ? `${getHttpBaseUrl()}${header.assets.original[0].path}?token=${header.assets.original[0].token}`
          : undefined;
      if (originalUrl && header.assets.original[0]) {
        console.log('🔍 [Transform] Generated original URL for memory:', header.id);
        console.log('🔍 [Transform] Token:', header.assets.original[0].token);
        console.log(
          '🔍 [Transform] Expires at:',
          new Date(Number(header.assets.original[0].expires_at_ns / BigInt(1000000)))
        );
        console.log('🔍 [Transform] Full URL:', originalUrl);
        console.log('🔍 [Transform] 🧪 TEST THIS URL IN BROWSER:', originalUrl);

        // Check actual asset size
        checkAssetSize(originalUrl, 'ORIGINAL', header.id);
      }
      return originalUrl;
    })(),

    // NEW: Storage location information
    storageStatus: (() => {
      // Process storage edges data
      const storageLocations = header.database_storage_edges.map(edge => {
        return 'Icp' in edge ? 'icp' : 'Neon' in edge ? 'neon' : 'unknown';
      });

      // TEMPORARY FIX: If this is an ICP memory (UUID v7 format) and we get 'neon' storage locations,
      // it's likely a backend bug where ICP memories are incorrectly marked as Neon.
      // For now, force ICP memories to show as 'icp' storage.
      const isUuidV7 = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(header.id);
      const finalStorageLocations =
        isUuidV7 && storageLocations.includes('neon') && !storageLocations.includes('icp')
          ? ['icp'] // Force ICP memories to show as 'icp' storage
          : storageLocations;

      // Final storage locations determined

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
  hostingPreferences?: { backendHosting?: string; blobHosting?: string[] };
}): Promise<{ success: boolean; message: string; deletedCount: number }> => {
  // Check if we should use ICP backend
  const useICP =
    options?.hostingPreferences?.backendHosting === 'icp' || options?.hostingPreferences?.blobHosting?.includes('icp');

  if (useICP) {
    // Use ICP backend for deletion
    return await deleteAllMemoriesFromICP(options);
  } else {
    // Use regular API backend for deletion
    return await deleteAllMemoriesFromAPI(options);
  }
};

const deleteAllMemoriesFromAPI = async (options?: {
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

const deleteAllMemoriesFromICP = async (_options?: {
  type?: 'image' | 'document' | 'note' | 'video' | 'audio';
  folder?: string;
  all?: boolean;
}): Promise<{ success: boolean; message: string; deletedCount: number }> => {
  try {
    // Import ICP dependencies
    const { getAuthClient } = await import('@/ic/ii');
    const { backendActor } = await import('@/ic/backend');

    // Get authenticated actor
    const authClient = await getAuthClient();
    if (!authClient.isAuthenticated()) {
      throw new Error('Please connect your Internet Identity to delete ICP memories');
    }

    const identity = authClient.getIdentity();
    const backend = await backendActor(identity);

    // Get capsule ID using the existing working pattern
    let capsuleId: string;
    try {
      // Use the working getCapsuleInfo service instead of direct backend call
      const { getCapsuleInfo } = await import('@/services/capsule');
      
      const capsuleInfo = await getCapsuleInfo(
        () => Promise.resolve(backend),
        () => {} // No-op clear function
      );
      
      if (capsuleInfo) {
        capsuleId = capsuleInfo.capsule_id;
        console.log('🔍 [Delete All Dev] Found existing capsule:', capsuleId);
      } else {
        // No capsule found, create one
        console.log('🔍 [Delete All Dev] No capsule found, creating one...');
        const createResult = await backend.capsules_create([]);
        if ('Ok' in createResult) {
          capsuleId = createResult.Ok.id;
          console.log('🔍 [Delete All Dev] Created new capsule:', capsuleId);
        } else {
          throw new Error(`Failed to create capsule: ${JSON.stringify(createResult.Err)}`);
        }
      }
    } catch (error) {
      console.error('🔍 [Delete All Dev] Error getting/creating capsule:', error);
      throw new Error(
        `Failed to get or create user capsule: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Use the new dev method for efficient deletion
    console.log('🔍 [Delete All Dev] Calling dev_clear_all_memories_in_capsule for capsule:', capsuleId);
    try {
      const deleteAllResult = await backend.dev_clear_all_memories_in_capsule(capsuleId, true); // true = delete assets

      if ('Ok' in deleteAllResult) {
        const result = deleteAllResult.Ok;
        console.log('🔍 [Delete All Dev] Success:', result);
        return {
          success: true,
          message: result.message,
          deletedCount: result.deleted_count,
        };
      } else {
        console.error('🔍 [Delete All Dev] Failed:', deleteAllResult.Err);
        throw new Error(`Failed to delete all memories: ${JSON.stringify(deleteAllResult.Err)}`);
      }
    } catch (error) {
      console.error('🔍 [Delete All Dev] Error calling dev_clear_all_memories_in_capsule:', error);
      throw new Error(
        `Failed to call dev_clear_all_memories_in_capsule: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  } catch (error) {
    console.error('Failed to delete memories from ICP:', error);
    throw new Error(`Failed to delete ICP memories: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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
