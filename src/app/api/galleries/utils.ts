import { DBGallery } from '@/db/schema';

export type GalleryWithStorageStatus = DBGallery & {
  storageStatus: {
    totalMemories: number;
    storageLocations: string[]; // Array of actual storage locations
  };
};

/**
 * Enhance a gallery with storage status from the gallery's own fields
 */
export function addStorageStatusToGallery(gallery: DBGallery): GalleryWithStorageStatus {
  const totalMemories = gallery.totalMemories ?? 0;

  // Extract storage locations from storageLocation
  const storageLocations: string[] = gallery.storageLocation || [];

  return {
    ...gallery,
    storageStatus: {
      totalMemories,
      storageLocations,
    },
  };
}

/**
 * Enhance multiple galleries with storage status
 */
export function addStorageStatusToGalleries(galleries: DBGallery[]): GalleryWithStorageStatus[] {
  return galleries.map(gallery => addStorageStatusToGallery(gallery));
}
