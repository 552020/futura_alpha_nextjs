#!/usr/bin/env ts-node

/**
 * Quick Vercel Blob Upload Test
 * Tests direct upload to Vercel Blob using token mode (dev only)
 *
 * Usage: npm run blob:test
 * Or: ts-node scripts/blob-upload-test.ts
 */

import { put } from '@vercel/blob';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

async function main() {
  console.log('🧪 Starting Vercel Blob Upload Test...\n');

  // Check if token is available
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.error('❌ BLOB_READ_WRITE_TOKEN not found in environment variables');
    console.log('Please set BLOB_READ_WRITE_TOKEN in your .env.local file');
    process.exit(1);
  }

  try {
    // Create a test file
    const testContent = 'Hello from Vercel Blob test! 🚀';
    const testFilePath = join(process.cwd(), 'test-upload.txt');
    writeFileSync(testFilePath, testContent);
    console.log('✅ Created test file:', testFilePath);

    // Read the file
    const fileBuffer = readFileSync(testFilePath);
    console.log('✅ Read file buffer:', fileBuffer.length, 'bytes');

    // Upload to Vercel Blob
    console.log('📤 Uploading to Vercel Blob...');
    const result = await put('test-upload.txt', fileBuffer, {
      access: 'public',
      token: token,
      addRandomSuffix: true,
    });

    console.log('✅ Upload successful!');
    console.log('📄 Result:', JSON.stringify(result, null, 2));

    // Test if the file is accessible
    console.log('\n🔍 Testing file accessibility...');
    const response = await fetch(result.url, { method: 'HEAD' });
    if (response.ok) {
      console.log('✅ File is accessible at:', result.url);
    } else {
      console.log('❌ File is not accessible:', response.status, response.statusText);
    }

    // Cleanup
    console.log('\n🧹 Cleaning up...');
    // Note: In a real test, you might want to delete the blob
    // For now, we'll just clean up the local file
    const { unlinkSync } = require('fs');
    unlinkSync(testFilePath);
    console.log('✅ Cleaned up local test file');

    console.log('\n🎉 Test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
