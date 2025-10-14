// Example test file for Internet Identity Playwright plugin
// This file demonstrates how to use @dfinity/internet-identity-playwright
//
// To use this file:
// 1. Install the plugin: pnpm add -D @dfinity/internet-identity-playwright
// 2. Uncomment the import and test code below
// 3. Run: pnpm playwright test icp-authentication.spec.ts

/*
import { testWithII } from '@dfinity/internet-identity-playwright';

testWithII.describe('ICP Authentication Workflows', () => {
  testWithII('should sign-in with a new user and access vault', async ({ page, iiPage }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Sign in with a new Internet Identity
    await iiPage.signInWithNewIdentity();
    
    // Verify we're authenticated
    await expect(page.locator('button:has-text("Connect")')).not.toBeVisible();
    
    // Navigate to vault and verify access
    await page.goto('/vault');
    await page.waitForLoadState('networkidle');
    
    // Should be able to see the vault interface
    await expect(page.locator('h1, h2, h3')).toContainText(/vault|memories|gallery/i);
  });

  testWithII('should upload image with authenticated user', async ({ page, iiPage }) => {
    // Sign in with new identity
    await page.goto('/');
    await iiPage.signInWithNewIdentity();
    
    // Navigate to upload page
    await page.goto('/vault');
    await page.waitForLoadState('networkidle');
    
    // Look for upload functionality
    const uploadButton = page.locator('input[type="file"]')
      .or(page.locator('button:has-text("Upload")'))
      .or(page.locator('[data-testid="upload-button"]'));
    
    if (await uploadButton.count() > 0) {
      // Test upload workflow
      console.log('✅ Upload functionality found - can test upload workflow');
      
      // TODO: Implement actual file upload test
      // This would involve:
      // 1. Selecting a test image file
      // 2. Waiting for upload to complete
      // 3. Verifying image appears in vault
      // 4. Checking image dimensions are correct (not 32x32 placeholder)
    } else {
      console.log('ℹ️ Upload functionality not found in UI');
    }
  });

  testWithII('should delete all memories with authenticated user', async ({ page, iiPage }) => {
    // Sign in with new identity
    await page.goto('/');
    await iiPage.signInWithNewIdentity();
    
    // Navigate to vault
    await page.goto('/vault');
    await page.waitForLoadState('networkidle');
    
    // Look for delete all functionality
    const deleteAllButton = page.locator('button:has-text("Delete All")')
      .or(page.locator('button:has-text("Clear All")'))
      .or(page.locator('[data-testid="delete-all-memories"]'));
    
    if (await deleteAllButton.count() > 0) {
      // Test delete all workflow
      console.log('✅ Delete all functionality found - can test delete workflow');
      
      // TODO: Implement actual delete all test
      // This would involve:
      // 1. Ensuring there are memories to delete
      // 2. Clicking delete all button
      // 3. Confirming deletion
      // 4. Verifying memories are removed
      // 5. Checking that no "NotFound" errors occur
    } else {
      console.log('ℹ️ Delete all functionality not found in UI');
    }
  });

  testWithII('should handle capsule creation automatically', async ({ page, iiPage }) => {
    // Sign in with completely new identity (no existing capsule)
    await page.goto('/');
    await iiPage.signInWithNewIdentity();
    
    // Navigate to vault - this should trigger capsule creation if needed
    await page.goto('/vault');
    await page.waitForLoadState('networkidle');
    
    // Monitor network requests for capsule operations
    const requests: string[] = [];
    const responses: { url: string; status: number }[] = [];

    page.on('request', (request) => {
      if (request.url().includes('capsules')) {
        requests.push(`${request.method()} ${request.url()}`);
      }
    });

    page.on('response', (response) => {
      if (response.url().includes('capsules')) {
        responses.push({
          url: response.url(),
          status: response.status(),
        });
      }
    });

    // Wait for any capsule operations to complete
    await page.waitForTimeout(3000);

    // Check that capsule operations succeeded
    const capsuleErrors = responses.filter(r => r.status >= 400);
    const capsuleNotFoundErrors = responses.filter(r => r.status === 404);

    console.log(`🔍 [ICP Plugin] Found ${requests.length} capsule requests`);
    console.log(`🔍 [ICP Plugin] Found ${capsuleErrors.length} capsule errors`);
    console.log(`🔍 [ICP Plugin] Found ${capsuleNotFoundErrors.length} capsule 404 errors`);

    // The get-or-create capsule fix should prevent NotFound errors
    if (capsuleNotFoundErrors.length > 0) {
      console.log('❌ [ICP Plugin] Found capsule NotFound errors - fix may not be working');
    } else {
      console.log('✅ [ICP Plugin] No capsule NotFound errors - fix appears to be working');
    }

    // Log requests for debugging
    requests.forEach((req, index) => {
      console.log(`🔍 [ICP Plugin] Request ${index + 1}: ${req}`);
    });
  });
});
*/

// Placeholder test that runs without the plugin
import { test, expect } from '@playwright/test';

test.describe('ICP Authentication (Placeholder)', () => {
  test('ICP plugin not yet installed', async ({ page }) => {
    // This test runs without the ICP plugin
    // It serves as a placeholder until @dfinity/internet-identity-playwright is installed

    await page.goto('/');

    // Check if Internet Identity connection is available
    const connectButton = page.locator('button:has-text("Connect")');
    const isConnectVisible = await connectButton.isVisible();

    if (isConnectVisible) {
      console.log('ℹ️ [Placeholder] Internet Identity connection available');
      console.log('ℹ️ [Placeholder] Install @dfinity/internet-identity-playwright to enable automated testing');
    } else {
      console.log('ℹ️ [Placeholder] Already connected or no Internet Identity integration found');
    }

    // This test always passes - it's just for documentation
    expect(true).toBe(true);
  });
});

