import { Memory } from './memory';
import { DBGallery, DBGalleryItem } from '@/db/schema';
import { ErrorInfo } from 'react';

// Gallery with items - extends existing DB types
export interface GalleryWithItems extends DBGallery {
  items: (DBGalleryItem & { memory: Memory })[];
  imageCount: number;
  isOwner: boolean;
  storageStatus?: {
    totalMemories: number;
    icpCompleteMemories: number;
    icpComplete: boolean;
    icpAny: boolean;
    icpCompletePercentage: number;
    status: 'stored_forever' | 'partially_stored' | 'web2_only';
  };
}

// Gallery creation request
export interface CreateGalleryRequest {
  type: 'from-folder' | 'from-memories';
  folderName?: string;
  memories?: Array<{ id: string; type: string }>;
  title: string;
  description?: string;
  isPublic?: boolean;
}

// Gallery update request
export interface UpdateGalleryRequest {
  title?: string;
  description?: string;
  isPublic?: boolean;
}

// Folder information for gallery creation
export interface FolderInfo {
  name: string;
  imageCount: number;
  previewImages: string[];
  hasImages: boolean;
}

// Gallery responses
export interface GalleryListResponse {
  galleries: GalleryWithItems[];
  hasMore: boolean;
  totalCount: number;
}

export interface GalleryDetailResponse {
  gallery: GalleryWithItems;
  items: (DBGalleryItem & { memory: Memory })[];
  itemsCount: number;
}
// Additional types for gallery components
export interface Gallery {
  id: string;
  title: string;
  description?: string;
  isPublic: boolean;
  allowDownloads: boolean;
  coverImage?: string;
  imageCount: number;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  isOwner: boolean;
  shareUrl?: string;
}

export interface GalleryImage {
  id: string;
  url: string;
  thumbnail: string;
  title?: string;
  description?: string;
  width?: number;
  height?: number;
  position: number;
  createdAt: string;
}

export interface MockGalleryConfig {
  count: number;
  imageCount: number;
  aspectRatio: 'landscape' | 'portrait' | 'mixed' | 'wild';
  titles: string[];
  descriptions: string[];
}

export interface GalleryListState {
  ownGalleries: Gallery[];
  sharedGalleries: Gallery[];
  isLoading: boolean;
  error: string | null;
  useMockData: boolean;
}

export interface GalleryViewProps {
  galleryId: string;
  isPublic?: boolean;
}

export interface ImageLightboxProps {
  images: GalleryImage[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  allowDownload: boolean;
}

export interface CreateGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (gallery: Gallery) => void;
  availableFolders: FolderInfo[];
}

export interface GalleryErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// Analytics tracking function type
export type TrackFunction = (event: string, props?: Record<string, unknown>) => void;
