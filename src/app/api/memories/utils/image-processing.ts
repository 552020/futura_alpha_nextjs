/**
 * IMAGE PROCESSING UTILITIES
 *
 * This module handles client-side image processing for generating multiple optimized assets.
 * It creates display and thumbnail versions of images for better performance and user experience.
 *
 * USAGE:
 * - Generate display versions (~2048px long edge, WebP)
 * - Generate thumbnail versions (~512px long edge, WebP)
 * - Process images in the browser before upload
 * - Support multiple image formats (JPEG, PNG, WebP)
 *
 * ASSET TYPES:
 * - original: Full resolution file (uploaded as-is)
 * - display: Optimized for viewing (~2048px long edge, WebP, 150-400KB)
 * - thumb: Grid thumbnails (~512px long edge, WebP, 20-60KB)
 */

// Constants for image processing
export const DISPLAY_MAX_SIZE = 2048; // Maximum long edge for display version
export const THUMB_MAX_SIZE = 512; // Maximum long edge for thumbnail version
export const DISPLAY_QUALITY = 0.85; // JPEG/WebP quality for display
export const THUMB_QUALITY = 0.8; // JPEG/WebP quality for thumbnail

export interface ProcessedImageAsset {
  assetType: "original" | "display" | "thumb";
  blob: Blob;
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
 * Process an image file to create multiple optimized versions
 * This function runs in the browser and creates display and thumbnail versions
 */
export async function processImageForMultipleAssets(file: File): Promise<ImageProcessingResult> {
  // Validate file type
  if (!file.type.startsWith("image/")) {
    throw new Error("File is not an image");
  }

  // Create image element and load the file
  const img = new Image();
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  // Load image
  const imageDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = imageDataUrl;
  });

  const originalWidth = img.naturalWidth;
  const originalHeight = img.naturalHeight;

  // Create original asset (no processing needed)
  const originalAsset: ProcessedImageAsset = {
    assetType: "original",
    blob: file,
    width: originalWidth,
    height: originalHeight,
    size: file.size,
    mimeType: file.type,
  };

  // Create display version
  const displayAsset = await createOptimizedVersion(img, canvas, ctx, DISPLAY_MAX_SIZE, DISPLAY_QUALITY, "display");

  // Create thumbnail version
  const thumbAsset = await createOptimizedVersion(img, canvas, ctx, THUMB_MAX_SIZE, THUMB_QUALITY, "thumb");

  return {
    original: originalAsset,
    display: displayAsset,
    thumb: thumbAsset,
  };
}

/**
 * Create an optimized version of an image
 */
async function createOptimizedVersion(
  img: HTMLImageElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  maxSize: number,
  quality: number,
  assetType: "display" | "thumb"
): Promise<ProcessedImageAsset> {
  const { width, height } = calculateDimensions(img.naturalWidth, img.naturalHeight, maxSize);

  // Set canvas dimensions
  canvas.width = width;
  canvas.height = height;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Draw image
  ctx.drawImage(img, 0, 0, width, height);

  // Convert to blob
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create blob"));
        }
      },
      "image/webp", // Use WebP for better compression
      quality
    );
  });

  return {
    assetType,
    blob,
    width,
    height,
    size: blob.size,
    mimeType: "image/webp",
  };
}

/**
 * Calculate new dimensions while maintaining aspect ratio
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxSize: number
): { width: number; height: number } {
  const aspectRatio = originalWidth / originalHeight;

  let width: number;
  let height: number;

  if (originalWidth > originalHeight) {
    // Landscape
    width = Math.min(originalWidth, maxSize);
    height = width / aspectRatio;
  } else {
    // Portrait or square
    height = Math.min(originalHeight, maxSize);
    width = height * aspectRatio;
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}

/**
 * Upload multiple processed assets to blob storage
 * This function handles uploading all three versions (original, display, thumb)
 */
export async function uploadProcessedAssetsToBlob(
  processedAssets: ImageProcessingResult,
  baseFileName: string
): Promise<{
  original: { url: string; storageKey: string };
  display: { url: string; storageKey: string };
  thumb: { url: string; storageKey: string };
}> {
  const { put } = await import("@vercel/blob");

  // Generate unique file names
  const timestamp = Date.now();
  const originalFileName = `${timestamp}-${baseFileName}`;
  const displayFileName = `${timestamp}-${baseFileName.replace(/\.[^/.]+$/, "_display.webp")}`;
  const thumbFileName = `${timestamp}-${baseFileName.replace(/\.[^/.]+$/, "_thumb.webp")}`;

  // Upload all three versions in parallel
  const [originalResult, displayResult, thumbResult] = await Promise.all([
    // Upload original
    put(`uploads/${originalFileName}`, processedAssets.original.blob, {
      access: "public",
      contentType: processedAssets.original.mimeType,
    }),
    // Upload display
    put(`uploads/${displayFileName}`, processedAssets.display.blob, {
      access: "public",
      contentType: processedAssets.display.mimeType,
    }),
    // Upload thumbnail
    put(`uploads/${thumbFileName}`, processedAssets.thumb.blob, {
      access: "public",
      contentType: processedAssets.thumb.mimeType,
    }),
  ]);

  return {
    original: {
      url: originalResult.url,
      storageKey: originalFileName,
    },
    display: {
      url: displayResult.url,
      storageKey: displayFileName,
    },
    thumb: {
      url: thumbResult.url,
      storageKey: thumbFileName,
    },
  };
}

/**
 * Create asset data for database insertion
 * This function formats the processed assets for the memory_assets table
 */
export function createAssetDataFromProcessed(
  memoryId: string,
  processedAssets: ImageProcessingResult,
  blobResults: {
    original: { url: string; storageKey: string };
    display: { url: string; storageKey: string };
    thumb: { url: string; storageKey: string };
  }
) {
  return [
    {
      memoryId,
      assetType: "original" as const,
      variant: null,
      url: blobResults.original.url,
      storageBackend: "vercel_blob" as const,
      storageKey: blobResults.original.storageKey,
      bytes: processedAssets.original.size,
      width: processedAssets.original.width,
      height: processedAssets.original.height,
      mimeType: processedAssets.original.mimeType,
      sha256: null, // Will be calculated by client-side processing
      processingStatus: "completed" as const,
      processingError: null,
    },
    {
      memoryId,
      assetType: "display" as const,
      variant: null,
      url: blobResults.display.url,
      storageBackend: "vercel_blob" as const,
      storageKey: blobResults.display.storageKey,
      bytes: processedAssets.display.size,
      width: processedAssets.display.width,
      height: processedAssets.display.height,
      mimeType: processedAssets.display.mimeType,
      sha256: null, // Will be calculated by client-side processing
      processingStatus: "completed" as const,
      processingError: null,
    },
    {
      memoryId,
      assetType: "thumb" as const,
      variant: null,
      url: blobResults.thumb.url,
      storageBackend: "vercel_blob" as const,
      storageKey: blobResults.thumb.storageKey,
      bytes: processedAssets.thumb.size,
      width: processedAssets.thumb.width,
      height: processedAssets.thumb.height,
      mimeType: processedAssets.thumb.mimeType,
      sha256: null, // Will be calculated by client-side processing
      processingStatus: "completed" as const,
      processingError: null,
    },
  ];
}

/**
 * Process and upload image with multiple assets in one operation
 * This is a convenience function that combines processing and uploading
 */
export async function processAndUploadImageWithMultipleAssets(
  file: File,
  memoryId: string
): Promise<{
  assets: Array<{
    assetType: "original" | "display" | "thumb";
    url: string;
    storageKey: string;
    bytes: number;
    width: number;
    height: number;
    mimeType: string;
  }>;
}> {
  // Process the image
  const processedAssets = await processImageForMultipleAssets(file);

  // Upload to blob storage
  const baseFileName = file.name.replace(/[^a-zA-Z0-9-_\.]/g, "_");
  const blobResults = await uploadProcessedAssetsToBlob(processedAssets, baseFileName);

  // Create asset data
  const assetData = createAssetDataFromProcessed(memoryId, processedAssets, blobResults);

  return {
    assets: assetData.map((asset) => ({
      assetType: asset.assetType,
      url: asset.url,
      storageKey: asset.storageKey,
      bytes: asset.bytes,
      width: asset.width!,
      height: asset.height!,
      mimeType: asset.mimeType,
    })),
  };
}
