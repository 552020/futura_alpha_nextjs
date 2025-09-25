'use client';

import { useSearchParams } from 'next/navigation';
import { SelectionProvider } from '@/contexts/SelectionContext';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { galleryService } from '@/services/gallery';
import { GalleryWithItems, GalleryDetailResponse } from '@/types/gallery';
import { Checkbox } from '@/components/ui/checkbox';
import Image from 'next/image';
import Rating from '@/components/gallery/Rating';

export default function GalleryClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { id, lang: _lang } = params as { id: string; lang: string };
  const isSelectionMode = searchParams.get('select') === 'true';

  // Gallery state
  const [gallery, setGallery] = useState<GalleryWithItems | null>(null);
  const [galleryDetail, setGalleryDetail] = useState<GalleryDetailResponse | null>(null);
  const [_activeTab, _setActiveTab] = useState<'all' | 'hidden'>('all');
  const [_showHidden, _setShowHidden] = useState(false);
  const [_showMessageModal, _setShowMessageModal] = useState(false);
  const [_message, _setMessage] = useState('');
  const [_isSending, _setIsSending] = useState(false);
  const [_selectedImage, _setSelectedImage] = useState<{ url: string; title: string } | null>(null);
  const [_sendError, _setSendError] = useState<string | null>(null);

  const _MAX_SELECTION = 35;

  // Add a class to the body when in selection mode
  useEffect(() => {
    if (isSelectionMode) {
      document.body.classList.add('selection-mode');
      return () => {
        document.body.classList.remove('selection-mode');
      };
    }
  }, [isSelectionMode]);

  // Load gallery data
  useEffect(() => {
    const loadGallery = async () => {
      try {
        const data = await galleryService.getGallery(id);
        setGalleryDetail(data);
        setGallery(data.gallery);
      } catch (error) {
        console.error('Failed to load gallery:', error);
      }
    };

    if (id) {
      loadGallery();
    }
  }, [id]);

  // Your existing gallery rendering logic here...
  // (Add the rest of your gallery component JSX here)

  return (
    <SelectionProvider>
      <div className={isSelectionMode ? 'selection-mode' : ''}>
        {/* Add your gallery content here */}
        {gallery ? (
          <div className="gallery-container">
            {/* Render your gallery items */}
            {galleryDetail?.items?.map((item) => (
              <div key={item.id} className="gallery-item">
                {/* Render your gallery item content */}
                {isSelectionMode && (
                  <Checkbox 
                    // Add your selection logic here
                  />
                )}
                <Image 
                  src={item.memory.url || ''} 
                  alt={item.memory.title}
                  width={300}
                  height={200}
                  className="object-cover"
                />
                <div className="gallery-item-info">
                  <h3>{item.memory.title}</h3>
                  <Rating
                    value={item.memory.rating || 0}
                    onChange={(newRating: number) => {
                      // Add your rating update logic here
                      console.log(`Rating updated to ${newRating} for item ${item.id}`);
                    }}
                    className="mt-2"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>Loading gallery...</div>
        )}
      </div>
    </SelectionProvider>
  );
}
