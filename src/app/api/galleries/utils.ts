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
 * Enhance a gallery with storage status from the gallery's own fields
 */
export function addStorageStatusToGallery(gallery: DBGallery): GalleryWithStorageStatus {
  // Calculate storage status from the gallery's own fields
  const hasIcpStorage = gallery.storageLocations?.includes('icp-canister') || false;
  const totalMemories = gallery.totalMemories || 0;

  // For now, assume all memories in ICP storage are complete
  // In the future, this could be calculated from individual memory storage status
  const icpCompleteMemories = hasIcpStorage ? totalMemories : 0;

  const icpCompletePercentage = totalMemories > 0 ? Math.round((icpCompleteMemories / totalMemories) * 100) : 0;

  // Determine overall status
  let status: 'stored_forever' | 'partially_stored' | 'web2_only';
  if (hasIcpStorage && icpCompleteMemories === totalMemories) {
    status = 'stored_forever';
  } else if (hasIcpStorage) {
    status = 'partially_stored';
  } else {
    status = 'web2_only';
  }

  return {
    ...gallery,
    storageStatus: {
      totalMemories,
      icpCompleteMemories,
      icpComplete: hasIcpStorage && icpCompleteMemories === totalMemories,
      icpAny: hasIcpStorage,
      icpCompletePercentage,
      status,
    },
  };
}

/**
 * Enhance multiple galleries with storage status
 */
export function addStorageStatusToGalleries(galleries: DBGallery[]): GalleryWithStorageStatus[] {
  return galleries.map(gallery => addStorageStatusToGallery(gallery));
}
