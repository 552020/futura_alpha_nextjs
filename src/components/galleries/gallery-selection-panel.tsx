import { useState } from 'react';
import Image from 'next/image';
import { ImageIcon, X, Star } from 'lucide-react';

interface GallerySelectionPanelProps {
  isOpen: boolean;
  selectedItems: Array<{
    id: string;
    memory: {
      id: string;
      url?: string;
      title?: string;
    };
  }>;
  ratings: { [imageId: string]: number };
  failedImages: Set<string>;
  onImageClick: (
    item: {
      id: string;
      memory: {
        id: string;
        url?: string;
        title?: string;
      };
    },
    index: number
  ) => void;
  onRemoveFromSelection: (imageId: string) => void;
  onSendPhotos: () => void;
}

export function GallerySelectionPanel({
  isOpen,
  selectedItems,
  ratings,
  failedImages,
  onImageClick,
  onRemoveFromSelection,
  // onSendPhotos prop removed as it's no longer used
}: Omit<GallerySelectionPanelProps, 'onSendPhotos'>) {
  const [panelWidth, setPanelWidth] = useState(320);

  if (!isOpen) return null;

  return (
    <div
      className="h-full border-l border-border bg-background/95 backdrop-blur-sm flex flex-col z-40"
      style={{
        width: `${panelWidth}px`,
        minWidth: '280px',
        maxWidth: '60%',
      }}
    >
      {/* Resize Handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-2 bg-border hover:bg-primary cursor-col-resize transition-colors z-50 -ml-1"
        onMouseDown={(e) => {
          e.preventDefault();
          const startX = e.clientX;
          const startWidth = panelWidth;

          const handleMouseMove = (e: MouseEvent) => {
            const newWidth = Math.max(
              280,
              Math.min(
                window.innerWidth * 0.6,
                startWidth - (e.clientX - startX)
              )
            );
            setPanelWidth(newWidth);
          };

          const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
          };

          document.addEventListener('mousemove', handleMouseMove);
          document.addEventListener('mouseup', handleMouseUp);
        }}
      />

      <div className="p-4 border-b border-border">
        <h3 className="font-medium text-center">
          Selected Photos ({selectedItems.length})
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="h-full flex flex-col">
          <div className="flex-1 grid grid-cols-2 gap-2 auto-rows-max">
            {selectedItems.map((item) => (
              <div
                key={item.id}
                className="relative aspect-square rounded-md overflow-hidden border border-border hover:ring-2 hover:ring-primary hover:ring-offset-1 transition-all"
                onClick={() => onImageClick(item, selectedItems.indexOf(item))}
              >
                {item.memory.url && !failedImages.has(item.memory.url) ? (
                  <Image
                    src={item.memory.url}
                    alt={item.memory.title || 'Selected photo'}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 150px"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <button
                  className="absolute top-1 right-1 p-1 rounded-full bg-destructive/80 hover:bg-destructive text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFromSelection(item.memory.id);
                  }}
                >
                  <X className="h-3 w-3" />
                </button>
                {/* Rating indicator */}
                <div className="absolute bottom-1 left-1 bg-black/70 rounded-full px-2 py-1">
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-400 fill-current" />
                    <span className="text-xs text-white">
                      {ratings[item.memory.id] || 0}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selectedItems.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <p className="text-sm">Select photos to see them here</p>
                <p className="text-xs mt-1 opacity-70">
                  Click on photos in the gallery to select them
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Removed Send button as it's now only shown in the gallery selection bar */}
    </div>
  );
}
