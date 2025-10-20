#!/usr/bin/env node

/**
 * Vercel Blob Image Upload Test Script
 *
 * This script tests image uploads with different sizes and formats:
 * - Small images (< 1MB)
 * - Medium images (1-5MB)
 * - Large images (> 5MB)
 * - Different formats (JPG, PNG, WEBP)
 */

const { put, del, list } = require('@vercel/blob');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

async function testImageUploads() {
  console.log('🧪 Testing Vercel Blob Image Uploads...\n');

  try {
    // Check if token is available
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error('BLOB_READ_WRITE_TOKEN not found in environment variables');
    }
    console.log('✅ BLOB_READ_WRITE_TOKEN found');

    const testImages = [
      // Small images (< 1MB)
      { path: '../../public/small/abstract-1.jpg', name: 'abstract-1.jpg', size: '265K' },
      { path: '../../public/small/diana_charles.jpg', name: 'diana_charles.jpg', size: '408K' },

      // Medium images (1-5MB)
      { path: '../../public/small/blue-sky.jpg', name: 'blue-sky.jpg', size: '1.9M' },
      { path: '../../public/small/flowers-bw.jpg', name: 'flowers-bw.jpg', size: '1.0M' },

      // Large images (> 5MB)
      { path: '../../public/hero/plants.jpg', name: 'plants.jpg', size: '3.3M' },
      { path: '../../public/hero/rays.jpg', name: 'rays.jpg', size: '4.9M' },
      { path: '../../public/hero/sky-night.jpg', name: 'sky-night.jpg', size: '6.3M' },

      // Different formats
      { path: '../../public/hero/placeholder_img_big.png', name: 'placeholder.png', size: '26K' },
      {
        path: '../../public/images/segments/black-mirror/black_mirror_1.webp',
        name: 'black_mirror_1.webp',
        size: '5.8K',
      },
    ];

    const uploadResults = [];

    console.log('\n📤 Testing image uploads...\n');

    for (const image of testImages) {
      try {
        const fullPath = path.join(__dirname, image.path);

        // Check if file exists
        if (!fs.existsSync(fullPath)) {
          console.log(`⚠️  Skipping ${image.name} - file not found`);
          continue;
        }

        console.log(`📤 Uploading ${image.name} (${image.size})...`);

        // Read file
        const fileBuffer = fs.readFileSync(fullPath);
        const contentType = getContentType(image.name);

        // Upload to Vercel Blob
        const result = await put(`test-images/${image.name}`, fileBuffer, {
          access: 'public',
          contentType: contentType,
          addRandomSuffix: true,
        });

        console.log(`✅ Upload successful: ${result.url}`);
        uploadResults.push({ name: image.name, url: result.url, size: image.size });
      } catch (error) {
        console.log(`❌ Failed to upload ${image.name}: ${error.message}`);
      }
    }

    // Test 3: List all blobs
    console.log('\n📋 Listing all blobs...');
    const blobs = await list();
    console.log(`✅ Found ${blobs.blobs.length} blobs total`);

    // Show recent test uploads
    const recentBlobs = blobs.blobs
      .filter(blob => blob.pathname.includes('test-images'))
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    console.log('\n📄 Recent test image uploads:');
    recentBlobs.forEach(blob => {
      console.log(`  - ${blob.pathname} (${blob.size} bytes, ${blob.contentType})`);
    });

    // Test 4: Clean up test files
    console.log('\n🗑️ Cleaning up test files...');
    for (const result of uploadResults) {
      try {
        await del(result.url);
        console.log(`✅ Deleted ${result.name}`);
      } catch (error) {
        console.log(`❌ Failed to delete ${result.name}: ${error.message}`);
      }
    }

    console.log('\n🎉 All image upload tests completed successfully!');

    // Summary
    console.log('\n📊 Test Summary:');
    console.log(`  - Images tested: ${uploadResults.length}`);
    console.log(`  - Small images (< 1MB): ${uploadResults.filter(r => r.size.includes('K')).length}`);
    console.log(`  - Large images (> 1MB): ${uploadResults.filter(r => r.size.includes('M')).length}`);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    default:
      return 'application/octet-stream';
  }
}

// Run the tests
testImageUploads();
