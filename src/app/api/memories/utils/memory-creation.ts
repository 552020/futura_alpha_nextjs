/**
 * MEMORY CREATION UTILITIES
 *
 * This module provides utility functions for memory creation operations.
 * All database operations are now handled through the service layer.
 *
 * ARCHITECTURE:
 * - Uses service layer functions instead of direct database operations
 * - Maintains the same interface for backward compatibility
 * - Provides proper error handling and logging
 *
 * USAGE:
 * - Use createMemory() for new code (recommended)
 * - createMemoryFromBlob() maintained for backward compatibility
 * - All functions use schema-based interfaces for type safety
 */

import { createMemoryWithAssets } from '@/services/memory';
import { fatLogger } from '@/lib/logger';

// Schema-based interfaces for memory creation (maintained for backward compatibility)
export interface CreateMemoryParams {
  // Core memory data (from memories table)
  ownerId: string;
  type: 'image' | 'video' | 'document' | 'note' | 'audio';
  title: string;
  description?: string;
  fileCreatedAt?: Date;
  isPublic?: boolean;
  parentFolderId?: string | null;
  tags?: string[];
  recipients?: string[];
  unlockDate?: Date | null;
  metadata?: Record<string, unknown>;
  storageDuration?: number | null;

  // Optional assets (from memoryAssets table)
  assets?: CreateMemoryAssetParams[];

  // Options
  isOnboarding?: boolean;
  mode?: string;
}

// Based on NewDBMemoryAsset from schema.ts (maintained for backward compatibility)
export interface CreateMemoryAssetParams {
  assetType:
    | 'original'
    | 'display'
    | 'thumb'
    | 'placeholder'
    | 'poster'
    | 'waveform';
  variant?: string;
  url: string;
  assetLocation: 's3' | 'vercel_blob' | 'icp' | 'arweave' | 'ipfs' | 'neon';
  bucket?: string;
  storageKey: string;
  bytes: number;
  width?: number;
  height?: number;
  mimeType: string;
  sha256?: string;
  processingStatus?: 'failed' | 'pending' | 'processing' | 'completed';
  processingError?: string;
}

// Simple return type (maintained for backward compatibility)
export type CreateMemoryResult =
  | { success: true; memoryId: string }
  | { success: false; error: string };

/**
 * Unified memory creation function
 * Creates a memory record with optional assets in the database
 *
 * This function now uses the service layer instead of direct database operations.
 * The complex database operations have been moved to the memory service layer.
 *
 * Note: No runtime validation - relies on TypeScript types for type safety
 */
export async function createMemory(
  params: CreateMemoryParams
): Promise<CreateMemoryResult> {
  try {
    fatLogger.info('Creating memory with assets', 'be', {
      operation: 'create_memory',
      ownerId: params.ownerId,
      type: params.type,
      title: params.title,
      hasAssets: !!(params.assets && params.assets.length > 0),
    });

    // Use the service layer function
    const result = await createMemoryWithAssets({
      title: params.title,
      type: params.type,
      ownerId: params.ownerId,
      description: params.description,
      fileCreatedAt: params.fileCreatedAt,
      isPublic: params.isPublic,
      parentFolderId: params.parentFolderId,
      tags: params.tags,
      recipients: params.recipients,
      unlockDate: params.unlockDate,
      metadata: params.metadata,
      storageDuration: params.storageDuration,
      isOnboarding: params.isOnboarding,
      mode: params.mode,
      assets: params.assets,
    });

    if (!result.success) {
      fatLogger.error('Failed to create memory with assets', 'be', {
        operation: 'create_memory',
        ownerId: params.ownerId,
        type: params.type,
        title: params.title,
        error: result.error,
      });
      return {
        success: false,
        error: result.error || 'Failed to create memory',
      };
    }

    fatLogger.info('Successfully created memory with assets', 'be', {
      operation: 'create_memory',
      memoryId: result.data?.memoryId,
      ownerId: params.ownerId,
      type: params.type,
      title: params.title,
      assetsCount: result.data?.assets?.length || 0,
    });

    return {
      success: true,
      memoryId: result.data?.memoryId || '',
    };
  } catch (error) {
    fatLogger.error('Error in createMemory', 'be', {
      operation: 'create_memory',
      ownerId: params.ownerId,
      type: params.type,
      title: params.title,
      error: error instanceof Error ? error : undefined,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

import { detectMemoryType } from '@/utils/memory-type';

/**
 * Extract memory type from MIME type
 * @deprecated Use detectMemoryType from @/utils/memory-type instead
 */
function extractMemoryType(
  contentType: string
): 'image' | 'video' | 'document' | 'note' | 'audio' {
  return detectMemoryType(contentType);
}

/**
 * Extract title from file path
 */
function extractTitleFromPath(pathname: string): string {
  return pathname.split('/').pop()?.split('.')[0] || 'Untitled';
}

/**
 * Create memory from blob data with automatic type/title extraction
 * This is a convenience wrapper around createMemory()
 *
 * This function now uses the service layer instead of direct database operations.
 */
export async function createMemoryFromBlob(
  blob: {
    url: string;
    pathname: string;
    size: number;
    contentType: string;
    assetLocation?: 'vercel_blob' | 's3';
    storageKey?: string;
  },
  meta: {
    allUserId: string;
    isOnboarding?: boolean;
    mode?: string;
  }
): Promise<{ success: boolean; memoryId?: string; error?: string }> {
  try {
    fatLogger.info('Creating memory from blob', 'be', {
      operation: 'create_memory_from_blob',
      url: blob.url,
      size: blob.size,
      contentType: blob.contentType,
      allUserId: meta.allUserId,
    });

    // Extract missing information automatically
    const memoryType = extractMemoryType(blob.contentType);
    const title = extractTitleFromPath(blob.pathname);

    const assetData: CreateMemoryAssetParams = {
      assetType: 'original',
      url: blob.url,
      assetLocation: blob.assetLocation || 's3',
      storageKey: blob.storageKey || blob.pathname,
      bytes: blob.size,
      mimeType: blob.contentType,
      processingStatus: 'completed',
    };

    const params: CreateMemoryParams = {
      ownerId: meta.allUserId,
      type: memoryType,
      title,
      description: '',
      fileCreatedAt: new Date(),
      isPublic: false,
      parentFolderId: null,
      tags: [],
      recipients: [],
      unlockDate: null,
      metadata: {},
      storageDuration: null,
      assets: [assetData],
      isOnboarding: meta.isOnboarding,
      mode: meta.mode,
    };

    // Use the unified createMemory function (which now uses the service layer)
    const result = await createMemory(params);

    if (result.success) {
      fatLogger.info('Successfully created memory from blob', 'be', {
        operation: 'create_memory_from_blob',
        memoryId: result.memoryId,
        url: blob.url,
        size: blob.size,
        contentType: blob.contentType,
      });
    }

    return result;
  } catch (error) {
    fatLogger.error('Error in createMemoryFromBlob', 'be', {
      operation: 'create_memory_from_blob',
      url: blob.url,
      size: blob.size,
      contentType: blob.contentType,
      allUserId: meta.allUserId,
      error: error instanceof Error ? error : undefined,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
