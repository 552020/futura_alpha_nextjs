'use client';

import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingProps {
  value: number;
  onChange: (rating: number) => void;
  className?: string;
  size?: 'sm' | 'default';
}

const Rating: React.FC<RatingProps> = ({ 
  value, 
  onChange, 
  className = '', 
  size = 'default' 
}) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const handleClick = (rating: number) => {
    // Toggle off if clicking the same rating
    onChange(rating === value ? 0 : rating);
  };

  const handleMouseEnter = (rating: number) => {
    setHoverValue(rating);
  };

  const handleMouseLeave = () => {
    setHoverValue(null);
  };

  const displayValue = hoverValue !== null ? hoverValue : value;
  const starSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  const starGap = size === 'sm' ? 'gap-0.5' : 'gap-1';

  return (
    <div 
      className={cn(
        'flex items-center', 
        starGap,
        className
      )}
      onMouseLeave={handleMouseLeave}
    >
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type="button"
          className={cn(
            'transition-colors focus:outline-none',
            'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary',
            'rounded-sm p-0.5',
            'text-muted-foreground',
            {
              'text-yellow-400': rating <= displayValue,
              'hover:text-yellow-500': rating <= (hoverValue || value),
            }
          )}
          onClick={(e) => {
            e.stopPropagation();
            handleClick(rating);
          }}
          onMouseEnter={() => handleMouseEnter(rating)}
          aria-label={`Rate ${rating} out of 5`}
        >
          <Star 
            className={cn(
              starSize,
              'fill-current',
              {
                'fill-yellow-400': rating <= displayValue,
                'hover:fill-yellow-500': rating <= (hoverValue || value),
              }
            )}
          />
        </button>
      ))}
    </div>
  );
};

export default Rating;
