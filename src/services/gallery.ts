import {
  GalleryWithItems,
  FolderInfo,
  CreateGalleryRequest,
  GalleryListResponse,
  GalleryDetailResponse,
  UpdateGalleryRequest,
} from "@/types/gallery";
import { generatedGalleries, getGeneratedGallery } from "@/app/[lang]/gallery/generated-gallery-data";
import { icpGalleryService, type GalleryData, type StoreGalleryResponse } from "./icp-gallery";
import { Principal } from "@dfinity/principal";

// Analytics tracking shim for future implementation
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const trackGalleryEvent = (event: string, _properties: Record<string, unknown> = {}) => {
  // console.log("Gallery Analytics:", { event, properties: _properties, timestamp: new Date().toISOString() });
  // TODO: Implement actual analytics tracking
  // This could send data to PostHog, Google Analytics, or other analytics services
};

// Mock data for development - now using generated data
const mockGalleries: GalleryWithItems[] = generatedGalleries;

const mockFolders: FolderInfo[] = [
  {
    name: "Vacation Photos",
    imageCount: 15,
    previewImages: ["/mock/gallery/Amazing_Bridge_05.webp", "/mock/gallery/Beautiful_Festival_39.webp"],
    hasImages: true,
  },
  {
    name: "Wedding 2024",
    imageCount: 25,
    previewImages: ["/mock/gallery/Beautiful_Wedding_16.webp", "/mock/gallery/Gorgeous_Celebration_31.webp"],
    hasImages: true,
  },
];

// Helper function to handle API responses
const handleApiResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

// Gallery service with real API integration
export const galleryService = {
  // Check if mock data should be used
  isMockDataEnabled: (useMockData: boolean = false): boolean => {
    return useMockData;
  },

  // List galleries
  listGalleries: async (
    page: number = 1,
    limit: number = 12,
    useMockData: boolean = false
  ): Promise<GalleryListResponse> => {
    trackGalleryEvent("gallery_list_requested", { page, limit });

    if (useMockData) {
      return {
        galleries: mockGalleries,
        hasMore: false,
        totalCount: mockGalleries.length,
      };
    }

    try {
      const response = await fetch(`/api/galleries?page=${page}&limit=${limit}`);
      return await handleApiResponse(response);
    } catch (error) {
      console.error("Error listing galleries:", error);
      throw new Error("Failed to load galleries");
    }
  },

  // Get single gallery
  getGallery: async (id: string, useMockData: boolean = false): Promise<GalleryDetailResponse> => {
    trackGalleryEvent("gallery_viewed", { galleryId: id });

    if (useMockData) {
      const gallery = getGeneratedGallery(id);
      if (!gallery) {
        throw new Error("Gallery not found");
      }

      return {
        gallery,
        items: gallery.items,
        itemsCount: gallery.imageCount,
      };
    }

    try {
      const response = await fetch(`/api/galleries/${id}`);
      return await handleApiResponse(response);
    } catch (error) {
      console.error("Error getting gallery:", error);
      throw new Error("Failed to load gallery");
    }
  },

  // Create gallery from folder
  createGalleryFromFolder: async (
    folderName: string,
    title?: string,
    description?: string,
    isPublic: boolean = false,
    useMockData: boolean = false
  ): Promise<GalleryWithItems> => {
    trackGalleryEvent("gallery_created_from_folder", { folderName, title });

    if (useMockData) {
      const newGallery: GalleryWithItems = {
        id: `mock-gallery-${Date.now()}`,
        title: title || `Gallery from ${folderName}`,
        description: description || `Gallery created from folder: ${folderName}`,
        isPublic,
        createdAt: new Date(),
        updatedAt: new Date(),
        ownerId: "mock-user-1",
        items: [],
        imageCount: 0,
        isOwner: true,
      };
      return newGallery;
    }

    try {
      const request: CreateGalleryRequest = {
        type: "from-folder",
        folderName,
        title: title || `Gallery from ${folderName}`,
        description: description || `Gallery created from folder: ${folderName}`,
        isPublic,
      };

      // console.log("Sending request to API:", request);

      const response = await fetch("/api/galleries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      // console.log("API response status:", response.status);

      const result = await handleApiResponse(response);
      // console.log("API response result:", result);
      // console.log("Gallery items count:", result.gallery?.items?.length || 0);
      return result.gallery;
    } catch (error) {
      console.error("Error creating gallery from folder:", error);
      throw new Error("Failed to create gallery from folder");
    }
  },

  // Create gallery from memories
  createGalleryFromMemories: async (
    memories: Array<{ id: string; type: string }>,
    title?: string,
    description?: string,
    isPublic: boolean = false,
    useMockData: boolean = false
  ): Promise<GalleryWithItems> => {
    trackGalleryEvent("gallery_created_from_memories", { memoriesCount: memories.length, title });

    if (useMockData) {
      const newGallery: GalleryWithItems = {
        id: `mock-gallery-${Date.now()}`,
        title: title || "Custom Gallery",
        description: description || "Gallery created from selected memories",
        isPublic,
        createdAt: new Date(),
        updatedAt: new Date(),
        ownerId: "mock-user-1",
        items: [],
        imageCount: memories.length,
        isOwner: true,
      };
      return newGallery;
    }

    try {
      const request: CreateGalleryRequest = {
        type: "from-memories",
        memories,
        title: title || "Custom Gallery",
        description: description || "Gallery created from selected memories",
        isPublic,
      };

      const response = await fetch("/api/galleries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      const result = await handleApiResponse(response);
      return result.gallery;
    } catch (error) {
      console.error("Error creating gallery from memories:", error);
      throw new Error("Failed to create gallery from memories");
    }
  },

  // Create gallery (legacy function - now uses the specific functions above)
  createGallery: async (request: CreateGalleryRequest, useMockData: boolean = false): Promise<GalleryWithItems> => {
    trackGalleryEvent("gallery_created", { type: request.type });

    if (useMockData) {
      const newGallery: GalleryWithItems = {
        id: `mock-gallery-${Date.now()}`,
        title: request.title,
        description: request.description || "",
        isPublic: request.isPublic || false,
        createdAt: new Date(),
        updatedAt: new Date(),
        ownerId: "mock-user-1",
        items: [],
        imageCount: 0,
        isOwner: true,
      };
      return newGallery;
    }

    try {
      const response = await fetch("/api/galleries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      const result = await handleApiResponse(response);
      return result.gallery;
    } catch (error) {
      console.error("Error creating gallery:", error);
      throw new Error("Failed to create gallery");
    }
  },

  // Update gallery
  updateGallery: async (
    id: string,
    updates: UpdateGalleryRequest,
    useMockData: boolean = false
  ): Promise<GalleryWithItems> => {
    trackGalleryEvent("gallery_updated", { galleryId: id, updates });

    if (useMockData) {
      const gallery = getGeneratedGallery(id);
      if (!gallery) {
        throw new Error("Gallery not found");
      }

      return {
        ...gallery,
        ...updates,
        updatedAt: new Date(),
      };
    }

    try {
      const response = await fetch(`/api/galleries/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      const result = await handleApiResponse(response);
      return result.gallery;
    } catch (error) {
      console.error("Error updating gallery:", error);
      throw new Error("Failed to update gallery");
    }
  },

  // Delete gallery
  deleteGallery: async (id: string, useMockData: boolean = false): Promise<void> => {
    trackGalleryEvent("gallery_deleted", { galleryId: id });

    if (useMockData) {
      // Mock deletion - just return success
      return;
    }

    try {
      const response = await fetch(`/api/galleries/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error deleting gallery:", error);
      throw new Error("Failed to delete gallery");
    }
  },

  // Share gallery
  shareGallery: async (
    id: string,
    shareData: { sharedWithType: string; sharedWithId: string },
    useMockData: boolean = false
  ): Promise<void> => {
    trackGalleryEvent("gallery_shared", { galleryId: id, shareData });

    if (useMockData) {
      // Mock sharing - just return success
      return;
    }

    try {
      const response = await fetch(`/api/galleries/${id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shareData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error sharing gallery:", error);
      throw new Error("Failed to share gallery");
    }
  },

  // Get folders with images for gallery creation
  getFoldersWithImages: async (useMockData: boolean = false): Promise<FolderInfo[]> => {
    trackGalleryEvent("folders_requested");

    if (useMockData) {
      return mockFolders;
    }

    try {
      // Note: This endpoint doesn't exist yet, so we'll need to create it
      // For now, we'll use a placeholder that returns empty array
      // TODO: Create `/api/galleries/folders` endpoint
      const response = await fetch("/api/galleries/folders");
      return await handleApiResponse(response);
    } catch (error) {
      console.error("Error getting folders:", error);
      // Return empty array instead of throwing for now
      return [];
    }
  },

  // ============================================================================
  // ICP INTEGRATION - "Store Forever" Feature
  // ============================================================================

  /**
   * Store a gallery forever in the ICP canister
   */
  storeGalleryForever: async (gallery: GalleryWithItems, ownerPrincipal?: string): Promise<StoreGalleryResponse> => {
    trackGalleryEvent("gallery_store_forever_requested", { galleryId: gallery.id });

    try {
      // Convert Web2 gallery to ICP format
      const galleryData: GalleryData = icpGalleryService.convertWeb2GalleryToICP(
        gallery as unknown as Record<string, unknown>,
        (gallery.items || []) as unknown as Record<string, unknown>[],
        ownerPrincipal
          ? ({ Principal: ownerPrincipal } as unknown as Principal)
          : ({ Principal: "anonymous" } as unknown as Principal)
      );

      // Store in ICP canister
      const result = await icpGalleryService.storeGalleryForever(galleryData);

      // If successful, update Web2 storage edges to reflect ICP storage
      if (result.success) {
        await updateStorageEdgesAfterICPSuccess(gallery);
      }

      trackGalleryEvent("gallery_store_forever_completed", {
        galleryId: gallery.id,
        success: result.success,
      });

      return result;
    } catch (error) {
      console.error("Error storing gallery forever:", error);
      trackGalleryEvent("gallery_store_forever_failed", {
        galleryId: gallery.id,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        success: false,
        message: `Failed to store gallery forever: ${error instanceof Error ? error.message : "Unknown error"}`,
        storage_location: { Failed: null },
      };
    }
  },

  /**
   * Get galleries stored in ICP canister
   */
  getICPUserGalleries: async (): Promise<GalleryWithItems[]> => {
    trackGalleryEvent("icp_galleries_requested");

    try {
      const icpGalleries = await icpGalleryService.getMyGalleries();

      // Convert ICP galleries to Web2 format for frontend compatibility
      const web2Galleries = icpGalleries.map((icpGallery) => ({
        id: icpGallery.id,
        title: icpGallery.title,
        description: icpGallery.description || "",
        isPublic: icpGallery.is_public,
        createdAt: new Date(Number(icpGallery.created_at)),
        updatedAt: new Date(Number(icpGallery.updated_at)),
        imageCount: icpGallery.memory_entries.length,
        isOwner: true, // ICP galleries are owned by the current user
        ownerId: icpGallery.owner_principal.toString(),
        items: icpGallery.memory_entries.map((entry) => ({
          id: entry.memory_id,
          position: entry.position,
          caption: entry.gallery_caption || "",
          isFeatured: entry.is_featured,
          memory: {
            id: entry.memory_id,
            title: `Memory ${entry.memory_id}`,
            url: "", // Will be populated when we load memory data
            thumbnail: "", // Will be populated when we load memory data
            type: "image",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        })),
      })) as unknown as GalleryWithItems[];

      trackGalleryEvent("icp_galleries_retrieved", { count: web2Galleries.length });
      return web2Galleries;
    } catch (error) {
      console.error("Error getting ICP galleries:", error);
      trackGalleryEvent("icp_galleries_failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw new Error(`Failed to get ICP galleries: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },

  /**
   * Check if user has a capsule registered for ICP storage
   */
  checkICPCapsuleStatus: async (): Promise<boolean> => {
    try {
      return await icpGalleryService.checkCapsuleStatus();
    } catch (error) {
      console.error("Error checking ICP capsule status:", error);
      return false;
    }
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Update Web2 storage edges after successful ICP storage
 * This ensures storage status badges show correct "ICP" or "BOTH" status
 */
async function updateStorageEdgesAfterICPSuccess(gallery: GalleryWithItems): Promise<void> {
  try {
    // Update storage edges for each memory in the gallery
    for (const item of gallery.items || []) {
      const memory = item.memory;

      // Update metadata edge
      await fetch("/api/storage/edges", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memoryId: memory.id,
          memoryType: memory.type,
          backend: "icp-canister",
          artifact: "metadata",
          present: true,
        }),
      });

      // Update asset edge
      await fetch("/api/storage/edges", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memoryId: memory.id,
          memoryType: memory.type,
          backend: "icp-canister",
          artifact: "asset",
          present: true,
        }),
      });
    }

    // console.log(`Updated storage edges for ${gallery.items?.length || 0} memories in gallery ${gallery.id}`);
  } catch (error) {
    console.error("Error updating storage edges after ICP success:", error);
    // Don't throw - this is a side effect, not critical to the main operation
  }
}
