/**
 * MEMORY QUERY UTILITIES
 *
 * This module provides utility functions for memory queries.
 * All database operations are now handled through the service layer.
 *
 * ARCHITECTURE:
 * - Uses service layer functions instead of direct database operations
 * - Maintains the same interface for backward compatibility
 * - Provides proper error handling and logging
 */

import {
  getMemoryRecordsWithGalleries,
  type MemoryWithGalleries,
} from '@/services/memory';
import { fatLogger } from '@/lib/logger';

/**
 * Fetch memories with their associated galleries
 *
 * This function now uses the service layer instead of direct database operations.
 * The complex SQL query has been moved to the memory service layer.
 */
export async function fetchMemoriesWithGalleries(
  ownerAllUserId: string
): Promise<MemoryWithGalleries[]> {
  try {
    fatLogger.info('Fetching memories with galleries', 'be', {
      operation: 'fetch_memories_with_galleries',
      ownerId: ownerAllUserId,
    });

    const result = await getMemoryRecordsWithGalleries(ownerAllUserId);

    if (!result.success) {
      fatLogger.error('Failed to fetch memories with galleries', 'be', {
        operation: 'fetch_memories_with_galleries',
        ownerId: ownerAllUserId,
        error: result.error,
      });
      throw new Error(
        result.error || 'Failed to fetch memories with galleries'
      );
    }

    fatLogger.info('Successfully fetched memories with galleries', 'be', {
      operation: 'fetch_memories_with_galleries',
      ownerId: ownerAllUserId,
      count: result.data?.length || 0,
    });

    return result.data || [];
  } catch (error) {
    fatLogger.error('Error in fetchMemoriesWithGalleries', 'be', {
      operation: 'fetch_memories_with_galleries',
      ownerId: ownerAllUserId,
      error: error instanceof Error ? error : undefined,
    });
    throw error;
  }
}

// Re-export the type for backward compatibility
export type { MemoryWithGalleries };
