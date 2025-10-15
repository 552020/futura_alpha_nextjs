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

  fatLogger.info('🚀 [WebWorker] Starting image processing', 'webworker', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    maxDisplaySize,
    maxThumbSize,
    maxPlaceholderSize,
  });

  try {
    if (kind !== 'process') {
      throw new Error(`Unknown message kind: ${kind}`);
    }

    // Check if format is supported
    if (!SUPPORTED_FORMATS.includes(file.type)) {
      fatLogger.error('❌ [WebWorker] Unsupported format', 'webworker', {
        fileType: file.type,
        supportedFormats: SUPPORTED_FORMATS,
      });
      const response: ProcessResponse = {
        kind: 'process',
        ok: false,
        error: `Unsupported format: ${file.type}`,
      };
      self.postMessage(response);
      return;
    }

    fatLogger.info('✅ [WebWorker] Format check passed', 'webworker', { fileType: file.type });

    // Create image from file
    fatLogger.info('🖼️ [WebWorker] Creating image from file', 'webworker', { fileName: file.name });
    const image = await createImageFromFile(file);
    fatLogger.info('✅ [WebWorker] Image created successfully', 'webworker', {
      originalWidth: image.width,
      originalHeight: image.height,
    });

    // Process display version (2048px max)
    fatLogger.info('🔄 [WebWorker] Processing display version', 'webworker', { maxDisplaySize });
    const display = await processToDisplay(image, maxDisplaySize);
    fatLogger.info('✅ [WebWorker] Display processing completed', 'webworker', {
      displayWidth: display.width,
      displayHeight: display.height,
      displaySize: display.blob.size,
    });

    // Process thumb from display (512px max)
    fatLogger.info('🔄 [WebWorker] Processing thumb version', 'webworker', { maxThumbSize });
    const thumb = await processToThumb(display.blob, maxThumbSize);
    fatLogger.info('✅ [WebWorker] Thumb processing completed', 'webworker', {
      thumbWidth: thumb.width,
      thumbHeight: thumb.height,
      thumbSize: thumb.blob.size,
    });

    // Process placeholder from thumb (32px max, data URL)
    fatLogger.info('🔄 [WebWorker] Processing placeholder version', 'webworker', { maxPlaceholderSize });
    const placeholder = await processToPlaceholder(thumb.blob, maxPlaceholderSize);
    fatLogger.info('✅ [WebWorker] Placeholder processing completed', 'webworker', {
      placeholderWidth: placeholder.width,
      placeholderHeight: placeholder.height,
      placeholderSize: placeholder.bytes,
    });

    // Log final processing results
    fatLogger.info('🎉 [WebWorker] All processing completed successfully', 'webworker', {
      fileName: file.name,
      originalSize: file.size,
      displaySize: display.blob.size,
      thumbSize: thumb.blob.size,
      placeholderSize: placeholder.bytes,
    });

    const response: ProcessResponse = {
      kind: 'process',
      ok: true,
      display,
      thumb,
      placeholder,
    };

    fatLogger.info('📤 [WebWorker] Sending success response', 'webworker', { fileName: file.name });
    self.postMessage(response);
  } catch (error) {
    fatLogger.error('❌ [WebWorker] Processing failed', 'webworker', {
      fileName: file.name,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    const response: ProcessResponse = {
      kind: 'process',
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
    fatLogger.info('📤 [WebWorker] Sending error response', 'webworker', { fileName: file.name });
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
  fatLogger.info('🔄 [WebWorker] processToDisplay: Starting', 'webworker', {
    originalWidth: image.width,
    originalHeight: image.height,
    maxSize,
  });

  const { width, height } = calculateDimensions(image.width, image.height, maxSize);

  fatLogger.info('📐 [WebWorker] processToDisplay: Calculated dimensions', 'webworker', {
    calculatedWidth: width,
    calculatedHeight: height,
  });

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Draw image to canvas
  ctx.drawImage(image, 0, 0, width, height);

  // Convert to blob
  const blob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.82 });

  fatLogger.info('✅ [WebWorker] processToDisplay: Completed', 'webworker', {
    finalWidth: width,
    finalHeight: height,
    blobSize: blob.size,
  });

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
  fatLogger.info('🔄 [WebWorker] processToThumb: Starting', 'webworker', {
    displayBlobSize: displayBlob.size,
    maxSize,
  });

  // Create image from display blob
  const image = await createImageFromBlob(displayBlob);

  fatLogger.info('🖼️ [WebWorker] processToThumb: Image created from blob', 'webworker', {
    imageWidth: image.width,
    imageHeight: image.height,
  });

  const { width, height } = calculateDimensions(image.width, image.height, maxSize);

  fatLogger.info('📐 [WebWorker] processToThumb: Calculated dimensions', 'webworker', {
    calculatedWidth: width,
    calculatedHeight: height,
  });

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Draw image to canvas
  ctx.drawImage(image, 0, 0, width, height);

  // Convert to blob
  const blob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.82 });

  fatLogger.info('✅ [WebWorker] processToThumb: Completed', 'webworker', {
    finalWidth: width,
    finalHeight: height,
    blobSize: blob.size,
  });

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
  fatLogger.info('🔄 [WebWorker] processToPlaceholder: Starting', 'webworker', {
    thumbBlobSize: thumbBlob.size,
    maxSize,
  });

  // Create image from thumb blob
  const image = await createImageFromBlob(thumbBlob);

  fatLogger.info('🖼️ [WebWorker] processToPlaceholder: Image created from blob', 'webworker', {
    imageWidth: image.width,
    imageHeight: image.height,
  });

  const { width, height } = calculateDimensions(image.width, image.height, maxSize);

  fatLogger.info('📐 [WebWorker] processToPlaceholder: Calculated dimensions', 'webworker', {
    calculatedWidth: width,
    calculatedHeight: height,
  });

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Draw image to canvas
  ctx.drawImage(image, 0, 0, width, height);

  // Convert to data URL
  const blob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.6 });

  fatLogger.info('🔄 [WebWorker] processToPlaceholder: Converting to data URL', 'webworker', {
    blobSize: blob.size,
  });

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read blob as data URL'));
    reader.readAsDataURL(blob);
  });

  fatLogger.info('✅ [WebWorker] processToPlaceholder: Completed', 'webworker', {
    finalWidth: width,
    finalHeight: height,
    dataUrlLength: dataUrl.length,
    blobSize: blob.size,
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
