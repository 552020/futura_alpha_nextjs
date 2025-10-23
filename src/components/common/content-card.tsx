'use client';

import {
  FileText,
  ImageIcon,
  Video,
  Share2,
  Trash2,
  File,
  Pencil,
  Music,
  Folder,
  Image as ImageLucide,
  Loader2,
  Globe,
  Lock,
} from 'lucide-react';
import { MemoryStatus } from '../memory/memory-status';
import { MemoryStorageBadge } from '@/components/common/memory-storage-badge';
import { BaseCard } from '@/components/common/base-card';
import Image from 'next/image';
import { shortenTitle } from '@/lib/utils';
import { getBlurPlaceholder, IMAGE_SIZES } from '@/utils/image-utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Memory } from '@/types/memory';
import { DashboardItem } from '@/services/memories';
import { Badge } from '@/components/ui/badge';
import { GalleryWithItems } from '@/types/gallery';
import { fatLogger } from '@/lib/logger/fat-logger';

interface BaseItem {
  id: string;
}

interface MemoryItem extends BaseItem {
  type: 'image' | 'video' | 'note' | 'document' | 'audio' | 'folder';
  title: string;
  description?: string;
  thumbnail?: string;
  url?: string; // Display URL for images
  status: 'private' | 'shared' | 'public';
  sharedWithCount?: number;
  sharedBy?: string;
  itemCount?: number;
  assets?: Array<{ assetType: string; url: string }>;
  storageSummary?: {
    storageLocations: string[]; // Array of storage locations: ['icp'], ['neon'], ['icp', 'neon']
  };
}

interface GalleryPhotoItem extends BaseItem {
  memory: {
    id: string;
    url?: string;
    title?: string;
    type: string;
  };
}

interface GalleryItem extends BaseItem {
  title: string;
  description?: string;
  isPublic: boolean;
  itemsCount?: number;
}

type FlexibleItem = MemoryItem | GalleryPhotoItem | GalleryItem | Memory | DashboardItem | GalleryWithItems;

interface ContentCardProps {
  item: FlexibleItem;
  onClick: (item: FlexibleItem) => void;
  onEdit?: (item: FlexibleItem) => void;
  onShare?: (item: FlexibleItem) => void;
  onDelete?: (item: FlexibleItem) => void;
  isDeleting?: boolean;

  // Selection mode props (for gallery photos)
  selectionMode?: boolean;
  isSelected?: boolean;
  onSelectionToggle?: (checked: boolean) => void;

  // Rating props (for gallery photos) - commented out
  // rating?: number;
  // onRate?: (rating: number) => void;

  // Hide/Unhide props (for gallery photos) - commented out
  // isHidden?: boolean;
  // onHide?: () => void;
  // onUnhide?: () => void;

  // Image error handling
  onImageError?: (url: string) => void;

  // View mode
  viewMode?: 'grid' | 'list';

  // Content type identification
  contentType?: 'memory' | 'gallery-photo' | 'gallery';
}

// Helper functions
function getMemoryIcon(type: string) {
  switch (type) {
    case 'image':
      return <ImageIcon className="h-5 w-5" />;
    case 'video':
      return <Video className="h-5 w-5" />;
    case 'note':
      return <FileText className="h-5 w-5" />;
    case 'document':
      return <File className="h-5 w-5" />;
    case 'audio':
      return <Music className="h-5 w-5" />;
    case 'folder':
      return <Folder className="h-5 w-5" />;
    default:
      return <FileText className="h-5 w-5" />;
  }
}

function renderPreview(item: FlexibleItem) {
  // Memory preview logic
  if ('type' in item && item.type) {
    const memory = item as MemoryItem;

    // For grid view, prefer display image over thumbnail for better quality
    const memoryWithAssets = memory as typeof memory & { assets?: Array<{ assetType: string; url: string }> };
    const derivedThumb =
      memoryWithAssets?.assets?.find?.(a => a.assetType === 'display')?.url ||
      memoryWithAssets?.assets?.find?.(a => a.assetType === 'thumb')?.url ||
      memoryWithAssets?.assets?.find?.(a => a.assetType === 'original')?.url;

    // Look for placeholder asset for better blur effect
    const placeholderAsset = memoryWithAssets?.assets?.find?.(a => a.assetType === 'placeholder');
    const blurDataURL = placeholderAsset?.url || getBlurPlaceholder();

    if (memory.type === 'image' && (memory.url || memory.thumbnail || derivedThumb)) {
      // Prefer display URL (memory.url) over thumbnail for better quality in grid view
      const imageSrc = memory.url || memory.thumbnail || derivedThumb || '';
      fatLogger.info('Image src for memory:', 'be', { memoryId: memory.id, url: imageSrc });

      return (
        <Image
          src={imageSrc}
          alt={memory.title || 'Memory image'}
          fill={true}
          className="object-cover"
          sizes={IMAGE_SIZES.grid}
          placeholder="blur"
          blurDataURL={blurDataURL}
          onLoad={async () => {
            fatLogger.info('Image loaded successfully for memory:', 'be', { memoryId: memory.id, url: imageSrc });

            // Check actual image dimensions and file size
            try {
              const response = await fetch(imageSrc);
              const blob = await response.blob();

              const img = document.createElement('img');
              img.onload = () => {
                fatLogger.info('Memory:', 'be', { memoryId: memory.id });
                fatLogger.info('URL:', 'be', { url: imageSrc });
                fatLogger.info('Dimensions:', 'be', { width: img.naturalWidth, height: img.naturalHeight });
                fatLogger.info('File size:', 'be', { size: blob.size });
                fatLogger.info('Expected: Display ~2048px, Thumbnail ~512px, Placeholder 32px', 'be');

                // Determine what type of image this is based on dimensions
                if (img.naturalWidth <= 50 && img.naturalHeight <= 50) {
                  fatLogger.warn('PLACEHOLDER IMAGE DETECTED!', 'be');
                } else if (img.naturalWidth >= 1000 || img.naturalHeight >= 1000) {
                  fatLogger.info('Display image detected', 'be');
                } else if (img.naturalWidth >= 400 || img.naturalHeight >= 400) {
                  fatLogger.info('Thumbnail image detected', 'be');
                } else {
                  fatLogger.info('Unknown image type', 'be');
                }
              };
              img.src = URL.createObjectURL(blob);
            } catch (error) {
              fatLogger.error('Failed to check image dimensions:', 'be', { error });
            }
          }}
          onError={() => {
            fatLogger.error('Image error for memory:', 'be', { memoryId: memory.id, url: imageSrc });
          }}
        />
      );
    }

    const IconComponent = getMemoryIconComponent(memory.type);
    const label = getMemoryLabel(memory);

    return (
      <div className="flex flex-col items-center justify-center text-muted-foreground">
        <IconComponent className="h-12 w-12 mb-2" />
        <span className="text-sm">{label}</span>
      </div>
    );
  }

  return null;
}

function getMemoryIconComponent(type: string) {
  switch (type) {
    case 'image':
      return ImageIcon;
    case 'video':
      return Video;
    case 'note':
      return FileText;
    case 'document':
      return File;
    case 'audio':
      return Music;
    case 'folder':
      return Folder;
    default:
      return FileText;
  }
}

function getMemoryLabel(memory: MemoryItem) {
  if (memory.type === 'folder') {
    return `${memory.itemCount || 0} items`;
  }
  switch (memory.type) {
    case 'video':
      return 'Video';
    case 'audio':
      return 'Audio';
    case 'document':
      return 'Document';
    case 'note':
      return 'Note';
    default:
      return 'File';
  }
}

/**
 * Renders the title for different item types in the card.
 *
 * TODO: BAD DESIGN - This function handles multiple item structures with different
 * property paths. This indicates poor type design and should be refactored to:
 * 1. Use a unified item interface with consistent property names
 * 2. Or use proper type guards/discriminated unions
 * 3. Or separate render functions for different item types
 *
 * Current logic:
 * - Direct memory items: uses item.title
 * - Gallery photo items: uses item.memory.title
 * - Fallback: "Untitled"
 */
function renderTitle(item: FlexibleItem) {
  // Base title
  let titleText = 'Untitled';
  if ('title' in item) {
    titleText = shortenTitle(item.title);
  } else if ('memory' in item && item.memory.title) {
    titleText = item.memory.title;
  }

  // For folders, append a small badge with itemCount
  if ('type' in item && item.type === 'folder' && 'itemCount' in item) {
    return (
      <div className="flex items-center gap-2">
        <span>{titleText}</span>
        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] leading-none text-muted-foreground">
          {String((item as { itemCount?: number }).itemCount ?? 0)}
        </span>
      </div>
    );
  }

  return titleText;
}

/**
 * Renders the description for different item types in the card.
 *
 * Returns undefined (not "Untitled") because:
 * - Descriptions are optional content, unlike titles which are required
 * - Returning undefined allows the BaseCard to conditionally render the description section
 * - If we returned "Untitled", it would show "Untitled" text even when no description exists
 * - The BaseCard checks if renderDescription returns a value before rendering the description area
 */
function renderDescription(item: FlexibleItem) {
  if ('description' in item) {
    return item.description;
  }
  return undefined;
}

// FolderStorageBadge component for displaying folder storage status
function FolderStorageBadge({
  storageSummary,
  size: _size,
}: {
  storageSummary?: { storageLocations: string[] };
  size: string;
}) {
  if (!storageSummary?.storageLocations?.length) return null;

  const { storageLocations } = storageSummary;

  // Simple logic: show badge for each storage location
  return (
    <div className="flex gap-1">
      {storageLocations.map(location => (
        <Badge key={location} variant="secondary" className="text-xs">
          {location.toUpperCase()}
        </Badge>
      ))}
    </div>
  );
}

function renderStorageBadge(item: FlexibleItem) {
  if ('type' in item && item.type) {
    if (item.type === 'folder') {
      // Handle folder storage badge
      const folderItem = item as MemoryItem & { storageSummary?: { storageLocations: string[] } };
      return <FolderStorageBadge storageSummary={folderItem.storageSummary} size="xs" />;
    } else {
      // Handle individual memory storage badge
      return (
        <MemoryStorageBadge
          memoryId={item.id}
          memoryType={item.type}
          storageStatus={'storageStatus' in item ? item.storageStatus : undefined}
          size="xs"
        />
      );
    }
  }
  return null;
}

function renderLeftStatus(item: FlexibleItem) {
  if ('type' in item && item.type) {
    const memory = item as MemoryItem;

    return (
      <>
        {/* Document type icon */}
        <div className="flex-shrink-0">{getMemoryIcon(memory.type)}</div>

        {/* Visibility status */}
        <MemoryStatus status={memory.status} sharedWithCount={memory.sharedWithCount} sharedBy={memory.sharedBy} />
      </>
    );
  }

  return null;
}

export function ContentCard({
  item,
  onClick,
  onEdit,
  onShare,
  onDelete,
  isDeleting,
  selectionMode = false,
  isSelected = false,
  onSelectionToggle,
  // rating = 0,
  // onRate,
  // isHidden = false,
  // onHide,
  // onUnhide,
  onImageError,
  viewMode = 'grid',
  contentType = 'memory',
}: ContentCardProps) {
  // Handle list view for memories
  if (viewMode === 'list' && contentType === 'memory') {
    const memory = item as MemoryItem;

    return (
      <div
        className="cursor-pointer transition-all hover:shadow-md p-4 border rounded-lg"
        onClick={() => onClick(item)}
      >
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">{getMemoryIcon(memory.type)}</div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate" title={memory.title}>
              {shortenTitle(memory.title)}
            </h3>
            {memory.description && <p className="text-sm text-muted-foreground truncate">{memory.description}</p>}
          </div>
          <div className="flex items-center gap-2">
            <MemoryStatus status={memory.status} sharedWithCount={memory.sharedWithCount} sharedBy={memory.sharedBy} />
            {onEdit && (
              <button
                className="p-2 hover:bg-accent rounded"
                onClick={e => {
                  e.stopPropagation();
                  onEdit(item);
                }}
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            {onShare && (
              <button
                className="p-2 hover:bg-accent rounded"
                onClick={e => {
                  e.stopPropagation();
                  onShare(item);
                }}
              >
                <Share2 className="h-4 w-4" />
              </button>
            )}
            {onDelete && (
              <button
                className="p-2 hover:bg-accent rounded"
                onClick={e => {
                  e.stopPropagation();
                  onDelete(item);
                }}
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Handle gallery photo cards with selection mode
  if (contentType === 'gallery-photo') {
    const photoItem = item as GalleryPhotoItem;

    return (
      <div className="relative group">
        <BaseCard
          item={item}
          onClick={onClick}
          onEdit={onEdit}
          onShare={onShare}
          onDelete={onDelete}
          renderPreview={() => {
            if (photoItem.memory.url) {
              return (
                <div className="w-full h-full relative min-w-0">
                  <Image
                    src={photoItem.memory.url}
                    alt={photoItem.memory.title || 'Photo'}
                    fill={true}
                    className="object-cover"
                    onError={() => {
                      fatLogger.error('Image error for memory:', 'be', {
                        memoryId: photoItem.memory.id,
                        url: photoItem.memory.url,
                      });
                      onImageError?.(photoItem.memory.url!);
                    }}
                    sizes={IMAGE_SIZES.gallery}
                    placeholder="blur"
                    blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                    priority={false}
                    loading="lazy"
                  />
                </div>
              );
            }

            return (
              <div className="flex flex-col items-center justify-center text-muted-foreground h-full">
                <ImageIcon className="h-16 w-16 mb-2" />
                <span className="text-sm">Photo</span>
              </div>
            );
          }}
          renderDescription={() => null}
          renderStorageBadge={() => null}
          renderLeftStatus={() => (
            <>
              {/* Selection checkbox - positioned absolutely */}
              {selectionMode && onSelectionToggle && (
                <div className="absolute top-2 left-2 z-20">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={onSelectionToggle}
                    onClick={e => e.stopPropagation()}
                    className="bg-white/90 border-white shadow-sm"
                  />
                </div>
              )}

              {/* Hidden indicator - commented out */}
              {/* {isHidden && (
                <div className="bg-red-500/70 rounded-full px-2 py-1">
                  <span className="text-xs text-white">Hidden</span>
                </div>
              )} */}
            </>
          )}
        />

        {/* Bottom controls - only visible during selection mode - commented out */}
        {/* {selectionMode && (
          <>
            <div className="absolute bottom-2 left-2 flex items-center gap-2">
              {/* Hide/Unhide button */}
              {/* {(onHide || onUnhide) && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={e => {
                    e.stopPropagation();
                    if (isHidden && onUnhide) {
                      onUnhide();
                    } else if (onHide) {
                      onHide();
                    }
                  }}
                  className="h-8 w-8 p-0 bg-white/90 hover:bg-white border border-gray-300"
                >
                  {isHidden ? <Eye className="h-4 w-4 text-gray-700" /> : <EyeOff className="h-4 w-4 text-gray-700" />}
                </Button>
              )} */}
            {/* </div>

            <div className="absolute bottom-2 right-2">
              {/* Rating stars */}
              {/* {onRate && (
                <div className="flex items-center gap-0.5 bg-white/90 rounded-full px-2 py-1 border border-gray-300">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Button
                      key={star}
                      size="sm"
                      variant="ghost"
                      onClick={e => {
                        e.stopPropagation();
                        onRate(star);
                      }}
                      className="h-6 w-6 p-0 hover:bg-transparent"
                    >
                      <Star
                        className={`h-4 w-4 ${star <= rating ? 'text-yellow-500 fill-current' : 'text-gray-400'}`}
                      />
                    </Button>
                  ))}
                </div>
              )} */}
            {/* </div>
          </>
        )} */}
      </div>
    );
  }

  // Handle gallery collections
  if (contentType === 'gallery') {
    const gallery = item as GalleryWithItems;

    return (
      <BaseCard
        item={item}
        onClick={onClick}
        onEdit={onEdit}
        onShare={onShare}
        onDelete={onDelete}
        renderPreview={() => (
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <ImageLucide className="h-16 w-16 mb-2" />
            <span className="text-sm">Gallery</span>
            {gallery.imageCount > 0 && (
              <span className="text-xs text-muted-foreground mt-1">
                {gallery.imageCount} {gallery.imageCount === 1 ? 'photo' : 'photos'}
              </span>
            )}
          </div>
        )}
        renderTitle={() => gallery.title}
        renderDescription={() => gallery.description}
        renderStorageBadge={() => (
          <div className="flex items-center gap-2 flex-wrap">
            {!gallery.isOwner ? (
              <Badge
                variant="outline"
                className="text-xs border-blue-300 text-blue-700 bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:bg-blue-950"
              >
                <Share2 className="h-3 w-3 mr-1" />
                Shared with you
              </Badge>
            ) : gallery.sharedCount > 0 ? (
              <Badge
                variant="outline"
                className="text-xs border-green-300 text-green-700 bg-green-50 dark:border-green-700 dark:text-green-300 dark:bg-green-950"
              >
                <Share2 className="h-3 w-3 mr-1" />
                Shared
              </Badge>
            ) : null}
            <Badge variant={gallery.sharingStatus === 'public' ? 'default' : 'secondary'} className="text-xs">
              {gallery.sharingStatus === 'public' ? (
                <>
                  <Globe className="h-3 w-3 mr-1" />
                  Public
                </>
              ) : (
                <>
                  <Lock className="h-3 w-3 mr-1" />
                  Private
                </>
              )}
            </Badge>
          </div>
        )}
        renderLeftStatus={() => (
          <div className="flex items-center gap-2">
            {!gallery.isOwner ? (
              <Badge
                variant="outline"
                className="text-xs border-blue-300 text-blue-700 bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:bg-blue-950"
              >
                <Share2 className="h-3 w-3 mr-1" />
                Shared with you
              </Badge>
            ) : gallery.sharedCount > 0 ? (
              <Badge
                variant="outline"
                className="text-xs border-green-300 text-green-700 bg-green-50 dark:border-green-700 dark:text-green-300 dark:bg-green-950"
              >
                <Share2 className="h-3 w-3 mr-1" />
                Shared
              </Badge>
            ) : null}
            <Badge variant={gallery.sharingStatus === 'public' ? 'default' : 'secondary'} className="text-xs">
              {gallery.sharingStatus === 'public' ? (
                <>
                  <Globe className="h-3 w-3 mr-1" />
                  Public
                </>
              ) : (
                <>
                  <Lock className="h-3 w-3 mr-1" />
                  Private
                </>
              )}
            </Badge>
          </div>
        )}
      />
    );
  }

  // Default grid view using BaseCard
  return (
    <BaseCard
      item={item}
      onClick={onClick}
      onEdit={onEdit}
      onShare={onShare}
      onDelete={onDelete}
      isDeleting={isDeleting}
      renderPreview={renderPreview}
      renderTitle={renderTitle}
      renderDescription={renderDescription}
      renderStorageBadge={renderStorageBadge}
      renderLeftStatus={renderLeftStatus}
    />
  );
}
