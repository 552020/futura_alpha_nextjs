import { useGalleryShare } from '@/hooks/useGalleryShare';
import { ShareModalBase } from './base';

interface GalleryShareDialogProps {
  galleryId: string;
  galleryTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShare?: () => void;
}

export function GalleryShareDialog({
  galleryId,
  galleryTitle,
  open,
  onOpenChange,
  onShare,
}: GalleryShareDialogProps) {
  const { shareGallery } = useGalleryShare();

  const handleShare = async (data: { email?: string; message: string }) => {
    const { email, message } = data;

    if (!email) {
      throw new Error('Email is required');
    }

    try {
      await shareGallery({
        galleryId,
        galleryTitle,
        email,
        message,
      });

      onOpenChange(false);
      onShare?.();
    } catch (error) {
      throw error; // Re-throw to let the modal handle the error display
    }
  };

  return (
    <ShareModalBase
      isOpen={open}
      onClose={() => onOpenChange(false)}
      onSend={handleShare}
      mode="gallery-share"
      galleryTitle={galleryTitle}
    />
  );
}
