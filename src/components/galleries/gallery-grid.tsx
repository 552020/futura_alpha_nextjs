import { Image } from "lucide-react";
import { GalleryWithItems } from "@/types/gallery";
import { BaseGrid } from "@/components/common/base-grid";
import { GalleryCard } from "./gallery-card";

interface GalleryGridProps {
  galleries: GalleryWithItems[];
  onGalleryClick: (gallery: GalleryWithItems) => void;
  onGalleryEdit?: (gallery: GalleryWithItems) => void;
  onGalleryShare?: (gallery: GalleryWithItems) => void;
  onGalleryDelete?: (gallery: GalleryWithItems) => void;
  viewMode?: "grid" | "list";
}

export function GalleryGrid({
  galleries,
  onGalleryClick,
  onGalleryEdit,
  onGalleryShare,
  onGalleryDelete,
  viewMode = "grid",
}: GalleryGridProps) {
  // Placeholder action handlers if not provided
  const handleEdit =
    onGalleryEdit ||
    ((gallery: GalleryWithItems) => {
      console.log("Edit gallery:", gallery.id);
      // TODO: Implement gallery editing
    });

  const handleShare =
    onGalleryShare ||
    ((gallery: GalleryWithItems) => {
      console.log("Share gallery:", gallery.id);
      // TODO: Implement gallery sharing
    });

  const handleDelete =
    onGalleryDelete ||
    ((gallery: GalleryWithItems) => {
      console.log("Delete gallery:", gallery.id);
      // TODO: Implement gallery deletion
    });
  // Create empty state component
  const emptyState = (
    <div className="text-center py-16">
      <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
        <Image className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
      </div>
      <h3 className="text-xl font-semibold mb-2">No galleries yet</h3>
      <p className="text-muted-foreground mb-6">Create your first gallery to start organizing your photos</p>
    </div>
  );

  return (
    <BaseGrid
      items={galleries}
      renderItem={(gallery) => (
        <GalleryCard
          gallery={gallery}
          onClick={onGalleryClick}
          onEdit={handleEdit}
          onShare={handleShare}
          onDelete={handleDelete}
        />
      )}
      emptyState={emptyState}
      viewMode={viewMode}
      gap="md"
      gridCols={{
        sm: 1,
        md: 2,
        lg: 3,
        xl: 4,
      }}
    />
  );
}
