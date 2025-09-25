'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useAuthGuard } from '@/utils/authentication';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Share2,
  Edit,
  Globe,
  Lock,
  ImageIcon,
  Trash2,
  Eye,
  EyeOff,
  Maximize2,
  HardDrive,
  CheckSquare,
  X,
  Star,
  Check,
} from 'lucide-react';
import { galleryService } from '@/services/gallery';
import { GalleryWithItems } from '@/types/gallery';
import { ForeverStorageProgressModal } from '@/components/galleries/forever-storage-progress-modal';
import { StorageStatusBadge, getGalleryStorageStatus } from '@/components/common/storage-status-badge';
// import { MemoryStorageBadge } from '@/components/common/memory-storage-badge';
import { GalleryStorageSummary } from '@/components/galleries/gallery-storage-summary';
import { getBlurPlaceholder, IMAGE_SIZES } from '@/utils/image-utils';

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
  const [panelWidth, setPanelWidth] = useState(320);

  // Selection state
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [ratings, setRatings] = useState<{ [imageId: string]: number }>({});
  const [hiddenImages, setHiddenImages] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'hidden'>('all');
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [showForeverStorageModal, setShowForeverStorageModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ url: string; title: string } | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

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

  const handleEditGallery = () => {
    // TODO: Navigate to edit page or open edit modal
    console.log('Edit gallery:', gallery?.id);
  };

  const getStoreForeverButtonState = () => {
    if (!gallery) return { text: 'Store Forever', disabled: true, variant: 'outline' as const };

    // Check if gallery has storage status
    if (gallery.storageStatus) {
      switch (gallery.storageStatus.status) {
        case 'stored_forever':
          return {
            text: 'Already Stored',
            disabled: true,
            variant: 'secondary' as const,
            className:
              'border-green-200 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-300 dark:hover:bg-green-950',
          };
        case 'partially_stored':
          return {
            text: 'Continue Storing',
            disabled: false,
            variant: 'outline' as const,
            className:
              'border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-300 dark:hover:bg-orange-950',
          };
        case 'web2_only':
        default:
          return {
            text: 'Store Forever',
            disabled: false,
            variant: 'outline' as const,
            className:
              'border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950',
          };
      }
    }

    // Fallback for galleries without storage status
    return {
      text: 'Store Forever',
      disabled: false,
      variant: 'outline' as const,
      className:
        'border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950',
    };
  };

  const handleStoreForever = () => {
    setShowForeverStorageModal(true);
  };

  const handleForeverStorageSuccess = async () => {
    // Refresh gallery data to show updated storage status
    await loadGallery();
  };

  const handleForeverStorageError = (error: Error) => {
    console.error('Error storing gallery forever:', error);
    setError('Failed to store gallery forever');
  };

  const handleShareGallery = () => {
    // TODO: Implement share functionality
    console.log('Share gallery:', gallery?.id);
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading gallery...</p>
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

  if (error || !gallery) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">Gallery not found</h2>
          <p className="text-muted-foreground mb-6">{error || "This gallery doesn't exist"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4 min-w-0">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 min-w-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between min-w-0">
                <h1 className="text-2xl font-light">{gallery.title}</h1>
                <div className="flex items-center gap-2">
                  <div className="relative group">
                    <StorageStatusBadge status={getGalleryStorageStatus(gallery)} />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                      {gallery.storageStatus?.status === 'stored_forever'
                        ? 'Gallery stored permanently on Internet Computer'
                        : gallery.storageStatus?.status === 'partially_stored'
                          ? 'Gallery partially stored on Internet Computer'
                          : 'Gallery stored in standard database'}
                    </div>
                  </div>
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
                </div>
              </div>
              {gallery.description && <p className="text-muted-foreground text-sm mt-1">{gallery.description}</p>}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
              <Button variant="outline" size="sm" onClick={handleFullScreenView}>
                <Maximize2 className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button variant="outline" size="sm" onClick={handleShareGallery}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" size="sm" onClick={handleTogglePrivacy} disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Updating...
                  </>
                ) : gallery.isPublic ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Hide
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Publish
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={handleEditGallery}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant={isSelecting ? 'default' : 'outline'} size="sm" onClick={toggleSelectionMode}>
                {isSelecting ? (
                  <>
                    <X className="h-4 w-4 mr-2" />
                    Cancel Selection
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Select Photos
                  </>
                )}
              </Button>
              {(() => {
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
                          console.log('View gallery on ICP:', gallery.id);
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
            </div>
          </div>
        </div>
      </div>

      {/* Gallery Storage Summary */}
      {gallery && (
        <>
          <div className="container mx-auto px-6 py-4">
            <h1 className="text-2xl font-bold">{gallery.title}</h1>
            {gallery.description && <p className="text-muted-foreground">{gallery.description}</p>}
          </div>
          <GalleryStorageSummary gallery={gallery} onStoreForever={handleStoreForever} />
        </>
      )}

      {isSelecting && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-900/50">
          <div className="container mx-auto px-6 py-3 flex items-center justify-between">
            <div className="text-sm text-blue-800 dark:text-blue-200">
              {selectedImages.length} of {MAX_SELECTION} photos selected
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('all')}
                className={activeTab === 'all' ? 'bg-blue-100 dark:bg-blue-900' : ''}
              >
                All Photos
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('hidden')}
                className={activeTab === 'hidden' ? 'bg-blue-100 dark:bg-blue-900' : ''}
              >
                Hidden ({hiddenImages.length})
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowMessageModal(true)}
                disabled={selectedImages.length === 0}
              >
                <Check className="h-4 w-4 mr-2" />
                Send {selectedImages.length} Photos
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main content area with side panel */}
      <div className="relative flex-1 overflow-hidden min-h-0 h-full">
        <div className={`flex h-full ${showSidePanel ? '' : 'justify-end'}`}>
          {/* Photo Grid */}
          <div className={`overflow-y-auto h-full ${showSidePanel ? 'flex-1' : 'w-full'}`}>
            <div className="container min-w-0 px-6 py-8 mx-auto h-full flex flex-col">
              {(() => {
                if (isLoading) {
                  return (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="w-12 h-12 border-b-2 rounded-full animate-spin border-primary"></div>
                    </div>
                  );
                }

                if (error) {
                  return (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-destructive mb-4">{error}</p>
                        <Button onClick={loadGallery}>Retry</Button>
                      </div>
                    </div>
                  );
                }

                if (filteredItems.length === 0) {
                  return (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <h3 className="mb-2 text-xl font-semibold">No photos in this gallery yet</h3>
                        <p className="text-muted-foreground">Add photos to this gallery to see them here.</p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="flex-1 grid min-w-0 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredItems.map((item, index) => (
                      <div
                        key={item.id}
                        className={`min-w-0 aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity relative ${
                          selectedImages.includes(item.memory.id) ? 'ring-4 ring-blue-500' : ''
                        }`}
                        onClick={() => handleImageClick(item, index)}
                      >
                        {/* Selection checkbox */}
                        {isSelecting && (
                          <div className="absolute top-2 left-2 z-10">
                            <Checkbox
                              checked={selectedImages.includes(item.memory.id)}
                              onCheckedChange={checked => {
                                if (checked) {
                                  setSelectedImages(prev =>
                                    prev.length < MAX_SELECTION ? [...prev, item.memory.id] : prev
                                  );
                                } else {
                                  setSelectedImages(prev => prev.filter(id => id !== item.memory.id));
                                }
                              }}
                              onClick={e => e.stopPropagation()}
                              className="bg-white/90 border-white shadow-sm"
                            />
                          </div>
                        )}
                        {item.memory.url && !failedImages.has(item.memory.url) ? (
                          <div className="w-full h-full relative min-w-0">
                            <Image
                              src={item.memory.url}
                              alt={item.memory.title || `Photo ${index + 1}`}
                              fill
                              className="object-cover"
                              onError={() => handleImageError(item.memory.url!)}
                              sizes={IMAGE_SIZES.gallery}
                              placeholder="blur"
                              blurDataURL={getBlurPlaceholder()}
                            />
                          </div>
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center min-w-0">
                            <div className="flex flex-col items-center justify-center text-muted-foreground">
                              <ImageIcon className="h-16 w-16 mb-2" />
                              <span className="text-sm break-words">Photo {index + 1}</span>
                              {failedImages.has(item.memory.url!) && (
                                <span className="text-xs text-muted-foreground/70 mt-1 break-words">
                                  Failed to load
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Image actions overlay */}
                        <div
                          className={`absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex flex-col justify-between p-2 ${activeTab === 'hidden' ? 'opacity-100' : ''}`}
                        >
                          {/* Top bar */}
                          <div className="flex justify-between items-start">
                            {/* Memory Storage Status Badge - Commented out */}
                            {/* <MemoryStorageBadge
                              memoryId={item.memory.id}
                              memoryType={item.memory.type}
                              size="xs"
                              showTooltip={true}
                            /> */}

                            {/* Rating and Hidden indicator */}
                            <div className="flex items-center gap-1 ml-auto">
                              {activeTab === 'hidden' && (
                                <div className="bg-red-500/70 rounded-full px-2 py-1">
                                  <span className="text-xs text-white">Hidden</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1 bg-black/70 rounded-full px-2 py-1">
                                <Star className="h-3 w-3 text-yellow-400 fill-current" />
                                <span className="text-xs text-white">{ratings[item.memory.id] || 0}</span>
                              </div>
                            </div>
                          </div>

                          {/* Bottom bar */}
                          <div className="flex justify-between items-end">
                            {/* Hide/Unhide button */}
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                if (activeTab === 'hidden') {
                                  handleUnhideImage(item.memory.id);
                                } else {
                                  handleHideImage(item.memory.id);
                                }
                              }}
                              className="p-1.5 rounded-full bg-black/70 hover:bg-black/90 transition-colors"
                              title={activeTab === 'hidden' ? 'Unhide photo' : 'Hide photo'}
                            >
                              {activeTab === 'hidden' ? (
                                <Eye className="h-4 w-4 text-white" />
                              ) : (
                                <EyeOff className="h-4 w-4 text-white" />
                              )}
                            </button>

                            {/* Rating stars */}
                            <div className="flex items-center gap-0.5 bg-black/70 rounded-full px-2 py-1">
                              {[1, 2, 3, 4, 5].map(star => (
                                <button
                                  key={star}
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleRateImage(item.memory.id, star);
                                  }}
                                  className="p-0.5"
                                >
                                  <Star
                                    className={`h-4 w-4 ${
                                      star <= (ratings[item.memory.id] || 0)
                                        ? 'text-yellow-400 fill-current'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Side Panel */}
          {isSelecting && (
            <div
              className={`h-full border-l border-border bg-background/95 backdrop-blur-sm flex flex-col z-40 ${showSidePanel ? 'w-80' : 'w-0'}`}
              style={{
                width: showSidePanel ? `${panelWidth}px` : '0px',
                minWidth: '280px',
                maxWidth: '60%',
              }}
            >
              {/* Resize Handle */}
              <div
                className="absolute left-0 top-0 bottom-0 w-2 bg-border hover:bg-primary cursor-col-resize transition-colors z-50 -ml-1"
                onMouseDown={e => {
                  e.preventDefault();
                  const startX = e.clientX;
                  const startWidth = panelWidth;

                  const handleMouseMove = (e: MouseEvent) => {
                    const newWidth = Math.max(
                      280,
                      Math.min(window.innerWidth * 0.6, startWidth - (e.clientX - startX))
                    );
                    setPanelWidth(newWidth);
                  };

                  const handleMouseUp = () => {
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                  };

                  document.addEventListener('mousemove', handleMouseMove);
                  document.addEventListener('mouseup', handleMouseUp);
                }}
              />

              <div className="p-4 border-b border-border">
                <h3 className="font-medium text-center">Selected Photos ({selectedItems.length})</h3>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <div className="h-full flex flex-col">
                  <div className="flex-1 grid grid-cols-2 gap-2 auto-rows-max">
                    {selectedItems.map(item => (
                      <div
                        key={item.id}
                        className="relative aspect-square rounded-md overflow-hidden border border-border hover:ring-2 hover:ring-primary hover:ring-offset-1 transition-all"
                        onClick={() => handleImageClick(item, selectedItems.indexOf(item))}
                      >
                        {item.memory.url && !failedImages.has(item.memory.url) ? (
                          <Image
                            src={item.memory.url}
                            alt={item.memory.title || 'Selected photo'}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 50vw, 150px"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <ImageIcon className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <button
                          className="absolute top-1 right-1 p-1 rounded-full bg-destructive/80 hover:bg-destructive text-white"
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedImages(prev => prev.filter(id => id !== item.memory.id));
                          }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                        {/* Rating indicator */}
                        <div className="absolute bottom-1 left-1 bg-black/70 rounded-full px-2 py-1">
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-400 fill-current" />
                            <span className="text-xs text-white">{ratings[item.memory.id] || 0}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedItems.length === 0 && (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <p className="text-sm">Select photos to see them here</p>
                        <p className="text-xs mt-1 opacity-70">Click on photos in the gallery to select them</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-border">
                <Button
                  className="w-full"
                  onClick={() => setShowMessageModal(true)}
                  disabled={selectedItems.length === 0}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Send {selectedItems.length} Photo{selectedItems.length !== 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Modal */}
      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent className="max-w-4xl w-full p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>{selectedImage?.title}</DialogTitle>
          </DialogHeader>
          <div className="relative aspect-video w-full">
            {selectedImage?.url && (
              <Image
                src={selectedImage.url}
                alt={selectedImage.title}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 80vw"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Forever Storage Modal */}
      {gallery && (
        <ForeverStorageProgressModal
          isOpen={showForeverStorageModal}
          onClose={() => setShowForeverStorageModal(false)}
          gallery={gallery}
          onSuccess={handleForeverStorageSuccess}
          onError={handleForeverStorageError}
        />
      )}
    </div>
  );
}

export default function GalleryViewPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GalleryViewContent />
    </Suspense>
  );
}
