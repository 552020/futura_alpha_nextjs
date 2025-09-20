'use client';

import { Badge } from '@/components/ui/badge';
import { Image, Lock, Globe } from 'lucide-react';
import { GalleryWithItems } from '@/types/gallery';
import { StorageStatusBadge, getGalleryStorageStatus } from '@/components/common/storage-status-badge';
import { BaseCard } from '@/components/common/base-card';

interface GalleryCardProps {
  gallery: GalleryWithItems;
  onClick: (gallery: GalleryWithItems) => void;
  onEdit?: (gallery: GalleryWithItems) => void;
  onShare?: (gallery: GalleryWithItems) => void;
  onDelete?: (gallery: GalleryWithItems) => void;
}

export function GalleryCard({ gallery, onClick, onEdit, onShare, onDelete }: GalleryCardProps) {
  return (
    <BaseCard
      item={gallery}
      onClick={onClick}
      onEdit={onEdit}
      onShare={onShare}
      onDelete={onDelete}
      renderPreview={() => (
        <div className="flex flex-col items-center justify-center text-muted-foreground">
          <Image className="h-16 w-16 mb-2" aria-hidden="true" />
          <span className="text-sm">Gallery</span>
        </div>
      )}
      renderTitle={gallery => gallery.title}
      renderDescription={gallery => gallery.description}
      renderStorageBadge={gallery => <StorageStatusBadge status={getGalleryStorageStatus(gallery)} size="xs" />}
      renderLeftStatus={gallery => (
        <>
          {/* Image count icon */}
          <div className="flex-shrink-0">
            <Image className="h-4 w-4" aria-hidden="true" />
          </div>

          {/* Privacy status */}
          <Badge variant={gallery.isPublic ? 'default' : 'secondary'} className="text-xs">
            {gallery.isPublic ? (
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
        </>
      )}
    />
  );
}
