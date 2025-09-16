"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuthGuard } from "@/utils/authentication";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Share2, Edit, Globe, Lock, ImageIcon, Trash2, Maximize2, CheckSquare, Square } from "lucide-react";
import { galleryService } from "@/services/gallery";
import { GalleryWithItems } from "@/types/gallery";
import { StorageStatusBadge, getGalleryStorageStatus } from "@/components/common/storage-status-badge";
import { GalleryStorageSummary } from "@/components/galleries/gallery-storage-summary";
import { SelectionProvider, useSelection } from "@/contexts/selection-context";
import { SelectionToolbar } from "@/components/galleries/selection-toolbar";
import { SendToPhotographerModal } from "@/components/galleries/send-to-photographer-modal";
import { GalleryItem } from "@/components/galleries/gallery-item";
import { useToast } from "@/hooks/use-toast";
import { sendEmail } from "@/utils/mailgun";

// Mock data flag for development
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA_GALLERY === "true";

function GalleryViewContent() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthorized, isLoading: authLoading } = useAuthGuard();
  const { toast } = useToast();
  const { isSelectMode, toggleSelectMode, selectedItems, clearSelection } = useSelection();
  
  const [gallery, setGallery] = useState<GalleryWithItems | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSendToPhotographerModal, setShowSendToPhotographerModal] = useState(false);
  // const [isSending, setIsSending] = useState(false);

  const loadGallery = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await galleryService.getGallery(id as string, USE_MOCK_DATA);
      setGallery(result.gallery);
    } catch (err) {
      console.error("Error loading gallery:", err);
      setError("Failed to load gallery");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (isAuthorized && id) loadGallery();
  }, [isAuthorized, id, loadGallery]);

  // Auto-open modal if returning from II linking flow
  useEffect(() => {
    if (typeof window === "undefined") return;
    const shouldOpen = searchParams?.get("storeForever") === "1";
    if (shouldOpen) {
      // setShowForeverStorageModal(true); // removed because unused
      const url = new URL(window.location.href);
      url.searchParams.delete("storeForever");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams]);

  const handleImageClick = (itemId: string) => {
    if (isSelectMode) return;
    const index = gallery?.items.findIndex(item => item.id === itemId);
    if (index !== undefined && index !== -1) {
      router.push(`/gallery/${id}/preview?image=${index}`);
    }
  };

  const handleDeleteGallery = async () => {
    if (!gallery || !confirm("Are you sure you want to delete this gallery? This action cannot be undone.")) return;

    try {
      setIsDeleting(true);
      await galleryService.deleteGallery(gallery.id, USE_MOCK_DATA);
      router.push("/gallery");
    } catch (err) {
      console.error("Error deleting gallery:", err);
      setError("Failed to delete gallery");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFullScreenView = () => router.push(`/gallery/${id}/preview`);

  const handleSelectModeToggle = () => {
    toggleSelectMode();
    if (isSelectMode) clearSelection();
  };

  const handleSendToPhotographer = useCallback(async (email: string, message: string) => {
    if (!gallery) return;
    
    try {
      // setIsSending(true);
      const selectedItemsDetails = gallery.items
        .filter(item => selectedItems.has(item.id))
        .map(item => ({
          title: item.memory?.title || 'Untitled',
          url: item.memory?.url || ''
        }));

      await sendEmail({
        to: email,
        subject: `Gallery: ${gallery.title}`,
        html: `
          <h2>Gallery: ${gallery.title}</h2>
          ${message ? `<p>${message}</p>` : ''}
          <h3>Selected Items (${selectedItems.size}):</h3>
          <ul>
            ${selectedItemsDetails.map(item => 
              `<li>${item.title}: ${item.url || 'No URL available'}</li>`
            ).join('')}
          </ul>
        `
      });

      toast({
        title: "Success",
        description: `Sent ${selectedItems.size} items to photographer.`,
      });

      clearSelection();
      setShowSendToPhotographerModal(false);
      toggleSelectMode();
      
    } catch (error) {
      console.error('Error sending to photographer:', error);
      toast({
        title: "Error",
        description: "Failed to send images to photographer. Please try again.",
        variant: "destructive",
      });
    } finally {
      // setIsSending(false);
    }
  }, [gallery, selectedItems, clearSelection, toggleSelectMode, toast]);

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
      console.error("Error updating gallery privacy:", err);
      setError("Failed to update gallery privacy");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEditGallery = () => {
    // TODO: Navigate to edit page or open edit modal
  };

  const handleShareGallery = () => {
    // TODO: Implement share functionality
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading gallery...</p>
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
          <Button onClick={() => router.push('/login')}>Log in</Button>
        </div>
      </div>
    );
  }

  if (error || !gallery) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">Gallery not found</h2>
          <p className="text-muted-foreground mb-6">{error || "This gallery doesn't exist or you don't have permission to view it"}</p>
          <Button onClick={() => router.push('/gallery')}>Back to Galleries</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="m12 19-7-7 7-7"/>
                <path d="M19 12H5"/>
              </svg>
            </Button>
            <h1 className="text-xl font-semibold">{gallery.title}</h1>
            <Badge variant={gallery.isPublic ? 'default' : 'secondary'}>
              {gallery.isPublic ? 'Public' : 'Private'}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant={isSelectMode ? 'default' : 'outline'}
              size="sm" 
              onClick={handleSelectModeToggle}
              className={isSelectMode ? 'bg-primary text-primary-foreground' : ''}
            >
              {isSelectMode ? (
                <>
                  <CheckSquare className="h-4 w-4 mr-2" />
                  {selectedItems.size} Selected
                </>
              ) : (
                <>
                  <Square className="h-4 w-4 mr-2" />
                  Select
                </>
              )}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleFullScreenView}
              disabled={isSelectMode}
            >
              <Maximize2 className="h-4 w-4 mr-2" />
              Fullscreen
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleTogglePrivacy} 
              disabled={isUpdating || isSelectMode}
            >
              {isUpdating ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
              ) : gallery.isPublic ? (
                <Lock className="h-4 w-4 mr-2" />
              ) : (
                <Globe className="h-4 w-4 mr-2" />
              )}
              {gallery.isPublic ? 'Make Private' : 'Make Public'}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleShareGallery}
              disabled={isSelectMode}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleEditGallery}
              disabled={isSelectMode}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleDeleteGallery} 
              disabled={isDeleting || isSelectMode}
            >
              {isDeleting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Gallery info */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">{gallery.title}</h2>
              {gallery.description && (
                <p className="text-gray-600 dark:text-gray-400 mt-1">{gallery.description}</p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <StorageStatusBadge status={getGalleryStorageStatus(gallery)} />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {gallery.items?.length || 0} items • {new Date(gallery.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <GalleryStorageSummary gallery={gallery} />
        </div>

        {/* Gallery grid */}
        {gallery.items && gallery.items.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {gallery.items.map((item) => (
              <div key={item.id} className="relative group">
                <GalleryItem
                  item={{
                    id: item.id,
                    url: item.memory?.url || '/placeholder.svg',
                    title: item.memory?.title,
                    description: item.memory?.description,
                    memory: item.memory ? {
                      id: item.memory.id,
                      type: item.memory.type
                    } : undefined
                  }}
                  onClick={handleImageClick}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <ImageIcon className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No images in this gallery</h3>
            <p className="text-gray-500 dark:text-gray-400">Upload some images to get started</p>
          </div>
        )}
      </main>
      
      <SelectionToolbar onSendToPhotographer={() => setShowSendToPhotographerModal(true)} />
      
      <SendToPhotographerModal
      isOpen={showSendToPhotographerModal}
      onClose={() => setShowSendToPhotographerModal(false)}
      onConfirm={handleSendToPhotographer}
      selectedCount={selectedItems.size}
    />

    </div>
  );
}

function GalleryViewPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading gallery...</p>
        </div>
      </div>
    }>
      <SelectionProvider>
        <GalleryViewContent />
      </SelectionProvider>
    </Suspense>
  );
}

export default GalleryViewPage;
