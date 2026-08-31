import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

interface GallerySelectionBarProps {
  isSelecting: boolean;
  selectedCount: number;
  maxSelection: number;
  hiddenCount: number;
  activeTab: 'all' | 'hidden';
  onTabChange: (tab: 'all' | 'hidden') => void;
  onSendPhotos: () => void;
  showHiddenTabs?: boolean;
}

export function GallerySelectionBar({
  isSelecting,
  selectedCount,
  maxSelection,
  hiddenCount,
  activeTab,
  onTabChange,
  onSendPhotos,
  showHiddenTabs = false,
}: GallerySelectionBarProps) {
  if (!isSelecting) return null;

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-900/50">
      <div className="container mx-auto px-6 py-3 flex items-center justify-between">
        <div className="text-sm text-blue-800 dark:text-blue-200">
          {selectedCount} of {maxSelection} photos selected
        </div>
        <div className="flex items-center gap-2">
          {/* Hidden tab functionality - only shown when feature is enabled */}
          {showHiddenTabs && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onTabChange('all')}
                className={
                  activeTab === 'all' ? 'bg-blue-100 dark:bg-blue-900' : ''
                }
              >
                All Photos
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onTabChange('hidden')}
                className={
                  activeTab === 'hidden' ? 'bg-blue-100 dark:bg-blue-900' : ''
                }
              >
                Hidden ({hiddenCount})
              </Button>
            </>
          )}
          <Button
            variant="default"
            size="sm"
            onClick={onSendPhotos}
            disabled={selectedCount === 0}
          >
            <Check className="h-4 w-4 mr-2" />
            Send {selectedCount} Photos
          </Button>
        </div>
      </div>
    </div>
  );
}
