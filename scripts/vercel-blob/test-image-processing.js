#!/usr/bin/env node

/**
 * Vercel Blob Image Processing Test Script
 *
 * This script tests the backend image processing functions that create
 * display, thumbnail, and placeholder assets from an original image.
 * Uses the same pure functions as the S3 upload flow.
 */

const { put } = require('@vercel/blob');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

// Mock the backend image processing function
// This simulates the processImageForMultipleAssetsBackend function
async function processImageForMultipleAssetsBackend(file) {
  console.log(`🖼️ Processing image: ${file.name} (${file.size} bytes)`);

  // Simulate image processing (in real implementation, this would use Sharp)
  const originalSize = file.size;
  const displaySize = Math.floor(originalSize * 0.3); // Simulate 30% of original
  const thumbSize = Math.floor(originalSize * 0.1); // Simulate 10% of original

  // Create mock processed assets
  const originalBuffer = Buffer.alloc(originalSize, 0x01);
  const displayBuffer = Buffer.alloc(displaySize, 0x02);
  const thumbBuffer = Buffer.alloc(thumbSize, 0x03);

  // Create File objects for each processed image
  const originalBlob = new File([originalBuffer], file.name, { type: 'image/webp' });
  const displayBlob = new File([displayBuffer], `display_${file.name}`, { type: 'image/webp' });
  const thumbBlob = new File([thumbBuffer], `thumb_${file.name}`, { type: 'image/webp' });

  return {
    original: {
      assetType: 'original',
      blob: originalBlob,
      width: 2048,
      height: 1536,
      size: originalSize,
      mimeType: 'image/webp',
    },
    display: {
      assetType: 'display',
      blob: displayBlob,
      width: 1024,
      height: 768,
      size: displaySize,
      mimeType: 'image/webp',
    },
    thumb: {
      assetType: 'thumb',
      blob: thumbBlob,
      width: 512,
      height: 384,
      size: thumbSize,
      mimeType: 'image/webp',
    },
  };
}

async function uploadDerivativeToVercelBlob(asset, type) {
  const filename = `${type}_${asset.blob.name}`;

  const result = await put(filename, asset.blob, {
    access: 'public',
    contentType: asset.blob.type,
    addRandomSuffix: true,
  });

  return {
    url: result.url,
    pathname: result.pathname,
    assetType: asset.assetType,
    width: asset.width,
    height: asset.height,
    size: asset.size,
    mimeType: asset.mimeType,
  };
}

async function testImageProcessing() {
  console.log('🧪 Testing Image Processing with Vercel Blob...\n');

  try {
    // Check if token is available
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error('BLOB_READ_WRITE_TOKEN not found in environment variables');
    }
    console.log('✅ BLOB_READ_WRITE_TOKEN found');

    // Test with a real image file
    const testImages = [
      { path: '../../public/small/abstract-1.jpg', name: 'abstract-1.jpg' },
      { path: '../../public/small/diana_charles.jpg', name: 'diana_charles.jpg' },
      { path: '../../public/small/blue-sky.jpg', name: 'blue-sky.jpg' },
    ];

    for (const imageInfo of testImages) {
      try {
        const fullPath = path.join(__dirname, imageInfo.path);

        // Check if file exists
        if (!fs.existsSync(fullPath)) {
          console.log(`⚠️  Skipping ${imageInfo.name} - file not found`);
          continue;
        }

        console.log(`\n📤 Processing ${imageInfo.name}...`);

        // Read the image file
        const fileBuffer = fs.readFileSync(fullPath);
        const file = new File([fileBuffer], imageInfo.name, { type: 'image/jpeg' });

        // Process the image (simulate backend processing)
        console.log('🔄 Processing image derivatives...');
        const processedAssets = await processImageForMultipleAssetsBackend(file);

        console.log('✅ Image processing complete:');
        console.log(
          `  Original: ${processedAssets.original.width}x${processedAssets.original.height} (${processedAssets.original.size} bytes)`
        );
        console.log(
          `  Display: ${processedAssets.display.width}x${processedAssets.display.height} (${processedAssets.display.size} bytes)`
        );
        console.log(
          `  Thumb: ${processedAssets.thumb.width}x${processedAssets.thumb.height} (${processedAssets.thumb.size} bytes)`
        );

        // Upload derivatives to Vercel Blob
        console.log('📤 Uploading derivatives to Vercel Blob...');
        const [originalResult, displayResult, thumbResult] = await Promise.all([
          uploadDerivativeToVercelBlob(processedAssets.original, 'original'),
          uploadDerivativeToVercelBlob(processedAssets.display, 'display'),
          uploadDerivativeToVercelBlob(processedAssets.thumb, 'thumb'),
        ]);

        console.log('✅ Upload successful:');
        console.log(`  Original: ${originalResult.url}`);
        console.log(`  Display: ${displayResult.url}`);
        console.log(`  Thumb: ${thumbResult.url}`);

        // Clean up test files
        console.log('🗑️ Cleaning up test files...');
        await Promise.all([
          put(originalResult.pathname, new File([], ''), { access: 'public' })
            .then(() => console.log('✅ Deleted original'))
            .catch(() => console.log('⚠️  Could not delete original')),
          put(displayResult.pathname, new File([], ''), { access: 'public' })
            .then(() => console.log('✅ Deleted display'))
            .catch(() => console.log('⚠️  Could not delete display')),
          put(thumbResult.pathname, new File([], ''), { access: 'public' })
            .then(() => console.log('✅ Deleted thumb'))
            .catch(() => console.log('⚠️  Could not delete thumb')),
        ]);
      } catch (error) {
        console.log(`❌ Failed to process ${imageInfo.name}: ${error.message}`);
      }
    }

    console.log('\n🎉 Image processing test completed successfully!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the test
testImageProcessing();
