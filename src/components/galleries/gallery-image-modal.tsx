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
  const [displaySize, setDisplaySize] = React.useState<'display' | 'original'>('display');
  const [currentImageUrl, setCurrentImageUrl] = React.useState(image?.url || '');
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [showSizeDropdown, setShowSizeDropdown] = React.useState(false);
  const [shouldDropUp, setShouldDropUp] = React.useState(false);
  
  // Update current image URL when display size or assets change
  React.useEffect(() => {
    const updateDisplayedImage = async () => {
      if (!image) return;
      
      // If no assets, use the image URL directly
      if (!assets || assets.length === 0) {
        setCurrentImageUrl(image.url);
        return;
      }
      
      try {
        // Try to find the best asset for display
        const preferredOrder = displaySize === 'display' 
          ? ['display', 'original', 'thumb'] 
          : ['original', 'display', 'thumb'];
        
        for (const assetType of preferredOrder) {
          const asset = assets.find(a => a.assetType === assetType);
          if (asset) {
            const formattedAsset = {
              url: asset.url,
              assetLocation: 's3',
              storageKey: asset.url,
              bucket: process.env.AWS_S3_BUCKET
            };
            const url = await generateBestAssetUrl(formattedAsset);
            setCurrentImageUrl(url);
            return;
          }
        }
        
        // Fallback to first available asset or image URL
        if (assets[0]) {
          const formattedAsset = {
            url: assets[0].url,
            assetLocation: 's3',
            storageKey: assets[0].url,
            bucket: process.env.AWS_S3_BUCKET
          };
          const url = await generateBestAssetUrl(formattedAsset);
          setCurrentImageUrl(url);
        } else {
          setCurrentImageUrl(image.url);
        }
      } catch (error) {
        console.error('Error updating displayed image:', error);
        setCurrentImageUrl(image.url);
      }
    };
    
    updateDisplayedImage();
  }, [image, assets, displaySize]);
  
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
    if (!image) return '';
    
    // If no assets array or it's empty, use the image URL directly
    if (!assets || assets.length === 0) {
      return image.url;
    }

    // For downloads, we'll use the same logic as display but with the downloadSize
    const preferredOrder = displaySize === 'display' 
      ? ['display', 'original', 'thumb'] 
      : ['original', 'display', 'thumb'];
    
    for (const assetType of preferredOrder) {
      const asset = assets.find(a => a.assetType === assetType);
      if (asset) {
        try {
          const formattedAsset = {
            url: asset.url,
            assetLocation: 's3',
            storageKey: asset.url,
            bucket: process.env.AWS_S3_BUCKET
          };
          return await generateBestAssetUrl(formattedAsset);
        } catch (error) {
          console.error(`Error generating URL for asset type ${assetType}:`, error);
          continue;
        }
      }
    }

    // Fallback to first available asset or image URL
    if (assets[0]) {
      const formattedAsset = {
        url: assets[0].url,
        assetLocation: 's3',
        storageKey: assets[0].url,
        bucket: process.env.AWS_S3_BUCKET
      };
      return generateBestAssetUrl(formattedAsset);
    }
    
    return image.url;
  };

  const handleDownload = async () => {
    if (!image?.url) return;
    
    try {
      setIsDownloading(true);
      
      // Get the appropriate URL based on selected size
      const downloadUrl = await getDownloadUrl();
      
      // Try to fetch the file first to handle potential errors
      let blob: Blob;
      try {
        const response = await fetch(downloadUrl, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
          },
          credentials: 'include' // Include credentials for authenticated requests
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        blob = await response.blob();
      } catch (fetchError) {
        console.warn('Fetch failed, trying direct download:', fetchError);
        // If fetch fails, try direct download
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `download-${displaySize}${downloadUrl.includes('.') ? '' : '.jpg'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }
      
      // Create a blob URL for the downloaded file
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
          if (!filename.includes(displaySize) && displaySize !== 'original') {
            const parts = filename.split('.');
            const ext = parts.pop();
            filename = `${parts.join('.')}-${displaySize}.${ext}`;
          }
        }
      } catch (e) {
        console.warn('Could not parse URL for filename', e);
        const ext = blob.type.split('/')[1] || 'jpg';
        filename = `download-${displaySize}.${ext}`;
      }
      
      // Set up the download link
      link.href = blobUrl;
      link.download = filename;
      
      // Add to document, trigger download, and clean up
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }, 100);
      
    } catch (error) {
      console.error('Error in download handler:', error);
      // Final fallback - try direct download with the image URL
      const link = document.createElement('a');
      link.href = image.url;
      const ext = image.url.split('.').pop()?.split('?')[0] || 'jpg';
      link.download = `download-${displaySize}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsDownloading(false);
      setShowSizeDropdown(false);
    }
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
                src={currentImageUrl}
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
              <div className="flex items-center space-x-1 relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                  onClick={handleDownload}
                  disabled={isDownloading}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isDownloading ? 'Downloading...' : `Download (${displaySize})`}
                </Button>
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20 h-9 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSizeDropdown(!showSizeDropdown);
                    }}
                    ref={(el) => {
                      if (el) {
                        const rect = el.getBoundingClientRect();
                        const spaceBelow = window.innerHeight - rect.bottom;
                        const spaceAbove = rect.top;
                        const dropdownHeight = 100; // Approximate height of the dropdown
                        
                        // Position dropdown below if there's enough space, otherwise above
                        setShouldDropUp(spaceBelow < dropdownHeight && spaceAbove > spaceBelow);
                      }
                    }}
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        showSizeDropdown ? 'rotate-180' : ''
                      }`}
                    />
                    <span className="sr-only">Select download size</span>
                  </Button>
                  {showSizeDropdown && (
                    <div
                      className={`absolute ${
                        shouldDropUp ? 'bottom-full mb-1' : 'top-full mt-1'
                      } right-0 w-40 bg-black/80 backdrop-blur-sm rounded-md shadow-lg z-50 border border-white/20`}
                      onMouseLeave={() => setShowSizeDropdown(false)}
                      style={{
                        // Ensure dropdown stays within viewport
                        maxHeight: 'calc(100vh - 20px)',
                        overflowY: 'auto',
                        // Add some animation
                        animation: 'fadeIn 100ms ease-out',
                      }}
                    >
                      <div className="py-1">
                        <button
                          className={`w-full text-left px-4 py-2 text-sm text-white hover:bg-white/20 ${
                            displaySize === 'display' ? 'bg-white/30' : ''
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDisplaySize('display');
                            setShowSizeDropdown(false);
                          }}
                        >
                          Medium (Display)
                        </button>
                        <button
                          className={`w-full text-left px-4 py-2 text-sm text-white hover:bg-white/20 ${
                            displaySize === 'original' ? 'bg-white/30' : ''
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDisplaySize('original');
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
