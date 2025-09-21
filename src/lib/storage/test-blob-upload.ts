/**
 * TEST BLOB-FIRST UPLOAD FLOW
 *
 * This is a simple test to verify that the blob-first upload flow works correctly.
 * It can be run in the browser console or as a simple test script.
 */

import { uploadFile } from '@/services/upload';

/**
 * Test the blob-first upload flow with a sample file
 */
export async function testBlobFirstUpload() {
  console.log('🧪 Testing blob-first upload flow...');

  try {
    // Create a simple test file
    const testContent = 'Hello, this is a test file for blob-first upload!';
    const testFile = new File([testContent], 'test.txt', { type: 'text/plain' });

    console.log('📁 Created test file:', testFile.name, testFile.size, 'bytes');

    // Test upload with Vercel Blob
    const result = await uploadFile(
      testFile,
      false, // isOnboarding
      undefined, // existingUserId
      'files', // mode
      'vercel_blob' // storageBackend
    );

    console.log('✅ Upload successful!');
    console.log('📊 Result:', result);
    console.log(`📊 Assets created: ${result.data.assets.length}`);

    return result;
  } catch (error) {
    console.error('❌ Upload failed:', error);
    throw error;
  }
}

/**
 * Test image upload with multiple assets (original, display, thumb)
 */
export async function testImageUpload() {
  console.log('🧪 Testing image upload with multiple assets...');

  try {
    // Create a simple test image (1x1 pixel PNG)
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(0, 0, 100, 100);
    }

    const blob = await new Promise<Blob>(resolve => {
      canvas.toBlob(blob => {
        resolve(blob!);
      }, 'image/png');
    });

    const testImage = new File([blob], 'test-image.png', { type: 'image/png' });
    console.log('🖼️ Created test image:', testImage.name, testImage.size, 'bytes');

    // Test upload with Vercel Blob
    const result = await uploadFile(
      testImage,
      false, // isOnboarding
      undefined, // existingUserId
      'files', // mode
      'vercel_blob' // storageBackend
    );

    console.log('✅ Image upload successful!');
    console.log('📊 Result:', result);
    console.log(`📊 Assets created: ${result.data.assets.length}`);

    // Log each asset
    result.data.assets.forEach((asset, index) => {
      console.log(`  Asset ${index + 1}: ${asset.assetType} - ${asset.bytes} bytes - ${asset.url}`);
    });

    return result;
  } catch (error) {
    console.error('❌ Image upload failed:', error);
    throw error;
  }
}

/**
 * Test multiple storage backends
 */
export async function testMultipleStorageBackends() {
  console.log('🧪 Testing multiple storage backends...');

  try {
    const testContent = 'Testing multiple storage backends!';
    const testFile = new File([testContent], 'multi-test.txt', { type: 'text/plain' });

    // Test with multiple backends (Vercel Blob + S3)
    const result = await uploadFile(
      testFile,
      false,
      undefined,
      'files',
      ['vercel_blob', 's3'] // Multiple backends
    );

    console.log('✅ Multi-backend upload successful!');
    console.log('📊 Result:', result);

    return result;
  } catch (error) {
    console.error('❌ Multi-backend upload failed:', error);
    throw error;
  }
}

/**
 * Test onboarding flow
 */
export async function testOnboardingUpload() {
  console.log('🧪 Testing onboarding upload flow...');

  try {
    const testContent = 'Testing onboarding upload!';
    const testFile = new File([testContent], 'onboarding-test.txt', { type: 'text/plain' });

    const result = await uploadFile(
      testFile,
      true, // isOnboarding
      undefined,
      'files',
      'vercel_blob'
    );

    console.log('✅ Onboarding upload successful!');
    console.log('📊 Result:', result);

    return result;
  } catch (error) {
    console.error('❌ Onboarding upload failed:', error);
    throw error;
  }
}

// Export for browser console testing
if (typeof window !== 'undefined') {
  (window as any).testBlobFirstUpload = testBlobFirstUpload; // eslint-disable-line @typescript-eslint/no-explicit-any
  (window as any).testImageUpload = testImageUpload; // eslint-disable-line @typescript-eslint/no-explicit-any
  (window as any).testMultipleStorageBackends = testMultipleStorageBackends; // eslint-disable-line @typescript-eslint/no-explicit-any
  (window as any).testOnboardingUpload = testOnboardingUpload; // eslint-disable-line @typescript-eslint/no-explicit-any
}
