/**
 * Gallery Service Types
 * 
 * Shared types for gallery operations
 */

import type { galleries, galleryItems } from '@/db';
import type { BlobHosting } from '@/db/enums';

export type DBGallery = typeof galleries.$inferSelect;
export type NewDBGallery = typeof galleries.$inferInsert;
export type DBGalleryItem = typeof galleryItems.$inferSelect;
export type NewDBGalleryItem = typeof galleryItems.$inferInsert;

export interface GalleryOperationResult<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface CreateGalleryParams {
    ownerId: string;
    title: string;
    description?: string;
    name?: string;
    sharingStatus?: 'private' | 'shared' | 'public';
    totalMemories?: number;
    storageLocation?: BlobHosting[];
}

export interface UpdateGalleryParams {
    title?: string;
    description?: string;
    sharingStatus?: 'private' | 'shared' | 'public';
    sharedCount?: number;
    totalMemories?: number;
}

export interface GalleryQueryParams {
    ownerId?: string;
    sharingStatus?: 'private' | 'shared' | 'public';
    limit?: number;
    offset?: number;
}

export interface CreateGalleryItemParams {
    galleryId: string;
    memoryId: string;
    memoryType: 'image' | 'video' | 'document' | 'note' | 'audio';
    position: number;
    caption?: string | null;
    isFeatured?: boolean;
    metadata?: Record<string, unknown>;
}

export interface ShareGalleryParams {
    galleryId: string;
    allUserId?: string | null;
    role: 'owner' | 'member' | 'guest';
    grantSource: 'user' | 'group' | 'magic_link' | 'public_mode' | 'system';
}

export interface GalleryAccessCheckParams {
    galleryId: string;
    userId: string;
}

export interface GalleryWithItemsCount extends DBGallery {
    itemsCount: number;
    isOwner: boolean;
}
