'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { galleryService } from '@/services/gallery';
import { GalleryWithItems } from '@/types/gallery';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { CheckCircle } from 'lucide-react';
import { useSelection } from '@/contexts/SelectionContext';
import Rating from './Rating';
import HideButton from './HideButton';

const Gallery = () => {
  const { id } = useParams();
  const [gallery, setGallery] = useState<GalleryWithItems | null>(null);
  const { selectedImages, toggleSelection, rateImage, hideImage, hiddenImages, resetHiddenImages } = useSelection();

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

  const visibleImages = gallery?.items.filter(item => !hiddenImages.includes(item.memory.id)) || [];

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h2>Select Your Favorite Pictures</h2>
        <p>Click on the images to select them. You can also rate them or hide them temporarily to help you decide.</p>
        <Button onClick={handleSendSelection} disabled={selectedImages.length === 0}>
          Send Selection
        </Button>
        {hiddenImages.length > 0 && (
          <Button onClick={resetHiddenImages} variant="secondary" style={{ marginLeft: '10px' }}>
            Show Hidden Images
          </Button>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
        {visibleImages.map((item) => (
          <div key={item.id} style={{ position: 'relative', cursor: 'pointer' }} onClick={() => toggleSelection(item.memory.id)}>
            {selectedImages.includes(item.memory.id) && (
              <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 1 }}>
                <CheckCircle color="white" fill="blue" size={24} />
              </div>
            )}
            <Image src={item.memory.url!} alt={item.memory.title || 'Gallery Image'} width={300} height={300} style={{ width: '100%', height: 'auto', display: 'block' }} />
            <div style={{ padding: '8px' }}>
              <p>{item.memory.title || 'Gallery Image'}</p>
              <Rating imageId={item.memory.id} onRate={(rating) => rateImage(item.memory.id, rating)} />
              <HideButton imageId={item.memory.id} onHide={() => hideImage(item.memory.id)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Gallery;
