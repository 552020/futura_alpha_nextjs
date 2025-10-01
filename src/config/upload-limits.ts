/**
 * Upload limits configuration
 *
 * Target requirements: 500 files × 20MB = 10GB per upload
 * Safety margins: +20% buffer for safety and performance
 */

// S3-specific upload limits (direct upload, no chunking)
export const UPLOAD_LIMITS_S3 = {
  // File size limits
  MAX_FILE_SIZE_MB: parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB || '24'), // 20MB + 20% safety
  MAX_FILES_PER_UPLOAD: parseInt(process.env.NEXT_PUBLIC_MAX_FILES_PER_UPLOAD || '600'), // 500 + 20% safety
  MAX_TOTAL_UPLOAD_SIZE_MB: parseInt(process.env.NEXT_PUBLIC_MAX_TOTAL_UPLOAD_SIZE_MB || '12000'), // 10GB + 20% safety

  // Inline storage limit (for database storage - same as ICP)
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

// ICP-specific upload limits (chunked upload)
export const UPLOAD_LIMITS_ICP = {
  // Chunking configuration
  CHUNK_SIZE_BYTES: 1.5 * 1024 * 1024, // 1.5MB chunks (frontend optimized)
  MAX_CHUNKS: 512, // Maximum number of chunks allowed
  MAX_FILE_SIZE_MB: 768, // 512 chunks × 1.5MB

  // Inline storage limit (for database storage - same as S3)
  INLINE_MAX_BYTES: 32 * 1024, // 32KB (database storage limit)

  // Derived values
  get CHUNK_SIZE_MB() {
    return this.CHUNK_SIZE_BYTES / (1024 * 1024);
  },

  get MAX_FILE_SIZE_BYTES() {
    return this.MAX_FILE_SIZE_MB * 1024 * 1024;
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

  isFileSizeValid(fileSize: number): boolean {
    return fileSize <= this.MAX_FILE_SIZE_BYTES;
  },

  // Error messages
  getInlineSizeErrorMessage(fileSize: number): string {
    const fileSizeKB = Math.round(fileSize / 1024);
    return `File too large for inline storage: ${fileSizeKB}KB. Maximum inline size: 32KB`;
  },

  getChunkCountErrorMessage(fileSize: number): string {
    const chunks = this.getExpectedChunks(fileSize);
    return `File too large: ${chunks} chunks exceeds limit of ${this.MAX_CHUNKS} chunks`;
  },

  getFileSizeErrorMessage(fileSize: number): string {
    const fileSizeMB = Math.round(fileSize / (1024 * 1024));
    return `File too large: ${fileSizeMB}MB. Maximum allowed: ${this.MAX_FILE_SIZE_MB}MB`;
  },
} as const;

// Type for upload limits
export type UploadLimitsS3 = typeof UPLOAD_LIMITS_S3;
export type UploadLimitsICP = typeof UPLOAD_LIMITS_ICP;

// Legacy type alias for backward compatibility
export type UploadLimits = UploadLimitsS3;
