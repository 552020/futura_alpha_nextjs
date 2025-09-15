/**
 * STORAGE PROVIDER TYPES
 *
 * This module defines the interfaces and types for the storage provider system.
 * It supports multiple storage backends (Vercel Blob, AWS S3, Arweave, IPFS, Cloudinary)
 * with a unified interface for frontend blob uploads.
 */

export interface UploadOptions {
  /** Custom filename for the upload */
  filename?: string;
  /** Additional metadata to store with the file */
  metadata?: Record<string, string>;
  /** Whether the file should be publicly accessible */
  public?: boolean;
  /** Custom content type override */
  contentType?: string;
  /** Upload progress callback */
  onProgress?: (progress: number) => void;
}

export interface UploadResult {
  /** Public URL to access the uploaded file */
  url: string;
  /** Storage key/path for the file */
  key: string;
  /** File size in bytes */
  size: number;
  /** MIME type of the file */
  mimeType: string;
  /** Additional metadata from the storage provider */
  metadata?: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  /** Storage provider name */
  provider: string;
}

export interface DeleteOptions {
  /** Storage key/path to delete */
  key: string;
  /** Additional options for deletion */
  options?: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

/**
 * Storage Provider Interface
 *
 * All storage providers must implement this interface to ensure
 * consistent behavior across different storage backends.
 */
export interface StorageProvider {
  /** Unique name identifier for this provider */
  readonly name: string;

  /** Upload a file to the storage provider */
  upload(file: File, options?: UploadOptions): Promise<UploadResult>;

  /** Delete a file from the storage provider */
  delete(options: DeleteOptions): Promise<void>;

  /** Get the public URL for a storage key */
  getUrl(key: string): string;

  /** Check if the provider is available/configured */
  isAvailable(): boolean;
}

/**
 * Storage Backend Types
 *
 * These match the storage_backend_t enum in the database schema
 */
export type StorageBackend = "s3" | "vercel_blob" | "icp" | "arweave" | "ipfs" | "cloudinary" | "neon";

/**
 * Storage Manager Configuration
 */
export interface StorageManagerConfig {
  /** Default storage backend to use */
  defaultBackend?: StorageBackend;
  /** Fallback backends in order of preference */
  fallbackBackends?: StorageBackend[];
  /** Maximum retry attempts for failed uploads */
  maxRetries?: number;
  /** Retry delay in milliseconds */
  retryDelay?: number;
}

/**
 * Upload Error Types
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly code?: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = "StorageError";
  }
}

export class UploadError extends StorageError {
  constructor(message: string, provider: string, public readonly file: File, code?: string, originalError?: Error) {
    super(message, provider, code, originalError);
    this.name = "UploadError";
  }
}

export class DeleteError extends StorageError {
  constructor(message: string, provider: string, public readonly key: string, code?: string, originalError?: Error) {
    super(message, provider, code, originalError);
    this.name = "DeleteError";
  }
}
