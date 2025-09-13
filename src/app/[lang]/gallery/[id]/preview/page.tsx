"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useAuthGuard } from "@/utils/authentication";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, Download, Share2, HardDrive } from "lucide-react";
import { galleryService } from "@/services/gallery";
import { GalleryWithItems } from "@/types/gallery";
import { ForeverStorageProgressModal } from "@/components/galleries/forever-storage-progress-modal";
import { MemoryStorageBadge } from "@/components/common/memory-storage-badge";
import { useToast } from "@/hooks/use-toast";

// Gallery Hero Cover Component
function GalleryHeroCover({
  gallery,
  failedImages,
  onImageError,
}: {
  gallery: GalleryWithItems;
  failedImages: Set<string>;
  onImageError: (url: string) => void;
}) {
  return (
    <div className="relative w-full h-screen bg-black">
      {/* Cover image */}
      {gallery.items[0]?.memory.url && !failedImages.has(gallery.items[0].memory.url) ? (
        <Image
          src={gallery.items[0].memory.url}
          alt={gallery.items[0].memory.title || "Gallery Cover"}
          fill
          className="object-cover"
          onError={() => onImageError(gallery.items[0].memory.url!)}
          sizes="100vw"
          priority
        />
      ) : (
        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="h-32 w-32 mx-auto mb-4 bg-gray-700 rounded-lg flex items-center justify-center">
              <span className="text-4xl">📷</span>
            </div>
            <h1 className="text-2xl font-semibold mb-2">{gallery.title}</h1>
            {gallery.description && <p className="text-gray-300">{gallery.description}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// Sticky Header Component (separate from hero)
function StickyHeader({
  gallery,
  onExitPreview,
  onPublish,
  onDownload,
  onShare,
  onStoreForever,
  isPublishing,
  isDownloading,
  isSharing,
  isStoringForever,
  selectedImageIndex,
}: {
  gallery: GalleryWithItems;
  onExitPreview: () => void;
  onPublish: () => void;
  onDownload: () => void;
  onShare: () => void;
  onStoreForever: () => void;
  isPublishing: boolean;
  isDownloading: boolean;
  isSharing: boolean;
  isStoringForever: boolean;
  selectedImageIndex: number | null;
}) {
  return (
    <div className="sticky top-0 -mt-16 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur border-b border-gray-200 dark:border-gray-800">
      <div className="container mx-auto h-16 px-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="text-gray-900 dark:text-white min-w-0">
            <h1 className="text-lg font-semibold truncate">{gallery.title}</h1>
            {gallery.description && (
              <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-1">{gallery.description}</p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onExitPreview}
              className="text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Exit Preview
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onPublish}
              disabled={isPublishing}
              className="text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              {isPublishing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  {gallery.isPublic ? "Hiding..." : "Publishing..."}
                </>
              ) : gallery.isPublic ? (
                "Hide"
              ) : (
                "Publish"
              )}
            </Button>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDownload}
            disabled={isDownloading || selectedImageIndex === null}
            className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {isDownloading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                Downloading...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onShare}
            disabled={isSharing}
            className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {isSharing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                Sharing...
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onStoreForever}
            disabled={isStoringForever}
            className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950"
          >
            {isStoringForever ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                Storing...
              </>
            ) : (
              <>
                <HardDrive className="h-4 w-4 mr-2" />
                Store Forever
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Gallery Grid Component
function GalleryGrid({
  gallery,
  failedImages,
  onImageClick,
  onImageError,
}: {
  gallery: GalleryWithItems;
  failedImages: Set<string>;
  onImageClick: (index: number) => void;
  onImageError: (url: string) => void;
}) {
  return (
    <div className="px-6 pb-8">
      {gallery.items && gallery.items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {gallery.items.map((item, index) => (
            <div
              key={item.id}
              className="aspect-square bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity relative"
              onClick={() => onImageClick(index)}
            >
              {item.memory.url && !failedImages.has(item.memory.url) ? (
                <div className="w-full h-full relative">
                  <Image
                    src={item.memory.url}
                    alt={item.memory.title || `Photo ${index + 1}`}
                    fill
                    className="object-cover"
                    onError={() => onImageError(item.memory.url!)}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>
              ) : (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                  <div className="flex flex-col items-center justify-center text-gray-400">
                    <div className="h-16 w-16 mb-2 bg-gray-700 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">📷</span>
                    </div>
                    <span className="text-sm">Photo {index + 1}</span>
                    {failedImages.has(item.memory.url!) && (
                      <span className="text-xs text-gray-500 mt-1">Failed to load</span>
                    )}
                  </div>
                </div>
              )}

              {/* Memory Storage Status Badge */}
              <div className="absolute top-2 right-2 z-10">
                <MemoryStorageBadge
                  memoryId={item.memory.id}
                  memoryType={item.memory.type}
                  size="xs"
                  showTooltip={true}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-white">
          <h3 className="text-xl font-semibold mb-2">No photos in this gallery yet</h3>
          <p className="text-gray-300 mb-6">Add photos to this gallery to see them here.</p>
        </div>
      )}
    </div>
  );
}

const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA_GALLERY === "true";

function GalleryPreviewContent() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthorized, isLoading: authLoading } = useAuthGuard();
  const { toast } = useToast();
  const [gallery, setGallery] = useState<GalleryWithItems | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [showCover] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showForeverStorageModal, setShowForeverStorageModal] = useState(false);

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
    if (isAuthorized && id) {
      loadGallery();
    }
  }, [isAuthorized, id, loadGallery]);

  // Auto-open modal if returning from II linking flow
  useEffect(() => {
    if (typeof window === "undefined") return;
    const shouldOpen = searchParams?.get("storeForever") === "1";
    if (shouldOpen) {
      setShowForeverStorageModal(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("storeForever");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams]);

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
  };

  const handleCloseLightbox = useCallback(() => {
    setSelectedImageIndex(null);
  }, []);

  const handlePreviousImage = useCallback(() => {
    if (selectedImageIndex !== null && gallery) {
      setSelectedImageIndex(selectedImageIndex > 0 ? selectedImageIndex - 1 : gallery.items.length - 1);
    }
  }, [selectedImageIndex, gallery]);

  const handleNextImage = useCallback(() => {
    if (selectedImageIndex !== null && gallery) {
      setSelectedImageIndex(selectedImageIndex < gallery.items.length - 1 ? selectedImageIndex + 1 : 0);
    }
  }, [selectedImageIndex, gallery]);

  const handleImageError = useCallback((imageUrl: string) => {
    setFailedImages((prev) => new Set(prev).add(imageUrl));
  }, []);

  const handleExitPreview = useCallback(() => {
    router.push(`/gallery/${id}`);
  }, [router, id]);

  const handlePublish = async () => {
    if (!gallery) return;

    try {
      setIsPublishing(true);
      await galleryService.updateGallery(gallery.id, { isPublic: !gallery.isPublic });

      // Update local state
      setGallery((prev) => (prev ? { ...prev, isPublic: !prev.isPublic } : null));

      // Show success message (you can add toast notification here)
      // console.log(`Gallery ${gallery.isPublic ? "hidden" : "published"} successfully`);
      toast({
        title: "Success",
        description: `Gallery ${gallery.isPublic ? "hidden" : "published"} successfully`,
      });
    } catch (error) {
      console.error("Failed to update gallery:", error);
      // Show error message (you can add toast notification here)
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDownload = async () => {
    if (!gallery || selectedImageIndex === null) return;

    try {
      setIsDownloading(true);
      const currentImage = gallery.items[selectedImageIndex];
      if (currentImage?.memory.url) {
        // Create a temporary link and trigger download
        const link = document.createElement("a");
        link.href = currentImage.memory.url;
        link.download = currentImage.memory.title || `gallery-image-${selectedImageIndex + 1}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error("Failed to download image:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!gallery) return;

    try {
      setIsSharing(true);
      await galleryService.shareGallery(gallery.id, {
        sharedWithType: "public",
        sharedWithId: "public",
      });

      // Show success message (you can add toast notification here)
      // console.log("Gallery shared successfully");
      toast({
        title: "Success",
        description: "Gallery shared successfully",
      });
    } catch (error) {
      console.error("Failed to share gallery:", error);
      // Show error message (you can add toast notification here)
    } finally {
      setIsSharing(false);
    }
  };

  const handleStoreForever = () => {
    setShowForeverStorageModal(true);
  };

  const handleForeverStorageSuccess = async () => {
    toast({
      title: "Success!",
      description: "Gallery stored forever on ICP successfully!",
    });
    // Refresh gallery data to show updated storage status
    await loadGallery();
  };

  const handleForeverStorageError = (error: Error) => {
    console.error("Error storing gallery forever:", error);
    setError("Failed to store gallery forever");
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedImageIndex !== null) {
        switch (e.key) {
          case "Escape":
            handleCloseLightbox();
            break;
          case "ArrowLeft":
            handlePreviousImage();
            break;
          case "ArrowRight":
            handleNextImage();
            break;
        }
      } else {
        switch (e.key) {
          case "Escape":
            handleExitPreview();
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedImageIndex, handleCloseLightbox, handlePreviousImage, handleNextImage, handleExitPreview]);

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-slate-950">
        <div className="text-center text-gray-900 dark:text-white">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading gallery...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-slate-950">
        <div className="text-center text-gray-900 dark:text-white">
          <h2 className="text-2xl font-semibold mb-4">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">You need to be logged in to view this gallery</p>
          <Button onClick={handleExitPreview} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (error || !gallery) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center text-white">
          <h2 className="text-2xl font-semibold mb-4">Error</h2>
          <p className="text-gray-300 mb-6">{error || "Gallery not found"}</p>
          <Button onClick={handleExitPreview} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-950">
      {/* Hero Cover Section */}
      {showCover && gallery && gallery.items.length > 0 && (
        <GalleryHeroCover gallery={gallery} failedImages={failedImages} onImageError={handleImageError} />
      )}

      {/* Sticky Header */}
      <StickyHeader
        gallery={gallery}
        onExitPreview={handleExitPreview}
        onPublish={handlePublish}
        onDownload={handleDownload}
        onShare={handleShare}
        onStoreForever={handleStoreForever}
        isPublishing={isPublishing}
        isDownloading={isDownloading}
        isSharing={isSharing}
        isStoringForever={false}
        selectedImageIndex={selectedImageIndex}
      />

      {/* Photo Grid */}
      <div className="pt-16">
        <GalleryGrid
          gallery={gallery}
          failedImages={failedImages}
          onImageClick={handleImageClick}
          onImageError={handleImageError}
        />
      </div>

      {/* Lightbox */}
      {selectedImageIndex !== null && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Close button */}
            <button
              onClick={handleCloseLightbox}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10 p-2"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Navigation buttons */}
            <button
              onClick={handlePreviousImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 z-10 p-2"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
            <button
              onClick={handleNextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 z-10 p-2"
            >
              <ChevronRight className="h-8 w-8" />
            </button>

            {/* Image */}
            <div className="max-w-5xl max-h-full p-8">
              {gallery.items[selectedImageIndex]?.memory.url &&
              !failedImages.has(gallery.items[selectedImageIndex].memory.url!) ? (
                <Image
                  src={gallery.items[selectedImageIndex].memory.url}
                  alt={gallery.items[selectedImageIndex].memory.title || `Photo ${selectedImageIndex + 1}`}
                  width={1200}
                  height={800}
                  className="max-w-full max-h-full object-contain"
                  sizes="90vw"
                />
              ) : (
                <div className="bg-gray-800 rounded-lg p-8 text-center">
                  <div className="h-32 w-32 mx-auto mb-4 bg-gray-700 rounded-lg flex items-center justify-center">
                    <span className="text-4xl">📷</span>
                  </div>
                  <p className="text-lg text-gray-300">
                    Photo {selectedImageIndex + 1} of {gallery.items.length}
                  </p>
                </div>
              )}
            </div>

            {/* Image counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm">
              {selectedImageIndex + 1} of {gallery.items.length}
            </div>
          </div>
        </div>
      )}

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

export default function GalleryPreviewPage() {
  return <GalleryPreviewContent />;
}
