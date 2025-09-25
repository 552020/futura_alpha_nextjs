import React from 'react';
import { Star } from 'lucide-react';

interface RatingProps {
  value: number;
  onChange: (rating: number) => void;
  maxRating?: number;
  className?: string;
}

export default function Rating({ value, onChange, maxRating = 5, className = '' }: RatingProps) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {[1, 2, 3, 4, 5].slice(0, maxRating).map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="p-0.5 hover:scale-110 transition-transform"
        >
          <Star
            className={`h-4 w-4 ${
              star <= value
                ? 'text-yellow-400 fill-current'
                : 'text-gray-300 hover:text-yellow-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
}
