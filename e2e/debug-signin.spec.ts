import { test } from '@playwright/test';

test.describe('Debug Signin Flow', () => {
  test('check signin modal flow', async ({ page }) => {
    // Listen for console errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // 1. Go to homepage first
    await page.goto('/en');
    console.log('Initial page URL:', page.url());

    // 2. Click the "Sign In" button in header
    await page.getByRole('button', { name: 'Sign In' }).click();

    // 3. Wait for modal to appear and check URL
    await page.waitForLoadState('networkidle');
    console.log('URL after clicking Sign In:', page.url());

    // 4. Take a screenshot of the modal
    await page.screenshot({ path: 'debug/debug-signin-modal.png' });

    // 5. Check for modal presence
    const modal = page.locator('.fixed.inset-0.z-50'); // Modal container
    const modalVisible = await modal.isVisible();
    console.log('Modal visible:', modalVisible);

    // 6. Check for Internet Identity button in modal
    const iiButton = page.locator(
      'button:has-text("Sign in with Internet Identity")'
    );
    const iiButtonCount = await iiButton.count();
    const iiButtonVisible =
      iiButtonCount > 0 ? await iiButton.first().isVisible() : false;
    console.log(
      `Internet Identity button found: ${iiButtonCount}, visible: ${iiButtonVisible}`
    );

    // 7. Check for Google button too
    const googleButton = page.locator('button:has-text("Sign in with Google")');
    const googleButtonCount = await googleButton.count();
    const googleButtonVisible =
      googleButtonCount > 0 ? await googleButton.first().isVisible() : false;
    console.log(
      `Google button found: ${googleButtonCount}, visible: ${googleButtonVisible}`
    );

    // 8. Check for modal title
    const modalTitle = page.locator('h1:has-text("Sign in")');
    const titleVisible = await modalTitle.isVisible();
    console.log('Modal title visible:', titleVisible);

    // 9. Check for close button
    const closeButton = page.locator('button:has([data-lucide="x"])');
    const closeButtonVisible = await closeButton.isVisible();
    console.log('Close button visible:', closeButtonVisible);

    // 10. Check for console errors
    console.log('Console errors:', consoleErrors);

    // 11. Check for any error messages in modal
    const errorElements = await page
      .locator('[role="alert"], .error, .alert')
      .count();
    console.log(`Found ${errorElements} error/alert elements`);

    // 12. List all buttons in modal
    const modalButtons = page.locator('.fixed.inset-0.z-50 button');
    const buttonCount = await modalButtons.count();
    console.log(`Total buttons in modal: ${buttonCount}`);

    for (let i = 0; i < buttonCount; i++) {
      const button = modalButtons.nth(i);
      const text = await button.textContent();
      const isVisible = await button.isVisible();
      console.log(`Modal Button ${i}: "${text}" (visible: ${isVisible})`);
    }
  });
});
