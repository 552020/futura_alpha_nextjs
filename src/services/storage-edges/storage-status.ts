import { getStorageEdges } from './storage-edge-operations';
import type { DBStorageEdge } from '@/db/types';

export async function getStorageStatusForMemory(
  memoryId: string
): Promise<{
  success: boolean;
  data?: { storageLocations: string[] };
  error?: string;
}> {
  try {
    const edgesResult = await getStorageEdges({ memoryId });
    if (!edgesResult.success || !edgesResult.data) {
      return {
        success: false,
        error: edgesResult.error || 'Failed to fetch storage edges',
      };
    }

    const edges = Array.isArray(edgesResult.data)
      ? (edgesResult.data as DBStorageEdge[])
      : [edgesResult.data as DBStorageEdge];

    const locations = new Set<string>();
    for (const edge of edges) {
      if (edge.present) {
        if (edge.locationMetadata) locations.add(edge.locationMetadata);
        if (edge.locationAsset) locations.add(edge.locationAsset);
      }
    }

    return { success: true, data: { storageLocations: Array.from(locations) } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
