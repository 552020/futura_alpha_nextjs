'use client';

import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { SelectionProvider } from '@/contexts/SelectionContext';
import { useEffect } from 'react';

// Dynamically import the GalleryPage component with SSR disabled
const GalleryPage = dynamic(
  () => import('./page').then(mod => mod.default),
  { 
    ssr: false,
    loading: () => <div>Loading gallery...</div>
  }
);

const GalleryPageWrapper = () => {
  const searchParams = useSearchParams();
  const isSelectionMode = searchParams.get('select') === 'true';

  // Add a class to the body when in selection mode
  useEffect(() => {
    if (isSelectionMode) {
      document.body.classList.add('selection-mode');
      return () => {
        document.body.classList.remove('selection-mode');
      };
    }
  }, [isSelectionMode]);

  return (
    <SelectionProvider>
      <div className={isSelectionMode ? 'selection-mode' : ''}>
        <GalleryPage />
      </div>
    </SelectionProvider>
  );
};

export default GalleryPageWrapper;
