/**
 * Upload limits configuration
 *
 * Target requirements: 500 files × 20MB = 10GB per upload
 * Safety margins: +20% buffer for safety and performance
 */

export const UPLOAD_LIMITS = {
  // File size limits
  MAX_FILE_SIZE_MB: parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB || '24'), // 20MB + 20% safety
  MAX_FILES_PER_UPLOAD: parseInt(process.env.NEXT_PUBLIC_MAX_FILES_PER_UPLOAD || '600'), // 500 + 20% safety
  MAX_TOTAL_UPLOAD_SIZE_MB: parseInt(process.env.NEXT_PUBLIC_MAX_TOTAL_UPLOAD_SIZE_MB || '12000'), // 10GB + 20% safety

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
} as const;

// ICP-specific upload limits
export const UPLOAD_LIMITS_ICP = {
  // Inline upload limit (same as Vercel Blob for consistency)
  INLINE_MAX_BYTES: 1.5 * 1024 * 1024, // 1.5MB (ICP can handle up to 2MB, using 1.5MB for safety)

  // Chunking configuration
  CHUNK_SIZE_BYTES: 1.5 * 1024 * 1024, // 1.5MB chunks
  MAX_CHUNKS: 512, // Maximum number of chunks allowed

  // Derived values
  get INLINE_MAX_MB() {
    return this.INLINE_MAX_BYTES / (1024 * 1024);
  },

  get CHUNK_SIZE_KB() {
    return this.CHUNK_SIZE_BYTES / 1024;
  },

  // Validation helpers
  isInlineSizeValid(fileSize: number): boolean {
    return fileSize <= this.INLINE_MAX_BYTES;
  },

  getExpectedChunks(fileSize: number): number {
    return Math.ceil(fileSize / this.CHUNK_SIZE_BYTES);
  },

  isChunkCountValid(fileSize: number): boolean {
    return this.getExpectedChunks(fileSize) <= this.MAX_CHUNKS;
  },

  // Error messages
  getInlineSizeErrorMessage(fileSize: number): string {
    const fileSizeMB = Math.round((fileSize / (1024 * 1024)) * 100) / 100;
    return `File too large for inline upload: ${fileSizeMB}MB. Maximum inline size: ${this.INLINE_MAX_MB}MB`;
  },

  getChunkCountErrorMessage(fileSize: number): string {
    const chunks = this.getExpectedChunks(fileSize);
    return `File too large: ${chunks} chunks exceeds limit of ${this.MAX_CHUNKS} chunks`;
  },
} as const;

// Type for upload limits
export type UploadLimits = typeof UPLOAD_LIMITS;
export type UploadLimitsICP = typeof UPLOAD_LIMITS_ICP;
