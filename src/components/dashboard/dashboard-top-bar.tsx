'use client';

import { Button } from '@/components/ui/button';
import { ExtendedMemory } from '@/types/dashboard';
import { ItemUploadButton } from '@/components/memory/item-upload-button';
import { BaseTopBar } from '@/components/common/base-top-bar';

interface SearchAndFilterBarProps {
  memories: ExtendedMemory[];
  onFilteredMemoriesChange: (filteredMemories: ExtendedMemory[]) => void;
  showViewToggle?: boolean;
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  viewMode?: 'grid' | 'list';
  className?: string;
  showUploadButtons?: boolean;
  onUploadSuccess?: () => void;
  onUploadError?: (error: Error) => void;
  onClearAllMemories?: () => void;
}

export function DashboardTopBar({
  memories,
  onFilteredMemoriesChange,
  showViewToggle = true,
  onViewModeChange,
  viewMode = 'grid',
  className = '',
  showUploadButtons = false,
  onUploadSuccess,
  onUploadError,
  onClearAllMemories,
}: SearchAndFilterBarProps) {
  // Create left action buttons
  const leftActions = (
    <>
      {showUploadButtons && (
        <>
          <ItemUploadButton
            mode="folder"
            variant="dashboard-add-folder"
            onSuccess={onUploadSuccess}
            onError={onUploadError}
          />
          <ItemUploadButton
            mode="files"
            variant="dashboard-add-file"
            onSuccess={onUploadSuccess}
            onError={onUploadError}
          />
        </>
      )}
      {onClearAllMemories && (
        <Button
          variant="destructive"
          size="sm"
          onClick={onClearAllMemories}
          className="h-9 px-4 py-1 text-sm whitespace-nowrap"
        >
          Clear All
        </Button>
      )}
    </>
  );

  return (
    <BaseTopBar
      items={memories}
      onFilteredItemsChange={onFilteredMemoriesChange}
      showViewToggle={showViewToggle}
      onViewModeChange={onViewModeChange}
      viewMode={viewMode}
      className={className}
      leftActions={leftActions}
      searchPlaceholder="Search memories, tags, or descriptions..."
      searchFields={memory => [memory.title, memory.description || '', ...(memory.tags || [])]}
      filterOptions={[
        { value: 'all', label: 'All Types' },
        { value: 'image', label: 'Images' },
        { value: 'video', label: 'Videos' },
        { value: 'document', label: 'Documents' },
        { value: 'audio', label: 'Audio' },
      ]}
      filterLogic={(memory, filterType) => {
        if (filterType === 'all') return true;
        return memory.type === filterType;
      }}
      sortOptions={[
        { value: 'newest', label: 'Newest First' },
        { value: 'oldest', label: 'Oldest First' },
        { value: 'most-viewed', label: 'Most Viewed' },
        { value: 'favorites', label: 'Favorites First' },
      ]}
      sortLogic={(a, b, sortBy) => {
        switch (sortBy) {
          case 'newest':
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case 'oldest':
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          case 'most-viewed':
            return ((b as ExtendedMemory).views || 0) - ((a as ExtendedMemory).views || 0);
          case 'favorites':
            return ((b as ExtendedMemory).isFavorite ? 1 : 0) - ((a as ExtendedMemory).isFavorite ? 1 : 0);
          default:
            return 0;
        }
      }}
    />
  );
}
