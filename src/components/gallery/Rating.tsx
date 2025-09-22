'use client';

import React, { useState } from 'react';
import { Slider } from '@/components/ui/slider';

interface RatingProps {
  imageId: string;
  onRate: (rating: number) => void;
}

const Rating: React.FC<RatingProps> = ({ imageId: _imageId, onRate }) => {
  const [rating, setRating] = useState(0);

  const handleRating = (value: number[]) => {
    const newRating = value[0];
    setRating(newRating);
    onRate(newRating);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <Slider defaultValue={[0]} max={5} step={1} onValueChange={handleRating} style={{ width: '150px' }} />
    </div>
  );
};

export default Rating;
