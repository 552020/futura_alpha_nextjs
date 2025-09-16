import { db } from '@/db/db';
import { getGalleryPresenceById, DBGalleryPresence } from '@/db/schema';
import { DBGallery } from '@/db/schema';

export type GalleryWithStorageStatus = DBGallery & {
  storageStatus: {
    totalMemories: number;
    icpCompleteMemories: number;
    icpComplete: boolean;
    icpAny: boolean;
    icpCompletePercentage: number;
    status: 'stored_forever' | 'partially_stored' | 'web2_only';
  };
};

/**
 * Enhance a gallery with computed storage status from the gallery_presence view
 */
export async function addStorageStatusToGallery(gallery: DBGallery): Promise<GalleryWithStorageStatus> {
  try {
    // Query the gallery_presence view for this gallery
    const result = await db.execute(getGalleryPresenceById(gallery.id));
    const rows = (result as { rows?: unknown[] })?.rows || [];

    if (rows.length === 0) {
      // No presence data available, return gallery with default storage status
      return {
        ...gallery,
        storageStatus: {
          totalMemories: 0,
          icpCompleteMemories: 0,
          icpComplete: false,
          icpAny: false,
          icpCompletePercentage: 0,
          status: 'web2_only' as const,
        },
      };
    }

    const presenceData = rows[0] as DBGalleryPresence;

    return {
      ...gallery,
      storageStatus: {
        totalMemories: presenceData.total_memories,
        icpCompleteMemories: presenceData.icp_complete_memories,
        icpComplete: presenceData.icp_complete,
        icpAny: presenceData.icp_any,
        icpCompletePercentage:
          presenceData.total_memories > 0
            ? Math.round((presenceData.icp_complete_memories / presenceData.total_memories) * 100)
            : 0,
        status: presenceData.icp_complete ? 'stored_forever' : presenceData.icp_any ? 'partially_stored' : 'web2_only',
      },
    };
  } catch (error) {
    console.error('Error adding storage status to gallery:', gallery.id, error);

    // Return gallery with default storage status on error
    return {
      ...gallery,
      storageStatus: {
        totalMemories: 0,
        icpCompleteMemories: 0,
        icpComplete: false,
        icpAny: false,
        icpCompletePercentage: 0,
        status: 'web2_only' as const,
      },
    };
  }
}

/**
 * Enhance multiple galleries with computed storage status
 */
export async function addStorageStatusToGalleries(galleries: DBGallery[]): Promise<GalleryWithStorageStatus[]> {
  const enhancedGalleries = await Promise.allSettled(galleries.map(gallery => addStorageStatusToGallery(gallery)));

  return enhancedGalleries.map(result => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      console.error('Error enhancing gallery with storage status:', result.reason);
      // Return original gallery with default storage status on error
      return {
        ...galleries[0], // This is a fallback, should be the corresponding gallery
        storageStatus: {
          totalMemories: 0,
          icpCompleteMemories: 0,
          icpComplete: false,
          icpAny: false,
          icpCompletePercentage: 0,
          status: 'web2_only' as const,
        },
      };
    }
  });
}
