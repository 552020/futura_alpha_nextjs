'use client';

import { MemoryCard } from '@/components/memory/memory-card';
import type { ExtendedMemory } from '@/types/dashboard';

interface GalleryMemoryCardProps {
  memory: ExtendedMemory & {
    status: 'private' | 'shared' | 'public';
    sharedWithCount?: number;
    sharedBy?: string;
  };
  isSelecting: boolean;
  isSelected: boolean;
  rating?: number;
  isHidden?: boolean;
  onClick: (memory: ExtendedMemory) => void;
  onSelectionToggle: (memory: ExtendedMemory, selected: boolean) => void;
  onRate?: (memory: ExtendedMemory, rating: number) => void;
  onToggleHidden?: (memory: ExtendedMemory) => void;
  // MemoryCard props - these can be undefined
  onDelete: (memoryId: string) => void;
  onShare: (memoryId: string) => void;
  onEdit: (memoryId: string) => void;
  viewMode?: 'grid' | 'list';
}

export function GalleryMemoryCard({
  memory,
  isSelecting,
  isSelected,
  rating = 0,
  isHidden = false,
  onClick,
  onSelectionToggle,
  onRate,
  onToggleHidden,
  onDelete,
  onShare,
  onEdit,
  viewMode = 'grid',
}: GalleryMemoryCardProps) {
  // When in selection mode, render with selection overlay
  if (isSelecting && viewMode === 'grid') {
    return (
      <div className={`relative ${isSelected ? 'ring-2 ring-primary' : ''}`}>
        <div className="group">
          <MemoryCard
            memory={memory}
            onClick={onClick}
            onDelete={onDelete || (() => {})}
            onShare={onShare || (() => {})}
            onEdit={onEdit || (() => {})}
            viewMode="grid"
          />

          {/* Selection checkbox in top-left corner */}
          <div className="absolute top-2 left-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => onSelectionToggle(memory, e.target.checked)}
              onClick={(e) => e.stopPropagation()}
              className="w-4 h-4 bg-background border-2 border-primary shadow-sm"
            />
          </div>

          {/* Selection controls overlay - show on hover */}
          <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center justify-center gap-2 text-xs">
              {/* Hide/Unhide button */}
              {onToggleHidden && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleHidden(memory);
                  }}
                  className="p-1 rounded-full bg-black/50 hover:bg-black/70 transition-colors flex items-center justify-center"
                  title={isHidden ? 'Unhide photo' : 'Hide photo'}
                >
                  {isHidden ? (
                    <svg className="h-3 w-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="h-3 w-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  )}
                </button>
              )}

              {/* Rating display and controls - compact */}
              <div className="flex items-center gap-1 bg-black/50 rounded-full px-1.5 py-0.5">
                <span className="text-xs text-white">★{rating}</span>
                {onRate && (
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={(e) => {
                          e.stopPropagation();
                          onRate(memory, star);
                        }}
                        className="p-0.5 hover:scale-110 transition-transform"
                        title={`Rate ${star} star${star > 1 ? 's' : ''}`}
                      >
                        <svg
                          className={`h-2.5 w-2.5 transition-colors ${
                            star <= rating ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-400'
                          }`}
                          fill={star <= rating ? 'currentColor' : 'none'}
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                          />
                        </svg>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default: use standard MemoryCard
  return (
    <MemoryCard
      memory={memory}
      onClick={onClick}
      onDelete={onDelete}
      onShare={onShare}
      onEdit={onEdit}
      viewMode={viewMode}
    />
  );
}
