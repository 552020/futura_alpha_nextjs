import React from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import { Button } from '@/components/ui/button';
import { Download, X, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { generateBestAssetUrl } from '@/lib/presigned-url-utils';

type GalleryAsset = {
  assetType: string;
  url: string;
  mimeType?: string;
};

interface GalleryImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: {
    url: string;
    title: string;
    id: string;
    type?: string;
  } | null;
  assets?: GalleryAsset[]; // Array of available assets (original, display, thumb)
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
  hasPrevious = false,
  assets = []
}: GalleryImageModalProps) {
  const [downloadSize, setDownloadSize] = React.useState<'display' | 'original'>('display');
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [showSizeDropdown, setShowSizeDropdown] = React.useState(false);
  
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
  
  // Get the best URL for the selected download size
  const getDownloadUrl = async (): Promise<string> => {
    console.log('getDownloadUrl called with downloadSize:', downloadSize);
    console.log('Available assets:', assets);
    
    // If no assets array or it's empty, use the image URL directly
    if (!assets || assets.length === 0) {
      console.log('No assets available, falling back to image URL');
      return image?.url || '';
    }

    // Similar to /app/api/galleries/[id]/route.ts but with different priority order
    const preferredOrder = downloadSize === 'display' 
      ? ['display', 'original', 'thumb'] 
      : ['original', 'display', 'thumb'];
    
    console.log('Preferred order for selection:', preferredOrder);
    
    for (const assetType of preferredOrder) {
      const asset = assets.find(a => a.assetType === assetType);
      console.log(`Checking asset type: ${assetType}`, asset);
      
      if (asset) {
        try {
          // Format the asset object to match what generateBestAssetUrl expects
          const formattedAsset = {
            url: asset.url,
            assetLocation: 's3', // Assuming all assets are in S3
            storageKey: asset.url, // Use URL as storage key as a fallback
            bucket: process.env.AWS_S3_BUCKET // Use the environment variable for bucket
          };
          
          console.log('Formatted asset for generateBestAssetUrl:', formattedAsset);
          
          const url = await generateBestAssetUrl(formattedAsset);
          console.log(`Selected asset type: ${assetType}`, { url });
          return url;
        } catch (error) {
          console.error(`Error generating URL for asset type ${assetType}:`, error);
          continue; // Try the next asset type if this one fails
        }
      }
    }

    // Fallback to first available asset or image URL
    const fallbackUrl = assets[0] 
      ? (() => {
          const formattedAsset = {
            url: assets[0].url,
            assetLocation: 's3',
            storageKey: assets[0].url,
            bucket: process.env.AWS_S3_BUCKET
          };
          return generateBestAssetUrl(formattedAsset);
        })()
      : (image?.url || '');
    
    console.log('Using fallback URL:', await fallbackUrl);
    return fallbackUrl;
  };

  const handleDownload = async () => {
    if (!image?.url) return;
    
    try {
      setIsDownloading(true);
      
      // Get the appropriate URL based on selected size
      const downloadUrl = await getDownloadUrl();
      
      // Fetch the image as a blob
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
        },
        credentials: 'same-origin'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      // Create a temporary anchor element
      const link = document.createElement('a');
      
      // Extract filename from URL or use a default one
      let filename = 'download';
      try {
        const url = new URL(downloadUrl);
        const pathParts = url.pathname.split('/');
        const extractedName = pathParts[pathParts.length - 1];
        
        // Clean up the filename
        if (extractedName) {
          // Remove any query parameters
          const cleanName = extractedName.split('?')[0];
          
          // If no extension or we want to ensure a specific one
          if (!cleanName.includes('.')) {
            // Get extension from content type or use default
            const extension = blob.type.split('/')[1] || 'jpg';
            filename = `${cleanName}.${extension}`;
          } else {
            filename = cleanName;
          }
          
          // Add size indicator if not in the filename
          if (!filename.includes(downloadSize) && downloadSize !== 'original') {
            const parts = filename.split('.');
            const ext = parts.pop();
            filename = `${parts.join('.')}-${downloadSize}.${ext}`;
          }
        }
      } catch (e) {
        console.warn('Could not parse URL for filename', e);
        filename = `download-${downloadSize}.jpg`;
      }
      
      // Set up the download link
      link.href = blobUrl;
      link.download = filename;
      link.style.display = 'none';
      
      // Add to document, trigger download, and clean up
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }, 100);
      
    } catch (error) {
      console.error('Error downloading image:', error);
      // Fallback to the original method if the fetch approach fails
      const link = document.createElement('a');
      link.href = image.url;
      link.download = `download-${downloadSize}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsDownloading(false);
      setShowSizeDropdown(false);
    }
  };

  // Generate a unique ID for the dialog description
  const descriptionId = React.useId();

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
            <div className="relative inline-block">
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                  onClick={handleDownload}
                  disabled={isDownloading}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isDownloading ? 'Downloading...' : `Download (${downloadSize})`}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20 h-9 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSizeDropdown(!showSizeDropdown);
                  }}
                >
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      showSizeDropdown ? 'rotate-180' : ''
                    }`}
                  />
                  <span className="sr-only">Select download size</span>
                </Button>
              </div>
              {showSizeDropdown && (
                <div
                  className="absolute left-0 mt-1 w-40 bg-black/80 backdrop-blur-sm rounded-md shadow-lg z-50 border border-white/20"
                  onMouseLeave={() => setShowSizeDropdown(false)}
                >
                  <div className="py-1">
                    <button
                      className={`w-full text-left px-4 py-2 text-sm text-white hover:bg-white/20 ${
                        downloadSize === 'display' ? 'bg-white/30' : ''
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDownloadSize('display');
                        setShowSizeDropdown(false);
                      }}
                    >
                      Medium (Display)
                    </button>
                    <button
                      className={`w-full text-left px-4 py-2 text-sm text-white hover:bg-white/20 ${
                        downloadSize === 'original' ? 'bg-white/30' : ''
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDownloadSize('original');
                        setShowSizeDropdown(false);
                      }}
                    >
                      Original
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
