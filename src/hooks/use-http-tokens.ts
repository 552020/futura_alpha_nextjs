'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  getHttpToken,
  getBulkHttpTokens,
  getHttpAssetUrl,
  getBulkHttpAssetUrls,
  clearExpiredHttpTokens,
  getHttpTokenCacheStats,
} from '@/lib/http-token-manager';
import { fatLogger } from '@/lib/logger';

/**
 * Hook for managing HTTP tokens for ICP asset serving
 *
 * Provides caching, bulk operations, and automatic cleanup
 */
export function useHttpTokens() {
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Set up automatic cleanup of expired tokens
  useEffect(() => {
    // Clear expired tokens every 5 minutes
    cleanupIntervalRef.current = setInterval(
      () => {
        clearExpiredHttpTokens();
      },
      5 * 60 * 1000
    );

    return () => {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }
    };
  }, []);

  /**
   * Get a single token for a memory
   */
  const getToken = useCallback(
    async (
      memoryId: string,
      variants: string[] = ['thumbnail'],
      assetIds: string[] | null = null,
      ttlSecs: number = 180
    ): Promise<string> => {
      try {
        return await getHttpToken(memoryId, variants, assetIds, ttlSecs);
      } catch (error) {
        fatLogger.error('Failed to get HTTP token', 'fe', {
          memoryId,
          error: error instanceof Error ? error : undefined,
        });
        throw error;
      }
    },
    []
  );

  /**
   * Get tokens for multiple memories in bulk
   */
  const getBulkTokens = useCallback(
    async (
      memoryIds: string[],
      variants: string[] = ['thumbnail'],
      assetIds: string[] | null = null,
      ttlSecs: number = 180
    ): Promise<Map<string, string>> => {
      try {
        return await getBulkHttpTokens(memoryIds, variants, assetIds, ttlSecs);
      } catch (error) {
        fatLogger.error('Failed to get bulk HTTP tokens', 'fe', {
          memoryIds,
          error: error instanceof Error ? error : undefined,
        });
        throw error;
      }
    },
    []
  );

  /**
   * Get asset URL for a single memory
   */
  const getAssetUrl = useCallback(
    async (memoryId: string, variant: string, assetId: string | null = null, baseUrl?: string): Promise<string> => {
      try {
        return await getHttpAssetUrl(memoryId, variant, assetId, baseUrl);
      } catch (error) {
        fatLogger.error('Failed to get HTTP asset URL', 'fe', {
          memoryId,
          variant,
          error: error instanceof Error ? error : undefined,
        });
        throw error;
      }
    },
    []
  );

  /**
   * Get asset URLs for multiple memories (dashboard scenario)
   */
  const getBulkAssetUrls = useCallback(
    async (memoryIds: string[], variant: string = 'thumbnail', baseUrl?: string): Promise<Map<string, string>> => {
      try {
        return await getBulkHttpAssetUrls(memoryIds, variant, baseUrl);
      } catch (error) {
        fatLogger.error('Failed to get bulk HTTP asset URLs', 'fe', {
          memoryIds,
          variant,
          error: error instanceof Error ? error : undefined,
        });
        throw error;
      }
    },
    []
  );

  /**
   * Get cache statistics
   */
  const getCacheStats = useCallback(() => {
    return getHttpTokenCacheStats();
  }, []);

  /**
   * Manually clear expired tokens
   */
  const clearExpired = useCallback(() => {
    clearExpiredHttpTokens();
  }, []);

  return {
    getToken,
    getBulkTokens,
    getAssetUrl,
    getBulkAssetUrls,
    getCacheStats,
    clearExpired,
  };
}

/**
 * Hook specifically for dashboard scenarios with bulk asset loading
 */
export function useDashboardAssets() {
  const { getBulkAssetUrls } = useHttpTokens();

  /**
   * Load thumbnail URLs for a list of memories (dashboard scenario)
   * Handles both ICP and Neon memories appropriately
   */
  const loadThumbnails = useCallback(
    async (memories: Array<{ id: string; thumbnail?: string; ownerId?: string; storageStatus?: { storageLocations: string[] } }>): Promise<Map<string, string>> => {
      try {
        fatLogger.info('Loading dashboard thumbnails', 'fe', { count: memories.length });
        
        // Separate ICP and Neon memories
        const icpMemories = memories.filter(memory => {
          // Check if ownerId indicates ICP user
          if (memory.ownerId === 'icp-user') {
            return true;
          }
          // Check storage status for ICP storage
          if (memory.storageStatus?.storageLocations?.includes('icp')) {
            return true;
          }
          return false;
        });
        
        const neonMemories = memories.filter(memory => !icpMemories.includes(memory));
        
        const urlMap = new Map<string, string>();
        
        // Handle ICP memories - use pre-generated URLs
        for (const memory of icpMemories) {
          if (memory.thumbnail) {
            urlMap.set(memory.id, memory.thumbnail);
            fatLogger.info('Using pre-generated ICP thumbnail URL', 'fe', { 
              memoryId: memory.id, 
              url: memory.thumbnail 
            });
          }
        }
        
        // Handle Neon memories - generate new URLs
        if (neonMemories.length > 0) {
          const neonMemoryIds = neonMemories.map(m => m.id);
          const neonUrls = await getBulkAssetUrls(neonMemoryIds, 'thumbnail');
          
          for (const [memoryId, url] of neonUrls) {
            urlMap.set(memoryId, url);
          }
        }
        
        fatLogger.info('Dashboard thumbnails loaded', 'fe', {
          icpCount: icpMemories.length,
          neonCount: neonMemories.length,
          totalUrls: urlMap.size
        });
        
        return urlMap;
      } catch (error) {
        fatLogger.error('Failed to load dashboard thumbnails', 'fe', {
          memories: memories.map(m => m.id),
          error: error instanceof Error ? error : undefined,
        });
        throw error;
      }
    },
    [getBulkAssetUrls]
  );

  /**
   * Load preview URLs for a list of memories
   */
  const loadPreviews = useCallback(
    async (memoryIds: string[]): Promise<Map<string, string>> => {
      try {
        fatLogger.info('Loading dashboard previews', 'fe', { count: memoryIds.length });
        return await getBulkAssetUrls(memoryIds, 'preview');
      } catch (error) {
        fatLogger.error('Failed to load dashboard previews', 'fe', {
          memoryIds,
          error: error instanceof Error ? error : undefined,
        });
        throw error;
      }
    },
    [getBulkAssetUrls]
  );

  /**
   * Load both thumbnails and previews in parallel
   */
  const loadAllVariants = useCallback(
    async (
      memories: Array<{ id: string; thumbnail?: string; ownerId?: string; storageStatus?: { storageLocations: string[] } }>
    ): Promise<{
      thumbnails: Map<string, string>;
      previews: Map<string, string>;
    }> => {
      try {
        fatLogger.info('Loading all dashboard variants', 'fe', { count: memories.length });

        // Separate ICP and Neon memories
        const icpMemories = memories.filter(memory => {
          if (memory.ownerId === 'icp-user') return true;
          if (memory.storageStatus?.storageLocations?.includes('icp')) return true;
          return false;
        });
        
        const neonMemories = memories.filter(memory => !icpMemories.includes(memory));
        
        const thumbnails = new Map<string, string>();
        const previews = new Map<string, string>();
        
        // Handle ICP memories - use pre-generated URLs
        for (const memory of icpMemories) {
          if (memory.thumbnail) {
            thumbnails.set(memory.id, memory.thumbnail);
          }
          // For previews, we'd need to check if there's a display URL
          // For now, use thumbnail as preview for ICP memories
          if (memory.thumbnail) {
            previews.set(memory.id, memory.thumbnail);
          }
        }
        
        // Handle Neon memories - generate new URLs
        if (neonMemories.length > 0) {
          const neonMemoryIds = neonMemories.map(m => m.id);
          const [neonThumbnails, neonPreviews] = await Promise.all([
            getBulkAssetUrls(neonMemoryIds, 'thumbnail'),
            getBulkAssetUrls(neonMemoryIds, 'preview'),
          ]);
          
          for (const [memoryId, url] of neonThumbnails) {
            thumbnails.set(memoryId, url);
          }
          for (const [memoryId, url] of neonPreviews) {
            previews.set(memoryId, url);
          }
        }

        return { thumbnails, previews };
      } catch (error) {
        fatLogger.error('Failed to load all dashboard variants', 'fe', {
          memories: memories.map(m => m.id),
          error: error instanceof Error ? error : undefined,
        });
        throw error;
      }
    },
    [getBulkAssetUrls]
  );

  return {
    loadThumbnails,
    loadPreviews,
    loadAllVariants,
  };
}

