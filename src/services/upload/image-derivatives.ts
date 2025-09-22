/**
 * Image derivatives processing service
 *
 * Handles format-based image processing for Lane B of the parallel upload pipeline.
 * Phase 1: Real processing - display → thumb → placeholder using Web Worker
 */

import type { GrantResponse } from './grant';
import type { ProcessedAssets } from './finalize';

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

/**
 * Process image derivatives based on format support
 */
export async function processImageDerivatives(file: File, grant: GrantResponse): Promise<ProcessedAssets> {
  // Format-based routing: only process supported image formats
  const supportedFormats = ['image/jpeg', 'image/png', 'image/webp'];

  if (!supportedFormats.includes(file.type)) {
    console.log(`⏭️ Skipping derivatives for unsupported format: ${file.type}`);
    // Return skipped status for unsupported formats
    return {
      display: { assetType: 'display', processingStatus: 'skipped' },
      thumb: { assetType: 'thumb', processingStatus: 'skipped' },
      placeholder: { assetType: 'placeholder', processingStatus: 'skipped' },
    };
  }

  console.log(`🖼️ Processing derivatives for supported format: ${file.type}`);
  // Process supported formats using Web Worker
  return await processImageDerivativesWithWorker(file, grant);
}

/**
 * Phase 1: Real image processing using Web Worker
 * Creates display → thumb → placeholder chain and uploads derivatives
 */
export async function processImageDerivativesWithWorker(file: File, grant: GrantResponse): Promise<ProcessedAssets> {
  console.log(`🖼️ Phase 1 real processing for: ${file.name} (${file.size} bytes, ${file.type})`);
  console.log(`📋 Grant includes: original=${!!grant.original}, display=${!!grant.display}, thumb=${!!grant.thumb}`);

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
    console.error(`❌ Failed to process derivatives for ${file.name}:`, error);

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
      console.log(`📤 Uploading display asset to S3: ${grant.display.fileKey} (${response.display.bytes} bytes)`);
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
      console.log(
        `✅ Display asset uploaded to S3: ${response.display.width}x${response.display.height} → ${displayUrl}`
      );
    } catch (error) {
      console.error('❌ Failed to upload display asset to S3:', error);
      results.display = { assetType: 'display', processingStatus: 'failed' };
    }
  }

  // Upload thumb asset to S3
  if (response.thumb && grant.thumb) {
    try {
      console.log(`📤 Uploading thumb asset to S3: ${grant.thumb.fileKey} (${response.thumb.bytes} bytes)`);
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
      console.log(`✅ Thumb asset uploaded to S3: ${response.thumb.width}x${response.thumb.height} → ${thumbUrl}`);
    } catch (error) {
      console.error('❌ Failed to upload thumb asset to S3:', error);
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
    console.log(`✅ Generated placeholder data URL (${dataUrlBytes} bytes)`);
  }

  return results;
}

/**
 * Upload asset blob to S3 using presigned URL
 */
async function uploadAssetToS3(blob: Blob, uploadUrl: string): Promise<void> {
  console.log(`🔄 S3 PUT request: ${blob.size} bytes, ${blob.type}`);

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: blob,
    headers: {
      'Content-Type': blob.type,
    },
  });

  if (!response.ok) {
    console.error(`❌ S3 upload failed: ${response.status} ${response.statusText}`);
    throw new Error(`S3 upload failed: ${response.status} ${response.statusText}`);
  }

  console.log(`✅ S3 upload successful: ${response.status} ${response.statusText}`);
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
