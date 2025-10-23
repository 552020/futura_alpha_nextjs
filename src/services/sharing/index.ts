/**
 * SHARING SERVICE - Universal sharing functionality
 *
 * This module provides comprehensive sharing capabilities for any resource type
 * (memories, galleries, folders). Supports both user-to-user sharing and public link sharing.
 *
 * USAGE EXAMPLES:
 * ```typescript
 * // Create a user share
 * const share = await createShare({
 *   resourceType: 'memory',
 *   resourceId: 'memory-id',
 *   targetUserId: 'user-id',
 *   permissions: { canView: true, canEdit: false, canDelete: false },
 *   invitedBy: 'owner-id'
 * });
 *
 * // Create a public link
 * const publicLink = await createPublicLink({
 *   resourceType: 'memory',
 *   resourceId: 'memory-id',
 *   createdBy: 'owner-id',
 *   expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
 * });
 *
 * // Check access
 * const access = await checkResourceAccess({
 *   resourceType: 'memory',
 *   resourceId: 'memory-id',
 *   userId: 'user-id'
 * });
 * ```
 */

// Share operations (user-to-user sharing)
export {
  createShare,
  revokeShare,
  getResourceShares,
  getSharedResources,
  checkResourceAccess,
  createBulkShares,
} from './share-operations';

// Token operations (public link sharing)
export {
  createPublicLink,
  validatePublicToken,
  grantAccessViaToken,
  deactivatePublicLink,
  getResourcePublicLinks,
  cleanupExpiredTokens,
  generateShareableUrl,
} from './token-operations';

// Re-export shared types
export type { OperationResult } from '../shared/types';

// Types
export type {
  // Base types
  ShareableResourceType,

  // User sharing
  CreateShareParams,
  SharePermissions,
  ShareRecord,
  ShareListParams,
  ShareListResult,
  AccessCheckParams,
  AccessCheckResult,
  BulkShareParams,
  BulkShareResult,

  // Public link sharing
  CreatePublicLinkParams,
  PublicLinkRecord,
  PublicLinkAccess,
  TokenValidationResult,
  GenerateTokenParams,

  // Statistics and management
  ShareStats,
  EmailShareParams,
  EmailShareResult,
  CleanupParams,
  CleanupResult,
} from './types';
