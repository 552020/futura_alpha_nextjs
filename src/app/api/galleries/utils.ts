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

  // Calculate storage locations from storageDistribution keys
  const storageLocations: string[] = gallery.storageDistribution ? Object.keys(gallery.storageDistribution) : [];

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
