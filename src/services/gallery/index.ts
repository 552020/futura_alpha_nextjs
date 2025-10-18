/**
 * Gallery Service Layer - Server-Side Operations
 *
 * This module provides pure functions for gallery database operations.
 * All functions are stateless and can be easily tested and composed.
 * 
 * Note: This is the SERVER-SIDE service layer for DB operations.
 * For CLIENT-SIDE HTTP calls, see src/services/gallery.ts
 */

// Gallery operations
export {
    createGalleryRecord,
    getGalleryRecord,
    getGalleryRecords,
    getGalleriesByOwner,
    getSharedGalleries,
    getAllAccessibleGalleries,
    updateGalleryRecord,
    deleteGalleryRecord,
    createGalleryItems,
    getGalleryItems,
    deleteGalleryItemsByMemoryIds,
    shareGalleryWithUser,
    getGalleryShares,
    checkGalleryAccess,
    checkMemoryAccessInGallery,
} from './gallery-operations';

// Shared types
export type {
    GalleryOperationResult,
    CreateGalleryParams,
    UpdateGalleryParams,
    GalleryQueryParams,
    CreateGalleryItemParams,
    ShareGalleryParams,
    GalleryAccessCheckParams,
    DBGallery,
    NewDBGallery,
    DBGalleryItem,
    NewDBGalleryItem,
    GalleryWithItemsCount,
} from './types';
