/**
 * STORAGE MODULE EXPORTS
 *
 * This module exports all storage-related functionality for the blob-first upload system.
 */

// Core types and interfaces
export type {
  StorageProvider,
  StorageBackend,
  StorageManagerConfig,
  UploadOptions,
  UploadResult,
  DeleteOptions,
} from "./types";

// Import for internal use
import type { StorageManagerConfig } from "./types";

export { StorageError, UploadError, DeleteError } from "./types";

// Storage manager
export { StorageManager } from "./storage-manager";
import { StorageManager } from "./storage-manager";

// Individual providers
export { VercelBlobProvider } from "./providers/vercel-blob";
export { AWSS3Provider } from "./providers/aws-s3";
export { ArweaveProvider } from "./providers/arweave";
export { IPFSProvider } from "./providers/ipfs";
export { CloudinaryProvider } from "./providers/cloudinary";
export { ICPProvider } from "./providers/icp";

// Convenience function to create a default storage manager
export function createStorageManager(config?: StorageManagerConfig) {
  return new StorageManager(config);
}
