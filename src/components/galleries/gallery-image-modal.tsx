import React from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import { Button } from '@/components/ui/button';
import { Download, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface GalleryImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: {
    url: string;
    title: string;
  } | null;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export function GalleryImageModal({ 
  isOpen, 
  onClose, 
  image, 
  onNext, 
  onPrevious, 
  hasNext = false, 
  hasPrevious = false 
}: GalleryImageModalProps) {
  // Handle keyboard navigation
  const handleKeyDown = React.useCallback((e: KeyboardEvent) => {
    if (!onNext || !onPrevious) return;
    
    const keyboardEvent = e as unknown as React.KeyboardEvent;
    
    switch (keyboardEvent.key) {
      case 'ArrowLeft':
        if (hasPrevious && onPrevious) {
          keyboardEvent.preventDefault();
          onPrevious();
        }
        break;
      case 'ArrowRight':
        if (hasNext && onNext) {
          keyboardEvent.preventDefault();
          onNext();
        }
        break;
      case 'Escape':
        onClose();
        break;
      default:
        break;
    }
  }, [hasNext, hasPrevious, onNext, onPrevious, onClose]);
  
  // Add event listener for keyboard navigation
  React.useEffect(() => {
    if (isOpen) {
      const keyDownHandler = (e: Event) => handleKeyDown(e as unknown as KeyboardEvent);
      window.addEventListener('keydown', keyDownHandler);
      return () => {
        window.removeEventListener('keydown', keyDownHandler);
      };
    }
  }, [isOpen, handleKeyDown]);
  // TODO: Implement download functionality
  const handleDownload = () => {
    if (!image?.url) return;
    
    const link = document.createElement('a');
    link.href = image.url;
    // Extract filename from URL or use a default one
    const filename = image.url.split('/').pop() || 'download';
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-full p-0 bg-transparent border-none shadow-none">
        <DialogTitle asChild>
          <VisuallyHidden>Image Viewer</VisuallyHidden>
        </DialogTitle>
        <div className="relative w-full h-[90vh] flex items-center justify-center">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 z-10 h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </Button>

          {/* Navigation arrows */}
          {onPrevious && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 z-10 h-12 w-12 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all"
              onClick={(e) => {
                e.stopPropagation();
                onPrevious();
              }}
              disabled={!hasPrevious}
              aria-label="Previous image"
            >
              <ChevronLeft className="h-8 w-8" />
              <span className="sr-only">Previous image</span>
            </Button>
          )}
          
          {onNext && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 z-10 h-12 w-12 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all"
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
              disabled={!hasNext}
              aria-label="Next image"
            >
              <ChevronRight className="h-8 w-8" />
              <span className="sr-only">Next image</span>
            </Button>
          )}

          {/* Image container */}
          <div className="relative w-full h-full flex items-center justify-center">
            {image?.url && (
              <Image
                src={image.url}
                alt={image.title}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 90vw"
                priority
              />
            )}
          </div>

          {/* Bottom controls */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/50 text-white px-4 py-2 rounded-full">
            <span className="text-sm font-medium">{image?.title}</span>
            
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
