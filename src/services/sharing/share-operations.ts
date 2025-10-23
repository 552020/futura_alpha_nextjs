/**
 * SHARE OPERATIONS - Core sharing functionality
 *
 * This module provides functions for user-to-user sharing via resourceMembership.
 * Handles creating, revoking, and managing shares for any resource type.
 */

import { db } from '@/db/db';
import { resourceMembership } from '@/db';
import { eq, and, ne, desc } from 'drizzle-orm';
import { fatLogger } from '@/lib/logger';
import type { OperationResult } from '../shared/types';
import type {
  CreateShareParams,
  ShareRecord,
  ShareListParams,
  ShareListResult,
  AccessCheckParams,
  AccessCheckResult,
  SharePermissions,
  BulkShareParams,
  BulkShareResult,
  PublicLinkRecord,
} from './types';

/**
 * Create a share for a specific user
 */
export async function createShare(params: CreateShareParams): Promise<OperationResult<ShareRecord>> {
  try {
    const { resourceType, resourceId, targetUserId, permissions, invitedBy } = params;

    // Check if share already exists
    const existingShare = await db.query.resourceMembership.findFirst({
      where: and(
        eq(resourceMembership.resourceType, resourceType),
        eq(resourceMembership.resourceId, resourceId),
        eq(resourceMembership.allUserId, targetUserId),
        eq(resourceMembership.grantSource, 'user')
      ),
    });

    if (existingShare) {
      return {
        success: false,
        error: 'Share already exists for this user',
      };
    }

    // Calculate permission mask
    const permMask = calculatePermissionMask(permissions);

    // Create the share
    const [newShare] = await db
      .insert(resourceMembership)
      .values({
        resourceType,
        resourceId,
        allUserId: targetUserId,
        role: 'member', // Default role for user shares
        permMask,
        grantSource: 'user',
        invitedByAllUserId: invitedBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    fatLogger.info('Share created successfully', 'be', {
      operation: 'create_share',
      resourceType,
      resourceId,
      targetUserId,
      shareId: newShare.id,
    });

    return {
      success: true,
      data: newShare as ShareRecord,
    };
  } catch (error) {
    fatLogger.error('Failed to create share', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'create_share',
      params,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Revoke a share
 */
export async function revokeShare(shareId: string, revokedBy: string): Promise<OperationResult<boolean>> {
  try {
    // Check if share exists and user has permission to revoke
    const share = await db.query.resourceMembership.findFirst({
      where: eq(resourceMembership.id, shareId),
    });

    if (!share) {
      return {
        success: false,
        error: 'Share not found',
      };
    }

    // Delete the share
    await db.delete(resourceMembership).where(eq(resourceMembership.id, shareId));

    fatLogger.info('Share revoked successfully', 'be', {
      operation: 'revoke_share',
      shareId,
      revokedBy,
    });

    return {
      success: true,
      data: true,
    };
  } catch (error) {
    fatLogger.error('Failed to revoke share', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'revoke_share',
      shareId,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get all shares for a resource
 */
export async function getResourceShares(params: ShareListParams): Promise<OperationResult<ShareListResult>> {
  try {
    const { resourceType, resourceId, includeInactive: _includeInactive = false } = params;

    // Get user shares (excluding system grants)
    const userShares = await db.query.resourceMembership.findMany({
      where: and(
        eq(resourceMembership.resourceType, resourceType),
        eq(resourceMembership.resourceId, resourceId),
        ne(resourceMembership.grantSource, 'system')
      ),
      orderBy: desc(resourceMembership.createdAt),
    });

    // Get public links (we'll implement this in token-operations.ts)
    const publicLinks: PublicLinkRecord[] = []; // TODO: Implement when we create token operations

    const result: ShareListResult = {
      userShares: userShares as ShareRecord[],
      publicLinks: publicLinks,
      totalShares: userShares.length + publicLinks.length,
    };

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    fatLogger.error('Failed to get resource shares', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'get_resource_shares',
      params,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if a user has access to a resource
 */
export async function checkResourceAccess(params: AccessCheckParams): Promise<OperationResult<AccessCheckResult>> {
  try {
    const { resourceType, resourceId, userId } = params;

    // Check for direct ownership or membership
    const membership = await db.query.resourceMembership.findFirst({
      where: and(
        eq(resourceMembership.resourceType, resourceType),
        eq(resourceMembership.resourceId, resourceId),
        eq(resourceMembership.allUserId, userId)
      ),
    });

    if (!membership) {
      return {
        success: true,
        data: {
          hasAccess: false,
          accessLevel: 'none',
          permissions: { canView: false, canEdit: false, canDelete: false },
          source: 'none',
        },
      };
    }

    // Determine access level and permissions
    const accessLevel = membership.role;
    const permissions = parsePermissionMask(membership.permMask);

    return {
      success: true,
      data: {
        hasAccess: true,
        accessLevel: accessLevel === 'superadmin' ? 'admin' : (accessLevel as 'owner' | 'admin' | 'member' | 'guest'),
        permissions,
        source: membership.grantSource === 'system' ? 'ownership' : 'user_share',
      },
    };
  } catch (error) {
    fatLogger.error('Failed to check resource access', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'check_resource_access',
      params,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get all resources shared with a user
 */
export async function getSharedResources(
  userId: string,
  resourceType?: 'memory' | 'folder' | 'gallery'
): Promise<OperationResult<ShareRecord[]>> {
  try {
    const whereConditions = [eq(resourceMembership.allUserId, userId), ne(resourceMembership.grantSource, 'system')];

    if (resourceType) {
      whereConditions.push(eq(resourceMembership.resourceType, resourceType));
    }

    const memberships = await db.query.resourceMembership.findMany({
      where: and(...whereConditions),
      orderBy: desc(resourceMembership.createdAt),
    });

    return {
      success: true,
      data: memberships as ShareRecord[],
    };
  } catch (error) {
    fatLogger.error('Failed to get shared resources', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'get_shared_resources',
      userId,
      resourceType,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create multiple shares at once
 */
export async function createBulkShares(params: BulkShareParams): Promise<OperationResult<BulkShareResult>> {
  try {
    const { resourceType, resourceIds, targetUserId, permissions, invitedBy } = params;

    const results = await Promise.allSettled(
      resourceIds.map(resourceId =>
        createShare({
          resourceType,
          resourceId,
          targetUserId,
          permissions,
          invitedBy,
        })
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);

    return {
      success: true,
      data: {
        success: successful.length > 0,
        createdShares: successful.length,
        failedResources: resourceIds.filter(
          (_, index) => results[index].status === 'rejected' || !results[index].value.success
        ),
      },
    };
  } catch (error) {
    fatLogger.error('Failed to create bulk shares', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'create_bulk_shares',
      params,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Calculate permission mask from permissions object
 */
function calculatePermissionMask(permissions?: SharePermissions): number {
  if (!permissions) {
    return 1; // Default: view only
  }

  let mask = 0;
  if (permissions.canView) mask |= 1;
  if (permissions.canEdit) mask |= 2;
  if (permissions.canDelete) mask |= 4;

  return mask;
}

/**
 * Parse permission mask into permissions object
 */
function parsePermissionMask(mask: number): SharePermissions {
  return {
    canView: (mask & 1) !== 0,
    canEdit: (mask & 2) !== 0,
    canDelete: (mask & 4) !== 0,
  };
}
