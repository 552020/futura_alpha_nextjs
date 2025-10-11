/**
 * MEMORY CREATION UTILITIES
 *
 * This module handles memory creation operations for both JSON and file-based memories.
 * It provides standardized functions for creating memories in the unified schema.
 *
 * ARCHITECTURE:
 * - createMemory(): Unified function for all memory creation (schema-based interfaces)
 * - createMemoryFromBlob(): Legacy wrapper for blob-based memory creation
 *
 * USAGE:
 * - Use createMemory() for new code (recommended)
 * - createMemoryFromBlob() maintained for backward compatibility
 * - All functions use schema-based interfaces for type safety
 */

import { db } from '@/db/db';
import { memories } from '@/db/schema';
import { randomUUID } from 'crypto';
import type { NewDBMemory } from '@/db/schema';
import { fatLogger } from '@/lib/logger';

// Schema-based interfaces for memory creation
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

// Based on NewDBMemoryAsset from schema.ts
export interface CreateMemoryAssetParams {
  assetType: 'original' | 'display' | 'thumb' | 'placeholder' | 'poster' | 'waveform';
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

// Simple return type
export type CreateMemoryResult = { success: true; memoryId: string } | { success: false; error: string };

/**
 * Resolve the owner ID for memory creation
 * Handles onboarding case by creating temporary users when needed
 */
async function resolveOwnerId(
  ownerId: string,
  isOnboarding?: boolean
): Promise<{ success: true; ownerId: string } | { success: false; error: string }> {
  // If we have an owner ID and it's not onboarding, use it directly
  if (ownerId && !isOnboarding) {
    return { success: true, ownerId };
  }

  // Handle onboarding case - create temporary user

  try {
    const { createTemporaryUserBase } = await import('@/app/api/utils');
    const result = await createTemporaryUserBase('inviter');
    const temporaryOwnerId = result.allUser.id;

    return { success: true, ownerId: temporaryOwnerId };
  } catch (error) {
    fatLogger.error('Failed to create temporary user for onboarding', 'be', {
      error: error,
      operation: 'create_temporary_user',
      isOnboarding: true,
    });
    return {
      success: false,
      error: 'Failed to create temporary user for onboarding',
    };
  }
}

/**
 * Create a memory record in the database
 * Returns the created memory with its ID
 */
async function createMemoryRecord(
  params: CreateMemoryParams,
  ownerId: string
): Promise<{ success: true; memory: NewDBMemory } | { success: false; error: string }> {
  try {
    // Create memory record
    const newMemory: NewDBMemory = {
      ownerId: ownerId,
      type: params.type,
      title: params.title,
      description: params.description || '',
      fileCreatedAt: params.fileCreatedAt || new Date(),
      sharingStatus: params.isPublic ? 'public' : 'private',
      ownerSecureCode: randomUUID(),
      parentFolderId: params.parentFolderId || null,
      tags: params.tags || [],
      recipients: params.recipients || [],
      unlockDate: params.unlockDate || null,
      metadata: params.metadata || {},
      storageDuration: params.storageDuration || null,
    };
    const [createdMemory] = await db.insert(memories).values(newMemory).returning();

    fatLogger.info('Memory created', 'be', {
      memoryId: createdMemory.id || 'unknown',
      title: createdMemory.title || 'Untitled',
      type: createdMemory.type,
      operation: 'memory_created',
    });
    return { success: true, memory: createdMemory };
  } catch (error) {
    fatLogger.error('Failed to create memory record', 'be', {
      error: error,
      operation: 'create_memory_record',
      ownerId: ownerId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create memory assets in the database
 * Returns the created assets
 */
async function createMemoryAssets(
  memoryId: string,
  assets: CreateMemoryAssetParams[]
): Promise<{ success: true; assets: unknown[] } | { success: false; error: string }> {
  try {
    const { memoryAssets } = await import('@/db/schema');
    const assetData = assets.map(asset => ({
      memoryId: memoryId,
      assetType: asset.assetType,
      variant: asset.variant || null,
      url: asset.url,
      assetLocation: asset.assetLocation,
      bucket: asset.bucket || null,
      storageKey: asset.storageKey,
      bytes: asset.bytes,
      width: asset.width || null,
      height: asset.height || null,
      mimeType: asset.mimeType,
      sha256: asset.sha256 || null,
      processingStatus: asset.processingStatus || 'completed',
      processingError: asset.processingError || null,
    }));

    const createdAssets = await db.insert(memoryAssets).values(assetData).returning();

    fatLogger.info('Created assets for memory', 'be', {
      operation: 'create_memory_assets',
      memoryId,
      count: createdAssets.length,
    });
    return { success: true, assets: createdAssets };
  } catch (error) {
    fatLogger.error('Failed to create memory assets', 'be', {
      error: error,
      operation: 'create_memory_assets',
      memoryId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Unified memory creation function
 * Creates a memory record with optional assets in the database
 *
 * Note: No runtime validation - relies on TypeScript types for type safety
 */
export async function createMemory(params: CreateMemoryParams): Promise<CreateMemoryResult> {
  try {
    // Resolve owner ID (handles onboarding case)
    const ownerResult = await resolveOwnerId(params.ownerId, params.isOnboarding);
    if (!ownerResult.success) {
      return { success: false, error: ownerResult.error };
    }
    const ownerId = ownerResult.ownerId;

    // Handle mode logic
    if (params.mode === 'folder') {
      // Note: Current folder upload just processes multiple files without creating a folder
      // TODO: In the future, we could create a folder here and set parentFolderId
    }

    // Create memory record
    const memoryResult = await createMemoryRecord(params, ownerId);
    if (!memoryResult.success) {
      return { success: false, error: memoryResult.error };
    }
    const createdMemory = memoryResult.memory;

    // Create assets if provided
    if (params.assets && params.assets.length > 0 && createdMemory.id) {
      const assetsResult = await createMemoryAssets(createdMemory.id, params.assets);
      if (!assetsResult.success) {
        return { success: false, error: assetsResult.error };
      }
    }

    return {
      success: true,
      memoryId: createdMemory.id || '',
    };
  } catch (error) {
    fatLogger.error('Failed to create memory', 'be', {
      error: error,
      operation: 'create_memory',
      ownerId: params.ownerId,
      type: params.type,
      title: params.title,
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
function extractMemoryType(contentType: string): 'image' | 'video' | 'document' | 'note' | 'audio' {
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

    // Use the unified createMemory function
    return await createMemory(params);
  } catch (error) {
    fatLogger.error('Failed to create memory from blob', 'be', {
      error: error,
      operation: 'create_memory_from_blob',
      url: blob.url,
      size: blob.size,
      contentType: blob.contentType,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
