import { useState, useEffect } from 'react';

import { fatLogger } from '@/lib/logger';
export type MemoryStorageStatus = 'loading' | 'error' | string[]; // string[] for actual storage locations

interface MemoryPresenceData {
  memoryId: string;
  memoryType: string;
  storageStatus: {
    storageLocations: string[]; // Array of actual storage locations
  };
}

interface MemoryStatusMap {
  [key: string]: {
    status: MemoryStorageStatus;
    data: MemoryPresenceData | null;
  };
}

// Hook for single memory storage status
export function useMemoryStorageStatus(memoryId: string, memoryType: string, dataSource?: 'neon' | 'icp') {
  const [status, setStatus] = useState<MemoryStorageStatus>('loading');
  const [data, setData] = useState<MemoryPresenceData | null>(null);

  useEffect(() => {
    async function fetchStatus() {
      if (!memoryId || !memoryType) {
        setStatus('error');
        return;
      }

      try {
        setStatus('loading');

        // Use dataSource to determine which API to call
        if (dataSource === 'neon') {
          // For Neon memories, try the Neon API first
          const response = await fetch(`/api/memories/${memoryId}`);

          if (response.ok) {
            const result = await response.json();

            fatLogger.debug(`🔍 [STORAGE STATUS HOOK] Memory ${memoryId} - Neon API Response:`, 'fe', {
              success: result.success,
              hasData: !!result.data,
              hasStorageStatus: !!result.data?.storageStatus,
              storageStatus: result.data?.storageStatus,
            });

            if (result.success && result.data && result.data.storageStatus) {
              // Transform the response to match the expected format
              const storageStatus = result.data.storageStatus;
              const presenceData: MemoryPresenceData = {
                memoryId,
                memoryType,
                storageStatus: {
                  storageLocations: storageStatus.storageLocations || [],
                },
              };
              setData(presenceData);
              setStatus(storageStatus.storageLocations || []);

              fatLogger.debug(
                `✅ [STORAGE STATUS HOOK] Memory ${memoryId} - Set status:`,
                storageStatus.storageLocations || []
              );
              return;
            }
          }
        } else if (dataSource === 'icp') {
          // For ICP memories, go directly to storage edges API
          const storageResponse = await fetch(`/api/storage/edges?memoryId=${memoryId}`);
          if (storageResponse.ok) {
            const storageResult = await storageResponse.json();
            if (storageResult.success && storageResult.data) {
              const storageLocations = (
                storageResult.data as Array<{ locationMetadata?: string; locationAsset?: string }>
              )
                .map(edge => edge.locationMetadata || edge.locationAsset)
                .filter(
                  (location: string | undefined): location is string =>
                    typeof location === 'string' && location.length > 0
                );
              const presenceData: MemoryPresenceData = {
                memoryId,
                memoryType,
                storageStatus: {
                  storageLocations: [...new Set(storageLocations)], // Remove duplicates
                },
              };
              setData(presenceData);
              setStatus(presenceData.storageStatus.storageLocations);
              return;
            }
          }
        } else {
          // Fallback: Check if this is a UUID format (our new universal format)
          const isUuidV7 = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(memoryId);

          if (isUuidV7) {
            // For UUID v7 format without dataSource, try the Neon API first (most memories will be in Neon)
            const response = await fetch(`/api/memories/${memoryId}`);

            if (response.ok) {
              const result = await response.json();

              if (result.success && result.data && result.data.storageStatus) {
                // Transform the response to match the expected format
                const storageStatus = result.data.storageStatus;
                const presenceData: MemoryPresenceData = {
                  memoryId,
                  memoryType,
                  storageStatus: {
                    storageLocations: storageStatus.storageLocations || [],
                  },
                };
                setData(presenceData);
                setStatus(storageStatus.storageLocations || []);
                return;
              }
            }

            // If Neon API fails, try ICP storage edges API
            const storageResponse = await fetch(`/api/storage/edges?memoryId=${memoryId}`);
            if (storageResponse.ok) {
              const storageResult = await storageResponse.json();
              if (storageResult.success && storageResult.data) {
                const storageLocations = (
                  storageResult.data as Array<{ locationMetadata?: string; locationAsset?: string }>
                )
                  .map(edge => edge.locationMetadata || edge.locationAsset)
                  .filter(
                    (location: string | undefined): location is string =>
                      typeof location === 'string' && location.length > 0
                  );
                const presenceData: MemoryPresenceData = {
                  memoryId,
                  memoryType,
                  storageStatus: {
                    storageLocations: [...new Set(storageLocations)], // Remove duplicates
                  },
                };
                setData(presenceData);
                setStatus(presenceData.storageStatus.storageLocations);
                return;
              }
            }
          } else {
            // For old compound ID format, try storage edges API directly
            const storageResponse = await fetch(`/api/storage/edges?memoryId=${memoryId}`);
            if (storageResponse.ok) {
              const storageResult = await storageResponse.json();
              if (storageResult.success && storageResult.data) {
                const storageLocations = (
                  storageResult.data as Array<{ locationMetadata?: string; locationAsset?: string }>
                )
                  .map(edge => edge.locationMetadata || edge.locationAsset)
                  .filter(
                    (location: string | undefined): location is string =>
                      typeof location === 'string' && location.length > 0
                  );
                const presenceData: MemoryPresenceData = {
                  memoryId,
                  memoryType,
                  storageStatus: {
                    storageLocations: [...new Set(storageLocations)], // Remove duplicates
                  },
                };
                setData(presenceData);
                setStatus(presenceData.storageStatus.storageLocations);
                return;
              }
            }
          }
        }

        // If all else fails, set error status
        fatLogger.debug(`❌ [STORAGE STATUS HOOK] Memory ${memoryId} - No storage status data found`, 'fe');
        setStatus('error');
      } catch (error) {
        // Only log unexpected errors, not 404s for non-existent memories
        if (error instanceof Error && !error.message.includes('404')) {
          fatLogger.error('Error fetching memory storage status:', 'fe', {
            error: error.message,
            stack: error.stack,
          });
        }
        setStatus('error');
      }
    }

    fetchStatus();
  }, [memoryId, memoryType]);

  return { status, data };
}

// Hook for batch memory storage status (optimized for galleries)
export function useBatchMemoryStorageStatus(memories: Array<{ id: string; type: string }>) {
  const [statusMap, setStatusMap] = useState<MemoryStatusMap>({});
  const [isLoading, setIsLoading] = useState(true);

  // Create a stable key from memories array to prevent infinite re-renders
  const memoriesKey = memories
    .map(m => `${m.id}:${m.type}`)
    .sort()
    .join(',');

  useEffect(() => {
    async function fetchBatchStatus() {
      if (!memories || memories.length === 0) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // Initialize loading state for all memories
        const initialMap: MemoryStatusMap = {};
        memories.forEach(memory => {
          const key = `${memory.id}:${memory.type}`;
          initialMap[key] = { status: 'loading', data: null };
        });
        setStatusMap(initialMap);

        // For now, fetch individually (can be optimized with batch endpoint later)
        const promises = memories.map(async memory => {
          const key = `${memory.id}:${memory.type}`;
          try {
            const response = await fetch(`/api/memories/${memory.id}`);

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();

            if (result.success && result.data && result.data.storageStatus) {
              // Transform the response to match the expected format
              const storageStatus = result.data.storageStatus;
              const presenceData: MemoryPresenceData = {
                memoryId: memory.id,
                memoryType: memory.type,
                storageStatus: {
                  storageLocations: storageStatus.storageLocations || [],
                },
              };
              return {
                key,
                status: storageStatus.storageLocations || [],
                data: presenceData,
              };
            } else {
              return { key, status: 'error' as MemoryStorageStatus, data: null };
            }
          } catch (error) {
            // Only log unexpected errors, not 404s for non-existent memories
            if (error instanceof Error && !error.message.includes('404')) {
              fatLogger.error(`Error fetching status for memory ${memory.id}:`, 'fe', {
                error: error.message,
                stack: error.stack,
              });
            }
            return { key, status: 'error' as MemoryStorageStatus, data: null };
          }
        });

        const results = await Promise.all(promises);

        // Update status map with results
        setStatusMap(prevMap => {
          const newMap = { ...prevMap };
          results.forEach(result => {
            newMap[result.key] = {
              status: result.status,
              data: result.data,
            };
          });
          return newMap;
        });
      } catch (error) {
        fatLogger.error('Error in batch memory status fetch:', 'fe', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        // Set all to error state
        setStatusMap(prevMap => {
          const newMap = { ...prevMap };
          Object.keys(newMap).forEach(key => {
            newMap[key] = { status: 'error', data: null };
          });
          return newMap;
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchBatchStatus();
  }, [memoriesKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const getMemoryStatus = (memoryId: string, memoryType: string) => {
    const key = `${memoryId}:${memoryType}`;
    return statusMap[key] || { status: 'loading' as MemoryStorageStatus, data: null };
  };

  return { statusMap, isLoading, getMemoryStatus };
}

// Helper to get storage status summary for a gallery
export function getGalleryStorageSummary(statusMap: MemoryStatusMap, memories: Array<{ id: string; type: string }>) {
  const total = memories.length;
  let hasIcp = 0;
  let hasNeon = 0;
  let hasOther = 0;
  let loading = 0;
  let error = 0;

  memories.forEach(memory => {
    const key = `${memory.id}:${memory.type}`;
    const status = statusMap[key]?.status || 'loading';

    if (status === 'loading') {
      loading++;
    } else if (status === 'error') {
      error++;
    } else if (Array.isArray(status)) {
      // Check what storage locations are present
      if (status.includes('icp')) hasIcp++;
      if (status.includes('neon')) hasNeon++;
      if (status.some(loc => !['icp', 'neon'].includes(loc))) hasOther++;
    }
  });

  const icpPercentage = total > 0 ? Math.round((hasIcp / total) * 100) : 0;
  const hasAnyIcp = hasIcp > 0;
  const isFullyOnIcp = hasIcp === total && total > 0;

  return {
    total,
    hasIcp,
    hasNeon,
    hasOther,
    loading,
    error,
    icpPercentage,
    hasAnyIcp,
    isFullyOnIcp,
    storageLocations: Array.from(
      new Set(
        memories
          .map(memory => {
            const key = `${memory.id}:${memory.type}`;
            const status = statusMap[key]?.status;
            return Array.isArray(status) ? status : [];
          })
          .flat()
      )
    ),
  };
}
