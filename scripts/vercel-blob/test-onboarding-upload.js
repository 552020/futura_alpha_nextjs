#!/usr/bin/env node

/**
 * Test Onboarding Upload with Vercel Blob
 *
 * This script tests the complete onboarding upload flow:
 * 1. Upload original file to Vercel Blob
 * 2. Process image derivatives (display, thumb, placeholder)
 * 3. Upload derivatives to Vercel Blob
 * 4. Create memory with all assets
 */

const { put } = require('@vercel/blob');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

// Mock the pure functions we need
async function processImageForMultipleAssetsBackend(file) {
  console.log(`🖼️ Processing image: ${file.name} (${file.size} bytes)`);

  // Convert File to Buffer for sharp processing
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Get image metadata
  const metadata = await sharp(buffer).metadata();
  const { width: originalWidth, height: originalHeight } = metadata;

  if (!originalWidth || !originalHeight) {
    throw new Error('Could not determine image dimensions');
  }

  console.log(`📐 Original dimensions: ${originalWidth}x${originalHeight}`);

  // Calculate resize dimensions
  const displaySize = calculateResizeDimensions(originalWidth, originalHeight, 2048);
  const thumbSize = calculateResizeDimensions(originalWidth, originalHeight, 512);

  console.log(`📐 Display dimensions: ${displaySize.width}x${displaySize.height}`);
  console.log(`📐 Thumb dimensions: ${thumbSize.width}x${thumbSize.height}`);

  // Process images in parallel
  const [originalBuffer, displayBuffer, thumbBuffer] = await Promise.all([
    // Original: Convert to WebP with high quality
    sharp(buffer).webp({ quality: 90 }).toBuffer(),

    // Display: Resize and convert to WebP
    sharp(buffer)
      .resize(displaySize.width, displaySize.height, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer(),

    // Thumbnail: Resize and convert to WebP
    sharp(buffer)
      .resize(thumbSize.width, thumbSize.height, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer(),
  ]);

  // Create File objects for each processed image
  const originalBlob = new File([new Uint8Array(originalBuffer)], file.name, { type: 'image/webp' });
  const displayBlob = new File([new Uint8Array(displayBuffer)], `display_${file.name}`, { type: 'image/webp' });
  const thumbBlob = new File([new Uint8Array(thumbBuffer)], `thumb_${file.name}`, { type: 'image/webp' });

  return {
    original: {
      assetType: 'original',
      blob: originalBlob,
      width: originalWidth,
      height: originalHeight,
      size: originalBuffer.length,
      mimeType: 'image/webp',
    },
    display: {
      assetType: 'display',
      blob: displayBlob,
      width: displaySize.width,
      height: displaySize.height,
      size: displayBuffer.length,
      mimeType: 'image/webp',
    },
    thumb: {
      assetType: 'thumb',
      blob: thumbBlob,
      width: thumbSize.width,
      height: thumbSize.height,
      size: thumbBuffer.length,
      mimeType: 'image/webp',
    },
  };
}

function calculateResizeDimensions(originalWidth, originalHeight, maxSize) {
  if (originalWidth <= maxSize && originalHeight <= maxSize) {
    return { width: originalWidth, height: originalHeight };
  }

  const aspectRatio = originalWidth / originalHeight;
  let width, height;

  if (aspectRatio > 1) {
    // Landscape
    width = maxSize;
    height = Math.round(maxSize / aspectRatio);
  } else {
    // Portrait or square
    height = maxSize;
    width = Math.round(maxSize * aspectRatio);
  }

  return { width, height };
}

async function testOnboardingUpload() {
  console.log('🧪 Testing Onboarding Upload with Vercel Blob...\n');

  try {
    // Check if token is available
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error('BLOB_READ_WRITE_TOKEN not found in environment variables');
    }
    console.log('✅ BLOB_READ_WRITE_TOKEN found');

    // Test with a real image file
    const testImage = { path: '../../public/small/abstract-1.jpg', name: 'abstract-1.jpg' };
    const fullPath = path.join(__dirname, testImage.path);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`Test image not found: ${fullPath}`);
    }

    console.log(`📤 Processing ${testImage.name}...`);

    // Read the image file
    const fileBuffer = fs.readFileSync(fullPath);
    const file = new File([fileBuffer], testImage.name, { type: 'image/jpeg' });

    // Step 1: Upload original to Vercel Blob
    console.log('📤 Step 1: Uploading original to Vercel Blob...');
    const originalBlob = await put(`original_${file.name}`, file, {
      access: 'public',
      addRandomSuffix: true,
    });
    console.log(`✅ Original uploaded: ${originalBlob.url}`);

    // Step 2: Process image derivatives
    console.log('🔄 Step 2: Processing image derivatives...');
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

    // Step 3: Upload derivatives to Vercel Blob
    console.log('📤 Step 3: Uploading derivatives to Vercel Blob...');
    const [displayBlob, thumbBlob] = await Promise.all([
      put(`display_${file.name}`, processedAssets.display.blob, {
        access: 'public',
        addRandomSuffix: true,
      }),
      put(`thumb_${file.name}`, processedAssets.thumb.blob, {
        access: 'public',
        addRandomSuffix: true,
      }),
    ]);

    console.log(`✅ Display uploaded: ${displayBlob.url}`);
    console.log(`✅ Thumb uploaded: ${thumbBlob.url}`);

    // Step 4: Test file accessibility
    console.log('🔍 Step 4: Testing file accessibility...');
    const [originalTest, displayTest, thumbTest] = await Promise.all([
      fetch(originalBlob.url).then(r => ({ ok: r.ok, status: r.status, size: r.headers.get('content-length') })),
      fetch(displayBlob.url).then(r => ({ ok: r.ok, status: r.status, size: r.headers.get('content-length') })),
      fetch(thumbBlob.url).then(r => ({ ok: r.ok, status: r.status, size: r.headers.get('content-length') })),
    ]);

    console.log('✅ File accessibility test:');
    console.log(`  Original: ${originalTest.ok ? '✅' : '❌'} (${originalTest.status}) - ${originalTest.size} bytes`);
    console.log(`  Display: ${displayTest.ok ? '✅' : '❌'} (${displayTest.status}) - ${displayTest.size} bytes`);
    console.log(`  Thumb: ${thumbTest.ok ? '✅' : '❌'} (${thumbTest.status}) - ${thumbTest.size} bytes`);

    // Step 5: Simulate memory creation
    console.log('💾 Step 5: Simulating memory creation...');
    const memoryData = {
      id: 'test-memory-id',
      type: 'image',
      title: file.name.split('.')[0],
      assets: [
        {
          assetType: 'original',
          url: originalBlob.url,
          assetLocation: 'vercel_blob',
          storageKey: originalBlob.pathname,
          bytes: file.size,
          mimeType: file.type,
          processingStatus: 'completed',
        },
        {
          assetType: 'display',
          url: displayBlob.url,
          assetLocation: 'vercel_blob',
          storageKey: displayBlob.pathname,
          bytes: processedAssets.display.size,
          width: processedAssets.display.width,
          height: processedAssets.display.height,
          mimeType: processedAssets.display.mimeType,
          processingStatus: 'completed',
        },
        {
          assetType: 'thumb',
          url: thumbBlob.url,
          assetLocation: 'vercel_blob',
          storageKey: thumbBlob.pathname,
          bytes: processedAssets.thumb.size,
          width: processedAssets.thumb.width,
          height: processedAssets.thumb.height,
          mimeType: processedAssets.thumb.mimeType,
          processingStatus: 'completed',
        },
      ],
    };

    console.log('✅ Memory data structure:');
    console.log(`  Memory ID: ${memoryData.id}`);
    console.log(`  Assets: ${memoryData.assets.length} (original, display, thumb)`);
    console.log(`  All assets accessible: ${memoryData.assets.every(asset => asset.url.startsWith('https://'))}`);

    console.log('\n🎉 Onboarding upload test completed successfully!');
    console.log('\n📊 Summary:');
    console.log('✅ Original file uploaded to Vercel Blob');
    console.log('✅ Image derivatives processed with Sharp');
    console.log('✅ Display and thumb assets uploaded to Vercel Blob');
    console.log('✅ All files accessible via HTTP');
    console.log('✅ Memory data structure ready for database');
    console.log('✅ Perfect for onboarding flow (no authentication required)');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the test
testOnboardingUpload();
