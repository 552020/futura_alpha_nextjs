import { useState } from 'react';
import Image from 'next/image';
import { Checkbox } from '@/components/ui/checkbox';
import { ImageIcon, Star, Eye, EyeOff } from 'lucide-react';
import { getBlurPlaceholder, IMAGE_SIZES } from '@/utils/image-utils';

interface GalleryPhotoItemProps {
  item: {
    id: string;
    memory: {
      id: string;
      url?: string;
      title?: string;
      type: string;
    };
  };
  index: number;
  isSelecting: boolean;
  isSelected: boolean;
  isHidden: boolean;
  rating: number;
  activeTab: 'all' | 'hidden';
  failedImages: Set<string>;
  onImageClick: () => void;
  onSelectionToggle: (checked: boolean) => void;
  onRate: (rating: number) => void;
  onHide: () => void;
  onUnhide: () => void;
  onImageError: (url: string) => void;
}

export function GalleryPhotoItem({
  item,
  index,
  isSelecting,
  isSelected,
  isHidden,
  rating,
  activeTab,
  failedImages,
  onImageClick,
  onSelectionToggle,
  onRate,
  onHide,
  onUnhide,
  onImageError,
}: GalleryPhotoItemProps) {
  return (
    <div
      className={`min-w-0 aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity relative ${
        isSelected ? 'ring-4 ring-blue-500' : ''
      }`}
      onClick={onImageClick}
    >
      {/* Selection checkbox */}
      {isSelecting && (
        <div className="absolute top-2 left-2 z-10">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelectionToggle}
            onClick={e => e.stopPropagation()}
            className="bg-white/90 border-white shadow-sm"
          />
        </div>
      )}

      {/* Image content */}
      {item.memory.url && !failedImages.has(item.memory.url) ? (
        <div className="w-full h-full relative min-w-0">
          <Image
            src={item.memory.url}
            alt={item.memory.title || `Photo ${index + 1}`}
            fill
            className="object-cover"
            onError={() => onImageError(item.memory.url!)}
            sizes={IMAGE_SIZES.gallery}
            placeholder="blur"
            blurDataURL={getBlurPlaceholder()}
          />
        </div>
      ) : (
        <div className="w-full h-full bg-muted flex items-center justify-center min-w-0">
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <ImageIcon className="h-16 w-16 mb-2" />
            <span className="text-sm break-words">Photo {index + 1}</span>
            {failedImages.has(item.memory.url!) && (
              <span className="text-xs text-muted-foreground/70 mt-1 break-words">Failed to load</span>
            )}
          </div>
        </div>
      )}

      {/* Image actions overlay */}
      <div
        className={`absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex flex-col justify-between p-2 ${
          activeTab === 'hidden' ? 'opacity-100' : ''
        }`}
      >
        {/* Top bar */}
        <div className="flex justify-between items-start">
          {/* Rating and Hidden indicator */}
          <div className="flex items-center gap-1 ml-auto">
            {activeTab === 'hidden' && (
              <div className="bg-red-500/70 rounded-full px-2 py-1">
                <span className="text-xs text-white">Hidden</span>
              </div>
            )}
            <div className="flex items-center gap-1 bg-black/70 rounded-full px-2 py-1">
              <Star className="h-3 w-3 text-yellow-400 fill-current" />
              <span className="text-xs text-white">{rating}</span>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex justify-between items-end">
          {/* Hide/Unhide button */}
          <button
            onClick={e => {
              e.stopPropagation();
              if (activeTab === 'hidden') {
                onUnhide();
              } else {
                onHide();
              }
            }}
            className="p-1.5 rounded-full bg-black/70 hover:bg-black/90 transition-colors"
            title={activeTab === 'hidden' ? 'Unhide photo' : 'Hide photo'}
          >
            {activeTab === 'hidden' ? (
              <Eye className="h-4 w-4 text-white" />
            ) : (
              <EyeOff className="h-4 w-4 text-white" />
            )}
          </button>

          {/* Rating stars */}
          <div className="flex items-center gap-0.5 bg-black/70 rounded-full px-2 py-1">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                onClick={e => {
                  e.stopPropagation();
                  onRate(star);
                }}
                className="p-0.5"
              >
                <Star className={`h-4 w-4 ${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
