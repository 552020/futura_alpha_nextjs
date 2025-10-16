import { fatLogger } from '@/lib/logger';

/**
 * Image Processing Web Worker
 *
 * Phase 1: Real image processing for Lane B
 * Processes images to create display → thumb → placeholder chain
 */

// Worker message types
interface ProcessMessage {
  kind: 'process';
  file: File;
  maxDisplaySize: number;
  maxThumbSize: number;
  maxPlaceholderSize: number;
}

interface ProcessResponse {
  kind: 'process';
  ok: boolean;
  display?: ProcessedAsset;
  thumb?: ProcessedAsset;
  placeholder?: { dataUrl: string; width: number; height: number; bytes: number };
  error?: string;
}

interface ProcessedAsset {
  blob: Blob;
  width: number;
  height: number;
  mimeType: string;
  bytes: number;
}

// Supported image formats
const SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];

// Main worker message handler
self.onmessage = async (e: MessageEvent<ProcessMessage>) => {
  const { kind, file, maxDisplaySize = 2048, maxThumbSize = 512, maxPlaceholderSize = 32 } = e.data || {};

  try {
    if (kind !== 'process') {
      throw new Error(`Unknown message kind: ${kind}`);
    }

    // Check if format is supported
    if (!SUPPORTED_FORMATS.includes(file.type)) {
      const response: ProcessResponse = {
        kind: 'process',
        ok: false,
        error: `Unsupported format: ${file.type}`,
      };
      self.postMessage(response);
      return;
    }

    fatLogger.info(`🖼️ Worker processing: ${file.name} (${file.type})`, 'fe');

    // Create image from file
    const image = await createImageFromFile(file);

    // Process display version (2048px max)
    const display = await processToDisplay(image, maxDisplaySize);

    // Process thumb from display (512px max)
    const thumb = await processToThumb(display.blob, maxThumbSize);

    // Process placeholder from thumb (32px max, data URL)
    const placeholder = await processToPlaceholder(thumb.blob, maxPlaceholderSize);

    // 🔍 [Worker] Log processing results
    console.log('🔍 [Worker] Processing completed for:', file.name);
    console.log('🔍 [Worker] Display result:', {
      width: display.width,
      height: display.height,
      bytes: display.bytes,
      mimeType: display.mimeType,
    });
    console.log('🔍 [Worker] Thumbnail result:', {
      width: thumb.width,
      height: thumb.height,
      bytes: thumb.bytes,
      mimeType: thumb.mimeType,
    });
    console.log('🔍 [Worker] Placeholder result:', {
      width: placeholder.width,
      height: placeholder.height,
      bytes: placeholder.bytes,
    });

    const response: ProcessResponse = {
      kind: 'process',
      ok: true,
      display,
      thumb,
      placeholder,
    };

    self.postMessage(response);
  } catch (error) {
    fatLogger.error('Worker processing error', 'fe', { data: error as Error });
    const response: ProcessResponse = {
      kind: 'process',
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
    self.postMessage(response);
  }
};

/**
 * Create ImageBitmap from File
 */
function createImageFromFile(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file);
}

/**
 * Process image to display size (max 2048px)
 */
async function processToDisplay(image: ImageBitmap, maxSize: number): Promise<ProcessedAsset> {
  const { width, height } = calculateDimensions(image.width, image.height, maxSize);

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Draw image to canvas
  ctx.drawImage(image, 0, 0, width, height);

  // Convert to blob
  const blob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.82 });

  return {
    blob,
    width,
    height,
    mimeType: 'image/webp',
    bytes: blob.size,
  };
}

/**
 * Process blob to thumb size (max 512px)
 */
async function processToThumb(displayBlob: Blob, maxSize: number): Promise<ProcessedAsset> {
  // Create image from display blob
  const image = await createImageFromBlob(displayBlob);

  const { width, height } = calculateDimensions(image.width, image.height, maxSize);

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Draw image to canvas
  ctx.drawImage(image, 0, 0, width, height);

  // Convert to blob
  const blob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.82 });

  return {
    blob,
    width,
    height,
    mimeType: 'image/webp',
    bytes: blob.size,
  };
}

/**
 * Process blob to placeholder (max 32px, data URL)
 */
async function processToPlaceholder(
  thumbBlob: Blob,
  maxSize: number
): Promise<{ dataUrl: string; width: number; height: number; bytes: number }> {
  // Create image from thumb blob
  const image = await createImageFromBlob(thumbBlob);

  const { width, height } = calculateDimensions(image.width, image.height, maxSize);

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Draw image to canvas
  ctx.drawImage(image, 0, 0, width, height);

  // Convert to data URL
  const blob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.6 });

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read blob as data URL'));
    reader.readAsDataURL(blob);
  });

  return {
    dataUrl,
    width,
    height,
    bytes: blob.size,
  };
}

/**
 * Create ImageBitmap from Blob
 */
function createImageFromBlob(blob: Blob): Promise<ImageBitmap> {
  return createImageBitmap(blob);
}

/**
 * Calculate dimensions maintaining aspect ratio
 */
function calculateDimensions(
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
