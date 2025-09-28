/**
 * Finalize service for single finalize pattern
 *
 * Handles finalizing all assets (original + derivatives) in a single API call
 * with idempotent upserts to avoid double-writes and handle retries gracefully.
 */

import type { AssetType, ProcessingStatus } from '@/db/schema';

import { logger } from '@/lib/logger';
export interface FinalizeAsset {
  assetType: AssetType;
  assetLocation?: 's3' | 'vercel_blob' | 'icp' | 'arweave' | 'ipfs' | 'neon';
  storageKey?: string;
  bytes?: number;
  width?: number;
  height?: number;
  mimeType?: string;
  processingStatus: ProcessingStatus;
  url?: string; // URL for the asset (data URL for placeholders, S3 URL for others)
}

export interface FinalizeRequest {
  memoryId: string;
  assets: FinalizeAsset[];
  parentFolderId?: string;
}

export interface ProcessedAssets {
  display?: FinalizeAsset;
  thumb?: FinalizeAsset;
  placeholder?: FinalizeAsset;
}

/**
 * Finalize all assets in a single API call with idempotent upsert
 * STEP 5 of the upload pipeline (uploadMultipleToS3WithProcessing in s3-with-processing.ts)
 */
export async function finalizeAllAssets(
  laneAResult: PromiseSettledResult<{
    data: { id: string };
    results: Array<{ memoryId: string; size: number; checksum_sha256: string | null }>;
    userId: string;
  }>,
  laneBResult: PromiseSettledResult<ProcessedAssets> | null,
  parentFolderId?: string
): Promise<void> {
  // Extract memoryId from Lane A result
  const memoryId = laneAResult.status === 'fulfilled' ? laneAResult.value.data.id : null;

  if (!memoryId) {
    logger.error('❌ Cannot finalize: Lane A failed', undefined, { data: 'no memoryId available' });
    return;
  }

  // Build assets array
  const assets: FinalizeAsset[] = [];

  // Add original asset (always completed if we have memoryId)
  assets.push({
    assetType: 'original',
    processingStatus: 'completed',
  });

  // Add derivative assets from Lane B
  if (laneBResult?.status === 'fulfilled' && laneBResult.value) {
    const { display, thumb, placeholder } = laneBResult.value;

    if (display) assets.push(display);
    if (thumb) assets.push(thumb);
    if (placeholder) assets.push(placeholder);
  } else {
    // Lane B failed or was skipped - mark derivatives as failed/pending
    logger.warn('⚠️ Lane B failed or was skipped, marking derivatives as failed');
    assets.push(
      { assetType: 'display', processingStatus: 'failed' },
      { assetType: 'thumb', processingStatus: 'failed' },
      { assetType: 'placeholder', processingStatus: 'failed' }
    );
  }

  // Single finalize call
  logger.info(`🔍 DEBUG: Finalizing assets for memory ${memoryId} with parentFolderId:`, undefined, { parentFolderId });
  await finalizeAssets({ memoryId, assets, parentFolderId });
}

/**
 * Make the actual API call to finalize assets
 */
async function finalizeAssets(request: FinalizeRequest): Promise<void> {
  logger.info(`💾 Finalizing ${request.assets.length} assets for memory: ${request.memoryId}`);
  logger.info(`📋 Assets to finalize:`, {
    assets: request.assets.map(a => `${a.assetType}=${a.processingStatus}`).join(', '),
  });

  const response = await fetch('/api/upload/complete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to finalize assets');
  }

  logger.info(`✅ Assets finalized for memory: ${request.memoryId}`);
}
