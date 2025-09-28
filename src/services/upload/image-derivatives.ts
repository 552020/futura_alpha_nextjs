/**
 * Image derivatives processing service
 *
 * Handles format-based image processing for Lane B of the parallel upload pipeline.
 * This service is storage-agnostic and returns pure blobs that can be uploaded to any storage backend.
 */

import type { GrantResponse } from './s3-grant';
import type { ProcessedAssets } from './finalize';
import { logger } from '@/lib/logger';
// Web Worker types
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
  placeholder?: string; // data URL
  error?: string;
}

interface ProcessedAsset {
  blob: Blob;
  width: number;
  height: number;
  mimeType: string;
  bytes: number;
}

// Storage-agnostic processing results
export interface ProcessedBlob {
  blob: Blob;
  width: number;
  height: number;
  mimeType: string;
  bytes: number;
}

export interface ProcessedBlobs {
  display?: ProcessedBlob;
  thumb?: ProcessedBlob;
  placeholder?: {
    dataUrl: string;
    width: number;
    height: number;
  };
}

/**
 * Storage-agnostic image processing - returns pure blobs for any storage backend
 */
export async function processImageDerivativesPure(file: File): Promise<ProcessedBlobs> {
  // Format-based routing: only process supported image formats
  const supportedFormats = ['image/jpeg', 'image/png', 'image/webp'];

  if (!supportedFormats.includes(file.type)) {
    // Return empty results for unsupported formats
    return {};
  }
  // Process supported formats using Web Worker
  return await processImageDerivativesWithWorkerPure(file);
}

/**
 * Legacy S3-specific function - kept for backward compatibility
 * @deprecated Use processImageDerivativesPure + uploadProcessedAssetsToS3 instead
 */
export async function processImageDerivatives(file: File, grant: GrantResponse): Promise<ProcessedAssets> {
  // Format-based routing: only process supported image formats
  const supportedFormats = ['image/jpeg', 'image/png', 'image/webp'];

  if (!supportedFormats.includes(file.type)) {
    logger.info(`⏭️ Skipping derivatives for unsupported format: ${file.type}`);
    // Return skipped status for unsupported formats
    return {
      display: { assetType: 'display', processingStatus: 'skipped' },
      thumb: { assetType: 'thumb', processingStatus: 'skipped' },
      placeholder: { assetType: 'placeholder', processingStatus: 'skipped' },
    };
  }

  logger.info(`🖼️ Processing derivatives for supported format: ${file.type}`);
  // Process supported formats using Web Worker
  return await processImageDerivativesWithWorker(file, grant);
}

/**
 * Pure image processing using Web Worker - returns blobs only, no uploads
 */
export async function processImageDerivativesWithWorkerPure(file: File): Promise<ProcessedBlobs> {
  try {
    // Create Web Worker
    const worker = new Worker(new URL('../../workers/image-processor.worker.ts', import.meta.url), {
      type: 'module',
    });

    // Process image in worker
    const processedBlobs = await new Promise<ProcessedBlobs>((resolve, reject) => {
      const timeout = setTimeout(() => {
        worker.terminate();
        reject(new Error('Worker processing timeout'));
      }, 30000); // 30 second timeout

      worker.onmessage = (e: MessageEvent<ProcessResponse>) => {
        clearTimeout(timeout);
        worker.terminate();

        const response = e.data;
        if (!response.ok) {
          reject(new Error(response.error || 'Worker processing failed'));
          return;
        }

        // Convert to storage-agnostic format
        const result: ProcessedBlobs = {};

        if (response.display) {
          result.display = {
            blob: response.display.blob,
            width: response.display.width,
            height: response.display.height,
            mimeType: response.display.mimeType,
            bytes: response.display.bytes,
          };
        }

        if (response.thumb) {
          result.thumb = {
            blob: response.thumb.blob,
            width: response.thumb.width,
            height: response.thumb.height,
            mimeType: response.thumb.mimeType,
            bytes: response.thumb.bytes,
          };
        }

        if (response.placeholder) {
          result.placeholder = {
            dataUrl: response.placeholder,
            width: response.display?.width || 0,
            height: response.display?.height || 0,
          };
        }

        resolve(result);
      };

      worker.onerror = error => {
        clearTimeout(timeout);
        worker.terminate();
        reject(error);
      };

      // Send processing message
      const message: ProcessMessage = {
        kind: 'process',
        file,
        maxDisplaySize: 2048,
        maxThumbSize: 512,
        maxPlaceholderSize: 32,
      };

      worker.postMessage(message);
    });

    return processedBlobs;
  } catch (error) {
    logger.error(`Failed to process derivatives for ${file.name}`, error as Error, {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });
    return {}; // Return empty results on failure
  }
}

/**
 * Legacy S3-specific processing function - kept for backward compatibility
 * @deprecated Use processImageDerivativesWithWorkerPure + uploadProcessedAssetsToS3 instead
 */
export async function processImageDerivativesWithWorker(file: File, grant: GrantResponse): Promise<ProcessedAssets> {
  try {
    // Create Web Worker
    const worker = new Worker(new URL('../../workers/image-processor.worker.ts', import.meta.url), {
      type: 'module',
    });

    // Process image in worker
    const processedAssets = await new Promise<ProcessedAssets>((resolve, reject) => {
      const timeout = setTimeout(() => {
        worker.terminate();
        reject(new Error('Worker processing timeout'));
      }, 30000); // 30 second timeout

      worker.onmessage = (e: MessageEvent<ProcessResponse>) => {
        clearTimeout(timeout);
        worker.terminate();

        const response = e.data;
        if (!response.ok) {
          reject(new Error(response.error || 'Worker processing failed'));
          return;
        }

        // Upload display and thumb to S3, store placeholder in DB
        resolve(handleProcessedAssets(response, grant));
      };

      worker.onerror = error => {
        clearTimeout(timeout);
        worker.terminate();
        reject(error);
      };

      // Send processing message
      const message: ProcessMessage = {
        kind: 'process',
        file,
        maxDisplaySize: 2048,
        maxThumbSize: 512,
        maxPlaceholderSize: 32,
      };

      worker.postMessage(message);
    });

    return processedAssets;
  } catch (error) {
    logger.error(`❌ Failed to process derivatives for ${file.name}:`, undefined, {
      data: error instanceof Error ? error : undefined,
    });

    // Return failed status for all derivatives
    return {
      display: { assetType: 'display', processingStatus: 'failed' },
      thumb: { assetType: 'thumb', processingStatus: 'failed' },
      placeholder: { assetType: 'placeholder', processingStatus: 'failed' },
    };
  }
}

/**
 * Handle processed assets from worker: upload display/thumb, prepare placeholder
 */
async function handleProcessedAssets(response: ProcessResponse, grant: GrantResponse): Promise<ProcessedAssets> {
  const results: ProcessedAssets = {};

  // Upload display asset to S3
  if (response.display && grant.display) {
    try {
      await uploadAssetToS3(response.display.blob, grant.display.uploadUrl);
      const displayUrl = generateS3Url(grant.display.fileKey);
      results.display = {
        assetType: 'display',
        processingStatus: 'completed',
        assetLocation: 's3',
        storageKey: grant.display.fileKey,
        bytes: response.display.bytes,
        width: response.display.width,
        height: response.display.height,
        mimeType: response.display.mimeType,
        url: displayUrl,
      };
    } catch (error) {
      logger.error('Failed to upload display asset to S3', error as Error, {
        fileKey: grant.display.fileKey,
        bytes: response.display.bytes,
      });
      results.display = { assetType: 'display', processingStatus: 'failed' };
    }
  }

  // Upload thumb asset to S3
  if (response.thumb && grant.thumb) {
    try {
      await uploadAssetToS3(response.thumb.blob, grant.thumb.uploadUrl);
      const thumbUrl = generateS3Url(grant.thumb.fileKey);
      results.thumb = {
        assetType: 'thumb',
        processingStatus: 'completed',
        assetLocation: 's3',
        storageKey: grant.thumb.fileKey,
        bytes: response.thumb.bytes,
        width: response.thumb.width,
        height: response.thumb.height,
        mimeType: response.thumb.mimeType,
        url: thumbUrl,
      };
    } catch (error) {
      logger.error('Failed to upload thumb asset to S3:', undefined, {
        data: error instanceof Error ? error : undefined,
      });
      results.thumb = { assetType: 'thumb', processingStatus: 'failed' };
    }
  }

  // Store placeholder as data URL in database
  if (response.placeholder) {
    // Calculate actual byte size of the data URL
    const dataUrlBytes = new Blob([response.placeholder]).size;

    results.placeholder = {
      assetType: 'placeholder',
      processingStatus: 'completed',
      assetLocation: 'neon', // Store in database as per decision
      storageKey: '', // Empty string for placeholder assets
      url: response.placeholder, // Data URL stored in database
      bytes: dataUrlBytes, // Actual byte size of data URL
      width: 32, // Standard placeholder dimensions
      height: 24, // Standard placeholder dimensions
      mimeType: 'image/webp', // Consistent with decision
    };
    logger.info(`✅ Generated placeholder data URL (${dataUrlBytes} bytes)`);
  }

  return results;
}

/**
 * Upload asset blob to S3 using presigned URL
 */
async function uploadAssetToS3(blob: Blob, uploadUrl: string): Promise<void> {
  logger.info(`🔄 S3 PUT request: ${blob.size} bytes, ${blob.type}`);

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: blob,
    headers: {
      'Content-Type': blob.type,
    },
  });

  if (!response.ok) {
    logger.error(`❌ S3 upload failed: ${response.status} ${response.statusText}`);
    throw new Error(`S3 upload failed: ${response.status} ${response.statusText}`);
  }

  logger.info(`✅ S3 upload successful: ${response.status} ${response.statusText}`);
}

/**
 * Generate S3 public URL from file key
 */
function generateS3Url(fileKey: string): string {
  // Use hardcoded values for client-side since env vars aren't available
  const bucket = 'futura0';
  const region = 'eu-central-1';
  return `https://${bucket}.s3.${region}.amazonaws.com/${fileKey}`;
}

/**
 * Upload processed blobs to S3 using grants
 * This function handles the S3-specific upload logic for processed assets
 */
export async function uploadProcessedAssetsToS3(
  processedBlobs: ProcessedBlobs,
  grant: GrantResponse
): Promise<ProcessedAssets> {
  const results: ProcessedAssets = {};

  // Upload display asset to S3
  if (processedBlobs.display && grant.display) {
    try {
      await uploadAssetToS3(processedBlobs.display.blob, grant.display.uploadUrl);
      const displayUrl = generateS3Url(grant.display.fileKey);
      results.display = {
        assetType: 'display',
        processingStatus: 'completed',
        assetLocation: 's3',
        storageKey: grant.display.fileKey,
        bytes: processedBlobs.display.bytes,
        width: processedBlobs.display.width,
        height: processedBlobs.display.height,
        mimeType: processedBlobs.display.mimeType,
        url: displayUrl,
      };
    } catch (error) {
      logger.error('Failed to upload display asset:', undefined, { data: error instanceof Error ? error : undefined });
      results.display = {
        assetType: 'display',
        processingStatus: 'failed',
        assetLocation: 's3',
        storageKey: grant.display.fileKey,
        bytes: 0,
        width: 0,
        height: 0,
        mimeType: 'image/jpeg',
        url: '',
      };
    }
  }

  // Upload thumb asset to S3
  if (processedBlobs.thumb && grant.thumb) {
    try {
      await uploadAssetToS3(processedBlobs.thumb.blob, grant.thumb.uploadUrl);
      const thumbUrl = generateS3Url(grant.thumb.fileKey);
      results.thumb = {
        assetType: 'thumb',
        processingStatus: 'completed',
        assetLocation: 's3',
        storageKey: grant.thumb.fileKey,
        bytes: processedBlobs.thumb.bytes,
        width: processedBlobs.thumb.width,
        height: processedBlobs.thumb.height,
        mimeType: processedBlobs.thumb.mimeType,
        url: thumbUrl,
      };
    } catch (error) {
      logger.error('Failed to upload thumb asset:', undefined, { data: error instanceof Error ? error : undefined });
      results.thumb = {
        assetType: 'thumb',
        processingStatus: 'failed',
        assetLocation: 's3',
        storageKey: grant.thumb.fileKey,
        bytes: 0,
        width: 0,
        height: 0,
        mimeType: 'image/jpeg',
        url: '',
      };
    }
  }

  // Placeholder is stored in database, not uploaded
  if (processedBlobs.placeholder) {
    results.placeholder = {
      assetType: 'placeholder',
      processingStatus: 'completed',
      assetLocation: 'neon', // Stored in database
      storageKey: 'placeholder',
      bytes: 0,
      width: processedBlobs.placeholder.width,
      height: processedBlobs.placeholder.height,
      mimeType: 'image/jpeg',
      url: processedBlobs.placeholder.dataUrl,
    };
  }

  return results;
}
