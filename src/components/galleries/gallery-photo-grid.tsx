import { BaseGrid } from '@/components/common/base-grid';
import { GalleryMemoryCard } from './gallery-memory-card';

interface GalleryPhotoGridProps {
  items: Array<{
    id: string;
    memory: {
      id: string;
      url?: string;
      title?: string;
      type: 'image' | 'video' | 'note' | 'audio' | 'document' | 'folder';
    };
  }>;
  isLoading: boolean;
  error: string | null;
  isSelecting: boolean;
  selectedImages: string[];
  ratings: { [imageId: string]: number };
  hiddenImages: string[];
  _activeTab: 'all' | 'hidden';
  _failedImages: Set<string>;
  _maxSelection: number;
  onImageClick: (item: {
    id: string;
    memory: {
      id: string;
      url?: string;
      title?: string;
      type: 'image' | 'video' | 'note' | 'audio' | 'document' | 'folder';
    };
  }, index: number) => void;
  onSelectionToggle: (imageId: string, checked: boolean) => void;
  onRate: (imageId: string, rating: number) => void;
  onHide: (imageId: string) => void;
  onUnhide: (imageId: string) => void;
  onImageError: (url: string) => void;
  onRetry: () => void;
  onDelete?: (memoryId: string) => void;
  onShare?: (memoryId: string) => void;
  onEdit?: (memoryId: string) => void;
}

export function GalleryPhotoGrid({
  items,
  isLoading,
  error,
  isSelecting,
  selectedImages,
  ratings,
  hiddenImages,
  _activeTab,
  _failedImages,
  _maxSelection,
  onImageClick,
  onSelectionToggle,
  onRate,
  onHide,
  onUnhide,
  onDelete,
  onShare,
  onEdit,
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
          <button onClick={onRetry} className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
            Retry
          </button>
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
    <BaseGrid
      items={items}
      renderItem={(item, index) => (
        <GalleryMemoryCard
          key={item.id}
          memory={{
            ...item.memory,
            title: item.memory.title || `Photo ${index + 1}`, // Ensure title is always a string
            status: 'private', // Default status for gallery items
            sharedWithCount: 0,
            createdAt: new Date().toISOString(), // Add required createdAt
          }}
          isSelecting={isSelecting}
          isSelected={selectedImages.includes(item.memory.id)}
          rating={ratings[item.memory.id] || 0}
          isHidden={hiddenImages.includes(item.memory.id)}
          onClick={() => onImageClick(item, index)}
          onSelectionToggle={(memory, selected) => onSelectionToggle(memory.id, selected)}
          onRate={onRate ? (memory, rating) => onRate(memory.id, rating) : undefined}
          onToggleHidden={
            onHide && onUnhide
              ? (memory) => {
                  if (hiddenImages.includes(memory.id)) {
                    onUnhide(memory.id);
                  } else {
                    onHide(memory.id);
                  }
                }
              : undefined
          }
          onDelete={onDelete || (() => {})}
          onShare={onShare || (() => {})}
          onEdit={onEdit || (() => {})}
          viewMode="grid"
        />
      )}
      viewMode="grid"
      gridCols={{ sm: 1, md: 2, lg: 3, xl: 4 }}
      gap="sm"
      className="flex-1 min-w-0"
    />
  );
}
