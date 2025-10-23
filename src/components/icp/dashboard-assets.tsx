'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useDashboardAssets } from '@/hooks/use-http-tokens';
import { fatLogger } from '@/lib/logger';
import { normalizeIcUrl } from '@/lib/http-token-manager';

interface Memory {
  id: string;
  title: string;
  thumbnail?: string;
  ownerId?: string;
  storageStatus?: { storageLocations: string[] };
  // Add other memory properties as needed
}

interface DashboardAssetsProps {
  memories: Memory[];
  onImageError?: (memoryId: string, error: Error) => void;
}

/**
 * Dashboard component optimized for ICP HTTP asset serving
 *
 * Demonstrates bulk token loading and efficient asset display
 */
export function DashboardAssets({ memories, onImageError }: DashboardAssetsProps) {
  const [thumbnailUrls, setThumbnailUrls] = useState<Map<string, string>>(new Map());
  const [loadingStates, setLoadingStates] = useState<Map<string, boolean>>(new Map());
  const [errorStates, setErrorStates] = useState<Map<string, string>>(new Map());

  const { loadThumbnails } = useDashboardAssets();

  // Initialize loading states
  useEffect(() => {
    const initialLoadingStates = new Map<string, boolean>();
    memories.forEach(memory => {
      initialLoadingStates.set(memory.id, true);
    });
    setLoadingStates(initialLoadingStates);
  }, [memories]);

  // Load thumbnails when memories change
  const loadAssets = useCallback(async () => {
    if (memories.length === 0) return;

    try {
      fatLogger.info('Loading dashboard assets', 'fe', { count: memories.length });

      // Pass full memory objects instead of just IDs
      const urls = await loadThumbnails(memories);

      setThumbnailUrls(urls);

      // Update loading states
      const newLoadingStates = new Map<string, boolean>();
      const newErrorStates = new Map<string, string>();

      memories.forEach(memory => {
        if (urls.has(memory.id)) {
          newLoadingStates.set(memory.id, false);
        } else {
          newLoadingStates.set(memory.id, false);
          newErrorStates.set(memory.id, 'Failed to load thumbnail');
        }
      });

      setLoadingStates(newLoadingStates);
      setErrorStates(newErrorStates);

      fatLogger.info('Dashboard assets loaded', 'fe', {
        successful: urls.size,
        total: memories.length,
      });
    } catch (error) {
      fatLogger.error('Failed to load dashboard assets', 'fe', {
        error: error instanceof Error ? error : undefined,
      });

      // Set all to error state
      const errorStates = new Map<string, string>();
      const loadingStates = new Map<string, boolean>();

      memories.forEach(memory => {
        errorStates.set(memory.id, 'Failed to load assets');
        loadingStates.set(memory.id, false);
      });

      setErrorStates(errorStates);
      setLoadingStates(loadingStates);
    }
  }, [memories, loadThumbnails]);

  // Load assets when component mounts or memories change
  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const handleImageError = useCallback(
    (memoryId: string, error: Error) => {
      fatLogger.error('Image load error', 'fe', { memoryId, error });

      setErrorStates(prev => new Map(prev).set(memoryId, 'Image failed to load'));
      setLoadingStates(prev => new Map(prev).set(memoryId, false));

      onImageError?.(memoryId, error);
    },
    [onImageError]
  );

  const handleImageLoad = useCallback((memoryId: string) => {
    setLoadingStates(prev => new Map(prev).set(memoryId, false));
    setErrorStates(prev => {
      const newMap = new Map(prev);
      newMap.delete(memoryId);
      return newMap;
    });
  }, []);

  if (memories.length === 0) {
    return <div className="flex items-center justify-center p-8 text-gray-500">No memories to display</div>;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4">
      {memories.map(memory => {
        const isLoading = loadingStates.get(memory.id) ?? true;
        const error = errorStates.get(memory.id);
        const thumbnailUrl = thumbnailUrls.get(memory.id);

        return (
          <div
            key={memory.id}
            className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500 text-sm p-2">
                <div className="text-center">
                  <div className="text-red-500 mb-1">⚠️</div>
                  <div>{error}</div>
                </div>
              </div>
            )}

            {thumbnailUrl && !error && (
              <Image
                src={normalizeIcUrl(thumbnailUrl)}
                alt={memory.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
                onLoad={() => handleImageLoad(memory.id)}
                onError={() => handleImageError(memory.id, new Error('Image load failed'))}
                priority={false} // Let Next.js optimize loading
              />
            )}

            {/* Memory title overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
              <p className="text-white text-sm font-medium truncate">{memory.title}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Hook for dashboard asset management
 */
export function useDashboardAssetManager(memories: Memory[]) {
  const [assets, setAssets] = useState<{
    thumbnails: Map<string, string>;
    previews: Map<string, string>;
  }>({
    thumbnails: new Map(),
    previews: new Map(),
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { loadAllVariants } = useDashboardAssets();

  const loadAssets = useCallback(async () => {
    if (memories.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      // Pass full memory objects instead of just IDs
      const result = await loadAllVariants(memories);

      setAssets(result);
      fatLogger.info('Dashboard assets loaded successfully', 'fe', {
        thumbnails: result.thumbnails.size,
        previews: result.previews.size,
        total: memories.length,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load assets';
      setError(errorMessage);
      fatLogger.error('Failed to load dashboard assets', 'fe', {
        error: err instanceof Error ? err : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [memories, loadAllVariants]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  return {
    assets,
    loading,
    error,
    reload: loadAssets,
  };
}

