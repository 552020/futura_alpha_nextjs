'use client';

import React from 'react';
import { SelectionProvider } from '@/contexts/SelectionContext';
import Gallery from './Gallery';

const GalleryWrapper = () => {
  return (
    <SelectionProvider>
      <Gallery />
    </SelectionProvider>
  );
};

export default GalleryWrapper;
