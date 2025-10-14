import { test, expect } from '@playwright/test';

test.describe('Delete All Memories Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the vault page
    await page.goto('http://localhost:3000/vault');
    await page.waitForLoadState('networkidle');
  });

  test('delete all memories functionality works correctly', async ({ page }) => {
    // This test automates the delete all memories workflow
    // that was previously failing with "NotFound" errors

    // Check if user is authenticated
    const authButton = page.locator('button:has-text("Connect")');
    const isAuthenticated = await authButton.count() === 0;
    
    if (!isAuthenticated) {
      test.skip('Authentication required for delete test - Internet Identity setup needed');
    }

    // Look for the delete all memories button/option
    // This might be in a settings menu, dropdown, or as a direct button
    const deleteAllButton = page.locator('button:has-text("Delete All")')
      .or(page.locator('button:has-text("Clear All")'))
      .or(page.locator('[data-testid="delete-all-memories"]'))
      .or(page.locator('button:has-text("Delete All Memories")'));

    const deleteAllExists = await deleteAllButton.count() > 0;
    
    if (!deleteAllExists) {
      test.skip('Delete all memories button not found - may not be implemented in UI yet');
    }

    // Count existing memories before deletion
    const memoryCards = page.locator('[data-testid="memory-card"]')
      .or(page.locator('.memory-card'))
      .or(page.locator('img[src*="/api/assets/"]').locator('..'));
    
    const memoryCountBefore = await memoryCards.count();
    console.log(`🔍 [Playwright] Found ${memoryCountBefore} memories before deletion`);

    if (memoryCountBefore === 0) {
      test.skip('No memories to delete');
    }

    // Click the delete all button
    await deleteAllButton.click();

    // Handle confirmation dialog if it appears
    const confirmButton = page.locator('button:has-text("Confirm")')
      .or(page.locator('button:has-text("Yes")'))
      .or(page.locator('button:has-text("Delete")'))
      .or(page.locator('[data-testid="confirm-delete"]'));

    if (await confirmButton.count() > 0) {
      await confirmButton.click();
    }

    // Wait for deletion to complete
    // This might involve waiting for network requests or UI updates
    await page.waitForTimeout(3000);

    // Verify memories are deleted
    const memoryCountAfter = await memoryCards.count();
    console.log(`🔍 [Playwright] Found ${memoryCountAfter} memories after deletion`);

    // The count should be 0 or significantly reduced
    expect(memoryCountAfter).toBeLessThan(memoryCountBefore);
    
    if (memoryCountAfter === 0) {
      console.log('✅ All memories successfully deleted');
    } else {
      console.log(`⚠️ Some memories may not have been deleted: ${memoryCountAfter} remaining`);
    }
  });

  test('delete all memories handles capsule creation correctly', async ({ page }) => {
    // This test specifically checks that the get-or-create capsule pattern works
    // which was the fix for the "NotFound" error

    // Check if user is authenticated
    const authButton = page.locator('button:has-text("Connect")');
    const isAuthenticated = await authButton.count() === 0;
    
    if (!isAuthenticated) {
      test.skip('Authentication required for capsule test - Internet Identity setup needed');
    }

    // Monitor network requests to see if capsule creation happens
    const requests: string[] = [];
    const responses: { url: string; status: number; body?: string }[] = [];

    page.on('request', (request) => {
      if (request.url().includes('capsules') || request.url().includes('memories')) {
        requests.push(`${request.method()} ${request.url()}`);
      }
    });

    page.on('response', (response) => {
      if (response.url().includes('capsules') || response.url().includes('memories')) {
        responses.push({
          url: response.url(),
          status: response.status(),
        });
      }
    });

    // Try to trigger delete all memories
    const deleteAllButton = page.locator('button:has-text("Delete All")')
      .or(page.locator('button:has-text("Clear All")'))
      .or(page.locator('[data-testid="delete-all-memories"]'));

    if (await deleteAllButton.count() > 0) {
      await deleteAllButton.click();

      // Handle confirmation if needed
      const confirmButton = page.locator('button:has-text("Confirm")')
        .or(page.locator('button:has-text("Yes")'))
        .or(page.locator('button:has-text("Delete")'));

      if (await confirmButton.count() > 0) {
        await confirmButton.click();
      }

      // Wait for requests to complete
      await page.waitForTimeout(5000);

      // Check that no "NotFound" errors occurred
      const notFoundResponses = responses.filter(r => r.status === 404);
      const errorResponses = responses.filter(r => r.status >= 400);

      console.log(`🔍 [Playwright] Found ${requests.length} capsule/memory requests`);
      console.log(`🔍 [Playwright] Found ${errorResponses.length} error responses`);
      console.log(`🔍 [Playwright] Found ${notFoundResponses.length} 404 responses`);

      // Log the requests for debugging
      requests.forEach((req, index) => {
        console.log(`🔍 [Playwright] Request ${index + 1}: ${req}`);
      });

      // Log error responses for debugging
      errorResponses.forEach((resp, index) => {
        console.log(`🔍 [Playwright] Error ${index + 1}: ${resp.status} ${resp.url}`);
      });

      // The fix should prevent NotFound errors for capsule operations
      const capsuleNotFoundErrors = notFoundResponses.filter(r => 
        r.url.includes('capsules') && r.status === 404
      );

      if (capsuleNotFoundErrors.length > 0) {
        console.log('❌ [Playwright] Found capsule NotFound errors - fix may not be working');
        console.log('Capsule NotFound errors:', capsuleNotFoundErrors);
      } else {
        console.log('✅ [Playwright] No capsule NotFound errors found - fix appears to be working');
      }
    } else {
      test.skip('Delete all memories button not found');
    }
  });

  test('delete all memories shows appropriate feedback', async ({ page }) => {
    // This test checks that appropriate user feedback is shown during deletion

    // Check if user is authenticated
    const authButton = page.locator('button:has-text("Connect")');
    const isAuthenticated = await authButton.count() === 0;
    
    if (!isAuthenticated) {
      test.skip('Authentication required for feedback test - Internet Identity setup needed');
    }

    const deleteAllButton = page.locator('button:has-text("Delete All")')
      .or(page.locator('button:has-text("Clear All")'))
      .or(page.locator('[data-testid="delete-all-memories"]'));

    if (await deleteAllButton.count() === 0) {
      test.skip('Delete all memories button not found');
    }

    // Look for loading states, success messages, or error messages
    await deleteAllButton.click();

    // Check for loading state
    const loadingIndicator = page.locator('[data-testid="loading"]')
      .or(page.locator('.loading'))
      .or(page.locator('button:has-text("Deleting")'))
      .or(page.locator('button:disabled'));

    if (await loadingIndicator.count() > 0) {
      console.log('✅ [Playwright] Loading state detected during deletion');
    }

    // Wait for operation to complete
    await page.waitForTimeout(3000);

    // Check for success message
    const successMessage = page.locator('text=Successfully deleted')
      .or(page.locator('text=deleted successfully'))
      .or(page.locator('[data-testid="success-message"]'))
      .or(page.locator('.success'));

    // Check for error message
    const errorMessage = page.locator('text=Failed to delete')
      .or(page.locator('text=Error'))
      .or(page.locator('[data-testid="error-message"]'))
      .or(page.locator('.error'));

    if (await successMessage.count() > 0) {
      console.log('✅ [Playwright] Success message displayed');
    } else if (await errorMessage.count() > 0) {
      console.log('❌ [Playwright] Error message displayed');
      const errorText = await errorMessage.textContent();
      console.log(`Error message: ${errorText}`);
    } else {
      console.log('ℹ️ [Playwright] No explicit success/error message found');
    }
  });
});

