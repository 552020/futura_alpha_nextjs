import { Button } from '@/components/ui/button';
import { GalleryPhotoItem } from './gallery-photo-item';

interface GalleryPhotoGridProps {
  items: Array<{
    id: string;
    memory: {
      id: string;
      url?: string;
      title?: string;
      type: string;
    };
  }>;
  isLoading: boolean;
  error: string | null;
  isSelecting: boolean;
  selectedImages: string[];
  ratings: { [imageId: string]: number };
  hiddenImages: string[];
  activeTab: 'all' | 'hidden';
  failedImages: Set<string>;
  maxSelection: number;
onImageClick: (item: {
    id: string;
    memory: {
      id: string;
      url?: string;
      title?: string;
      type: string;
    };
  }, index: number) => void;
  onSelectionToggle: (imageId: string, checked: boolean) => void;
  onRate: (imageId: string, rating: number) => void;
  onHide: (imageId: string) => void;
  onUnhide: (imageId: string) => void;
  onImageError: (url: string) => void;
  onRetry: () => void;
}

export function GalleryPhotoGrid({
  items,
  isLoading,
  error,
  isSelecting,
  selectedImages,
  ratings,
  hiddenImages,
  activeTab,
  failedImages,
  _maxSelection,
  onImageClick,
  onSelectionToggle,
  onRate,
  onHide,
  onUnhide,
  onImageError,
  onRetry,
}: GalleryPhotoGridProps) {
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-12 h-12 border-b-2 rounded-full animate-spin border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={onRetry}>Retry</Button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h3 className="mb-2 text-xl font-semibold">No photos in this gallery yet</h3>
          <p className="text-muted-foreground">Add photos to this gallery to see them here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 grid min-w-0 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {items.map((item, index) => (
        <GalleryPhotoItem
          key={item.id}
          item={item}
          index={index}
          isSelecting={isSelecting}
          isSelected={selectedImages.includes(item.memory.id)}
          isHidden={hiddenImages.includes(item.memory.id)}
          rating={ratings[item.memory.id] || 0}
          activeTab={activeTab}
          failedImages={failedImages}
          onImageClick={() => onImageClick(item, index)}
          onSelectionToggle={checked => onSelectionToggle(item.memory.id, checked)}
          onRate={rating => onRate(item.memory.id, rating)}
          onHide={() => onHide(item.memory.id)}
          onUnhide={() => onUnhide(item.memory.id)}
          onImageError={onImageError}
        />
      ))}
    </div>
  );
}
