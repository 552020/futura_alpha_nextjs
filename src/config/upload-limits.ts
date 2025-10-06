/**
 * Upload limits configuration
 *
 * General upload limits with platform-specific overrides.
 * Each platform inherits from the general limits and only overrides what's different.
 */

// General upload limits (default values for all platforms)
const GENERAL_UPLOAD_LIMITS = {
  // File size limits
  MAX_FILE_SIZE_MB: parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB || '24'), // 20MB + 20% safety
  MAX_FILES_PER_UPLOAD: parseInt(process.env.NEXT_PUBLIC_MAX_FILES_PER_UPLOAD || '600'), // 500 + 20% safety
  MAX_TOTAL_UPLOAD_SIZE_MB: parseInt(process.env.NEXT_PUBLIC_MAX_TOTAL_UPLOAD_SIZE_MB || '12000'), // 10GB + 20% safety

  // Inline storage limit (for database storage - same for all platforms)
  INLINE_MAX_BYTES: 32 * 1024, // 32KB (database storage limit)

  // Derived values for easier use
  get MAX_FILE_SIZE_BYTES() {
    return this.MAX_FILE_SIZE_MB * 1024 * 1024;
  },

  get MAX_TOTAL_UPLOAD_SIZE_BYTES() {
    return this.MAX_TOTAL_UPLOAD_SIZE_MB * 1024 * 1024;
  },

  // Validation helpers
  isFileSizeValid(fileSize: number): boolean {
    return fileSize <= this.MAX_FILE_SIZE_BYTES;
  },

  isFileCountValid(fileCount: number): boolean {
    return fileCount <= this.MAX_FILES_PER_UPLOAD;
  },

  isTotalSizeValid(totalSize: number): boolean {
    return totalSize <= this.MAX_TOTAL_UPLOAD_SIZE_BYTES;
  },

  isInlineSizeValid(fileSize: number): boolean {
    return fileSize <= this.INLINE_MAX_BYTES;
  },

  // Error messages
  getFileSizeErrorMessage(fileSize: number): string {
    const fileSizeMB = Math.round(fileSize / (1024 * 1024));
    return `File too large: ${fileSizeMB}MB. Maximum allowed: ${this.MAX_FILE_SIZE_MB}MB`;
  },

  getFileCountErrorMessage(fileCount: number): string {
    return `Too many files: ${fileCount}. Maximum allowed: ${this.MAX_FILES_PER_UPLOAD} files`;
  },

  getTotalSizeErrorMessage(totalSize: number): string {
    const totalSizeMB = Math.round(totalSize / (1024 * 1024));
    return `Total upload size too large: ${totalSizeMB}MB. Maximum allowed: ${this.MAX_TOTAL_UPLOAD_SIZE_MB}MB`;
  },

  getInlineSizeErrorMessage(fileSize: number): string {
    const fileSizeKB = Math.round(fileSize / 1024);
    return `File too large for inline storage: ${fileSizeKB}KB. Maximum inline size: 32KB`;
  },
} as const;

// S3-specific upload limits (inherits from general, no overrides needed)
export const UPLOAD_LIMITS_S3 = {
  ...GENERAL_UPLOAD_LIMITS,
} as const;

// ICP-specific upload limits (inherits from general, overrides file size limits)
export const UPLOAD_LIMITS_ICP = {
  ...GENERAL_UPLOAD_LIMITS,

  // ICP-specific overrides
  MAX_FILE_SIZE_MB: 921, // 512 chunks × 1.8MB (much larger than S3 due to chunking)

  // ICP-specific chunking configuration
  CHUNK_SIZE_BYTES: 1.8 * 1024 * 1024, // 1.8MB chunks (matches backend)
  MAX_CHUNKS: 512, // Maximum number of chunks allowed

  // Override derived values
  get MAX_FILE_SIZE_BYTES(): number {
    return this.MAX_FILE_SIZE_MB * 1024 * 1024;
  },

  // ICP-specific validation helpers
  getExpectedChunks(fileSize: number): number {
    return Math.ceil(fileSize / this.CHUNK_SIZE_BYTES);
  },

  isChunkCountValid(fileSize: number): boolean {
    return this.getExpectedChunks(fileSize) <= this.MAX_CHUNKS;
  },

  // Override file size validation to include chunk count check
  isFileSizeValid(fileSize: number): boolean {
    return fileSize <= this.MAX_FILE_SIZE_BYTES && this.isChunkCountValid(fileSize);
  },

  // ICP-specific error messages
  getChunkCountErrorMessage(fileSize: number): string {
    const chunks = this.getExpectedChunks(fileSize);
    return `File too large: ${chunks} chunks exceeds limit of ${this.MAX_CHUNKS} chunks`;
  },

  getFileSizeErrorMessage(fileSize: number): string {
    const fileSizeMB = Math.round(fileSize / (1024 * 1024));
    const chunks = this.getExpectedChunks(fileSize);
    if (chunks > this.MAX_CHUNKS) {
      return this.getChunkCountErrorMessage(fileSize);
    }
    return `File too large: ${fileSizeMB}MB. Maximum allowed: ${this.MAX_FILE_SIZE_MB}MB`;
  },
} as const;

// Vercel Blob-specific upload limits (inherits from general, overrides file size)
export const UPLOAD_LIMITS_VERCEL_BLOB = {
  ...GENERAL_UPLOAD_LIMITS,

  // Vercel Blob-specific overrides
  MAX_FILE_SIZE_MB: 50, // Vercel Blob has different limits
} as const;

// Arweave-specific upload limits (inherits from general, overrides file size)
export const UPLOAD_LIMITS_ARWEAVE = {
  ...GENERAL_UPLOAD_LIMITS,

  // Arweave-specific overrides
  MAX_FILE_SIZE_MB: 100, // Arweave can handle larger files
} as const;

// IPFS-specific upload limits (inherits from general, overrides file size)
export const UPLOAD_LIMITS_IPFS = {
  ...GENERAL_UPLOAD_LIMITS,

  // IPFS-specific overrides
  MAX_FILE_SIZE_MB: 200, // IPFS can handle very large files
} as const;

// Type for upload limits
export type UploadLimitsS3 = typeof UPLOAD_LIMITS_S3;
export type UploadLimitsICP = typeof UPLOAD_LIMITS_ICP;
export type UploadLimitsVercelBlob = typeof UPLOAD_LIMITS_VERCEL_BLOB;
export type UploadLimitsArweave = typeof UPLOAD_LIMITS_ARWEAVE;
export type UploadLimitsIPFS = typeof UPLOAD_LIMITS_IPFS;

// Legacy type alias for backward compatibility
export type UploadLimits = UploadLimitsS3;
