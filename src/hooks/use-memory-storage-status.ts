import { useState, useEffect } from "react";

export type MemoryStorageStatus = "stored_forever" | "partially_stored" | "web2_only" | "loading" | "error";

interface MemoryPresenceData {
  memoryId: string;
  memoryType: string;
  metaNeon: boolean;
  assetBlob: boolean;
  metaIcp: boolean;
  assetIcp: boolean;
  storageStatus: {
    neon: boolean;
    blob: boolean;
    icp: boolean;
    icpPartial: boolean;
  };
  overallStatus: "stored_forever" | "partially_stored" | "web2_only";
}

interface MemoryStatusMap {
  [key: string]: {
    status: MemoryStorageStatus;
    data: MemoryPresenceData | null;
  };
}

// Hook for single memory storage status
export function useMemoryStorageStatus(memoryId: string, memoryType: string) {
  const [status, setStatus] = useState<MemoryStorageStatus>("loading");
  const [data, setData] = useState<MemoryPresenceData | null>(null);

  useEffect(() => {
    async function fetchStatus() {
      if (!memoryId || !memoryType) {
        setStatus("error");
        return;
      }

      try {
        setStatus("loading");
        const response = await fetch(`/api/memories/presence?id=${memoryId}&type=${memoryType}`);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        if (result.success && result.data) {
          setData(result.data);
          setStatus(result.data.overallStatus);
        } else {
          setStatus("error");
        }
      } catch (error) {
        console.error("Error fetching memory storage status:", error);
        setStatus("error");
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
    .map((m) => `${m.id}:${m.type}`)
    .sort()
    .join(",");

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
        memories.forEach((memory) => {
          const key = `${memory.id}:${memory.type}`;
          initialMap[key] = { status: "loading", data: null };
        });
        setStatusMap(initialMap);

        // For now, fetch individually (can be optimized with batch endpoint later)
        const promises = memories.map(async (memory) => {
          const key = `${memory.id}:${memory.type}`;
          try {
            const response = await fetch(`/api/memories/presence?id=${memory.id}&type=${memory.type}`);

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();

            if (result.success && result.data) {
              return {
                key,
                status: result.data.overallStatus as MemoryStorageStatus,
                data: result.data as MemoryPresenceData,
              };
            } else {
              return { key, status: "error" as MemoryStorageStatus, data: null };
            }
          } catch (error) {
            console.error(`Error fetching status for memory ${memory.id}:`, error);
            return { key, status: "error" as MemoryStorageStatus, data: null };
          }
        });

        const results = await Promise.all(promises);

        // Update status map with results
        setStatusMap((prevMap) => {
          const newMap = { ...prevMap };
          results.forEach((result) => {
            newMap[result.key] = {
              status: result.status,
              data: result.data,
            };
          });
          return newMap;
        });
      } catch (error) {
        console.error("Error in batch memory status fetch:", error);
        // Set all to error state
        setStatusMap((prevMap) => {
          const newMap = { ...prevMap };
          Object.keys(newMap).forEach((key) => {
            newMap[key] = { status: "error", data: null };
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
    return statusMap[key] || { status: "loading" as MemoryStorageStatus, data: null };
  };

  return { statusMap, isLoading, getMemoryStatus };
}

// Helper to get storage status summary for a gallery
export function getGalleryStorageSummary(statusMap: MemoryStatusMap, memories: Array<{ id: string; type: string }>) {
  const total = memories.length;
  let icpComplete = 0;
  let icpPartial = 0;
  let web2Only = 0;
  let loading = 0;
  let error = 0;

  memories.forEach((memory) => {
    const key = `${memory.id}:${memory.type}`;
    const status = statusMap[key]?.status || "loading";

    switch (status) {
      case "stored_forever":
        icpComplete++;
        break;
      case "partially_stored":
        icpPartial++;
        break;
      case "web2_only":
        web2Only++;
        break;
      case "loading":
        loading++;
        break;
      case "error":
        error++;
        break;
    }
  });

  const icpCompletePercentage = total > 0 ? Math.round((icpComplete / total) * 100) : 0;
  const hasAnyIcp = icpComplete > 0 || icpPartial > 0;
  const isFullyOnIcp = icpComplete === total && total > 0;

  return {
    total,
    icpComplete,
    icpPartial,
    web2Only,
    loading,
    error,
    icpCompletePercentage,
    hasAnyIcp,
    isFullyOnIcp,
    overallStatus: isFullyOnIcp ? "stored_forever" : hasAnyIcp ? "partially_stored" : "web2_only",
  };
}
