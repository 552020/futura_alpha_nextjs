/**
 * MEMORY UTILITIES - UNIFIED SCHEMA
 *
 * This module provides utilities for working with the unified memories table.
 * It replaces the old separate tables (documents, images, notes, videos) with
 * a single memories table that handles all memory types.
 *
 * USAGE:
 * - Find memories by ID across all types
 * - Work with unified memory structure
 * - Support all memory types: image, video, document, note, audio
 */

import { db } from '@/db/db';
import { memories } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { DBMemoryWithAssets } from '@/db/schema';

// With unified schema, MemoryWithType includes assets
export type MemoryWithType = DBMemoryWithAssets;

/**
 * Finds a memory by ID in the unified memories table
 * @param id The ID of the memory to find
 * @returns The memory record, or null if not found
 */
export async function findMemory(id: string): Promise<MemoryWithType | null> {
  const memory = await db.query.memories.findFirst({
    where: eq(memories.id, id),
    with: {
      assets: true,
    },
  });
  return memory || null;
}
