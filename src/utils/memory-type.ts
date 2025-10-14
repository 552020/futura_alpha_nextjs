/**
 * Memory Type Detection Utility
 *
 * Centralized utility for determining memory type from MIME type and file extension.
 * Replaces scattered, duplicated logic across the codebase.
 */

import type { MemoryType } from '@/db/schema';

/**
 * Extract memory type from MIME type and optional file name
 *
 * @param mimeType - The MIME type of the file
 * @param fileName - Optional file name for extension fallback
 * @returns The detected memory type
 */
export function detectMemoryType(mimeType: string, fileName?: string): MemoryType {
  // Primary detection based on MIME type
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';

  // Fallback to file extension if MIME type is not specific
  if (fileName) {
    const extension = fileName.split('.').pop()?.toLowerCase();

    if (!extension) return 'document';

    // Image extensions
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff'].includes(extension)) {
      return 'image';
    }

    // Video extensions
    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(extension)) {
      return 'video';
    }

    // Audio extensions
    if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(extension)) {
      return 'audio';
    }
  }

  // Default to document for unknown types
  return 'document';
}

/**
 * Extract memory type from a File object
 *
 * @param file - The File object
 * @returns The detected memory type
 */
export function detectMemoryTypeFromFile(file: File): MemoryType {
  return detectMemoryType(file.type, file.name);
}

/**
 * Check if a memory type is a media type (image, video, audio)
 *
 * @param memoryType - The memory type to check
 * @returns True if the type is a media type
 */
export function isMediaType(memoryType: MemoryType): boolean {
  return ['image', 'video', 'audio'].includes(memoryType);
}

/**
 * Check if a memory type supports image processing (thumbnails, etc.)
 *
 * @param memoryType - The memory type to check
 * @returns True if the type supports image processing
 */
export function supportsImageProcessing(memoryType: MemoryType): boolean {
  return memoryType === 'image' || memoryType === 'video';
}
