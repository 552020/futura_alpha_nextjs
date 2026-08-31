import { db } from '@/db/db';
import { galleries, galleryItems, resourceMembership, memories } from '@/db';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { fatLogger } from '@/lib/logger';
import type {
  GalleryOperationResult,
  CreateGalleryParams,
  UpdateGalleryParams,
  GalleryQueryParams,
  CreateGalleryItemParams,
  ShareGalleryParams,
  GalleryAccessCheckParams,
  DBGallery,
  GalleryWithItemsCount,
} from './types';

/**
 * Create a new gallery record in the database
 */
export const createGalleryRecord = async (
  params: CreateGalleryParams
): Promise<GalleryOperationResult<DBGallery>> => {
  try {
    const [createdGallery] = await db
      .insert(galleries)
      .values({
        ownerId: params.ownerId,
        title: params.title,
        description: params.description || '',
        name: params.name || params.title.toLowerCase().replace(/\s+/g, '-'),
        sharingStatus: params.sharingStatus || 'private',
        totalMemories: params.totalMemories || 0,
        sharedCount: 0,
        storageLocation: params.storageLocation || ['s3'],
      })
      .returning();

    fatLogger.info('Created gallery', 'be', {
      operation: 'create_gallery',
      galleryId: createdGallery.id,
      ownerId: params.ownerId,
      title: params.title,
    });

    return { success: true, data: createdGallery };
  } catch (error) {
    fatLogger.error('Failed to create gallery', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'create_gallery',
      ownerId: params.ownerId,
      title: params.title,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Get a single gallery record by ID
 */
export const getGalleryRecord = async (
  galleryId: string
): Promise<GalleryOperationResult<DBGallery>> => {
  try {
    const gallery = await db.query.galleries.findFirst({
      where: eq(galleries.id, galleryId),
    });

    if (!gallery) {
      return { success: false, error: 'Gallery not found' };
    }

    return { success: true, data: gallery };
  } catch (error) {
    fatLogger.error('Failed to get gallery', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'get_gallery',
      galleryId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Get galleries by query parameters
 */
export const getGalleryRecords = async (
  params: GalleryQueryParams
): Promise<GalleryOperationResult<DBGallery[]>> => {
  try {
    const whereConditions = [];

    if (params.ownerId) {
      whereConditions.push(eq(galleries.ownerId, params.ownerId));
    }
    if (params.sharingStatus) {
      whereConditions.push(eq(galleries.sharingStatus, params.sharingStatus));
    }

    const galleriesList = await db.query.galleries.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      orderBy: desc(galleries.createdAt),
      limit: params.limit,
      offset: params.offset,
    });

    return { success: true, data: galleriesList };
  } catch (error) {
    fatLogger.error('Failed to get galleries', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'get_galleries',
      params,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Get galleries owned by a user
 */
export const getGalleriesByOwner = async (
  ownerId: string
): Promise<GalleryOperationResult<DBGallery[]>> => {
  return getGalleryRecords({ ownerId });
};

/**
 * Get galleries shared with a user
 */
export const getSharedGalleries = async (
  allUserId: string
): Promise<GalleryOperationResult<DBGallery[]>> => {
  try {
    // Get gallery memberships for this user
    const memberships = await db.query.resourceMembership.findMany({
      where: and(
        eq(resourceMembership.allUserId, allUserId),
        eq(resourceMembership.resourceType, 'gallery')
      ),
    });

    if (memberships.length === 0) {
      return { success: true, data: [] };
    }

    // Get the actual gallery data
    const galleryIds = memberships.map((m) => m.resourceId);
    const sharedGalleries = await db.query.galleries.findMany({
      where: inArray(galleries.id, galleryIds),
      orderBy: desc(galleries.createdAt),
    });

    return { success: true, data: sharedGalleries };
  } catch (error) {
    fatLogger.error('Failed to get shared galleries', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'get_shared_galleries',
      allUserId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Get all galleries accessible by a user (owned + shared)
 */
export const getAllAccessibleGalleries = async (
  allUserId: string
): Promise<GalleryOperationResult<GalleryWithItemsCount[]>> => {
  try {
    // Get owned galleries
    const ownedResult = await getGalleriesByOwner(allUserId);
    if (!ownedResult.success) {
      return { success: false, error: ownedResult.error };
    }

    // Get shared galleries
    const sharedResult = await getSharedGalleries(allUserId);
    if (!sharedResult.success) {
      return { success: false, error: sharedResult.error };
    }

    // Combine and sort
    const allGalleries = [
      ...(ownedResult.data || []),
      ...(sharedResult.data || []),
    ];
    allGalleries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Add isOwner flag and itemsCount
    const galleriesWithMeta = allGalleries.map((gallery) => ({
      ...gallery,
      isOwner: gallery.ownerId === allUserId,
      itemsCount: gallery.totalMemories,
    }));

    return { success: true, data: galleriesWithMeta };
  } catch (error) {
    fatLogger.error('Failed to get all accessible galleries', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'get_all_accessible_galleries',
      allUserId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Update a gallery record
 */
export const updateGalleryRecord = async (
  galleryId: string,
  params: UpdateGalleryParams
): Promise<GalleryOperationResult<DBGallery>> => {
  try {
    const [updatedGallery] = await db
      .update(galleries)
      .set({
        ...params,
        updatedAt: new Date(),
      })
      .where(eq(galleries.id, galleryId))
      .returning();

    if (!updatedGallery) {
      return { success: false, error: 'Gallery not found' };
    }

    fatLogger.info('Updated gallery', 'be', {
      operation: 'update_gallery',
      galleryId,
      updates: Object.keys(params),
    });

    return { success: true, data: updatedGallery };
  } catch (error) {
    fatLogger.error('Failed to update gallery', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'update_gallery',
      galleryId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Delete a gallery record
 */
export const deleteGalleryRecord = async (
  galleryId: string
): Promise<GalleryOperationResult> => {
  try {
    // Delete gallery shares first
    await db
      .delete(resourceMembership)
      .where(
        and(
          eq(resourceMembership.resourceType, 'gallery'),
          eq(resourceMembership.resourceId, galleryId)
        )
      );

    // Delete gallery (cascade will handle gallery_items)
    const [deletedGallery] = await db
      .delete(galleries)
      .where(eq(galleries.id, galleryId))
      .returning();

    if (!deletedGallery) {
      return { success: false, error: 'Gallery not found' };
    }

    fatLogger.info('Deleted gallery', 'be', {
      operation: 'delete_gallery',
      galleryId,
      ownerId: deletedGallery.ownerId,
    });

    return { success: true, data: deletedGallery };
  } catch (error) {
    fatLogger.error('Failed to delete gallery', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'delete_gallery',
      galleryId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Create gallery items (add memories to gallery)
 */
export const createGalleryItems = async (
  items: CreateGalleryItemParams[]
): Promise<GalleryOperationResult> => {
  try {
    const createdItems = await db
      .insert(galleryItems)
      .values(items)
      .returning();

    fatLogger.info('Created gallery items', 'be', {
      operation: 'create_gallery_items',
      count: createdItems.length,
      galleryId: items[0]?.galleryId,
    });

    return { success: true, data: createdItems };
  } catch (error) {
    fatLogger.error('Failed to create gallery items', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'create_gallery_items',
      count: items.length,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Get gallery items for a gallery
 */
export const getGalleryItems = async (
  galleryId: string
): Promise<GalleryOperationResult> => {
  try {
    const items = await db.query.galleryItems.findMany({
      where: eq(galleryItems.galleryId, galleryId),
      orderBy: [galleryItems.position],
    });

    return { success: true, data: items };
  } catch (error) {
    fatLogger.error('Failed to get gallery items', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'get_gallery_items',
      galleryId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Delete gallery items by memory IDs
 */
export const deleteGalleryItemsByMemoryIds = async (
  galleryId: string,
  memoryIds: string[]
): Promise<GalleryOperationResult> => {
  try {
    const deletedItems = await db
      .delete(galleryItems)
      .where(
        and(
          eq(galleryItems.galleryId, galleryId),
          inArray(galleryItems.memoryId, memoryIds)
        )
      )
      .returning();

    fatLogger.info('Deleted gallery items', 'be', {
      operation: 'delete_gallery_items',
      galleryId,
      count: deletedItems.length,
    });

    return { success: true, data: deletedItems };
  } catch (error) {
    fatLogger.error('Failed to delete gallery items', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'delete_gallery_items',
      galleryId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Share a gallery with a user
 */
export const shareGalleryWithUser = async (
  params: ShareGalleryParams
): Promise<GalleryOperationResult> => {
  try {
    const [share] = await db
      .insert(resourceMembership)
      .values({
        resourceType: 'gallery',
        resourceId: params.galleryId,
        allUserId: params.allUserId || '',
        grantSource: params.grantSource,
        role: params.role,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Update gallery's sharedCount
    const shareCount = await db.query.resourceMembership.findMany({
      where: and(
        eq(resourceMembership.resourceId, params.galleryId),
        eq(resourceMembership.resourceType, 'gallery')
      ),
    });

    await db
      .update(galleries)
      .set({
        sharedCount: shareCount.length,
        sharingStatus: shareCount.length > 0 ? 'shared' : 'private',
        updatedAt: new Date(),
      })
      .where(eq(galleries.id, params.galleryId));

    fatLogger.info('Shared gallery', 'be', {
      operation: 'share_gallery',
      galleryId: params.galleryId,
      allUserId: params.allUserId,
      role: params.role,
    });

    return { success: true, data: share };
  } catch (error) {
    fatLogger.error('Failed to share gallery', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'share_gallery',
      galleryId: params.galleryId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Get gallery shares
 */
export const getGalleryShares = async (
  galleryId: string
): Promise<GalleryOperationResult> => {
  try {
    const shares = await db.query.resourceMembership.findMany({
      where: and(
        eq(resourceMembership.resourceId, galleryId),
        eq(resourceMembership.resourceType, 'gallery')
      ),
    });

    return { success: true, data: shares };
  } catch (error) {
    fatLogger.error('Failed to get gallery shares', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'get_gallery_shares',
      galleryId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Check if user has access to a gallery
 * Returns access level: 'owner', 'shared', 'public', or null
 */
export const checkGalleryAccess = async (
  params: GalleryAccessCheckParams
): Promise<GalleryOperationResult<'owner' | 'shared' | 'public' | null>> => {
  try {
    const gallery = await db.query.galleries.findFirst({
      where: eq(galleries.id, params.galleryId),
    });

    if (!gallery) {
      return { success: true, data: null };
    }

    // Check if user owns the gallery
    if (gallery.ownerId === params.userId) {
      return { success: true, data: 'owner' };
    }

    // Check if gallery is public
    if (gallery.sharingStatus === 'public') {
      return { success: true, data: 'public' };
    }

    // Check if gallery is shared with user
    const share = await db.query.resourceMembership.findFirst({
      where: and(
        eq(resourceMembership.resourceId, params.galleryId),
        eq(resourceMembership.resourceType, 'gallery'),
        eq(resourceMembership.allUserId, params.userId)
      ),
    });

    if (share) {
      return { success: true, data: 'shared' };
    }

    return { success: true, data: null };
  } catch (error) {
    fatLogger.error('Failed to check gallery access', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'check_gallery_access',
      galleryId: params.galleryId,
      userId: params.userId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Check if user has access to a memory (considering gallery override)
 */
export const checkMemoryAccessInGallery = async (
  memoryId: string,
  memoryType: string,
  allUserId: string,
  galleryId?: string
): Promise<GalleryOperationResult<boolean>> => {
  try {
    // If gallery is provided, check gallery access first
    if (galleryId) {
      const galleryAccessResult = await checkGalleryAccess({
        galleryId,
        userId: allUserId,
      });

      if (galleryAccessResult.success && galleryAccessResult.data) {
        // User has access through gallery
        return { success: true, data: true };
      }
    }

    // Check individual memory access
    const memory = await db.query.memories.findFirst({
      where: and(
        eq(memories.id, memoryId),
        eq(
          memories.type,
          memoryType as 'image' | 'video' | 'note' | 'document' | 'audio'
        )
      ),
    });

    if (!memory) {
      return { success: true, data: false };
    }

    // Check if user owns the memory
    if (memory.ownerId === allUserId) {
      return { success: true, data: true };
    }

    // Check if memory is public
    if (memory.sharingStatus === 'public') {
      return { success: true, data: true };
    }

    return { success: true, data: false };
  } catch (error) {
    fatLogger.error('Failed to check memory access in gallery', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'check_memory_access_in_gallery',
      memoryId,
      allUserId,
      galleryId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
