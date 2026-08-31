import { db } from '@/db/db';
import { memories, resourceMembership } from '@/db';
import { eq, and } from 'drizzle-orm';
import { fatLogger } from '@/lib/logger';
import type { OperationResult } from './types';

export interface ShareMemoryParams {
  memoryId: string;
  allUserId: string;
  grantSource: 'user' | 'group' | 'magic_link' | 'public_mode' | 'system';
  role: 'owner' | 'superadmin' | 'admin' | 'member' | 'guest';
  invitedByAllUserId?: string;
}

export interface MemoryAccessCheckParams {
  memoryId: string;
  userId: string;
}

/**
 * Share a memory with a user
 */
export const shareMemoryWithUser = async (
  params: ShareMemoryParams
): Promise<OperationResult> => {
  try {
    const [share] = await db
      .insert(resourceMembership)
      .values({
        resourceType: 'memory',
        resourceId: params.memoryId,
        allUserId: params.allUserId,
        grantSource: params.grantSource,
        role: params.role,
        invitedByAllUserId: params.invitedByAllUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Update memory's sharedCount
    const shareCount = await db.query.resourceMembership.findMany({
      where: and(
        eq(resourceMembership.resourceId, params.memoryId),
        eq(resourceMembership.resourceType, 'memory')
      ),
    });

    await db
      .update(memories)
      .set({
        sharingStatus: shareCount.length > 0 ? 'public' : 'private',
        updatedAt: new Date(),
      })
      .where(eq(memories.id, params.memoryId));

    fatLogger.info('Shared memory', 'be', {
      operation: 'share_memory',
      memoryId: params.memoryId,
      allUserId: params.allUserId,
      role: params.role,
    });

    return { success: true, data: share };
  } catch (error) {
    fatLogger.error('Failed to share memory', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'share_memory',
      memoryId: params.memoryId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Get memory shares
 */
export const getMemoryShares = async (
  memoryId: string
): Promise<OperationResult> => {
  try {
    const shares = await db.query.resourceMembership.findMany({
      where: and(
        eq(resourceMembership.resourceId, memoryId),
        eq(resourceMembership.resourceType, 'memory')
      ),
    });

    return { success: true, data: shares };
  } catch (error) {
    fatLogger.error('Failed to get memory shares', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'get_memory_shares',
      memoryId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Check if user has access to a memory
 * Returns access level: 'owner', 'shared', 'public', or null
 */
export const checkMemoryAccess = async (
  params: MemoryAccessCheckParams
): Promise<OperationResult<'owner' | 'shared' | 'public' | null>> => {
  try {
    const memory = await db.query.memories.findFirst({
      where: eq(memories.id, params.memoryId),
    });

    if (!memory) {
      return { success: true, data: null };
    }

    // Check if user owns the memory
    if (memory.ownerId === params.userId) {
      return { success: true, data: 'owner' };
    }

    // Check if memory is public
    if (memory.sharingStatus === 'public') {
      return { success: true, data: 'public' };
    }

    // Check if memory is shared with user
    const share = await db.query.resourceMembership.findFirst({
      where: and(
        eq(resourceMembership.resourceId, params.memoryId),
        eq(resourceMembership.resourceType, 'memory'),
        eq(resourceMembership.allUserId, params.userId)
      ),
    });

    if (share) {
      return { success: true, data: 'shared' };
    }

    return { success: true, data: null };
  } catch (error) {
    fatLogger.error('Failed to check memory access', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'check_memory_access',
      memoryId: params.memoryId,
      userId: params.userId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
