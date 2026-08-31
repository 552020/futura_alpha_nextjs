/**
 * SHARING SERVICE TYPES
 *
 * Type definitions for the sharing service operations.
 * Uses database types and shared types to avoid duplication.
 */

import type {
  ResourceType,
  resourceMembership,
  resourceShareTokens,
} from '@/db';

// Resource sharing types (reuse database types)
export type ShareableResourceType = ResourceType; // 'memory' | 'gallery' | 'folder'

// Derive types from database schema
export type ShareRecord = typeof resourceMembership.$inferSelect;
export type NewShareRecord = typeof resourceMembership.$inferInsert;
export type PublicLinkRecord = typeof resourceShareTokens.$inferSelect;
export type NewPublicLinkRecord = typeof resourceShareTokens.$inferInsert;

// User-to-user sharing
export interface CreateShareParams {
  resourceType: ShareableResourceType;
  resourceId: string;
  targetUserId: string;
  permissions?: SharePermissions;
  invitedBy: string;
}

export interface SharePermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

// Public link sharing
export interface CreatePublicLinkParams {
  resourceType: ShareableResourceType;
  resourceId: string;
  createdBy: string;
  expiresAt?: Date;
  isActive?: boolean;

  // Enhanced access control
  allowedUsers?: string[]; // Array of user IDs
  allowedRoles?: string[]; // Array of roles
  requireAuth?: boolean; // Must be logged in
  accessRestrictions?: Record<string, unknown>; // Custom restrictions
}

export interface PublicLinkAccess {
  isValid: boolean;
  isExpired: boolean;
  record?: PublicLinkRecord;
  error?: string;

  // Enhanced access control results
  requiresAuth?: boolean;
  userAllowed?: boolean;
  roleAllowed?: boolean;
  accessGranted?: boolean;
}

// Share management
export interface ShareListParams {
  resourceType: ShareableResourceType;
  resourceId: string;
  includeInactive?: boolean;
}

export interface ShareListResult {
  userShares: ShareRecord[];
  publicLinks: PublicLinkRecord[];
  totalShares: number;
}

// Token operations
export interface TokenValidationResult {
  isValid: boolean;
  isExpired: boolean;
  record?: PublicLinkRecord;
  error?: string;
}

export interface GenerateTokenParams {
  resourceType: ShareableResourceType;
  resourceId: string;
  createdBy: string;
  expiresAt?: Date;
}

// Share access control
export interface AccessCheckParams {
  resourceType: ShareableResourceType;
  resourceId: string;
  userId: string;
}

export interface AccessCheckResult {
  hasAccess: boolean;
  accessLevel: 'owner' | 'admin' | 'member' | 'guest' | 'none';
  permissions: SharePermissions;
  source: 'ownership' | 'user_share' | 'public_link' | 'group_share' | 'none';
}

// Share statistics
export interface ShareStats {
  totalShares: number;
  activeShares: number;
  publicLinks: number;
  activePublicLinks: number;
  expiredLinks: number;
}

// Email sharing (future feature)
export interface EmailShareParams {
  resourceType: ShareableResourceType;
  resourceId: string;
  emails: string[];
  permissions: SharePermissions;
  message?: string;
  invitedBy: string;
}

export interface EmailShareResult {
  success: boolean;
  createdShares: number;
  failedEmails: string[];
  error?: string;
}

// Bulk operations
export interface BulkShareParams {
  resourceType: ShareableResourceType;
  resourceIds: string[];
  targetUserId: string;
  permissions: SharePermissions;
  invitedBy: string;
}

export interface BulkShareResult {
  success: boolean;
  createdShares: number;
  failedResources: string[];
  error?: string;
}

// Share cleanup
export interface CleanupParams {
  resourceType?: ShareableResourceType;
  resourceId?: string;
  userId?: string;
  expiredOnly?: boolean;
}

export interface CleanupResult {
  removedShares: number;
  removedTokens: number;
  error?: string;
}
