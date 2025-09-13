"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useAuthGuard } from "@/utils/authentication";
import { Button } from "@/components/ui/button";
import { galleryService } from "@/services/gallery";
import { GalleryWithItems } from "@/types/gallery";
import { GalleryTopBar } from "@/components/galleries/gallery-top-bar";
import RequireAuth from "@/components/auth/require-auth";
import { CreateGalleryModal } from "@/components/galleries/create-gallery-modal";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { ErrorState } from "@/components/common/error-state";
import { GalleryGrid } from "@/components/galleries/gallery-grid";

// Mock data flag for development
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA_GALLERY === "true";

export default function GalleryPage() {
  const params = useParams();
  const lang = params.lang as string;
  const { isAuthorized, isLoading: authLoading } = useAuthGuard();

  const [galleries, setGalleries] = useState<GalleryWithItems[]>([]);
  const [filteredGalleries, setFilteredGalleries] = useState<GalleryWithItems[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (isAuthorized) {
      loadGalleries();
    }
  }, [isAuthorized]);

  const loadGalleries = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await galleryService.listGalleries(1, 12, USE_MOCK_DATA);
      setGalleries(result.galleries);
      setFilteredGalleries(result.galleries);
    } catch (err) {
      console.error("Error loading galleries:", err);
      setError("Failed to load galleries");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGalleryClick = (gallery: GalleryWithItems) => {
    // Navigate to gallery view
    window.location.href = `/${lang}/gallery/${gallery.id}`;
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleGalleryCreated = (_galleryId: string) => {
    // Reload galleries to show the new one
    loadGalleries();
  };

  const handleFilteredGalleriesChange = (filtered: GalleryWithItems[]) => {
    setFilteredGalleries(filtered);
  };

  const handleViewModeChange = (mode: "grid" | "list") => {
    setViewMode(mode);
  };

  if (!isAuthorized || authLoading) {
    // Show loading spinner only while status is loading
    if (authLoading) {
      return <LoadingSpinner fullScreen text="Loading..." />;
    }

    // Show access denied for unauthenticated users
    return <RequireAuth />;
  }

  if (isLoading) {
    return <LoadingSpinner fullScreen text="Loading galleries..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Something went wrong"
        message={error}
        onRetry={loadGalleries}
        retryText="Try Again"
        fullScreen
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <div className="container mx-auto px-6 py-4">
        <GalleryTopBar
          galleries={galleries}
          onFilteredGalleriesChange={handleFilteredGalleriesChange}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          onCreateGallery={() => setShowCreateModal(true)}
        />
      </div>

      {/* Gallery Grid */}
      <div className="container mx-auto px-6">
        <GalleryGrid galleries={filteredGalleries} onGalleryClick={handleGalleryClick} viewMode={viewMode} />
      </div>

      {/* Create Gallery Modal */}
      <CreateGalleryModal
        trigger={<Button className="hidden">Create Gallery</Button>}
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onGalleryCreated={handleGalleryCreated}
      />
    </div>
  );
}
