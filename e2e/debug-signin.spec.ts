import { test, expect } from '@playwright/test';

test.describe('Debug Signin Page', () => {
  test('check signin page content', async ({ page }) => {
    await page.goto('/en/signin');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Take a screenshot
    await page.screenshot({ path: 'debug-signin.png' });
    
    // Check the page title and URL
    console.log('Page URL:', page.url());
    console.log('Page title:', await page.title());
    
    // Check what buttons are available
    const buttons = await page.locator('button').all();
    console.log('Available buttons:');
    for (let i = 0; i < buttons.length; i++) {
      const text = await buttons[i].textContent();
      const isVisible = await buttons[i].isVisible();
      console.log(`Button ${i}: "${text}" (visible: ${isVisible})`);
    }
    
    // Check for Internet Identity text
    const iiText = await page.locator('text=Internet Identity').count();
    console.log(`Found ${iiText} elements with "Internet Identity" text`);
    
    // Check for any II-related elements
    const iiElements = await page.locator('[data-testid*="ii"], [class*="ii"], [id*="ii"]').count();
    console.log(`Found ${iiElements} II-related elements`);
    
    // Check if we're redirected somewhere else
    const currentUrl = page.url();
    console.log('Current URL after load:', currentUrl);
    
    // Check for any error messages
    const errorElements = await page.locator('[role="alert"], .error, .alert').count();
    console.log(`Found ${errorElements} error/alert elements`);
  });
});
