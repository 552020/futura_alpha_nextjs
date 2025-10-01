'use client';

import React, { createContext, useState, useContext, ReactNode } from 'react';

interface SelectionContextType {
  selectedImages: string[];
  toggleSelection: (imageId: string) => void;
  ratings: { [imageId: string]: number };
  rateImage: (imageId: string, rating: number) => void;
  hiddenImages: string[];
  hideImage: (imageId: string) => void;
  resetHiddenImages: () => void;
}

const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

export const useSelection = () => {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error('useSelection must be used within a SelectionProvider');
  }
  return context;
};

interface SelectionProviderProps {
  children: ReactNode;
}

export const SelectionProvider: React.FC<SelectionProviderProps> = ({ children }) => {
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [ratings, setRatings] = useState<{ [imageId: string]: number }>({});
  const [hiddenImages, setHiddenImages] = useState<string[]>([]);

  const toggleSelection = (imageId: string) => {
    setSelectedImages(prev =>
      prev.includes(imageId) ? prev.filter(id => id !== imageId) : [...prev, imageId]
    );
  };

  const rateImage = (imageId: string, rating: number) => {
    setRatings(prev => ({ ...prev, [imageId]: rating }));
  };

  const hideImage = (imageId: string) => {
    setHiddenImages(prev => [...prev, imageId]);
  };

  const resetHiddenImages = () => {
    setHiddenImages([]);
  };

  return (
    <SelectionContext.Provider value={{ selectedImages, toggleSelection, ratings, rateImage, hiddenImages, hideImage, resetHiddenImages }}>
      {children}
    </SelectionContext.Provider>
  );
};
