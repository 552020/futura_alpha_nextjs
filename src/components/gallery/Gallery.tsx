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
import HideButton from './HideButton';
import { Eye, EyeOff } from 'lucide-react';

const ResizeHandle = () => <PanelResizeHandle className="w-2 bg-gray-100 hover:bg-gray-200 transition-colors" />;

const Gallery = () => {
  const { id } = useParams();
  const [gallery, setGallery] = useState<GalleryWithItems | null>(null);
  const { selectedImages, toggleSelection, rateImage, hiddenImages, hideImage } = useSelection();
  const [activeTab, setActiveTab] = useState<'all' | 'hidden'>('all');
  const [showHidden, setShowHidden] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{url: string, title: string} | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  
  const MAX_SELECTION = 35;

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

  // Update filtered items based on active tab and showHidden state
  const filteredItems = gallery?.items.filter(item => {
    if (activeTab === 'hidden') return hiddenImages.includes(item.memory.id);
    if (!showHidden && hiddenImages.includes(item.memory.id)) return false;
    return true;
  }) || [];

  const unselectedImages = filteredItems.filter(item => !selectedImages.includes(item.memory.id));
  const selectedItems = filteredItems.filter(item => selectedImages.includes(item.memory.id));

  // Auto-select when rating changes
  const handleRateImage = (imageId: string, rating: number) => {
    // @ts-ignore - rating is a valid property in our use case
    rateImage(imageId, rating);
    if (rating > 0 && !selectedImages.includes(imageId)) {
      // @ts-ignore - toggleSelection is available in the context
      toggleSelection(imageId);
    }
  };

  const handleHideImage = (e: React.MouseEvent, imageId: string) => {
    e.stopPropagation();
    hideImage(imageId);
    // Also deselect if hidden
    if (selectedImages.includes(imageId)) {
      toggleSelection(imageId);
    }
  };

  const handleSendClick = () => {
    if (selectedImages.length === 0) return;
    setShowMessageModal(true);
  };

  const handleSendSelection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedImages.length === 0 || isSending) return;
    
    setIsSending(true);
    setSendError(null);
    
    try {
      // Get the actual file names for the selected images
      const selectedItems = gallery?.items.filter(item => selectedImages.includes(item.memory.id)) || [];
      const imageDetails = selectedItems.map(item => ({
        id: item.memory.id,
        url: item.memory.url || '',
        name: item.memory.title || `Image ${item.id}`,
        rating: item.memory.rating || 0
      }));

      const response = await fetch('/api/gallery/selection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          images: imageDetails,
          message: message.trim(),
          timestamp: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to send selection');
      }
      
      // Close modal and reset form on success
      setShowMessageModal(false);
      setMessage('');
      
      // Show success message
      alert('Your selection has been sent successfully!');
    } catch (error) {
      console.error('Error sending selection:', error);
      setSendError(error instanceof Error ? error.message : 'An error occurred while sending the selection.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)]">
      <div className="p-4 border-b space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">Photo Selection</h1>
            <div className="text-muted-foreground space-y-2 mt-2">
              <p>Browse through your photos and select up to {MAX_SELECTION} favorites:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Click the <span className="font-medium">checkbox</span> to select photos</li>
                <li>Use <span className="font-medium">star ratings</span> to rank your top picks</li>
                <li>Hide distracting photos with the <span className="font-medium">eye icon</span></li>
                <li>Click on any photo to view it in full size</li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              {hiddenImages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHidden(!showHidden)}
                  className="flex items-center gap-1"
                >
                  {showHidden ? (
                    <>
                      <EyeOff className="h-4 w-4" />
                      <span>Hide Hidden</span>
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" />
                      <span>Show Hidden ({hiddenImages.length})</span>
                    </>
                  )}
                </Button>
              )}
              <Button 
                onClick={handleSendClick}
                disabled={selectedImages.length === 0 || isSending}
                className="ml-2 min-w-[150px] bg-blue-600 hover:bg-blue-700 text-white"
              >
                Send {selectedImages.length} of {MAX_SELECTION}
              </Button>
            </div>
            <div className="w-full max-w-md">
              <div className="flex justify-between text-sm text-muted-foreground mb-1">
                <span>{selectedImages.length} selected (max {MAX_SELECTION})</span>
                <span>{MAX_SELECTION - selectedImages.length} remaining</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                  style={{ width: `${Math.min(100, (selectedImages.length / MAX_SELECTION) * 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full mx-auto p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Add a Message (Optional)</h3>
            
            <form onSubmit={handleSendSelection}>
              <div className="mb-4">
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Add a note to your selection..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  rows={4}
                  maxLength={200}
                  disabled={isSending}
                />
                <div className="text-right text-xs text-gray-500 mt-1">
                  {message.length}/200
                </div>
              </div>
              
              {sendError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md text-sm">
                  {sendError}
                </div>
              )}
              
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowMessageModal(false);
                    setSendError(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  disabled={isSending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex items-center gap-2"
                  disabled={isSending}
                >
                  {isSending ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </>
                  ) : (
                    'Send Selection'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-4xl w-full max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
              aria-label="Close"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
              <div className="relative pt-[75%] bg-black">
                <Image
                  src={selectedImage.url}
                  alt={selectedImage.title}
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
              {selectedImage.title && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-lg font-medium text-gray-900 dark:text-white">{selectedImage.title}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('all')}
              className={`py-4 px-6 text-sm font-medium ${
                activeTab === 'all'
                  ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              All Photos
              <span className="ml-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-medium px-2 py-0.5 rounded-full">
                {gallery?.items.length || 0}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('hidden')}
              className={`py-4 px-6 text-sm font-medium ${
                activeTab === 'hidden'
                  ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Hidden
              {hiddenImages.length > 0 && (
                <span className="ml-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-medium px-2 py-0.5 rounded-full">
                  {hiddenImages.length}
                </span>
              )}
            </button>
          </nav>
        </div>
      </div>

      <PanelGroup direction="horizontal" className="flex-1 w-full">
        <Panel defaultSize={70} minSize={30} className="p-4 overflow-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {unselectedImages.map(item => (
              <div
                key={item.id}
                className="relative group rounded-lg overflow-hidden border hover:shadow-md transition-shadow"
              >
                <div className="absolute top-2 left-2 z-10 flex gap-2">
                  <Checkbox
                    id={`select-${item.id}`}
                    checked={selectedImages.includes(item.memory.id)}
                    onCheckedChange={() => toggleSelection(item.memory.id)}
                    className="h-5 w-5 rounded-full bg-white/80"
                  />
                  <HideButton 
                    imageId={item.memory.id} 
                    onHide={(e) => handleHideImage(e, item.memory.id)}
                    className="bg-white/80 hover:bg-white"
                  />
                </div>
                <div 
                  className="relative w-full h-48 bg-gray-100 dark:bg-gray-800 cursor-zoom-in"
                  onClick={() => setSelectedImage({
                    url: item.memory.url!,
                    title: item.memory.title || ''
                  })}
                >
                  <Image
                    src={item.memory.url!}
                    alt={item.memory.title || 'Gallery Image'}
                    fill
                    className="object-cover hover:opacity-90 transition-opacity"
                  />
                </div>
                <div className="p-3">
                  <div className="flex justify-between items-start">
                    <p className="font-medium truncate">{item.memory.title || 'Untitled'}</p>
                    {hiddenImages.includes(item.memory.id) && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                        Hidden
                      </span>
                    )}
                  </div>
                  <Rating 
                    imageId={item.memory.id} 
                    onRate={rating => handleRateImage(item.memory.id, rating)} 
                    value={item.memory.rating || 0}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {selectedItems.length > 0 && (
          <>
            <ResizeHandle />
            <Panel defaultSize={30} minSize={20} className="bg-gray-50 p-4 overflow-auto border-l">
              <h2 className="text-lg font-semibold mb-4">Selected ({selectedItems.length})</h2>
              <div className="space-y-4">
                {selectedItems.map(item => (
                  <div key={item.id} className="flex gap-3 p-2 bg-white rounded-lg border">
                    <div className="relative h-16 w-16 flex-shrink-0">
                      <Image
                        src={item.memory.url!}
                        alt={item.memory.title || 'Selected Image'}
                        fill
                        className="object-cover rounded"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.memory.title || 'Untitled'}</p>
                      <Rating
                        imageId={item.memory.id}
                        onRate={rating => rateImage(item.memory.id, rating)}
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
