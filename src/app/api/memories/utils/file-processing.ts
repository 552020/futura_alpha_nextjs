/**
 * FILE PROCESSING UTILITIES
 *
 * This module handles file validation, type checking, and processing.
 * These functions are schema-agnostic and work with any file type.
 *
 * USAGE:
 * - Validate file types and sizes
 * - Check MIME types
 * - Process file metadata
 * - Log file details for debugging
 */

// Constants
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_VIDEO_SIZE = 25 * 1024 * 1024; // 25MB

// Self written notes are dealt in another route
export const ACCEPTED_MIME_TYPES = {
  image: [
    'image/jpeg', // .jpg, .jpeg
    'image/png', // .png
    'image/gif', // .gif
    'image/webp', // .webp
    'image/tiff', // .tiff
  ],
  document: [
    'application/pdf', // .pdf
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/rtf', // .rtf
    'application/epub+zip', // .epub

    // OpenDocument
    'application/vnd.oasis.opendocument.text', // .odt

    // Plain text and markdown
    'text/plain', // .txt
    'text/markdown', // .md
    'text/x-markdown', // .md

    // Org mode
    'text/x-org', // .org
  ],
  video: [
    'video/mp4', // .mp4
    'video/quicktime', // .mov
    'video/x-msvideo', // .avi
    'video/webm', // .webm
  ],
} as const;

export type AcceptedMimeType =
  | (typeof ACCEPTED_MIME_TYPES.image)[number]
  | (typeof ACCEPTED_MIME_TYPES.document)[number]
  | (typeof ACCEPTED_MIME_TYPES.video)[number];

export type FileValidationResult = {
  isValid: boolean;
  error?: string;
  fileType?: { mime: AcceptedMimeType };
  metadata?: {
    uploadedAt: string;
    originalName: string;
    size: number;
    mimeType: AcceptedMimeType;
  };
  buffer?: Buffer;
};

export function isAcceptedMimeType(mime: string): mime is AcceptedMimeType {
  return [...ACCEPTED_MIME_TYPES.image, ...ACCEPTED_MIME_TYPES.document, ...ACCEPTED_MIME_TYPES.video].includes(
    mime as AcceptedMimeType
  );
}

/**
 * Safely convert a string to AcceptedMimeType
 * Only use this after validating with isAcceptedMimeType()
 */
export function toAcceptedMimeType(mime: string): AcceptedMimeType {
  if (!isAcceptedMimeType(mime)) {
    throw new Error(`Invalid mime type: ${mime}`);
  }
  return mime;
}

export function getMemoryType(mime: AcceptedMimeType): 'document' | 'image' | 'video' {
  if (ACCEPTED_MIME_TYPES.image.includes(mime as (typeof ACCEPTED_MIME_TYPES.image)[number])) return 'image';
  if (ACCEPTED_MIME_TYPES.video.includes(mime as (typeof ACCEPTED_MIME_TYPES.video)[number])) return 'video';
  return 'document';
}

export async function validateFile(file: File): Promise<{ isValid: boolean; error?: string; buffer?: Buffer }> {
  // Check file size
  const isVideo = file.type.startsWith('video/');
  const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_FILE_SIZE;
  if (file.size > maxSize) {
    return { isValid: false, error: 'File too large' };
  }

  // Check mime type
  if (!isAcceptedMimeType(file.type)) {
    return { isValid: false, error: 'Invalid file type' };
  }

  // Get file buffer
  const buffer = Buffer.from(await file.arrayBuffer());

  // Skip file type validation for text files (like .md, .txt) because:
  // 1. Text files don't have a specific binary signature (magic numbers)
  // 2. file-type package can't reliably detect text file types
  // 3. We already validated the mime type above, which is sufficient for text files
  if (file.type.startsWith('text/')) {
    return { isValid: true, buffer };
  }

  // Validate file type for non-text files
  const { fileTypeFromBuffer } = await import('file-type');
  const fileType = await fileTypeFromBuffer(buffer);
  if (!fileType) {
    return { isValid: false, error: 'Could not determine file type' };
  }

  // Check if the detected mime type matches the file's mime type
  const memoryType = getMemoryType(file.type);
  if (memoryType === 'video' && !fileType.mime.startsWith('video/')) {
    return { isValid: false, error: 'Invalid video file' };
  }
  if (memoryType === 'image' && !fileType.mime.startsWith('image/')) {
    return { isValid: false, error: 'Invalid image file' };
  }

  return { isValid: true, buffer };
}

/**
 * Validate file MIME type
 * Returns error response if file type is not accepted
 */
export function validateFileType(file: File, isAcceptedMimeType: (mime: string) => boolean): { error: string | null } {
  if (!isAcceptedMimeType(file.type)) {
    return { error: 'Invalid file type' };
  }
  return { error: null };
}

/**
 * Perform comprehensive file validation with error handling
 * Returns validation result or error response
 */
export async function validateFileWithErrorHandling(
  file: File,
  validateFile: (file: File) => Promise<{ isValid: boolean; error?: string; buffer?: Buffer }>
): Promise<{
  validationResult: { isValid: boolean; error?: string; buffer?: Buffer } | null;
  error: string | null;
}> {
  let validationResult;
  try {
    // console.log("🔍 Starting file validation...");
    validationResult = await validateFile(file);
    if (!validationResult.isValid) {
      console.error('❌ File validation failed:', validationResult.error);
      return {
        validationResult: null,
        error: validationResult.error || 'File validation failed',
      };
    }
    // console.log("✅ File validation successful:", {
    //   type: file.type,
    //   size: file.size,
    // });
    return { validationResult, error: null };
  } catch (validationError) {
    console.error('❌ Validation error:', validationError);
    return {
      validationResult: null,
      error: validationError instanceof Error ? validationError.message : String(validationError),
    };
  }
}

/**
 * Log file details for debugging
 * Used for both single file and folder uploads
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function logFileDetails(file: File): void {
  // console.log("📄 File details:", {
  //   name: file.name,
  //   type: file.type,
  //   size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
  // });
}

/**
 * Log multiple file details for debugging
 * Used for folder uploads
 */
export function logMultipleFileDetails(files: File[]): void {
  // console.log(`📁 Folder contains ${files.length} files:`);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  files.forEach((_file, _index) => {
    // console.log(`  ${_index + 1}. `);
  });
}

/**
 * Extract folder information from file path
 * Used for folder uploads to determine folder name and preserve original path
 */
export function extractFolderInfo(fileName: string): { originalPath: string; folderName: string } {
  // When using webkitdirectory, fileName contains the full relative path
  // e.g., "Wedding Photos/ceremony/img001.jpg" -> folderName: "Wedding Photos"
  const pathParts = fileName.split('/');
  const folderName = pathParts.length > 1 ? pathParts[0] : 'Ungrouped';

  return {
    originalPath: fileName,
    folderName: folderName,
  };
}
