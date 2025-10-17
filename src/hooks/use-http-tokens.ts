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
   */
  const loadThumbnails = useCallback(
    async (memoryIds: string[]): Promise<Map<string, string>> => {
      try {
        fatLogger.info('Loading dashboard thumbnails', 'fe', { count: memoryIds.length });
        return await getBulkAssetUrls(memoryIds, 'thumbnail');
      } catch (error) {
        fatLogger.error('Failed to load dashboard thumbnails', 'fe', {
          memoryIds,
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
      memoryIds: string[]
    ): Promise<{
      thumbnails: Map<string, string>;
      previews: Map<string, string>;
    }> => {
      try {
        fatLogger.info('Loading all dashboard variants', 'fe', { count: memoryIds.length });

        const [thumbnails, previews] = await Promise.all([
          getBulkAssetUrls(memoryIds, 'thumbnail'),
          getBulkAssetUrls(memoryIds, 'preview'),
        ]);

        return { thumbnails, previews };
      } catch (error) {
        fatLogger.error('Failed to load all dashboard variants', 'fe', {
          memoryIds,
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

