import { db } from '@/db/db';
import { memories, resourceMembership } from '@/db';
import { eq, and, desc } from 'drizzle-orm';
import { fatLogger } from '@/lib/logger';
import type { OperationResult } from './types';
import { getMemoryRecords } from './memory-operations';

/**
 * Get memories shared with a user
 */
export const getSharedMemories = async (allUserId: string): Promise<OperationResult> => {
  try {
    // Get memory memberships for this user
    const memberships = await db.query.resourceMembership.findMany({
      where: and(eq(resourceMembership.allUserId, allUserId), eq(resourceMembership.resourceType, 'memory')),
    });

    if (memberships.length === 0) {
      return { success: true, data: [] };
    }

    // Get the actual memory data
    const memoryIds = memberships.map(m => m.resourceId);
    const sharedMemories = await db.query.memories.findMany({
      where: eq(memories.id, memoryIds[0]), // This needs to be fixed with proper inArray
      orderBy: desc(memories.createdAt),
    });

    return { success: true, data: sharedMemories };
  } catch (error) {
    fatLogger.error('Failed to get shared memories', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'get_shared_memories',
      allUserId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Get all memories accessible by a user (owned + shared + public)
 */
export const getAllAccessibleMemories = async (allUserId: string): Promise<OperationResult> => {
  try {
    // Get owned memories
    const ownedResult = await getMemoryRecords({ ownerId: allUserId });
    if (!ownedResult.success) {
      return { success: false, error: ownedResult.error };
    }

    // Get shared memories
    const sharedResult = await getSharedMemories(allUserId);
    if (!sharedResult.success) {
      return { success: false, error: sharedResult.error };
    }

    // Get public memories
    const publicResult = await getMemoryRecords({
      includeDeleted: false,
    });
    if (!publicResult.success) {
      return { success: false, error: publicResult.error };
    }

    // Filter public memories (those with sharingStatus === 'public')
    const publicMemories = Array.isArray(publicResult.data)
      ? publicResult.data.filter(
          (memory: { sharingStatus: string; ownerId: string }) =>
            memory.sharingStatus === 'public' && memory.ownerId !== allUserId
        )
      : [];

    // Combine and deduplicate
    const allMemories = [
      ...(Array.isArray(ownedResult.data) ? ownedResult.data : []),
      ...(Array.isArray(sharedResult.data) ? sharedResult.data : []),
      ...publicMemories,
    ];

    // Remove duplicates based on ID
    const uniqueMemories = allMemories.filter(
      (memory, index, self) => index === self.findIndex(m => m.id === memory.id)
    );

    // Sort by creation date
    uniqueMemories.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Add access level metadata
    const memoriesWithAccess = uniqueMemories.map(memory => ({
      ...memory,
      accessLevel: memory.ownerId === allUserId ? 'owner' : memory.sharingStatus === 'public' ? 'public' : 'shared',
    }));

    return { success: true, data: memoriesWithAccess };
  } catch (error) {
    fatLogger.error('Failed to get all accessible memories', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'get_all_accessible_memories',
      allUserId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
