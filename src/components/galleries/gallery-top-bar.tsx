'use client';

import { Button } from '@/components/ui/button';
import { GalleryWithItems } from '@/types/gallery';
import { BaseTopBar } from '@/components/common/base-top-bar';

interface GalleryTopBarProps {
  galleries: GalleryWithItems[];
  onFilteredGalleriesChange: (filteredGalleries: GalleryWithItems[]) => void;
  showViewToggle?: boolean;
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  viewMode?: 'grid' | 'list';
  className?: string;
  showCreateButton?: boolean;
  onCreateGallery?: () => void;
}

export function GalleryTopBar({
  galleries,
  onFilteredGalleriesChange,
  showViewToggle = true,
  onViewModeChange,
  viewMode = 'grid',
  className = '',
  showCreateButton = true,
  onCreateGallery,
}: GalleryTopBarProps) {
  // Create button action
  const leftActions =
    showCreateButton && onCreateGallery ? <Button onClick={onCreateGallery}>Create Gallery</Button> : null;

  return (
    <BaseTopBar
      items={galleries}
      onFilteredItemsChange={onFilteredGalleriesChange}
      showViewToggle={showViewToggle}
      onViewModeChange={onViewModeChange}
      viewMode={viewMode}
      className={className}
      leftActions={leftActions}
      searchPlaceholder="Search galleries..."
      searchFields={gallery => [gallery.title, gallery.description || '']}
      filterOptions={[
        { value: 'all', label: 'All Galleries' },
        { value: 'public', label: 'Public' },
        { value: 'private', label: 'Private' },
      ]}
      filterLogic={(gallery, filterType) => {
        if (filterType === 'public') return gallery.isPublic;
        if (filterType === 'private') return !gallery.isPublic;
        return true;
      }}
      sortOptions={[
        { value: 'newest', label: 'Newest First' },
        { value: 'oldest', label: 'Oldest First' },
        { value: 'name', label: 'Name A-Z' },
        { value: 'most-images', label: 'Most Images' },
      ]}
      sortLogic={(a, b, sortBy) => {
        switch (sortBy) {
          case 'newest':
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case 'oldest':
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          case 'name':
            return a.title.localeCompare(b.title);
          case 'most-images':
            return (b.imageCount || 0) - (a.imageCount || 0);
          default:
            return 0;
        }
      }}
    />
  );
}
