'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Star, Eye, EyeOff } from 'lucide-react';

interface SelectionControlsProps<T> {
  item: T;
  isSelected: boolean;
  onSelectionToggle: (item: T, selected: boolean) => void;
  className?: string;
}

export function SelectionControls<T>({
  item,
  isSelected,
  onSelectionToggle,
  className = '',
}: SelectionControlsProps<T>) {
  return (
    <Checkbox
      checked={isSelected}
      onCheckedChange={(checked) => onSelectionToggle(item, checked === true)}
      onClick={(e) => e.stopPropagation()}
      className={`bg-white/90 border-white shadow-sm ${className}`}
    />
  );
}

interface SelectionOverlayProps<T> {
  item: T;
  rating?: number;
  isHidden?: boolean;
  onRate?: (item: T, rating: number) => void;
  onToggleHidden?: (item: T) => void;
  className?: string;
}

export function SelectionOverlay<T>({
  item,
  rating = 0,
  isHidden = false,
  onRate,
  onToggleHidden,
  className = '',
}: SelectionOverlayProps<T>) {
  return (
    <div className={`bg-black/50 flex flex-col justify-between p-2 ${className}`}>
      {/* Top bar - Rating display */}
      <div className="flex justify-end">
        <div className="flex items-center gap-1 bg-black/70 rounded-full px-2 py-1">
          <Star className="h-3 w-3 text-yellow-400 fill-current" />
          <span className="text-xs text-white">{rating}</span>
        </div>
      </div>

      {/* Bottom bar - Hide/Unhide and Rating controls */}
      <div className="flex justify-between items-end">
        {/* Hide/Unhide button */}
        {onToggleHidden && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleHidden(item);
            }}
            className="p-1.5 rounded-full bg-black/70 hover:bg-black/90 transition-colors"
            title={isHidden ? 'Unhide item' : 'Hide item'}
          >
            {isHidden ? (
              <Eye className="h-4 w-4 text-white" />
            ) : (
              <EyeOff className="h-4 w-4 text-white" />
            )}
          </button>
        )}

        {/* Rating stars */}
        {onRate && (
          <div className="flex items-center gap-0.5 bg-black/70 rounded-full px-2 py-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={(e) => {
                  e.stopPropagation();
                  onRate(item, star);
                }}
                className="p-0.5"
              >
                <Star
                  className={`h-4 w-4 ${
                    star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface PhotoSelectionOverlayProps<T> {
  item: T;
  isSelected: boolean;
  rating?: number;
  isHidden?: boolean;
  onSelectionToggle: (item: T, selected: boolean) => void;
  onRate?: (item: T, rating: number) => void;
  onToggleHidden?: (item: T) => void;
}

export function PhotoSelectionOverlay<T>({
  item,
  isSelected,
  rating = 0,
  isHidden = false,
  onSelectionToggle,
  onRate,
  onToggleHidden,
}: PhotoSelectionOverlayProps<T>) {
  return (
    <>
      {/* Selection checkbox */}
      <div className="absolute top-2 left-2 z-10">
        <SelectionControls
          item={item}
          isSelected={isSelected}
          onSelectionToggle={onSelectionToggle}
        />
      </div>

      {/* Actions overlay */}
      <div className="absolute inset-0">
        <SelectionOverlay
          item={item}
          rating={rating}
          isHidden={isHidden}
          onRate={onRate}
          onToggleHidden={onToggleHidden}
        />
      </div>
    </>
  );
}
