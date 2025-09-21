/**
 * Image derivatives processing service
 *
 * Handles format-based image processing for Lane B of the parallel upload pipeline.
 * Phase 0: Hello World - creates dummy placeholder data URL
 * Phase 1: Real processing - display → thumb → placeholder using Canvas API
 */

import type { GrantResponse } from './grant';
import type { ProcessedAssets } from './finalize';

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
  // Process supported formats client-side
  return await processImageDerivativesClient(file, grant);
}

/**
 * Phase 0: Hello World implementation
 * Creates dummy placeholder data URL and marks display/thumb as pending
 */
export async function processImageDerivativesClient(file: File, _grant: GrantResponse): Promise<ProcessedAssets> {
  console.log(`👋 Phase 0 Hello World processing for: ${file.name}`);

  // Phase 0: Hello World - create dummy placeholder data URL
  const dummyPlaceholder = `data:text/plain;base64,${btoa(
    `hello from client processing @ ${new Date().toISOString()}`
  )}`;

  // Return processed assets for finalization (no direct API calls)
  return {
    display: {
      assetType: 'display',
      processingStatus: 'pending', // Will be processed in Phase 1
    },
    thumb: {
      assetType: 'thumb',
      processingStatus: 'pending', // Will be processed in Phase 1
    },
    placeholder: {
      assetType: 'placeholder',
      processingStatus: 'completed',
      placeholderDataUrl: dummyPlaceholder,
    },
  };
}

// Phase 1 helper functions (commented out for now)
// These will be implemented when we move to Phase 1

/*
async function processToDisplay(file: File): Promise<ProcessedAsset> {
  // Use existing Canvas API code to create 2048px display version
  // Return ProcessedAsset with blob, dimensions, etc.
}

async function processToThumb(displayAsset: ProcessedAsset): Promise<ProcessedAsset> {
  // Process display asset to 512px thumbnail
  // Return ProcessedAsset with blob, dimensions, etc.
}

async function processToPlaceholder(thumbAsset: ProcessedAsset): Promise<string> {
  // Process thumbnail to 32px placeholder and return as data URL
  // Return data URL string for database storage
}
*/
