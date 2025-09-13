"use client";

import { backendActor } from "@/ic/backend";
import { Identity } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";

// ============================================================================
// TYPES - Will be updated when declarations are regenerated
// ============================================================================

// Gallery types - matching backend declarations
export interface GalleryMemoryEntry {
  memory_id: string;
  position: number;
  gallery_caption: [] | [string]; // opt text in backend
  is_featured: boolean;
  gallery_metadata: string;
}

export interface Gallery {
  id: string;
  owner_principal: Principal;
  title: string;
  description: [] | [string]; // opt text in backend
  is_public: boolean;
  created_at: bigint;
  updated_at: bigint;
  storage_location: GalleryStorageLocation;
  memory_entries: GalleryMemoryEntry[];
  bound_to_neon: boolean;
}

export type GalleryStorageLocation =
  | { Web2Only: null }
  | { ICPOnly: null }
  | { Both: null }
  | { Migrating: null }
  | { Failed: null };

export interface GalleryData {
  gallery: Gallery;
  owner_principal: Principal;
}

export interface GalleryUpdateData {
  title?: string;
  description?: string;
  is_public?: boolean;
  memory_entries?: GalleryMemoryEntry[];
}

// Memory types
export interface MemoryInfo {
  name: string;
  memory_type: MemoryType;
  content_type: string;
  created_at: bigint;
  updated_at: bigint;
  uploaded_at: bigint;
  date_of_memory?: bigint;
}

export type MemoryType = { Note: null } | { Image: null } | { Document: null } | { Audio: null } | { Video: null };

export interface MemoryMetadataBase {
  date_of_memory?: string;
  size: bigint;
  people_in_memory?: string[];
  mime_type: string;
  original_name: string;
  uploaded_at: string;
  format?: string;
}

export interface ImageMetadata {
  base: MemoryMetadataBase;
  dimensions?: [number, number];
}

export type MemoryMetadata =
  | { Note: { base: MemoryMetadataBase; tags?: string[] } }
  | { Image: ImageMetadata }
  | { Document: { base: MemoryMetadataBase } }
  | {
      Audio: {
        base: MemoryMetadataBase;
        duration?: number;
        channels?: number;
        sample_rate?: number;
        bitrate?: number;
        format?: string;
      };
    }
  | { Video: { base: MemoryMetadataBase; width?: number; height?: number; duration?: number; thumbnail?: string } };

export type MemoryAccess =
  | { Private: null }
  | { Public: null }
  | { Custom: { groups: string[]; individuals: string[] } }
  | { Scheduled: { access: MemoryAccess; accessible_after: bigint } }
  | { EventTriggered: { access: MemoryAccess; trigger_event: string } };

// Sync types for gallery memory synchronization
export interface MemorySyncRequest {
  memory_id: string;
  memory_type: MemoryType;
  metadata: SimpleMemoryMetadata;
  asset_url: string; // URL to fetch asset from (e.g., Vercel Blob)
  expected_asset_hash: string; // Expected hash of the asset
  asset_size: bigint; // Size of the asset in bytes (matches backend)
}

export interface SimpleMemoryMetadata {
  title?: string;
  description?: string;
  tags: string[];
  created_at: bigint;
  updated_at: bigint;
  size?: bigint;
  content_type?: string;
  custom_fields: Record<string, string>;
}

export interface MemorySyncResult {
  memory_id: string;
  success: boolean;
  metadata_stored: boolean;
  asset_stored: boolean;
  message: string;
  error?: Error;
}

export interface BatchMemorySyncResponse {
  success: boolean;
  gallery_id: string;
  total_memories: number;
  successful_memories: number;
  failed_memories: number;
  results: MemorySyncResult[];
  message: string;
  error?: Error;
}

export type Error =
  | { Internal: string }
  | { NotFound: null }
  | { Unauthorized: null }
  | { InvalidArgument: string }
  | { ResourceExhausted: null }
  | { Conflict: string };

export interface BlobRef {
  kind: MemoryBlobKind;
  locator: string;
  hash: [] | [Uint8Array]; // opt blob in backend
}

export type MemoryBlobKind = { ICPCapsule: null } | { MemoryBlobKindExternal: null };

export interface MemoryData {
  blob_ref: BlobRef;
  data: [] | [Uint8Array]; // opt blob in backend
}

export interface Memory {
  id: string;
  info: MemoryInfo;
  metadata: MemoryMetadata;
  access: MemoryAccess;
  data: MemoryData;
}

// Response types
export interface StoreGalleryResponse {
  success: boolean;
  gallery_id?: string;
  icp_gallery_id?: string;
  message: string;
  storage_location: GalleryStorageLocation;
}

export interface UpdateGalleryResponse {
  success: boolean;
  gallery?: Gallery;
  message: string;
}

export interface DeleteGalleryResponse {
  success: boolean;
  message: string;
}

export interface MemoryOperationResponse {
  success: boolean;
  memory_id?: string;
  message: string;
}

export interface MemoryListResponse {
  success: boolean;
  memories: Memory[];
  message: string;
}

// ============================================================================
// ICP GALLERY SERVICE
// ============================================================================

export class ICPGalleryService {
  private identity?: Identity;

  constructor(identity?: Identity) {
    this.identity = identity;
  }

  // ============================================================================
  // GALLERY MANAGEMENT
  // ============================================================================

  /**
   * Store a gallery forever in the ICP canister
   */
  async storeGalleryForever(galleryData: GalleryData): Promise<StoreGalleryResponse> {
    try {
      const actor = await backendActor(this.identity);

      // Call the real backend endpoint
      const result = await actor.galleries_create(galleryData);

      // Handle Candid result union type
      if ("Err" in result) {
        const error = result.Err;
        const errorMessage =
          "Internal" in error
            ? error.Internal
            : "InvalidArgument" in error
            ? error.InvalidArgument
            : "Conflict" in error
            ? error.Conflict
            : "Unknown error";
        return {
          success: false,
          message: `Failed to create gallery: ${errorMessage}`,
          storage_location: { Failed: null },
        };
      }

      const gallery = result.Ok;
      return {
        success: true,
        gallery_id: gallery.id,
        icp_gallery_id: gallery.id,
        message: "Gallery created successfully",
        storage_location: gallery.storage_location,
      };
    } catch (error) {
      console.error("Error storing gallery forever:", error);
      return {
        success: false,
        message: `Failed to store gallery: ${error instanceof Error ? error.message : "Unknown error"}`,
        storage_location: { Failed: null },
      };
    }
  }

  /**
   * Get all galleries for the current user
   */
  async getMyGalleries(): Promise<Gallery[]> {
    try {
      // const actor = await backendActor(this.identity);

      // Call the real backend endpoint
      // const galleries = await actor.get_my_galleries();

      // Placeholder implementation until backend is ready
      // console.log("Get my galleries - placeholder");
      return [];
    } catch (error) {
      console.error("Error getting user galleries:", error);
      throw new Error(`Failed to get galleries: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Get a specific gallery by ID
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getGalleryById(_galleryId: string): Promise<Gallery | null> {
    try {
      // const actor = await backendActor(this.identity);

      // TODO: Update this call when declarations are regenerated
      // const gallery = await actor.get_gallery_by_id(galleryId);

      // Placeholder implementation
      // console.log("Get gallery by ID:", galleryId);

      return null;
    } catch (error) {
      console.error("Error getting gallery:", error);
      throw new Error(`Failed to get gallery: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Update a gallery in the ICP canister
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async updateGallery(_galleryId: string, _updateData: GalleryUpdateData): Promise<UpdateGalleryResponse> {
    try {
      // const actor = await backendActor(this.identity);

      // TODO: Update this call when declarations are regenerated
      // const result = await actor.update_gallery(galleryId, updateData);

      // Placeholder implementation
      // console.log("Update gallery:", galleryId, updateData);

      return {
        success: true,
        message: "Gallery updated successfully",
      };
    } catch (error) {
      console.error("Error updating gallery:", error);
      return {
        success: false,
        message: `Failed to update gallery: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Delete a gallery from the ICP canister
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async deleteGallery(_galleryId: string): Promise<DeleteGalleryResponse> {
    try {
      // const actor = await backendActor(this.identity);

      // TODO: Update this call when declarations are regenerated
      // const result = await actor.delete_gallery(galleryId);

      // Placeholder implementation
      // console.log("Delete gallery:", galleryId);

      return {
        success: true,
        message: "Gallery deleted successfully",
      };
    } catch (error) {
      console.error("Error deleting gallery:", error);
      return {
        success: false,
        message: `Failed to delete gallery: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  // ============================================================================
  // MEMORY MANAGEMENT
  // ============================================================================

  /**
   * Create a new memory
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async createMemory(_memoryData: MemoryData): Promise<MemoryOperationResponse> {
    try {
      // const actor = await backendActor(this.identity);

      // Call the real backend endpoint
      // const result = await actor.memories_create(capsuleId, memoryData);

      // Placeholder implementation
      // console.log("Add memory to capsule:", memoryData);

      return {
        success: true,
        memory_id: `memory_${Date.now()}`,
        message: "Memory added successfully to capsule",
      };
    } catch (error) {
      console.error("Error adding memory to capsule:", error);
      return {
        success: false,
        message: `Failed to add memory: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Get a memory by ID
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getMemory(_memoryId: string): Promise<Memory | null> {
    try {
      // const actor = await backendActor(this.identity);

      // TODO: Update this call when declarations are regenerated
      // const memory = await actor.memories_read(memoryId);

      // Placeholder implementation
      // console.log("Get memory from capsule:", memoryId);

      return null;
    } catch (error) {
      console.error("Error getting memory:", error);
      throw new Error(`Failed to get memory: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Update a memory by ID
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async updateMemory(_memoryId: string, _updates: Record<string, unknown>): Promise<MemoryOperationResponse> {
    try {
      // const actor = await backendActor(this.identity);

      // TODO: Update this call when declarations are regenerated
      // const result = await actor.memories_update(memoryId, updates);

      // Placeholder implementation
      // console.log("Update memory in capsule:", memoryId, updates);

      return {
        success: true,
        message: "Memory updated successfully",
      };
    } catch (error) {
      console.error("Error updating memory:", error);
      return {
        success: false,
        message: `Failed to update memory: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Delete a memory by ID
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async deleteMemory(_memoryId: string): Promise<MemoryOperationResponse> {
    try {
      // const actor = await backendActor(this.identity);

      // TODO: Update this call when declarations are regenerated
      // const result = await actor.memories_delete(memoryId);

      // Placeholder implementation
      // console.log("Delete memory from capsule:", memoryId);

      return {
        success: true,
        message: "Memory deleted successfully",
      };
    } catch (error) {
      console.error("Error deleting memory:", error);
      return {
        success: false,
        message: `Failed to delete memory: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * List all memories in a specific capsule
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async listMemories(capsuleId: string): Promise<MemoryListResponse> {
    // TODO: Implement when backend is ready
    // Currently placeholder - capsuleId will be used when implemented
    try {
      // const actor = await backendActor(this.identity);

      // TODO: Update this call when declarations are regenerated
      // const result = await actor.memories_list(capsuleId);

      // Placeholder implementation
      // console.log("List memories for capsule:", capsuleId);

      return {
        success: true,
        memories: [],
        message: "Memories retrieved successfully",
      };
    } catch (error) {
      console.error("Error listing memories:", error);
      return {
        success: false,
        memories: [],
        message: `Failed to list memories: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Convert Web2 gallery data to ICP format
   */
  convertWeb2GalleryToICP(
    web2Gallery: Record<string, unknown>,
    web2Items: Record<string, unknown>[],
    ownerPrincipal: Principal
  ): GalleryData {
    const memoryEntries: GalleryMemoryEntry[] = web2Items.map((item, index) => ({
      memory_id: (item.memory_id as string) || `memory_${index}`,
      position: (item.position as number) || index,
      gallery_caption: item.caption ? [item.caption as string] : [],
      is_featured: (item.is_featured as boolean) || false,
      gallery_metadata: JSON.stringify(item.metadata || {}),
    }));

    const gallery: Gallery = {
      id: String(web2Gallery.id || "unknown"),
      owner_principal: ownerPrincipal,
      title: String(web2Gallery.title || "Untitled Gallery"),
      description: web2Gallery.description ? [String(web2Gallery.description)] : [],
      is_public: Boolean(web2Gallery.is_public),
      created_at: BigInt((web2Gallery.created_at as number) || Date.now()),
      updated_at: BigInt((web2Gallery.updated_at as number) || Date.now()),
      storage_location: { Web2Only: null },
      memory_entries: memoryEntries,
      bound_to_neon: false, // Default to false for Web2 galleries
    };

    return {
      gallery,
      owner_principal: ownerPrincipal,
    };
  }

  /**
   * Check if user has a capsule registered
   */
  async checkCapsuleStatus(): Promise<boolean> {
    try {
      // const actor = await backendActor(this.identity);

      // TODO: Update this call when declarations are regenerated
      // const userInfo = await actor.get_user();

      // Placeholder implementation
      // console.log("Check capsule status");

      return true; // Assume user has capsule for now
    } catch (error) {
      console.error("Error checking capsule status:", error);
      return false;
    }
  }
}

// ============================================================================
// DEFAULT INSTANCE
// ============================================================================

// Create a default instance that can be used throughout the app
export const icpGalleryService = new ICPGalleryService();

// Export a function to create an instance with a specific identity
export function createICPGalleryService(identity?: Identity): ICPGalleryService {
  return new ICPGalleryService(identity);
}
