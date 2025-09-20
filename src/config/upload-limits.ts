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

// Type for upload limits
export type UploadLimits = typeof UPLOAD_LIMITS;
