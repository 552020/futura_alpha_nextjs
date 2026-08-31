import { Button } from '@/components/ui/button';
import { BaseGrid } from '@/components/common/base-grid';
import { ContentCard } from '@/components/common/content-card';

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
  _maxSelection: number;
  onImageClick: (
    item: {
      id: string;
      memory: {
        id: string;
        url?: string;
        title?: string;
        type: string;
      };
    },
    index: number
  ) => void;
  onSelectionToggle: (imageId: string, checked: boolean) => void;
  onRate?: (imageId: string, rating: number) => void;
  onHide?: (imageId: string) => void;
  onUnhide?: (imageId: string) => void;
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
  failedImages: _failedImages,
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
          <h3 className="mb-2 text-xl font-semibold">
            No photos in this gallery yet
          </h3>
          <p className="text-muted-foreground">
            Add photos to this gallery to see them here.
          </p>
        </div>
      </div>
    );
  }

  // Create empty state component
  const emptyState = (
    <div className="text-center py-16">
      <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
        <svg
          className="h-12 w-12 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
      <h3 className="text-xl font-semibold mb-2">
        No photos in this gallery yet
      </h3>
      <p className="text-muted-foreground mb-6">
        Add photos to this gallery to see them here.
      </p>
    </div>
  );

  return (
    <BaseGrid
      items={items}
      renderItem={(item, index) => (
        <ContentCard
          key={item.id}
          item={item}
          onClick={() => onImageClick(item, index)}
          contentType="gallery-photo"
          selectionMode={isSelecting}
          isSelected={selectedImages.includes(item.memory.id)}
          onSelectionToggle={(checked) =>
            onSelectionToggle(item.memory.id, checked)
          }
          rating={ratings[item.memory.id] || 0}
          onRate={
            onRate ? (rating) => onRate(item.memory.id, rating) : undefined
          }
          isHidden={activeTab === 'hidden'}
          onHide={onHide ? () => onHide(item.memory.id) : undefined}
          onUnhide={onUnhide ? () => onUnhide(item.memory.id) : undefined}
          onImageError={onImageError}
        />
      )}
      emptyState={emptyState}
      gap="sm"
      gridCols={{
        sm: 1,
        md: 2,
        lg: 3,
        xl: 4,
      }}
      selectionMode={isSelecting}
      selectedItems={new Set(selectedImages)}
      ratings={ratings}
      hiddenItems={new Set(hiddenImages)}
      onSelectionToggle={onSelectionToggle}
      onRate={onRate}
      onHide={onHide}
      onUnhide={onUnhide}
    />
  );
}
