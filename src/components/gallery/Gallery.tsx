'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { galleryService } from '@/services/gallery';
import { GalleryWithItems } from '@/types/gallery';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import Image from 'next/image';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useSelection } from '@/contexts/SelectionContext';
import Rating from './Rating';

const ResizeHandle = () => (
  <PanelResizeHandle className="w-2 bg-gray-100 hover:bg-gray-200 transition-colors" />
);

const Gallery = () => {
  const { id } = useParams();
  const [gallery, setGallery] = useState<GalleryWithItems | null>(null);
  const { selectedImages, toggleSelection, rateImage } = useSelection();

  useEffect(() => {
    const loadGallery = async () => {
      try {
        const result = await galleryService.getGallery(id as string);
        setGallery(result.gallery);
      } catch (err) {
        console.error('Error loading gallery:', err);
      }
    };

    if (id) {
      loadGallery();
    }
  }, [id]);

  const unselectedImages = gallery?.items.filter(
    item => !selectedImages.includes(item.memory.id)
  ) || [];
  
  const selectedItems = gallery?.items.filter(
    item => selectedImages.includes(item.memory.id)
  ) || [];

  const handleSendSelection = async () => {
    try {
      const response = await fetch('/api/gallery/selection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ images: selectedImages }),
      });

      if (response.ok) {
        alert('Selection sent successfully!');
      } else {
        alert('Failed to send selection.');
      }
    } catch (error) {
      console.error('Error sending selection:', error);
      alert('An error occurred while sending the selection.');
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)]">
      <div className="p-4 border-b">
        <h1 className="text-2xl font-bold mb-2">Photo Selection</h1>
        <p className="text-muted-foreground">
          Select your favorite pictures by checking the boxes below.
        </p>
        <div className="mt-4">
          <Button 
            onClick={handleSendSelection} 
            disabled={selectedImages.length === 0}
            className="w-full sm:w-auto"
          >
            Send {selectedImages.length} Selected Photos
          </Button>
        </div>
      </div>

      <PanelGroup direction="horizontal" className="flex-1 w-full">
        <Panel defaultSize={70} minSize={30} className="p-4 overflow-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {unselectedImages.map((item) => (
              <div 
                key={item.id} 
                className="relative group rounded-lg overflow-hidden border hover:shadow-md transition-shadow"
              >
                <div className="absolute top-2 left-2 z-10">
                  <Checkbox 
                    id={`select-${item.id}`}
                    checked={selectedImages.includes(item.memory.id)}
                    onCheckedChange={() => toggleSelection(item.memory.id)}
                    className="h-5 w-5 rounded-full bg-white/80"
                  />
                </div>
                <Image 
                  src={item.memory.url!} 
                  alt={item.memory.title || 'Gallery Image'} 
                  width={300} 
                  height={300} 
                  className="w-full h-48 object-cover"
                />
                <div className="p-3">
                  <p className="font-medium truncate">{item.memory.title || 'Untitled'}</p>
                  <Rating 
                    imageId={item.memory.id} 
                    onRate={(rating) => rateImage(item.memory.id, rating)} 
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {selectedItems.length > 0 && (
          <>
            <ResizeHandle />
            <Panel 
              defaultSize={30} 
              minSize={20}
              className="bg-gray-50 p-4 overflow-auto border-l"
            >
              <h2 className="text-lg font-semibold mb-4">
                Selected ({selectedItems.length})
              </h2>
              <div className="space-y-4">
                {selectedItems.map((item) => (
                  <div 
                    key={item.id}
                    className="flex gap-3 p-2 bg-white rounded-lg border"
                  >
                    <div className="relative h-16 w-16 flex-shrink-0">
                      <Image
                        src={item.memory.url!}
                        alt={item.memory.title || 'Selected Image'}
                        fill
                        className="object-cover rounded"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {item.memory.title || 'Untitled'}
                      </p>
                      <Rating 
                        imageId={item.memory.id} 
                        onRate={(rating) => rateImage(item.memory.id, rating)} 
                        className="mt-1"
                      />
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => toggleSelection(item.memory.id)}
                      className="flex-shrink-0"
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            </Panel>
          </>
        )}
      </PanelGroup>
    </div>
  );
};

export default Gallery;
