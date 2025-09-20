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

    // Download the original image from blob storage
    const originalResponse = await fetch(input.originalBlobUrl);
    if (!originalResponse.ok) {
      throw new Error(`Failed to download original image: ${originalResponse.status}`);
    }

    const originalBuffer = await originalResponse.arrayBuffer();
    const originalFile = new File([originalBuffer], input.originalPathname, {
      type: input.originalContentType,
    });

    // Process the image to create derivatives
    const processedAssets = await processImageForMultipleAssetsBackend(originalFile);
    console.log(`✅ Image processing complete: original, display, thumb`);

    // Upload derivatives to blob storage
    const [displayResult, thumbResult] = await Promise.all([
      uploadDerivativeToBlob(processedAssets.display, 'display'),
      uploadDerivativeToBlob(processedAssets.thumb, 'thumb'),
    ]);

    console.log(`📤 Uploaded derivatives: display=${displayResult.url}, thumb=${thumbResult.url}`);

    // Create asset records in database
    const assetData = [
      {
        memoryId: input.memoryId,
        assetType: 'display' as const,
        variant: null,
        url: displayResult.url,
        storageBackend: 'vercel_blob' as const,
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
        storageBackend: 'vercel_blob' as const,
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
  // Use process.nextTick for fire-and-forget processing
  process.nextTick(async () => {
    try {
      await processImageDerivatives(input);
    } catch (error) {
      console.error('Image processing enqueue failed:', error);
    }
  });
}
