'use client';

import React from 'react';
import { SelectionProvider } from '@/contexts/SelectionContext';
import PhotoSelector from '@/components/gallery/PhotoSelector';

const GallerySelectionPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-4">
        <SelectionProvider>
          <PhotoSelector />
        </SelectionProvider>
      </div>
    </div>
  );
};

export default GallerySelectionPage;
