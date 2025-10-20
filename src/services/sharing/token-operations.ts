/**
 * TOKEN OPERATIONS - Public link sharing functionality
 *
 * This module provides functions for creating and managing public share tokens.
 * Handles token generation, validation, and access control for public links.
 */

import { db } from '@/db/db';
import { resourceShareTokens, resourceMembership } from '@/db';
import { eq, and, or, isNull, gt } from 'drizzle-orm';
import { fatLogger } from '@/lib/logger';
import crypto from 'node:crypto';
import type { OperationResult } from '../shared/types';
import type { CreatePublicLinkParams, PublicLinkRecord, PublicLinkAccess } from './types';

/**
 * Generate a secure random token
 */
function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create a public share token
 */
export async function createPublicLink(params: CreatePublicLinkParams): Promise<OperationResult<PublicLinkRecord>> {
  try {
    const {
      resourceType,
      resourceId,
      createdBy,
      expiresAt,
      isActive = true,
      allowedUsers,
      allowedRoles,
      requireAuth = false,
      accessRestrictions,
    } = params;

    // Generate unique token
    const token = generateSecureToken();

    // Create the public link record
    const [newLink] = await db
      .insert(resourceShareTokens)
      .values({
        resourceType,
        resourceId,
        token,
        createdBy,
        expiresAt,
        isActive,
        createdAt: new Date(),
        allowedUsers: allowedUsers ? JSON.stringify(allowedUsers) : null,
        allowedRoles: allowedRoles ? JSON.stringify(allowedRoles) : null,
        requireAuth,
        accessRestrictions: accessRestrictions ? JSON.stringify(accessRestrictions) : null,
      })
      .returning();

    fatLogger.info('Public link created successfully', 'be', {
      operation: 'create_public_link',
      resourceType,
      resourceId,
      token: token.substring(0, 8) + '...', // Log partial token for security
      createdBy,
    });

    return {
      success: true,
      data: newLink as PublicLinkRecord,
    };
  } catch (error) {
    fatLogger.error('Failed to create public link', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'create_public_link',
      params,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Validate a public share token
 */
export async function validatePublicToken(token: string, userId?: string): Promise<OperationResult<PublicLinkAccess>> {
  try {
    const linkRecord = await db.query.resourceShareTokens.findFirst({
      where: eq(resourceShareTokens.token, token),
    });

    if (!linkRecord) {
      return {
        success: true,
        data: {
          isValid: false,
          isExpired: false,
          error: 'Token not found',
        },
      };
    }

    // Check if link is active
    if (!linkRecord.isActive) {
      return {
        success: true,
        data: {
          isValid: false,
          isExpired: false,
          error: 'Link has been deactivated',
        },
      };
    }

    // Check if link has expired
    const now = new Date();
    const isExpired = linkRecord.expiresAt && linkRecord.expiresAt < now;

    if (isExpired) {
      return {
        success: true,
        data: {
          isValid: false,
          isExpired: true,
          error: 'Link has expired',
        },
      };
    }

    // Enhanced access control validation
    let userAllowed = true;
    let roleAllowed = true;

    // Check authentication requirement
    if (linkRecord.requireAuth && !userId) {
      return {
        success: true,
        data: {
          isValid: false,
          isExpired: false,
          requiresAuth: true,
          error: 'Authentication required for this link',
        },
      };
    }

    // Check user whitelist
    if (linkRecord.allowedUsers && userId) {
      const allowedUsers = JSON.parse(linkRecord.allowedUsers as string);
      userAllowed = allowedUsers.includes(userId);
      if (!userAllowed) {
        return {
          success: true,
          data: {
            isValid: false,
            isExpired: false,
            userAllowed: false,
            error: 'User not authorized for this link',
          },
        };
      }
    }

    // Check role restrictions
    if (linkRecord.allowedRoles && userId) {
      // TODO: Implement getUserRole function
      // const userRole = await getUserRole(userId);
      // const allowedRoles = JSON.parse(linkRecord.allowedRoles);
      // roleAllowed = allowedRoles.includes(userRole);
      // For now, skip role checking
      roleAllowed = true;
    }

    return {
      success: true,
      data: {
        isValid: true,
        isExpired: false,
        record: linkRecord as PublicLinkRecord,
        requiresAuth: linkRecord.requireAuth,
        userAllowed,
        roleAllowed,
        accessGranted: userAllowed && roleAllowed,
      },
    };
  } catch (error) {
    fatLogger.error('Failed to validate public token', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'validate_public_token',
      token: token.substring(0, 8) + '...', // Log partial token for security
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Grant access via public token (creates resourceMembership)
 */
export async function grantAccessViaToken(token: string, userId: string): Promise<OperationResult<boolean>> {
  try {
    // Validate the token first with user context
    const validation = await validatePublicToken(token, userId);
    if (!validation.success || !validation.data?.isValid) {
      return {
        success: false,
        error: validation.data?.error || 'Invalid token',
      };
    }

    const linkRecord = validation.data.record!;

    // Check if user already has access
    const existingAccess = await db.query.resourceMembership.findFirst({
      where: and(
        eq(resourceMembership.resourceType, linkRecord.resourceType),
        eq(resourceMembership.resourceId, linkRecord.resourceId),
        eq(resourceMembership.allUserId, userId)
      ),
    });

    if (existingAccess) {
      return {
        success: true,
        data: true, // User already has access
      };
    }

    // Create resourceMembership entry for the user
    await db.insert(resourceMembership).values({
      resourceType: linkRecord.resourceType,
      resourceId: linkRecord.resourceId,
      allUserId: userId,
      role: 'guest', // Public links grant guest access
      permMask: 1, // View only
      grantSource: 'magic_link',
      sourceId: linkRecord.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    fatLogger.info('Access granted via public token', 'be', {
      operation: 'grant_access_via_token',
      resourceType: linkRecord.resourceType,
      resourceId: linkRecord.resourceId,
      userId,
      tokenId: linkRecord.id,
    });

    return {
      success: true,
      data: true,
    };
  } catch (error) {
    fatLogger.error('Failed to grant access via token', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'grant_access_via_token',
      token: token.substring(0, 8) + '...',
      userId,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Deactivate a public link
 */
export async function deactivatePublicLink(tokenId: string, deactivatedBy: string): Promise<OperationResult<boolean>> {
  try {
    await db
      .update(resourceShareTokens)
      .set({
        isActive: false,
      })
      .where(eq(resourceShareTokens.id, tokenId));

    fatLogger.info('Public link deactivated', 'be', {
      operation: 'deactivate_public_link',
      tokenId,
      deactivatedBy,
    });

    return {
      success: true,
      data: true,
    };
  } catch (error) {
    fatLogger.error('Failed to deactivate public link', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'deactivate_public_link',
      tokenId,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get all public links for a resource
 */
export async function getResourcePublicLinks(
  resourceType: string,
  resourceId: string
): Promise<OperationResult<PublicLinkRecord[]>> {
  try {
    const links = await db.query.resourceShareTokens.findMany({
      where: and(
        eq(resourceShareTokens.resourceType, resourceType as 'memory' | 'folder' | 'gallery'),
        eq(resourceShareTokens.resourceId, resourceId)
      ),
      orderBy: (resourceShareTokens, { desc }) => [desc(resourceShareTokens.createdAt)],
    });

    return {
      success: true,
      data: links as PublicLinkRecord[],
    };
  } catch (error) {
    fatLogger.error('Failed to get resource public links', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'get_resource_public_links',
      resourceType,
      resourceId,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Clean up expired tokens
 */
export async function cleanupExpiredTokens(): Promise<OperationResult<number>> {
  try {
    const now = new Date();

    const expiredTokens = await db.query.resourceShareTokens.findMany({
      where: and(
        eq(resourceShareTokens.isActive, true),
        or(isNull(resourceShareTokens.expiresAt), gt(resourceShareTokens.expiresAt, now))
      ),
    });

    // Deactivate expired tokens
    await db
      .update(resourceShareTokens)
      .set({
        isActive: false,
      })
      .where(
        and(
          eq(resourceShareTokens.isActive, true),
          or(isNull(resourceShareTokens.expiresAt), gt(resourceShareTokens.expiresAt, now))
        )
      );

    fatLogger.info('Expired tokens cleaned up', 'be', {
      operation: 'cleanup_expired_tokens',
      count: expiredTokens.length,
    });

    return {
      success: true,
      data: expiredTokens.length,
    };
  } catch (error) {
    fatLogger.error('Failed to cleanup expired tokens', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'cleanup_expired_tokens',
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate a shareable URL from a token
 */
export function generateShareableUrl(token: string, baseUrl?: string): string {
  const base = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${base}/shared/${token}`;
}
