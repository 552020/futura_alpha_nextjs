/**
 * Image utility functions for Next.js Image component optimization
 */

// Base64 encoded blur placeholder (1x1 pixel JPEG)
export const BLUR_DATA_URL =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q==';

/**
 * Generate a blur placeholder for user-uploaded images
 * This provides a smooth loading experience while the actual image loads
 */
export function getBlurPlaceholder(): string {
  return BLUR_DATA_URL;
}

/**
 * Check if an image URL is from an external source that supports optimization
 */
export function isExternalImage(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname !== 'localhost' && urlObj.hostname !== window.location.hostname;
  } catch {
    return false;
  }
}

/**
 * Get optimal image sizes for different use cases
 */
export const IMAGE_SIZES = {
  // Grid thumbnails
  grid: '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  // Gallery items
  gallery: '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw',
  // Hero/cover images
  hero: '100vw',
  // Lightbox/fullscreen
  lightbox: '100vw',
  // Profile images
  profile: '(max-width: 768px) 100vw, 400px',
  // Marketing images
  marketing: '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 90vw',
} as const;

export type ImageSizeKey = keyof typeof IMAGE_SIZES;
