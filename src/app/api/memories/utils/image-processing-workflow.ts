/**
 * Server-side image processing workflow
 *
 * This module handles the async processing of images after upload completion.
 * It processes the original image to create display and thumbnail versions,
 * uploads them to blob storage, and creates asset records in the database.
 */

import { put } from '@vercel/blob';
import { processImageForMultipleAssetsBackend } from './image-processing-backend';
import { db } from '@/db/db';
import { memoryAssets } from '@/db/schema';
import { eq } from 'drizzle-orm';

export interface ImageProcessingWorkflowInput {
  memoryId: string;
  originalBlobUrl: string;
  originalPathname: string;
  originalContentType: string;
  originalSize: number;
}

/**
 * Process image derivatives asynchronously
 * This function is called from the grant route's onUploadCompleted callback
 * for image files to create display and thumbnail versions
 */
export async function processImageDerivatives(input: ImageProcessingWorkflowInput): Promise<void> {
  try {
    console.log(`🖼️ Starting image processing workflow for memory ${input.memoryId}`);
    console.log(`📥 Original blob URL: ${input.originalBlobUrl}`);

    // Download the original image from blob storage
    const originalResponse = await fetch(input.originalBlobUrl);
    if (!originalResponse.ok) {
      throw new Error(`Failed to download original image: ${originalResponse.status} ${originalResponse.statusText}`);
    }

    const originalBuffer = await originalResponse.arrayBuffer();
    console.log(`📥 Downloaded original image: ${originalBuffer.byteLength} bytes`);
    
    const originalFile = new File([originalBuffer], input.originalPathname, {
      type: input.originalContentType,
    });

    // Process the image to create derivatives
    console.log(`🔄 Processing image derivatives...`);
    const processedAssets = await processImageForMultipleAssetsBackend(originalFile);
    console.log(`✅ Image processing complete:`, {
      display: `${processedAssets.display.width}x${processedAssets.display.height} (${processedAssets.display.size} bytes)`,
      thumb: `${processedAssets.thumb.width}x${processedAssets.thumb.height} (${processedAssets.thumb.size} bytes)`,
    });

    // Upload derivatives to blob storage
    console.log(`📤 Uploading derivatives to blob storage...`);
    const [displayResult, thumbResult] = await Promise.all([
      uploadDerivativeToBlob(processedAssets.display, 'display'),
      uploadDerivativeToBlob(processedAssets.thumb, 'thumb'),
    ]);

    console.log(`📤 Uploaded derivatives:`, {
      display: displayResult.url,
      thumb: thumbResult.url,
    });

    // Create asset records in database
    const assetData = [
      {
        memoryId: input.memoryId,
        assetType: 'display' as const,
        variant: null,
        url: displayResult.url,
        assetLocation: 'vercel_blob' as const,
        storageKey: displayResult.pathname,
        bytes: processedAssets.display.size,
        width: processedAssets.display.width,
        height: processedAssets.display.height,
        mimeType: processedAssets.display.mimeType,
        sha256: null,
        processingStatus: 'completed' as const,
        processingError: null,
      },
      {
        memoryId: input.memoryId,
        assetType: 'thumb' as const,
        variant: null,
        url: thumbResult.url,
        assetLocation: 'vercel_blob' as const,
        storageKey: thumbResult.pathname,
        bytes: processedAssets.thumb.size,
        width: processedAssets.thumb.width,
        height: processedAssets.thumb.height,
        mimeType: processedAssets.thumb.mimeType,
        sha256: null,
        processingStatus: 'completed' as const,
        processingError: null,
      },
    ];

    await db.insert(memoryAssets).values(assetData);
    console.log(`✅ Created ${assetData.length} derivative asset records for memory ${input.memoryId}`);
  } catch (error) {
    console.error(`❌ Image processing workflow failed for memory ${input.memoryId}:`, error);

    // Update the original asset with processing error
    try {
      await db
        .update(memoryAssets)
        .set({
          processingStatus: 'failed',
          processingError: error instanceof Error ? error.message : 'Unknown error',
        })
        .where(eq(memoryAssets.memoryId, input.memoryId));
      console.log(`📝 Updated original asset with processing error for memory ${input.memoryId}`);
    } catch (updateError) {
      console.error('Failed to update asset with processing error:', updateError);
    }
  }
}

/**
 * Upload a derivative image to blob storage
 */
async function uploadDerivativeToBlob(
  asset: { blob: File; assetType: string },
  type: 'display' | 'thumb'
): Promise<{ url: string; pathname: string }> {
  const filename = `${type}_${asset.blob.name}`;

  const result = await put(filename, asset.blob, {
    access: 'public',
    contentType: asset.blob.type,
    addRandomSuffix: true,
  });

  return {
    url: result.url,
    pathname: result.pathname,
  };
}

/**
 * Fire-and-forget image processing
 * This function is called from the grant route's onUploadCompleted callback
 * and runs asynchronously without blocking the upload response
 */
export function enqueueImageProcessing(input: ImageProcessingWorkflowInput): void {
  // Use setTimeout with 0 delay to ensure it runs after the current event loop
  // This is more reliable than process.nextTick for serverless environments
  setTimeout(async () => {
    try {
      console.log(`🚀 Starting async image processing for memory ${input.memoryId}`);
      await processImageDerivatives(input);
      console.log(`✅ Completed async image processing for memory ${input.memoryId}`);
    } catch (error) {
      console.error(`❌ Async image processing failed for memory ${input.memoryId}:`, error);
    }
  }, 0);
}
