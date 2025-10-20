/**
 * ICP Asset Utilities
 *
 * Integration utilities for ICP HTTP asset serving with existing asset URL generation
 */

import { getHttpAssetUrl, getBulkHttpAssetUrls } from './http-token-manager';
import { fatLogger } from './logger';

/**
 * Asset location types
 */
export type AssetLocation = 's3' | 'icp' | 'vercel_blob' | 'unknown';

/**
 * Enhanced asset interface for ICP integration
 */
export interface ICPAsset {
  url: string;
  assetLocation?: AssetLocation;
  storageKey?: string;
  bucket?: string | null;
  memoryId?: string;
  assetId?: string;
  variant?: string;
}

/**
 * Generate the best asset URL, including ICP HTTP serving
 */
export async function generateBestAssetUrl(asset: ICPAsset): Promise<string> {
  // For ICP assets, use HTTP token-based serving
  if (asset.assetLocation === 'icp' && asset.memoryId) {
    try {
      fatLogger.info('Generating ICP HTTP asset URL', 'fe', {
        memoryId: asset.memoryId,
        variant: asset.variant || 'original',
        assetId: asset.assetId,
      });

      const variant = asset.variant || 'original';
      const assetId = asset.assetId || null;

      const httpUrl = await getHttpAssetUrl(asset.memoryId, variant, assetId);

      fatLogger.info('Generated ICP HTTP asset URL', 'fe', {
        memoryId: asset.memoryId,
        urlLength: httpUrl.length,
      });

      return httpUrl;
    } catch (error) {
      fatLogger.warn('Failed to generate ICP HTTP URL, falling back to direct URL', 'fe', {
        memoryId: asset.memoryId,
        error: error instanceof Error ? error.message : String(error),
      });

      // Fall back to direct URL if HTTP serving fails
      return asset.url;
    }
  }

  // For non-ICP assets, return the original URL
  fatLogger.info('Using direct asset URL for non-ICP asset', 'fe', {
    assetLocation: asset.assetLocation,
  });

  return asset.url;
}

/**
 * Generate bulk asset URLs for dashboard scenarios
 */
export async function generateBulkAssetUrls(
  assets: ICPAsset[],
  variant: string = 'thumbnail'
): Promise<Map<string, string>> {
  // Separate ICP and non-ICP assets
  const icpAssets = assets.filter(asset => asset.assetLocation === 'icp' && asset.memoryId);
  const nonIcpAssets = assets.filter(asset => asset.assetLocation !== 'icp' || !asset.memoryId);

  const urlMap = new Map<string, string>();

  // Handle ICP assets with bulk HTTP serving
  if (icpAssets.length > 0) {
    try {
      const memoryIds = icpAssets.map(asset => asset.memoryId!);
      const httpUrls = await getBulkHttpAssetUrls(memoryIds, variant);

      // Map HTTP URLs back to assets
      for (const asset of icpAssets) {
        const httpUrl = httpUrls.get(asset.memoryId!);
        if (httpUrl) {
          urlMap.set(asset.url, httpUrl);
        } else {
          // Fall back to direct URL if HTTP serving failed
          urlMap.set(asset.url, asset.url);
        }
      }

      fatLogger.info('Generated bulk ICP HTTP URLs', 'fe', {
        successful: httpUrls.size,
        requested: icpAssets.length,
        variant,
      });
    } catch (error) {
      fatLogger.error('Failed to generate bulk ICP HTTP URLs', 'fe', {
        error: error instanceof Error ? error : undefined,
      });

      // Fall back to direct URLs for all ICP assets
      for (const asset of icpAssets) {
        urlMap.set(asset.url, asset.url);
      }
    }
  }

  // Handle non-ICP assets with direct URLs
  for (const asset of nonIcpAssets) {
    urlMap.set(asset.url, asset.url);
  }

  return urlMap;
}

/**
 * Check if an asset should use ICP HTTP serving
 */
export function shouldUseICPServing(asset: ICPAsset): boolean {
  return asset.assetLocation === 'icp' && !!asset.memoryId;
}

/**
 * Extract memory ID from ICP asset URL or storage key
 */
export function extractMemoryIdFromAsset(asset: ICPAsset): string | null {
  if (asset.memoryId) {
    return asset.memoryId;
  }

  // Try to extract from storage key or URL
  const source = asset.storageKey || asset.url;
  if (!source) {
    return null;
  }

  // Common patterns for ICP memory IDs in storage keys
  const patterns = [
    /memory[_-]?([a-f0-9-]+)/i,
    /([a-f0-9-]{8,})/i, // Generic UUID pattern
  ];

  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Create ICP asset from existing asset data
 */
export function createICPAsset(
  url: string,
  memoryId?: string,
  assetId?: string,
  variant?: string,
  storageKey?: string
): ICPAsset {
  return {
    url,
    assetLocation: 'icp',
    memoryId,
    assetId,
    variant,
    storageKey,
  };
}


