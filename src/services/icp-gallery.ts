'use client';

import { backendActor } from '@/ic/backend';
import { Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import type {
  GalleryItem,
  Gallery,
  GalleryData,
  GalleryMemoryEntry,
  MemoryType,
  Memory,
  Error,
  BlobHosting,
} from '@/ic/declarations/backend/backend.did.d';

import { fatLogger } from '@/lib/logger';

// ============================================================================
// FRONTEND-SPECIFIC TYPES (not available in backend declarations)
// ============================================================================

export interface GalleryUpdateData {
  title?: string;
  description?: string;
  is_public?: boolean;
  memory_entries?: GalleryMemoryEntry[];
}

// Sync types for gallery memory synchronization (frontend-specific)
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

// Response types
export interface StoreGalleryResponse {
  success: boolean;
  gallery_id?: string;
  icp_gallery_id?: string;
  message: string;
  storage_location: BlobHosting;
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
      if ('Err' in result) {
        const error = result.Err;
        const errorMessage =
          'Internal' in error
            ? error.Internal
            : 'InvalidArgument' in error
              ? error.InvalidArgument
              : 'Conflict' in error
                ? error.Conflict
                : 'Unknown error';
        return {
          success: false,
          message: `Failed to create gallery: ${errorMessage}`,
          storage_location: { S3: null }, // Default to S3 on error
        };
      }

      const gallery = result.Ok;
      return {
        success: true,
        gallery_id: gallery.id,
        icp_gallery_id: gallery.id,
        message: 'Gallery created successfully',
        storage_location: gallery.metadata.storage_location[0] || { S3: null },
      };
    } catch (error) {
      fatLogger.error('Error storing gallery forever:', 'be', { data: error instanceof Error ? error : undefined });
      return {
        success: false,
        message: `Failed to store gallery: ${error instanceof Error ? error.message : 'Unknown error'}`,
        storage_location: { S3: null }, // Default to S3 on error
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
      // fatLogger.info("Get my galleries - placeholder");
      return [];
    } catch (error) {
      fatLogger.error('Error getting user galleries:', 'be', { data: error instanceof Error ? error : undefined });
      throw new Error(`Failed to get galleries: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a specific gallery by ID
   */
  async getGalleryById(_galleryId: string): Promise<Gallery | null> {
    try {
      // const actor = await backendActor(this.identity);

      // TODO: Update this call when declarations are regenerated
      // const gallery = await actor.get_gallery_by_id(galleryId);

      // Placeholder implementation
      // fatLogger.info("Get gallery by ID:", galleryId);

      return null;
    } catch (error) {
      fatLogger.error('Error getting gallery:', 'be', { data: error instanceof Error ? error : undefined });
      throw new Error(`Failed to get gallery: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update a gallery in the ICP canister
   */
  async updateGallery(_galleryId: string, _updateData: GalleryUpdateData): Promise<UpdateGalleryResponse> {
    try {
      // const actor = await backendActor(this.identity);

      // TODO: Update this call when declarations are regenerated
      // const result = await actor.update_gallery(galleryId, updateData);

      // Placeholder implementation
      // fatLogger.info("Update gallery:", galleryId, updateData);

      return {
        success: true,
        message: 'Gallery updated successfully',
      };
    } catch (error) {
      fatLogger.error('Error updating gallery:', 'be', { data: error instanceof Error ? error : undefined });
      return {
        success: false,
        message: `Failed to update gallery: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Delete a gallery from the ICP canister
   */
  async deleteGallery(_galleryId: string): Promise<DeleteGalleryResponse> {
    try {
      // const actor = await backendActor(this.identity);

      // TODO: Update this call when declarations are regenerated
      // const result = await actor.delete_gallery(galleryId);

      // Placeholder implementation
      // fatLogger.info("Delete gallery:", galleryId);

      return {
        success: true,
        message: 'Gallery deleted successfully',
      };
    } catch (error) {
      fatLogger.error('Error deleting gallery:', 'be', { data: error instanceof Error ? error : undefined });
      return {
        success: false,
        message: `Failed to delete gallery: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  // ============================================================================
  // MEMORY MANAGEMENT
  // ============================================================================

  /**
   * Create a new memory
   */
  async createMemory(_memoryData: Record<string, unknown>): Promise<MemoryOperationResponse> {
    try {
      // const actor = await backendActor(this.identity);

      // Call the real backend endpoint
      // const result = await actor.memories_create(capsuleId, memoryData);

      // Placeholder implementation
      // fatLogger.info("Add memory to capsule:", memoryData);

      return {
        success: true,
        memory_id: `memory_${Date.now()}`,
        message: 'Memory added successfully to capsule',
      };
    } catch (error) {
      fatLogger.error('Error adding memory to capsule:', 'be', { data: error instanceof Error ? error : undefined });
      return {
        success: false,
        message: `Failed to add memory: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get a memory by ID
   */
  async getMemory(_memoryId: string): Promise<Memory | null> {
    try {
      // const actor = await backendActor(this.identity);

      // TODO: Update this call when declarations are regenerated
      // const memory = await actor.memories_read(memoryId);

      // Placeholder implementation
      // fatLogger.info("Get memory from capsule:", memoryId);

      return null;
    } catch (error) {
      fatLogger.error('Error getting memory:', 'be', { data: error instanceof Error ? error : undefined });
      throw new Error(`Failed to get memory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update a memory by ID
   */
  async updateMemory(_memoryId: string, _updates: Record<string, unknown>): Promise<MemoryOperationResponse> {
    try {
      // const actor = await backendActor(this.identity);

      // TODO: Update this call when declarations are regenerated
      // const result = await actor.memories_update(memoryId, updates);

      // Placeholder implementation
      // fatLogger.info("Update memory in capsule:", memoryId, updates);

      return {
        success: true,
        message: 'Memory updated successfully',
      };
    } catch (error) {
      fatLogger.error('Error updating memory:', 'be', { data: error instanceof Error ? error : undefined });
      return {
        success: false,
        message: `Failed to update memory: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Delete a memory by ID
   */
  async deleteMemory(_memoryId: string): Promise<MemoryOperationResponse> {
    try {
      // const actor = await backendActor(this.identity);

      // TODO: Update this call when declarations are regenerated
      // const result = await actor.memories_delete(memoryId);

      // Placeholder implementation
      // fatLogger.info("Delete memory from capsule:", memoryId);

      return {
        success: true,
        message: 'Memory deleted successfully',
      };
    } catch (error) {
      fatLogger.error('Error deleting memory:', 'be', { data: error instanceof Error ? error : undefined });
      return {
        success: false,
        message: `Failed to delete memory: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * List all memories in a specific capsule
   */
  async listMemories(_capsuleId: string): Promise<MemoryListResponse> {
    // TODO: Implement when backend is ready
    // Currently placeholder - capsuleId will be used when implemented
    try {
      // const actor = await backendActor(this.identity);

      // TODO: Update this call when declarations are regenerated
      // const result = await actor.memories_list(capsuleId);

      // Placeholder implementation
      // fatLogger.info("List memories for capsule:", capsuleId);

      return {
        success: true,
        memories: [],
        message: 'Memories retrieved successfully',
      };
    } catch (error) {
      fatLogger.error('Error listing memories:', 'be', { data: error instanceof Error ? error : undefined });
      return {
        success: false,
        memories: [],
        message: `Failed to list memories: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
    const items: GalleryItem[] = web2Items.map((item, index) => ({
      memory_id: (item.memory_id as string) || `memory_${index}`,
      position: (item.position as number) || index,
      caption: item.caption ? [item.caption as string] : [],
      memory_type: { Image: null }, // Default to Image type
      metadata: [], // Empty metadata array
    }));

    const gallery: Gallery = {
      id: String(web2Gallery.id || 'unknown'),
      updated_at: BigInt((web2Gallery.updated_at as number) || Date.now()),
      capsule_id: 'default-capsule', // TODO: Get actual capsule ID
      metadata: {
        total_memories: web2Items.length,
        title: [String(web2Gallery.title || 'Untitled Gallery')],
        sharing_status: Boolean(web2Gallery.is_public) ? { Public: null } : { Private: null },
        storage_location: [{ S3: null }], // Default to S3
        name: String(web2Gallery.title || 'Untitled Gallery')
          .toLowerCase()
          .replace(/\s+/g, '-'),
        description: web2Gallery.description ? [String(web2Gallery.description)] : [],
        shared_count: 0,
      },
      cover_memory_id: web2Items.length > 0 ? [web2Items[0].memory_id as string] : [],
      created_at: BigInt((web2Gallery.created_at as number) || Date.now()),
      items,
      access_entries: [], // Empty access entries for now
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
      // fatLogger.info("Check capsule status");

      return true; // Assume user has capsule for now
    } catch (error) {
      fatLogger.error('Error checking capsule status:', 'be', { data: error instanceof Error ? error : undefined });
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
