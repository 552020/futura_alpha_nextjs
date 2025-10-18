'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuthGuard } from '@/utils/authentication';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Globe, Lock, Trash2, Maximize2, HardDrive, Eye, Check, Share2 } from 'lucide-react';
import { galleryService } from '@/services/gallery';
import { GalleryWithItems } from '@/types/gallery';
import { Memory } from '@/types/memory';
import { ForeverStorageProgressModal } from '@/components/galleries/forever-storage-progress-modal';

interface MemoryAsset {
  assetType: string;
  url: string;
  mimeType?: string;
}

interface GalleryItemMemory extends Memory {
  assets?: MemoryAsset[];
}
import { StorageStatusBadge, getGalleryStorageStatus } from '@/components/common/storage-status-badge';
import { GalleryStorageSummary } from '@/components/galleries/gallery-storage-summary';
import { GalleryImageModal } from '@/components/galleries/gallery-image-modal';
import { GallerySelectionBar } from '@/components/galleries/gallery-selection-bar';
import { GalleryPhotoGrid } from '@/components/galleries/gallery-photo-grid';
import { GallerySelectionPanel } from '@/components/galleries/gallery-selection-panel';
import { SendSelectionModal } from '@/components/galleries/share-modals/send-selection';
import { GalleryShareDialog } from '@/components/galleries/share-modals/gallery-share';
import { toast } from '@/components/ui/use-toast';
import { ToastContainer } from '@/components/ui/toast-container';

import { fatLogger } from '@/lib/logger';
// Mock data flag for development - same pattern as dashboard
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA_GALLERY === 'true';

function GalleryViewContent() {
  const { id } = useParams();
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
  const [businessEmail, setBusinessEmail] = useState<string | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);

  // Image modal state
  const [selectedImage, setSelectedImage] = useState<{
    url: string;
    title: string;
    id: string;
    type?: string;
    assets?: Array<{ assetType: string; url: string; mimeType?: string }>;
  } | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(-1);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);

  const MAX_SELECTION = 35;

  const loadGallery = useCallback(async () => {
    try {
      fatLogger.info('Loading gallery with ID', 'fe', { galleryId: id });
      setIsLoading(true);
      setError(null);
      const result = await galleryService.getGallery(id as string, USE_MOCK_DATA);
      fatLogger.info('Gallery data received', 'fe', { galleryId: id, itemCount: result.gallery?.items?.length || 0 });
      setGallery(result.gallery);

      // Get the current user's ID from the session
      const sessionResponse = await fetch('/api/auth/session');
      const session = await sessionResponse.json();
      const userId = session?.user?.id;

      if (!userId) {
        fatLogger.info('No user session found, skipping business relationship check', 'fe');
        return;
      }

      // Fetch business relationship to get the business email
      try {
        fatLogger.info('Fetching business relationship for user ID', 'fe', { userId });
        const response = await fetch(`/api/users/${userId}/business-relationship`);
        if (response.ok) {
          const data = await response.json();
          fatLogger.info('Business relationship API response', 'fe', {
            status: 'success',
            isClient: data.isClient,
            businessEmail: data.businessEmail,
            relationships: data.relationships || [],
          });

          if (data.isClient && data.businessEmail) {
            fatLogger.info('Using business email from relationship', 'fe', { businessEmail: data.businessEmail });
            setBusinessEmail(data.businessEmail);
          } else if (data.isBusiness) {
            fatLogger.info('User is a business. No business email to use from relationship.', 'fe');
          } else {
            fatLogger.info('No business relationship found.', 'fe');
          }
        } else {
          const error = await response.json().catch(() => ({}));
          fatLogger.error('Error response from business-relationship API', 'fe', {
            status: response.status,
            statusText: response.statusText,
            error,
          });
        }
      } catch (error) {
        fatLogger.error('Error fetching business relationship', 'fe', { error, userId });
      }
    } catch (err) {
      fatLogger.error('Error loading gallery', 'fe', { data: err as Error });
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

  const _toggleSelectionMode = () => {
    const newIsSelecting = !isSelecting;

    if (newIsSelecting) {
      // Entering selection mode
      setShowSidePanel(true);
    } else {
      // Exiting selection mode
      setSelectedImages([]);
      setActiveTab('all');
    }

    setIsSelecting(newIsSelecting);
  };

  // Filter items based on active tab and hidden state
  const filteredItems =
    gallery?.items.filter(item => {
      if (activeTab === 'hidden') {
        return hiddenImages.includes(item.memory.id);
      }
      // Always hide images that are in the hidden list when viewing 'all' tab
      if (hiddenImages.includes(item.memory.id)) {
        return false;
      }
      return true;
    }) || [];

  const handleRateImage = (imageId: string, rating: number) => {
    setRatings(prev => ({ ...prev, [imageId]: rating }));

    // Auto-select the image when rating it
    if (isSelecting && !selectedImages.includes(imageId) && selectedImages.length < MAX_SELECTION) {
      setSelectedImages(prev => [...prev, imageId]);
    }
  };

  const handleHideImage = (imageId: string) => {
    fatLogger.info('Hiding image', 'fe', { imageId });
    setHiddenImages(prev => {
      const newHidden = [...prev, imageId];
      fatLogger.info('New hidden images', 'fe', { hiddenCount: newHidden.length, imageIds: newHidden });
      return newHidden;
    });
    // Remove from selected images if hidden
    setSelectedImages(prev => {
      const filtered = prev.filter(id => id !== imageId);
      fatLogger.info('Removed from selection, new selection', 'fe', {
        selectedCount: filtered.length,
        imageIds: filtered,
      });
      return filtered;
    });
  };

  const handleUnhideImage = (imageId: string) => {
    fatLogger.info('Unhiding image', 'fe', { imageId });
    setHiddenImages(prev => {
      const newHidden = prev.filter(id => id !== imageId);
      fatLogger.info('New hidden images', 'fe', { hiddenCount: newHidden.length, imageIds: newHidden });
      return newHidden;
    });
    // Remove from selected images if unhidden
    setSelectedImages(prev => {
      const filtered = prev.filter(id => id !== imageId);
      fatLogger.info('Removed from selection, new selection', 'fe', {
        selectedCount: filtered.length,
        imageIds: filtered,
      });
      return filtered;
    });
  };

  const handleSendClick = () => {
    if (selectedImages.length === 0) return;
    setShowMessageModal(true);
  };

  const handleSendSelection = async (message: string): Promise<void> => {
    if (selectedImages.length === 0) return;

    const selectedItems =
      gallery?.items
        .filter(item => selectedImages.includes(item.memory.id) && item.memory.url)
        .map(item => ({
          url: item.memory.url!, // We know it's defined due to the filter above
          name: item.memory.title || `Photo ${item.memory.id}`,
          rating: ratings[item.memory.id] || 0,
        })) || [];

    try {
      // Get user info for the email
      const session = await fetch('/api/auth/session').then(res => res.json());
      const userName = session?.user?.name || 'a user';
      const userEmail = session?.user?.email || 'unknown@example.com';

      // Generate email content
      const { subject, html, text } = await import('@/utils/email/gallerySelectionTemplate').then(m =>
        m.renderGallerySelectionEmail({
          userName,
          images: selectedItems,
          message,
          timestamp: new Date().toISOString(),
          requestId: Math.random().toString(36).substring(2, 9),
        })
      );

      // Determine recipient email - use business email if available, otherwise fall back to env var
      const recipientEmail = businessEmail || process.env.NEXT_PUBLIC_PHOTOGRAPHER_EMAIL;

      fatLogger.info('Email sending details', 'fe', {
        source: businessEmail ? 'business-relationship' : 'NEXT_PUBLIC_PHOTOGRAPHER_EMAIL',
        recipientEmail,
        hasBusinessEmail: !!businessEmail,
        hasEnvEmail: !!process.env.NEXT_PUBLIC_PHOTOGRAPHER_EMAIL,
      });

      if (!recipientEmail) {
        const errorMsg =
          'No recipient email address available. Tried:' +
          `\n- Business email from relationship: ${businessEmail || 'Not available'}` +
          `\n- Environment variable: ${process.env.NEXT_PUBLIC_PHOTOGRAPHER_EMAIL || 'Not set'}`;
        fatLogger.error('No recipient email address available', 'fe', {
          businessEmail,
          envEmail: process.env.NEXT_PUBLIC_PHOTOGRAPHER_EMAIL,
          errorMsg,
        });
        throw new Error(errorMsg);
      }

      // Send using the generic email endpoint
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: recipientEmail,
          subject,
          text,
          html,
          templateName: 'gallery-selection',
          templateVars: {
            userName,
            userEmail,
            imageCount: selectedItems.length,
            message,
            galleryId: id,
            images: selectedItems.map(img => ({
              ...img,
              ratingStars: '★'.repeat(Math.round(img.rating || 0)) + '☆'.repeat(5 - Math.round(img.rating || 0)),
            })),
            appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://futura.now',
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send selection');
      }

      toast({
        title: 'Success',
        description: 'Your selection has been sent successfully!',
        variant: 'default',
      });

      // Clear selection after successful send
      setSelectedImages([]);
    } catch (error) {
      fatLogger.error('Error sending selection', 'fe', { error, selectedCount: selectedImages.length });
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send selection',
        variant: 'destructive',
      });
      throw error;
    }
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
      fatLogger.error('Error deleting gallery', 'fe', { data: err as Error });
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
        { isPublic: gallery.sharingStatus === 'public' ? false : true },
        USE_MOCK_DATA
      );
      setGallery(updatedGallery);
    } catch (err) {
      fatLogger.error('Error updating gallery privacy', 'fe', { data: err as Error });
      setError('Failed to update gallery privacy');
    } finally {
      setIsUpdating(false);
    }
  };

  // const _handleEditGallery = () => {
  //   // TODO: Navigate to edit page or open edit modal
  //   // fatLogger.info("Edit gallery:", gallery?.id);
  // };

  const handleStoreForever = () => {
    // TODO: Implement store forever functionality
    setShowForeverStorageModal(true);
  };

  const handleShare = () => {
    setShowShareDialog(true);
  };

  const getStoreForeverButtonState = () => {
    // TODO: Implement button state logic
    return {
      variant: 'default' as const,
      disabled: false,
      className: '',
      text: 'Store Forever',
    };
  };

  const handleImageClick = (
    item: {
      id: string;
      memory: {
        id: string;
        url?: string;
        title?: string;
        type?: string;
        assets?: { assetType: string; url: string; mimeType?: string }[];
      };
    },
    _index: number
  ) => {
    // Extract assets from the memory object if they exist
    const assets: MemoryAsset[] = (item.memory.assets || []).map(asset => ({
      assetType: asset.assetType,
      url: asset.url,
      mimeType: asset.mimeType,
    }));

    setSelectedImage({
      url: item.memory.url || '',
      title: item.memory.title || 'Image',
      id: item.memory.id,
      type: 'image', // Default to 'image' as the selection panel doesn't pass the type
      assets, // Pass the assets array
    });

    // Find the index of the item in the filtered items array
    const itemIndex = filteredItems.findIndex(i => i.memory.id === item.memory.id);
    setCurrentImageIndex(itemIndex);
    setIsImageModalOpen(true);
  };

  const handleNextImage = () => {
    if (currentImageIndex < filteredItems.length - 1) {
      const nextIndex = currentImageIndex + 1;
      const nextItem = filteredItems[nextIndex];
      // Extract assets from the memory object if they exist
      const assets: MemoryAsset[] =
        (nextItem.memory as GalleryItemMemory).assets?.map(asset => ({
          assetType: asset.assetType,
          url: asset.url,
          mimeType: asset.mimeType,
        })) || [];

      setSelectedImage({
        url: nextItem.memory.url || '',
        title: nextItem.memory.title || 'Image',
        id: nextItem.memory.id,
        type: nextItem.memory.type || 'image', // Default to 'image' if not specified
        assets, // Pass the assets array
      });
      setCurrentImageIndex(nextIndex);
    }
  };

  const handlePreviousImage = () => {
    if (currentImageIndex > 0) {
      const prevIndex = currentImageIndex - 1;
      const prevItem = filteredItems[prevIndex];
      // Extract assets from the memory object if they exist
      const assets: MemoryAsset[] =
        (prevItem.memory as GalleryItemMemory).assets?.map(asset => ({
          assetType: asset.assetType,
          url: asset.url,
          mimeType: asset.mimeType,
        })) || [];

      setSelectedImage({
        url: prevItem.memory.url || '',
        title: prevItem.memory.title || 'Image',
        id: prevItem.memory.id,
        type: prevItem.memory.type || 'image', // Default to 'image' if not specified
        assets, // Pass the assets array
      });
      setCurrentImageIndex(prevIndex);
    }
  };

  const hasNextImage = currentImageIndex < filteredItems.length - 1;
  const hasPreviousImage = currentImageIndex > 0;

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
          <p className="text-muted-foreground mb-6">
            This gallery doesn&apos;t exist or you don&apos;t have access to it
          </p>
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
                {!gallery.isOwner && (
                  <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:bg-blue-950">
                    <Share2 className="h-3 w-3 mr-1" />
                    Shared with you
                  </Badge>
                )}
                <StorageStatusBadge status={getGalleryStorageStatus(gallery)} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-normal">
                {gallery.sharingStatus === 'public' ? (
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

              {/* Only show privacy toggle for gallery owners */}
              {gallery.isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTogglePrivacy}
                  disabled={isUpdating}
                  className="flex items-center gap-2"
                >
                  {gallery.sharingStatus === 'public' ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  {gallery.sharingStatus === 'public' ? 'Make Private' : 'Make Public'}
                </Button>
              )}

              {/* Only show share button for gallery owners */}
              {gallery.isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  className="flex items-center gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={_toggleSelectionMode}
                className={`flex items-center gap-2 ${isSelecting ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800' : ''}`}
              >
                <Check className="h-4 w-4" />
                {isSelecting ? 'Cancel' : 'Select'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleFullScreenView} className="flex items-center gap-2">
                <Maximize2 className="h-4 w-4" />
                Full Screen
              </Button>
              
              {/* Only show store forever and delete for gallery owners */}
              {gallery.isOwner && (() => {
                const buttonState = getStoreForeverButtonState();
                return (
                  <>
                    <div className="relative group">
                      <Button
                        variant={buttonState.variant}
                        size="sm"
                        onClick={handleStoreForever}
                        disabled={buttonState.disabled}
                        className={buttonState.className}
                      >
                        <HardDrive className="h-4 w-4 mr-2" />
                        {buttonState.text}
                      </Button>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                        {gallery?.storageStatus?.status === 'stored_forever'
                          ? 'This gallery is already permanently stored on the Internet Computer'
                          : gallery?.storageStatus?.status === 'partially_stored'
                            ? 'Continue storing the remaining items on the Internet Computer'
                            : 'Store this gallery permanently on the Internet Computer blockchain'}
                      </div>
                    </div>
                    {gallery?.storageStatus?.status === 'stored_forever' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // TODO: Open ICP explorer or gallery viewer
                          // fatLogger.info("View gallery on ICP:", gallery.id);
                        }}
                        className="border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300 dark:hover:bg-purple-950"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View on ICP
                      </Button>
                    )}
                  </>
                );
              })()}
              
              {/* Only show delete button for gallery owners */}
              {gallery.isOwner && (
                <Button variant="outline" size="sm" onClick={handleDeleteGallery} disabled={isDeleting}>
                  {isDeleting ? (
                    <>
                      <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </>
                  )}
                </Button>
              )}
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
        onSendPhotos={handleSendClick}
      />

      {/* Main content area with side panel */}
      <div className="relative flex-1 overflow-hidden min-h-0 h-full">
        <div className={`flex h-full ${showSidePanel ? '' : 'justify-end'}`}>
          {/* Photo Grid */}
          <div className={`overflow-y-auto h-full ${showSidePanel ? 'flex-1' : 'w-full'}`}>
            <div className="container min-w-0 px-6 py-8 mx-auto h-full flex flex-col">
              <GalleryPhotoGrid
                items={filteredItems}
                isLoading={isLoading}
                error={error}
                isSelecting={isSelecting}
                selectedImages={selectedImages}
                ratings={ratings}
                hiddenImages={hiddenImages}
                activeTab={activeTab}
                failedImages={failedImages}
                _maxSelection={MAX_SELECTION}
                onImageClick={handleImageClick}
                onSelectionToggle={(imageId, checked) => {
                  if (checked) {
                    setSelectedImages(prev => (prev.length < MAX_SELECTION ? [...prev, imageId] : prev));
                  } else {
                    setSelectedImages(prev => prev.filter(id => id !== imageId));
                  }
                }}
                onRate={handleRateImage}
                onHide={handleHideImage}
                onUnhide={handleUnhideImage}
                onImageError={handleImageError}
                onRetry={loadGallery}
              />
            </div>
          </div>

          {/* Selection Panel */}
          {isSelecting && (
            <GallerySelectionPanel
              isOpen={showSidePanel}
              selectedItems={gallery?.items.filter(item => selectedImages.includes(item.memory.id)) || []}
              ratings={ratings}
              failedImages={failedImages}
              onImageClick={(item, index) => {
                handleImageClick(item, index);
              }}
              onRemoveFromSelection={imageId => {
                setSelectedImages(prev => prev.filter(id => id !== imageId));
              }}
            />
          )}
        </div>
      </div>

      {/* Forever Storage Modal */}
      {showForeverStorageModal && (
        <ForeverStorageProgressModal
          isOpen={showForeverStorageModal}
          onClose={() => setShowForeverStorageModal(false)}
          gallery={gallery}
          onSuccess={result => {
            fatLogger.info('Gallery stored successfully', 'fe', { result, galleryId: gallery?.id });
            setShowForeverStorageModal(false);
          }}
          onError={error => {
            fatLogger.error('Error storing gallery', 'fe', { error, galleryId: gallery?.id });
          }}
        />
      )}

      {/* Image Modal */}
      {isImageModalOpen && selectedImage && (
        <GalleryImageModal
          isOpen={isImageModalOpen}
          image={selectedImage}
          assets={selectedImage?.assets || []}
          onClose={() => {
            setIsImageModalOpen(false);
            setSelectedImage(null);
            setCurrentImageIndex(-1);
          }}
          onNext={handleNextImage}
          onPrevious={handlePreviousImage}
          hasNext={hasNextImage}
          hasPrevious={hasPreviousImage}
        />
      )}

      {/* Send Selection Modal */}
      <SendSelectionModal
        isOpen={showMessageModal}
        onClose={() => setShowMessageModal(false)}
        selectedCount={selectedImages.length}
        onSend={handleSendSelection}
      />

      {/* Share Gallery Dialog */}
      {gallery && (
        <GalleryShareDialog
          galleryId={gallery.id}
          galleryTitle={gallery.title}
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer />
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
