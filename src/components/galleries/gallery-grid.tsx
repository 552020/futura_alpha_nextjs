import { GalleryWithItems } from '@/types/gallery';
import { BaseGrid } from '@/components/common/base-grid';
import { ContentCard } from '@/components/common/content-card';

interface GalleryGridProps {
  galleries: GalleryWithItems[];
  onGalleryClick: (gallery: GalleryWithItems) => void;
  onGalleryEdit?: (gallery: GalleryWithItems) => void;
  onGalleryShare?: (gallery: GalleryWithItems) => void;
  onGalleryDelete?: (gallery: GalleryWithItems) => void;
  _viewMode?: 'grid' | 'list';
}

export function GalleryGrid({
  galleries,
  onGalleryClick,
  onGalleryEdit,
  onGalleryShare,
  onGalleryDelete,
  _viewMode = 'grid',
}: GalleryGridProps) {
  // Create empty state component
  const emptyState = (
    <div className="text-center py-16">
      <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
        <div className="h-12 w-12 text-muted-foreground">📁</div>
      </div>
      <h3 className="text-xl font-semibold mb-2">No galleries yet</h3>
      <p className="text-muted-foreground mb-6">
        Create your first gallery to start organizing your photos
      </p>
    </div>
  );

  return (
    <BaseGrid
      items={galleries}
      emptyState={emptyState}
      gap="md"
      gridCols={{ sm: 1, md: 2, lg: 3, xl: 4 }}
      renderItem={(gallery) => (
        <ContentCard
          key={gallery.id}
          item={gallery}
          onClick={() => onGalleryClick(gallery)}
          onEdit={
            onGalleryEdit && gallery.isOwner
              ? () => onGalleryEdit(gallery)
              : undefined
          }
          onShare={
            onGalleryShare && gallery.isOwner
              ? () => onGalleryShare(gallery)
              : undefined
          }
          onDelete={
            onGalleryDelete && gallery.isOwner
              ? () => onGalleryDelete(gallery)
              : undefined
          }
          contentType="gallery"
        />
      )}
    />
  );
}
