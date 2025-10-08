/**
 * TEST BLOB-FIRST UPLOAD FLOW
 *
 * This is a simple test to verify that the blob-first upload flow works correctly.
 * It can be run in the browser console or as a simple test script.
 *
 * NOTE: This file is outdated and needs to be updated to use the new unified upload functions.
 */

// import { uploadFileToVercelBlob } from '@/services/upload/vercel-blob-upload';

import { fatLogger } from '@/lib/logger';
/**
 * Test the blob-first upload flow with a sample file
 */
export async function testBlobFirstUpload() {
  fatLogger.info('🧪 Testing blob-first upload flow...', 'be');
  fatLogger.info('⚠️ This test is outdated and needs to be updated to use the new unified upload functions.', 'be');

  // TODO: Update this test to use the new uploadToVercelBlob function
  throw new Error('Test is outdated - needs to be updated to use new unified upload functions');
}

/**
 * Test image upload with multiple assets (original, display, thumb)
 */
export async function testImageUpload() {
  fatLogger.info('🧪 Testing image upload with multiple assets...', 'be');
  fatLogger.info('⚠️ This test is outdated and needs to be updated to use the new unified upload functions.', 'be');

  // TODO: Update this test to use the new uploadToVercelBlob function
  throw new Error('Test is outdated - needs to be updated to use new unified upload functions');
}

/**
 * Test multiple storage backends
 */
export async function testMultipleStorageBackends() {
  fatLogger.info('🧪 Testing multiple storage backends...', 'be');
  fatLogger.info('⚠️ This test is outdated and needs to be updated to use the new unified upload functions.', 'be');

  // TODO: Update this test to use the new uploadToVercelBlob function
  throw new Error('Test is outdated - needs to be updated to use new unified upload functions');
}

/**
 * Test onboarding flow
 */
export async function testOnboardingUpload() {
  fatLogger.info('🧪 Testing onboarding upload flow...', 'be');
  fatLogger.info('⚠️ This test is outdated and needs to be updated to use the new unified upload functions.', 'be');

  // TODO: Update this test to use the new uploadToVercelBlob function
  throw new Error('Test is outdated - needs to be updated to use new unified upload functions');
}

// Export for browser console testing
if (typeof window !== 'undefined') {
  (window as any).testBlobFirstUpload = testBlobFirstUpload; // eslint-disable-line @typescript-eslint/no-explicit-any
  (window as any).testImageUpload = testImageUpload; // eslint-disable-line @typescript-eslint/no-explicit-any
  (window as any).testMultipleStorageBackends = testMultipleStorageBackends; // eslint-disable-line @typescript-eslint/no-explicit-any
  (window as any).testOnboardingUpload = testOnboardingUpload; // eslint-disable-line @typescript-eslint/no-explicit-any
}
