/**
 * Backend image processing utilities using Node.js libraries (sharp)
 * This file is only used on the server side and should not be imported by frontend code.
 */

import sharp from "sharp";

export interface ProcessedImageAsset {
  assetType: "original" | "display" | "thumb";
  blob: File;
  width: number;
  height: number;
  size: number;
  mimeType: string;
}

export interface ImageProcessingResult {
  original: ProcessedImageAsset;
  display: ProcessedImageAsset;
  thumb: ProcessedImageAsset;
}

/**
 * Backend implementation using Node.js libraries (sharp)
 */
export async function processImageForMultipleAssetsBackend(file: File): Promise<ImageProcessingResult> {
  // Convert File to Buffer for sharp processing
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Get image metadata
  const metadata = await sharp(buffer).metadata();
  const { width: originalWidth, height: originalHeight } = metadata;

  if (!originalWidth || !originalHeight) {
    throw new Error("Could not determine image dimensions");
  }

  // Calculate resize dimensions
  const displaySize = calculateResizeDimensions(originalWidth, originalHeight, 2048);
  const thumbSize = calculateResizeDimensions(originalWidth, originalHeight, 512);

  // Process images in parallel
  const [originalBuffer, displayBuffer, thumbBuffer] = await Promise.all([
    // Original: Convert to WebP with high quality
    sharp(buffer).webp({ quality: 90 }).toBuffer(),

    // Display: Resize and convert to WebP
    sharp(buffer)
      .resize(displaySize.width, displaySize.height, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer(),

    // Thumbnail: Resize and convert to WebP
    sharp(buffer)
      .resize(thumbSize.width, thumbSize.height, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer(),
  ]);

  // Create File objects for each processed image
  const originalBlob = new File([new Uint8Array(originalBuffer)], file.name, { type: "image/webp" });
  const displayBlob = new File([new Uint8Array(displayBuffer)], `display_${file.name}`, { type: "image/webp" });
  const thumbBlob = new File([new Uint8Array(thumbBuffer)], `thumb_${file.name}`, { type: "image/webp" });

  return {
    original: {
      assetType: "original",
      blob: originalBlob,
      width: originalWidth,
      height: originalHeight,
      size: originalBuffer.length,
      mimeType: "image/webp",
    },
    display: {
      assetType: "display",
      blob: displayBlob,
      width: displaySize.width,
      height: displaySize.height,
      size: displayBuffer.length,
      mimeType: "image/webp",
    },
    thumb: {
      assetType: "thumb",
      blob: thumbBlob,
      width: thumbSize.width,
      height: thumbSize.height,
      size: thumbBuffer.length,
      mimeType: "image/webp",
    },
  };
}

/**
 * Calculate resize dimensions while maintaining aspect ratio
 */
function calculateResizeDimensions(
  originalWidth: number,
  originalHeight: number,
  maxSize: number
): { width: number; height: number } {
  if (originalWidth <= maxSize && originalHeight <= maxSize) {
    return { width: originalWidth, height: originalHeight };
  }

  const aspectRatio = originalWidth / originalHeight;

  if (originalWidth > originalHeight) {
    return {
      width: maxSize,
      height: Math.round(maxSize / aspectRatio),
    };
  } else {
    return {
      width: Math.round(maxSize * aspectRatio),
      height: maxSize,
    };
  }
}
