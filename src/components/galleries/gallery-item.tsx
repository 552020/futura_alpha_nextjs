import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { useSelection } from '@/contexts/selection-context';
import { Image as ImageIcon } from 'lucide-react';
import { MemoryStorageBadge } from "@/components/common/memory-storage-badge";


type GalleryItemProps = {
  item: {
    id: string;
    url: string;
    title?: string;
    description?: string;
    memory?: {
      id: string;
      type: string;
    };
  };
  onClick?: (id: string) => void;
  className?: string;
};

export function GalleryItem({ item, onClick, className = '' }: GalleryItemProps) {
  const { isSelectMode, isSelected, toggleSelection } = useSelection();
  const [isHovered, setIsHovered] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleClick = () => {
    if (isSelectMode) {
      toggleSelection(item.id);
    } else {
      onClick?.(item.id);
    }
  };

  const showOverlay = isSelectMode || isHovered;
  const isItemSelected = isSelected(item.id);

  return (
    <div
      className={cn(
        'relative group rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 aspect-square transition-all duration-200',
        'hover:ring-2 hover:ring-primary hover:ring-offset-2',
        isItemSelected ? 'ring-2 ring-primary ring-offset-2' : '',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      {/* Image */}
      <div className="w-full h-full relative">
        {!imageError ? (
          <Image
            src={item.url}
            alt={item.title || 'Gallery image'}
            fill
            className={cn(
              'object-cover transition-opacity duration-200',
              isImageLoaded ? 'opacity-100' : 'opacity-0'
            )}
            onLoad={() => setIsImageLoaded(true)}
            onError={() => setImageError(true)}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
            <div className="text-gray-400 dark:text-gray-500">
              <ImageIcon className="h-12 w-12 mx-auto mb-2" />
              <p className="text-sm">Image not available</p>
            </div>
          </div>
        )}
      </div>

      {/* Selection overlay and checkbox */}
      {(showOverlay || isItemSelected) && (
        <div
          className={cn(
            'absolute inset-0 bg-black/30 flex items-center justify-center transition-opacity duration-200',
            isItemSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}
        >
          <div className="absolute top-2 left-2">
            <Checkbox 
              checked={isItemSelected}
              onCheckedChange={() => toggleSelection(item.id)}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className={cn(
                'h-6 w-6 rounded-full border-2 border-white',
                isItemSelected ? 'bg-primary' : 'bg-white/20'
              )}
            />
          </div>
        </div>
      )}

      {/* Bottom info */}
      {(item.title || item.memory) && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-white text-sm">
          {item.title && <p className="font-medium truncate">{item.title}</p>}
          {item.memory && (
            <div className="flex items-center mt-1">
              <MemoryStorageBadge memoryId={item.memory.id} memoryType={item.memory.type} size="xs" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
