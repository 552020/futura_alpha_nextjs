'use client';

import React from 'react';
import { EyeOff } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface HideButtonProps {
  imageId: string;
  onHide: () => void;
  className?: string;
}

const HideButton: React.FC<HideButtonProps> = ({ imageId: _imageId, onHide, className = '' }) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onHide();
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleClick}
            className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${className}`}
            aria-label="Hide image"
          >
            <EyeOff className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Hide this image</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default HideButton;
