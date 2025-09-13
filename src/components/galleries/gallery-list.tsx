"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GalleryCard } from "./gallery-card";
import { GalleryWithItems } from "@/types/gallery";
import { galleryService } from "@/services/gallery";
import { AlertCircle, RefreshCw, Plus } from "lucide-react";

interface GalleryListProps {
  page?: number;
  limit?: number;
  useMockData?: boolean;
  showCreateButton?: boolean;
  onGalleryClick?: (gallery: GalleryWithItems) => void;
  onCreateGallery?: () => void;
  className?: string;
}

export function GalleryList({
  page = 1,
  limit = 12,
  useMockData = false,
  showCreateButton = false,
  onGalleryClick,
  onCreateGallery,
  className = "",
}: GalleryListProps) {
  const [galleries, setGalleries] = useState<GalleryWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(page);

  const loadGalleries = useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
      try {
        setIsLoading(true);
        setError(null);

        const result = await galleryService.listGalleries(pageNum, limit, useMockData);

        if (append) {
          setGalleries((prev) => [...prev, ...result.galleries]);
        } else {
          setGalleries(result.galleries);
        }

        setHasMore(result.galleries.length === limit);
        setCurrentPage(pageNum);
      } catch (err) {
        console.error("Error loading galleries:", err);
        setError(err instanceof Error ? err.message : "Failed to load galleries");
      } finally {
        setIsLoading(false);
      }
    },
    [limit, useMockData]
  );

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      loadGalleries(currentPage + 1, true);
    }
  };

  const handleRefresh = () => {
    loadGalleries(1, false);
  };

  useEffect(() => {
    loadGalleries(page, false);
  }, [page, limit, useMockData, loadGalleries]);

  if (error) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  if (isLoading && galleries.length === 0) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          {showCreateButton && <Skeleton className="h-10 w-32" />}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: limit }).map((_, index) => (
            <GalleryCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (galleries.length === 0 && !isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Galleries</h2>
          {showCreateButton && (
            <Button onClick={onCreateGallery}>
              <Plus className="h-4 w-4 mr-2" />
              Create Gallery
            </Button>
          )}
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                <Plus className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">No galleries yet</h3>
                <p className="text-muted-foreground">Create your first gallery to start organizing your memories.</p>
              </div>
              {showCreateButton && (
                <Button onClick={onCreateGallery} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Gallery
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold">Galleries</h2>
          <Badge variant="secondary">{galleries.length} galleries</Badge>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {showCreateButton && (
            <Button onClick={onCreateGallery}>
              <Plus className="h-4 w-4 mr-2" />
              Create Gallery
            </Button>
          )}
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {galleries.map((gallery) => (
          <GalleryCard key={gallery.id} gallery={gallery} onClick={() => onGalleryClick?.(gallery)} />
        ))}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center pt-6">
          <Button onClick={handleLoadMore} disabled={isLoading} variant="outline" size="lg">
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              "Load More Galleries"
            )}
          </Button>
        </div>
      )}

      {/* Loading More Indicator */}
      {isLoading && galleries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <GalleryCardSkeleton key={`loading-${index}`} />
          ))}
        </div>
      )}
    </div>
  );
}

// Skeleton component for gallery cards
function GalleryCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-0">
        <Skeleton className="h-48 w-full" />
      </CardHeader>
      <CardContent className="p-4 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex items-center space-x-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <div className="flex items-center space-x-2 w-full">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
          <div className="flex-1" />
          <Skeleton className="h-8 w-8" />
        </div>
      </CardFooter>
    </Card>
  );
}
