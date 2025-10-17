/**
 * Frontend HTTP Token Manager for ICP Asset Serving
 *
 * Provides efficient token caching and bulk request handling for dashboard scenarios.
 * Uses functional approach with module-level state management.
 */

import type { BackendActor } from '@/ic/backend';
import { fatLogger } from './logger';

interface CachedToken {
  token: string;
  expires_at: number;
  variants: string[];
  asset_ids: string[] | null;
}

interface BulkCacheEntry {
  tokens: [string, string][];
  expires_at: number;
}

// Module-level state
const tokenCache = new Map<string, CachedToken>();
const bulkCache = new Map<string, BulkCacheEntry>();
let actorPromise: Promise<BackendActor> | null = null;

/**
 * Get or create authenticated backend actor using existing infrastructure
 */
async function getHttpActor(): Promise<BackendActor> {
  if (actorPromise) {
    return actorPromise;
  }

  actorPromise = createHttpActor();
  return actorPromise;
}

async function createHttpActor(): Promise<BackendActor> {
  try {
    // Use existing backend actor infrastructure
    const { backendActor } = await import('@/ic/backend');
    const actor = await backendActor();

    fatLogger.info('Created HTTP token manager actor', 'fe');
    return actor;
  } catch (error) {
    fatLogger.error('Failed to create HTTP token manager actor', 'fe', {
      data: error instanceof Error ? error : undefined,
    });
    throw error;
  }
}

/**
 * Generate cache key for individual token
 */
function getCacheKey(memoryId: string, variants: string[], assetIds: string[] | null): string {
  const variantStr = variants.sort().join(',');
  const assetStr = assetIds ? assetIds.sort().join(',') : 'null';
  return `${memoryId}:${variantStr}:${assetStr}`;
}

/**
 * Generate cache key for bulk tokens
 */
function getBulkCacheKey(memoryIds: string[], variants: string[], assetIds: string[] | null): string {
  const memoryStr = memoryIds.sort().join(',');
  const variantStr = variants.sort().join(',');
  const assetStr = assetIds ? assetIds.sort().join(',') : 'null';
  return `bulk:${memoryStr}:${variantStr}:${assetStr}`;
}

/**
 * Get HTTP base URL based on environment
 */
export function getHttpBaseUrl(): string {
  const isLocal = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local';

  if (isLocal) {
    const canisterId = process.env.NEXT_PUBLIC_CANISTER_ID_BACKEND;
    if (!canisterId) {
      throw new Error('NEXT_PUBLIC_CANISTER_ID_BACKEND not set for local development');
    }
    return `http://${canisterId}.localhost:4943`;
  }

  // Production ICP HTTP gateway
  const canisterId = process.env.NEXT_PUBLIC_CANISTER_ID_BACKEND;
  if (canisterId) {
    return `https://${canisterId}.ic0.app`;
  }

  throw new Error('Cannot determine HTTP base URL - missing canister ID');
}

/**
 * Get a single token for a memory, using cache if available
 */
export async function getHttpToken(
  memoryId: string,
  variants: string[] = ['thumbnail'],
  assetIds: string[] | null = null,
  ttlSecs: number = 180
): Promise<string> {
  const cacheKey = getCacheKey(memoryId, variants, assetIds);
  const cached = tokenCache.get(cacheKey);

  // Check if cached token is still valid
  if (cached && Date.now() < cached.expires_at) {
    fatLogger.info('Token cache hit', 'fe', { memoryId });
    return cached.token;
  }

  fatLogger.info('Fetching fresh token', 'fe', { memoryId, variants });

  try {
    const actor = await getHttpActor();
    const token = await actor.mint_http_token(memoryId, variants, assetIds ? [assetIds] : [], ttlSecs);

    // Cache the token with expiry
    const expiresAt = Date.now() + ttlSecs * 1000 - 10000; // 10s buffer
    tokenCache.set(cacheKey, {
      token,
      expires_at: expiresAt,
      variants,
      asset_ids: assetIds,
    });

    fatLogger.info('Token cached successfully', 'fe', { memoryId });
    return token;
  } catch (error) {
    fatLogger.error('Failed to mint token', 'fe', {
      memoryId,
      error: error instanceof Error ? error : undefined,
    });
    throw error;
  }
}

/**
 * Get tokens for multiple memories in a single bulk request
 */
export async function getBulkHttpTokens(
  memoryIds: string[],
  variants: string[] = ['thumbnail'],
  assetIds: string[] | null = null,
  ttlSecs: number = 180
): Promise<Map<string, string>> {
  const bulkCacheKey = getBulkCacheKey(memoryIds, variants, assetIds);
  const cached = bulkCache.get(bulkCacheKey);

  // Check if bulk cache is still valid
  if (cached && Date.now() < cached.expires_at) {
    fatLogger.info('Bulk token cache hit', 'fe', { count: memoryIds.length });
    return new Map(cached.tokens);
  }

  fatLogger.info('Fetching bulk tokens', 'fe', { count: memoryIds.length, variants });

  try {
    const actor = await getHttpActor();
    const tokenPairs = await actor.mint_http_tokens_bulk(memoryIds, variants, assetIds ? [assetIds] : [], ttlSecs);

    // Convert to Map and update individual cache
    const tokenMap = new Map<string, string>();
    const expiresAt = Date.now() + ttlSecs * 1000 - 10000; // 10s buffer

    for (const [memoryId, token] of tokenPairs) {
      tokenMap.set(memoryId, token);

      // Update individual cache
      const cacheKey = getCacheKey(memoryId, variants, assetIds);
      tokenCache.set(cacheKey, {
        token,
        expires_at: expiresAt,
        variants,
        asset_ids: assetIds,
      });
    }

    // Update bulk cache
    bulkCache.set(bulkCacheKey, {
      tokens: Array.from(tokenMap.entries()),
      expires_at: expiresAt,
    });

    fatLogger.info('Bulk tokens fetched and cached', 'fe', {
      successful: tokenMap.size,
      requested: memoryIds.length,
    });

    return tokenMap;
  } catch (error) {
    fatLogger.error('Failed to mint bulk tokens', 'fe', {
      error: error instanceof Error ? error : undefined,
    });
    throw error;
  }
}

/**
 * Get asset URL for a memory with automatic token management
 */
export async function getHttpAssetUrl(
  memoryId: string,
  variant: string,
  assetId: string | null = null,
  baseUrl?: string
): Promise<string> {
  const variants = [variant];
  const assetIds = assetId ? [assetId] : null;

  const token = await getHttpToken(memoryId, variants, assetIds);

  // Use environment-based base URL if not provided
  const httpBaseUrl = baseUrl || getHttpBaseUrl();

  let url = `${httpBaseUrl}/asset/${memoryId}/${variant}`;
  if (assetId) {
    url += `?id=${encodeURIComponent(assetId)}&token=${encodeURIComponent(token)}`;
  } else {
    url += `?token=${encodeURIComponent(token)}`;
  }

  return url;
}

/**
 * Get asset URLs for multiple memories (dashboard scenario)
 */
export async function getBulkHttpAssetUrls(
  memoryIds: string[],
  variant: string = 'thumbnail',
  baseUrl?: string
): Promise<Map<string, string>> {
  const variants = [variant];
  const tokenMap = await getBulkHttpTokens(memoryIds, variants);

  const httpBaseUrl = baseUrl || getHttpBaseUrl();
  const urlMap = new Map<string, string>();

  for (const [memoryId, token] of tokenMap) {
    const url = `${httpBaseUrl}/asset/${memoryId}/${variant}?token=${encodeURIComponent(token)}`;
    urlMap.set(memoryId, url);
  }

  return urlMap;
}

/**
 * Clear expired tokens from cache
 */
export function clearExpiredHttpTokens(): void {
  const now = Date.now();

  // Clear individual cache
  for (const [key, value] of tokenCache.entries()) {
    if (now >= value.expires_at) {
      tokenCache.delete(key);
    }
  }

  // Clear bulk cache
  for (const [key, value] of bulkCache.entries()) {
    if (now >= value.expires_at) {
      bulkCache.delete(key);
    }
  }
}

/**
 * Clear all cached tokens
 */
export function clearAllHttpTokens(): void {
  tokenCache.clear();
  bulkCache.clear();
  actorPromise = null; // Reset actor promise
  fatLogger.info('Cleared all HTTP tokens', 'fe');
}

/**
 * Get cache statistics
 */
export function getHttpTokenCacheStats() {
  const now = Date.now();
  let validTokens = 0;
  let expiredTokens = 0;

  for (const value of tokenCache.values()) {
    if (now < value.expires_at) {
      validTokens++;
    } else {
      expiredTokens++;
    }
  }

  return {
    individual_cache: {
      total: tokenCache.size,
      valid: validTokens,
      expired: expiredTokens,
    },
    bulk_cache: {
      total: bulkCache.size,
    },
  };
}
