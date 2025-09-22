'use client';

import React from 'react';
import { Slider } from '@/components/ui/slider';

interface RatingProps {
  value: number;
  onChange: (rating: number) => void;
  className?: string;
  size?: 'sm' | 'default';
}

const Rating: React.FC<RatingProps> = ({ value, onChange, className = '', size = 'default' }) => {
  const handleRating = (values: number[]) => {
    onChange(values[0]);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Slider 
        value={[value]} 
        max={5} 
        step={1} 
        onValueChange={handleRating} 
        className={size === 'sm' ? 'w-24' : 'w-32'}
        onPointerDown={(e) => e.stopPropagation()}
      />
    </div>
  );
};

export default Rating;
