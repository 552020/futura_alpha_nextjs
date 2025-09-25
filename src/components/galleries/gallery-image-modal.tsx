import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface GalleryImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: {
    url: string;
    title: string;
  } | null;
}

export function GalleryImageModal({ isOpen, onClose, image }: GalleryImageModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>{image?.title}</DialogTitle>
        </DialogHeader>
        <div className="relative aspect-video w-full">
          {image?.url && (
            <Image
              src={image.url}
              alt={image.title}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 80vw"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
