/**
 * Unified upload types for all storage backends
 *
 * This file standardizes types across S3, ICP, Vercel Blob, Arweave, and IPFS
 * to ensure consistency and maintainability.
 */

// ============================================================================
// DOMAIN TYPES - Import from canonical domain types
// ============================================================================

// Re-export domain types for backward compatibility
export type { UploadResult, UploadProgress, StorageBackend } from '@/types/upload';

// Import types for use in this file
import type { UploadResult, StorageBackend } from '@/types/upload';

/**
 * Unified service result for all storage backends
 * Replaces UploadServiceResult and individual result types
 */
export interface UploadServiceResult {
  // Core data
  data: { id: string; ownerId?: string }; // ownerId for onboarding context
  results: UploadResult[];
  userId: string;

  // Metadata
  totalFiles: number;
  totalSize: number;
  processingTime: number;

  // Storage info
  storageBackend: StorageBackend;
  databaseBackend: 'neon' | 'icp';
}

// ============================================================================
// STORAGE-SPECIFIC TYPES
// ============================================================================

/**
 * S3-specific upload configuration
 */
export interface S3UploadConfig {
  bucket: string;
  region: string;
  accessKey: string;
  secretKey: string;
  presignedUrl: string;
  expiresAt: Date;
}

/**
 * ICP-specific upload configuration
 */
export interface ICPUploadConfig {
  canisterId: string;
  network: 'local' | 'mainnet';
  capsuleId: string;
  sessionId: string;
  chunkSize: number;
  maxChunks: number;
}

/**
 * Vercel Blob-specific upload configuration
 */
export interface VercelBlobUploadConfig {
  token: string;
  url: string;
  expiresAt: Date;
}

/**
 * Arweave-specific upload configuration
 */
export interface ArweaveUploadConfig {
  wallet: string;
  gateway: string;
  tags: Record<string, string>;
}

/**
 * IPFS-specific upload configuration
 */
export interface IPFSUploadConfig {
  gateway: string;
  pinningService: string;
  apiKey: string;
}

// ============================================================================
// UPLOAD LIMITS TYPES
// ============================================================================

/**
 * Unified upload limits for all storage backends
 */
export interface UploadLimits {
  // File size limits
  maxFileSizeBytes: number;
  maxTotalSizeBytes: number;
  maxFilesPerUpload: number;

  // Storage-specific limits
  inlineMaxBytes: number;
  chunkSizeBytes?: number;
  maxChunks?: number;

  // Time limits
  uploadTimeoutMs: number;
  sessionTimeoutMs: number;
}

// ============================================================================
// PROCESSING TYPES
// ============================================================================

/**
 * Image processing result for derivatives
 */
export interface ProcessedBlobs {
  display?: {
    blob: Blob;
    mimeType: string;
    width: number;
    height: number;
    bytes: number;
  };
  thumb?: {
    blob: Blob;
    mimeType: string;
    width: number;
    height: number;
    bytes: number;
  };
  placeholder?: {
    dataUrl: string;
    width: number;
    height: number;
    bytes: number;
  };
}

/**
 * Processed assets result for database storage
 */
export interface ProcessedAssets {
  display?: {
    url: string;
    storageKey: string;
    assetLocation: string;
  };
  thumb?: {
    url: string;
    storageKey: string;
    assetLocation: string;
  };
  placeholder?: {
    url: string;
    storageKey: string;
    assetLocation: string;
  };
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Unified upload error for all storage backends
 */
export interface UploadError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  retryable: boolean;
  timestamp: Date;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if upload result is from S3
 */
export function isS3UploadResult(result: UploadResult): boolean {
  return result.storageBackend === 's3';
}

/**
 * Type guard to check if upload result is from ICP
 */
export function isICPUploadResult(result: UploadResult): boolean {
  return result.storageBackend === 'icp';
}

/**
 * Type guard to check if upload result is from Vercel Blob
 */
export function isVercelBlobUploadResult(result: UploadResult): boolean {
  return result.storageBackend === 'vercel_blob';
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Upload mode for different use cases
 */
export type UploadMode = 'single' | 'multiple-files' | 'directory';

// StorageBackend is now imported from domain types above

/**
 * Database backend type
 */
export type DatabaseBackend = 'neon' | 'icp';

/**
 * Asset type for derivatives
 */
export type AssetType = 'original' | 'display' | 'thumb' | 'placeholder';

/**
 * Asset location for storage tracking
 */
export type AssetLocation = 's3' | 'icp' | 'vercel-blob' | 'arweave' | 'ipfs' | 'neon';
