#!/usr/bin/env node

const { put } = require('@vercel/blob');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

/**
 * Test the complete onboarding upload flow
 *
 * This simulates the onboarding user experience:
 * 1. Upload file to Vercel Blob
 * 2. Call onboarding commit endpoint
 * 3. Verify memory was created
 */
async function testOnboardingFlow() {
  console.log('🧪 Testing Complete Onboarding Flow...\n');

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error(
      '❌ BLOB_READ_WRITE_TOKEN not found in environment variables'
    );
    console.log('Please set BLOB_READ_WRITE_TOKEN in your .env.local file');
    process.exit(1);
  }
  console.log('✅ BLOB_READ_WRITE_TOKEN found');

  try {
    // Step 1: Upload file to Vercel Blob (simulating frontend upload)
    console.log('📤 Step 1: Uploading file to Vercel Blob...');
    const testFilePath = path.join(
      __dirname,
      '../../public/small/diana_charles.jpg'
    );
    const fileBuffer = fs.readFileSync(testFilePath);
    const fileName = 'onboarding-test-' + Date.now() + '.jpg';

    const uploadResult = await put(fileName, fileBuffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: true,
    });

    console.log('✅ File uploaded successfully:', uploadResult.url);

    // Step 2: Call onboarding commit endpoint (simulating database operations)
    console.log('\n📝 Step 2: Creating memory record...');
    const baseURL = process.env.BASE_URL || 'http://localhost:3000';

    const commitResponse = await fetch(
      `${baseURL}/api/upload/complete?onboarding=true`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blobUrl: uploadResult.url,
          metadata: {
            title: 'Onboarding Test Image',
            mimeType: 'image/jpeg',
            size: fileBuffer.length,
            width: 1920,
            height: 1080,
          },
        }),
      }
    );

    if (!commitResponse.ok) {
      const error = await commitResponse.json();
      throw new Error(
        `Commit failed: ${error.error || commitResponse.statusText}`
      );
    }

    const commitResult = await commitResponse.json();
    console.log('✅ Memory created successfully:', commitResult);

    // Step 3: Verify the blob is accessible
    console.log('\n🔍 Step 3: Verifying blob accessibility...');
    const headResponse = await fetch(uploadResult.url, { method: 'HEAD' });

    if (headResponse.ok) {
      console.log('✅ Blob is accessible and ready');
      console.log(
        `📊 Content-Type: ${headResponse.headers.get('content-type')}`
      );
      console.log(
        `📊 Content-Length: ${headResponse.headers.get('content-length')} bytes`
      );
    } else {
      throw new Error(
        `Blob verification failed: ${headResponse.status} ${headResponse.statusText}`
      );
    }

    console.log('\n🎉 Onboarding flow test completed successfully!');
    console.log('\n📋 Test Summary:');
    console.log(`  - File uploaded: ${fileName}`);
    console.log(`  - Blob URL: ${uploadResult.url}`);
    console.log(`  - Memory ID: ${commitResult.memoryId}`);
    console.log(`  - Temp User ID: ${commitResult.tempUserId}`);
  } catch (error) {
    console.error('\n❌ Error during onboarding flow test:', error.message);
    process.exit(1);
  }
}

testOnboardingFlow();
