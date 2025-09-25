'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuthGuard } from '@/utils/authentication';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Globe, Lock, Trash2, Maximize2, CheckSquare } from 'lucide-react';
import { galleryService } from '@/services/gallery';
import { GalleryWithItems } from '@/types/gallery';
import { ForeverStorageProgressModal } from '@/components/galleries/forever-storage-progress-modal';
import { StorageStatusBadge, getGalleryStorageStatus } from '@/components/common/storage-status-badge';
import { GalleryStorageSummary } from '@/components/galleries/gallery-storage-summary';
import { GalleryImageModal } from '@/components/galleries/gallery-image-modal';
import { GallerySelectionBar } from '@/components/galleries/gallery-selection-bar';
import { GalleryPhotoGrid } from '@/components/galleries/gallery-photo-grid';
import { GallerySelectionPanel } from '@/components/galleries/gallery-selection-panel';

// Mock data flag for development - same pattern as dashboard
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA_GALLERY === 'true';

export function GalleryViewContent() {
  const { id, lang } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthorized, isLoading: authLoading } = useAuthGuard();
  const [gallery, setGallery] = useState<GalleryWithItems | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Selection state
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [ratings, setRatings] = useState<{ [imageId: string]: number }>({});
  const [hiddenImages, setHiddenImages] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'hidden'>('all');
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [showForeverStorageModal, setShowForeverStorageModal] = useState(false);

  // Missing state variables that were in the original
  const [selectedImage, setSelectedImage] = useState<{ url: string; title: string } | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);

  const MAX_SELECTION = 35;

  const loadGallery = useCallback(async () => {
    try {
      console.log('Loading gallery with ID:', id);
      setIsLoading(true);
      setError(null);
      const result = await galleryService.getGallery(id as string, USE_MOCK_DATA);
      console.log('Gallery data received:', result);
      setGallery(result.gallery);
    } catch (err) {
      console.error('Error loading gallery:', err);
      setError('Failed to load gallery');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (isAuthorized && id) {
      loadGallery();
    }
  }, [isAuthorized, id, loadGallery]);

  // Auto-open modal if returning from II linking flow
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const shouldOpen = searchParams?.get('storeForever') === '1';
    if (shouldOpen) {
      setShowForeverStorageModal(true);
      // Clean the query param to avoid reopening on refresh
      const url = new URL(window.location.href);
      url.searchParams.delete('storeForever');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams]);

  const handleImageClick = (item: NonNullable<typeof gallery>['items'][number], index?: number) => {
    if (!item?.memory) return;

    const memory = item.memory;

    // Always show image in modal, regardless of selection mode
    setSelectedImage({
      url: memory.url || '',
      title: memory.title || `Photo ${index !== undefined ? index + 1 : ''}`,
    });
    setIsImageModalOpen(true);
  };

  const handleSelectionToggle = (imageId: string, checked: boolean) => {
    if (checked) {
      setSelectedImages(prev => (prev.length < MAX_SELECTION ? [...prev, imageId] : prev));
    } else {
      setSelectedImages(prev => prev.filter(id => id !== imageId));
    }
  };

  const toggleSelectionMode = () => {
    if (isSelecting) {
      // Exit selection mode
      setSelectedImages([]);
      setActiveTab('all');
      setShowSidePanel(false);
    } else {
      // Enter selection mode
      setShowSidePanel(true);
    }
    setIsSelecting(!isSelecting);
  };

  // Filter items based on active tab and hidden state
  const filteredItems =
    gallery?.items.filter(item => {
      if (activeTab === 'hidden') {
        return hiddenImages.includes(item.memory.id);
      }
      // Hide images that are in the hidden list (unless we're in selection mode)
      if (hiddenImages.includes(item.memory.id)) {
        return false;
      }
      return true;
    }) || [];

  // Get selected items with their details
  const selectedItems = selectedImages
    .map(id => gallery?.items.find(item => item.memory.id === id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => {
      const ratingA = ratings[a.memory.id] || 0;
      const ratingB = ratings[b.memory.id] || 0;
      return ratingB - ratingA; // Sort in descending order
    });

  const handleRateImage = (imageId: string, rating: number) => {
    setRatings(prev => ({ ...prev, [imageId]: rating }));

    // Auto-select the image when rating it
    if (isSelecting && !selectedImages.includes(imageId) && selectedImages.length < MAX_SELECTION) {
      setSelectedImages(prev => [...prev, imageId]);
    }
  };

  const handleHideImage = (imageId: string) => {
    console.log('Hiding image:', imageId);
    setHiddenImages(prev => {
      const newHidden = [...prev, imageId];
      console.log('New hidden images:', newHidden);
      return newHidden;
    });
    // Remove from selected images if hidden
    setSelectedImages(prev => {
      const filtered = prev.filter(id => id !== imageId);
      console.log('Removed from selection, new selection:', filtered);
      return filtered;
    });
  };

  const handleUnhideImage = (imageId: string) => {
    console.log('Unhiding image:', imageId);
    setHiddenImages(prev => {
      const newHidden = prev.filter(id => id !== imageId);
      console.log('New hidden images:', newHidden);
      return newHidden;
    });
    // Remove from selected images if unhidden
    setSelectedImages(prev => {
      const filtered = prev.filter(id => id !== imageId);
      console.log('Removed from selection, new selection:', filtered);
      return filtered;
    });
  };

  const handleImageError = useCallback((imageUrl: string) => {
    setFailedImages(prev => new Set(prev).add(imageUrl));
  }, []);

  const handleDeleteGallery = async () => {
    if (!gallery || !confirm('Are you sure you want to delete this gallery? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);
      await galleryService.deleteGallery(gallery.id, USE_MOCK_DATA);
      router.push('/gallery');
    } catch (err) {
      console.error('Error deleting gallery:', err);
      setError('Failed to delete gallery');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFullScreenView = () => {
    router.push(`/gallery/${id}/preview`);
  };

  const handleTogglePrivacy = async () => {
    if (!gallery) return;

    try {
      setIsUpdating(true);
      const updatedGallery = await galleryService.updateGallery(
        gallery.id,
        { isPublic: !gallery.isPublic },
        USE_MOCK_DATA
      );
      setGallery(updatedGallery);
    } catch (err) {
      console.error('Error updating gallery privacy:', err);
      setError('Failed to update gallery privacy');
    } finally {
      setIsUpdating(false);
    }
  };

  // Early returns for loading states
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">Access Denied</h2>
          <p className="text-muted-foreground mb-6">You need to be logged in to view this gallery</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading gallery...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">Error</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={loadGallery}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!gallery) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">Gallery not found</h2>
          <p className="text-muted-foreground mb-6">This gallery doesn't exist or you don't have access to it</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.back()} className="flex items-center gap-2">
                ← Back
              </Button>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{gallery.title}</h1>
                <StorageStatusBadge status={getGalleryStorageStatus(gallery)} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-normal">
                {gallery.isPublic ? (
                  <>
                    <Globe className="h-3 w-3 mr-1" />
                    Public
                  </>
                ) : (
                  <>
                    <Lock className="h-3 w-3 mr-1" />
                    Private
                  </>
                )}
              </Badge>

              <Button
                variant="outline"
                size="sm"
                onClick={handleTogglePrivacy}
                disabled={isUpdating}
                className="flex items-center gap-2"
              >
                {gallery.isPublic ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                {gallery.isPublic ? 'Make Private' : 'Make Public'}
              </Button>

              <Button variant="outline" size="sm" onClick={handleFullScreenView} className="flex items-center gap-2">
                <Maximize2 className="h-4 w-4" />
                Full Screen
              </Button>

              <Button variant="outline" size="sm" onClick={toggleSelectionMode} className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4" />
                {isSelecting ? 'Exit Selection' : 'Select'}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteGallery}
                disabled={isDeleting}
                className="flex items-center gap-2 text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Storage Summary */}
      <div className="border-b bg-muted/50">
        <div className="container mx-auto px-4 py-2">
          <GalleryStorageSummary gallery={gallery} />
        </div>
      </div>

      {/* Selection Bar */}
      <GallerySelectionBar
        isSelecting={isSelecting}
        selectedCount={selectedImages.length}
        maxSelection={MAX_SELECTION}
        hiddenCount={hiddenImages.length}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSendPhotos={() => setShowMessageModal(true)}
      />

      {/* Main content area with side panel */}
      <div className="relative flex-1 overflow-hidden min-h-0 h-full">
        <div className={`flex h-full ${showSidePanel ? '' : 'justify-end'}`}>
          {/* Photo Grid */}
          <div className={`overflow-y-auto h-full ${showSidePanel ? 'flex-1' : 'w-full'}`}>
            <div className="container min-w-0 px-6 py-8 mx-auto h-full flex flex-col">
              <GalleryPhotoGrid
                items={filteredItems}
                isLoading={false}
                error={null}
                isSelecting={isSelecting}
                selectedImages={selectedImages}
                ratings={ratings}
                hiddenImages={hiddenImages}
                activeTab={activeTab}
                failedImages={failedImages}
                maxSelection={MAX_SELECTION}
                onImageClick={handleImageClick}
                onSelectionToggle={handleSelectionToggle}
                onRate={handleRateImage}
                onHide={handleHideImage}
                onUnhide={handleUnhideImage}
                onImageError={handleImageError}
                onRetry={loadGallery}
              />
            </div>
          </div>

          {/* Side Panel */}
          <GallerySelectionPanel
            isOpen={showSidePanel && isSelecting}
            selectedItems={selectedItems}
            ratings={ratings}
            failedImages={failedImages}
            onImageClick={handleImageClick}
            onRemoveFromSelection={imageId => setSelectedImages(prev => prev.filter(id => id !== imageId))}
            onSendPhotos={() => setShowMessageModal(true)}
          />
        </div>
      </div>

      {/* Forever Storage Modal */}
      {showForeverStorageModal && (
        <ForeverStorageProgressModal onClose={() => setShowForeverStorageModal(false)} galleryId={gallery.id} />
      )}

      {/* Image Modal */}
      {isImageModalOpen && selectedImage && (
        <GalleryImageModal
          image={selectedImage}
          onClose={() => {
            setIsImageModalOpen(false);
            setSelectedImage(null);
          }}
        />
      )}
    </div>
  );
}

export default function GalleryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading...</p>
          </div>
        </div>
      }
    >
      <GalleryViewContent />
    </Suspense>
  );
}
