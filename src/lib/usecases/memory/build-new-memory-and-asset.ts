/**
 * Build New Memory and Asset - Use Case Helper
 *
 * Pure utility function to build memory and asset data structures.
 * No database operations - just data transformation.
 */

import { NewDBMemory, NewDBMemoryAsset } from '@/db/types';
import { randomUUID } from 'crypto';
import type { AcceptedMimeType } from '@/app/api/memories/utils/file-processing';
import { getMemoryType } from '@/app/api/memories/utils/file-processing';
import { buildStorageKey } from '@/lib/storage/s3';

export interface BuildMemoryAndAssetParams {
  file: File;
  url: string;
  ownerId: string;
  parentFolderId?: string | null;
  assetLocation?: 's3' | 'vercel_blob';
}

export interface BuildMemoryAndAssetResult {
  memory: NewDBMemory;
  asset: NewDBMemoryAsset;
}

/**
 * Build memory and asset data for the unified schema
 *
 * This function creates the database row data for both memories and memoryAssets tables.
 * It's a pure data transformation function with no side effects.
 *
 * @param params - Input parameters for building memory and asset data
 * @returns Object containing memory and asset data structures
 */
export function buildNewMemoryAndAsset(params: BuildMemoryAndAssetParams): BuildMemoryAndAssetResult {
  const { file, url, ownerId, parentFolderId, assetLocation = 's3' } = params;
  const name = file.name || 'Untitled';

  const memory: NewDBMemory = {
    ownerId,
    type: getMemoryType(file.type as AcceptedMimeType) as 'image' | 'video' | 'document' | 'note' | 'audio',
    title: name,
    description: '',
    fileCreatedAt: new Date(),
    sharingStatus: 'private',
    parentFolderId: parentFolderId || null,
    ownerSecureCode: randomUUID(),
  };

  const asset: NewDBMemoryAsset = {
    memoryId: '', // Will be set after memory is created
    assetType: 'original',
    variant: 'default',
    url,
    assetLocation: assetLocation,
    storageKey: buildStorageKey(url, assetLocation),
    bytes: file.size,
    width: null,
    height: null,
    mimeType: file.type,
    sha256: null,
    processingStatus: 'completed',
    processingError: null,
  };

  return { memory, asset };
}
