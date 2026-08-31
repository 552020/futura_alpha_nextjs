/**
 * Upload-related type definitions
 */

/**
 * File input attribute mode - controls which HTML attributes are set on the file input
 *
 * - 'directory': Sets webkitdirectory, directory, and multiple attributes (folder selection)
 * - 'multiple-files': Sets multiple attribute only (multiple file selection)
 * - 'single': No special attributes (default single file selection)
 */
export type FileInputAttributeMode = 'directory' | 'multiple-files' | 'single';

/**
 * Props for the useFileUpload hook
 */
export interface UseFileUploadProps {
  mode?: FileInputAttributeMode;
  isOnboarding?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

// ============================================================================
// DOMAIN TYPES - Single source of truth for app code (camelCase)
// ============================================================================

/**
 * Storage backend types - canonical domain representation
 * Matches database schema and includes all supported providers
 */
export type StorageBackend =
  | 's3'
  | 'vercel_blob'
  | 'icp'
  | 'arweave'
  | 'ipfs'
  | 'neon';

/**
 * Upload result - domain representation of completed upload
 * Used throughout the application for type safety
 */
export interface UploadResult {
  memoryId: string;
  blobId: string;
  remoteId?: string;
  size: bigint;
  checksumSha256?: Uint8Array;
  storageBackend: StorageBackend;
  storageLocation: string;
  uploadedAt: bigint;
  expiresAt?: bigint;
}

/**
 * Upload progress - frontend-only type for UI progress tracking
 * Not exposed by backend, used for real-time upload status
 */
export interface UploadProgress {
  fileIndex: number;
  totalFiles: number;
  currentFile: string;
  bytesUploaded: bigint;
  totalBytes: bigint;
  percentage: number;
  status: 'uploading' | 'processing' | 'finalizing' | 'completed' | 'error';
  message?: string;
}
