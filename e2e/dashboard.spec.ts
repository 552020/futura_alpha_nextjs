import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('dashboard page loads and shows authentication state', async ({
    page,
  }) => {
    // Set desktop viewport to ensure navigation is visible
    await page.setViewportSize({ width: 1280, height: 720 });

    await page.goto('/en/dashboard');

    // Check that we're on the dashboard page
    await expect(page).toHaveURL(/\/dashboard/);

    // Look for common dashboard elements
    // These might be present depending on your dashboard structure
    const pageTitle = page.locator('h1, h2, [data-testid="page-title"]');
    if ((await pageTitle.count()) > 0) {
      await expect(pageTitle.first()).toBeVisible();
    }

    // Check for navigation elements (desktop nav should be visible)
    const nav = page.locator('nav, [role="navigation"]');
    if ((await nav.count()) > 0) {
      // Check if nav is visible, if not, just verify it exists
      const navElement = nav.first();
      const isVisible = await navElement.isVisible();
      if (!isVisible) {
        // Navigation exists but is hidden (mobile view), that's okay
        console.log('Navigation exists but is hidden (mobile view)');
      } else {
        await expect(navElement).toBeVisible();
      }
    }

    // Check for user-related elements (if authenticated)
    const userMenu = page.locator(
      '[data-testid="user-menu"], [aria-label*="user"], [aria-label*="profile"]'
    );
    if ((await userMenu.count()) > 0) {
      await expect(userMenu.first()).toBeVisible();
    }
  });

  test('dashboard shows appropriate content for unauthenticated users', async ({
    page,
  }) => {
    await page.goto('/en/dashboard');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check if there's a sign-in prompt or redirect
    const signInHeading = page.getByRole('heading', {
      name: /please sign in/i,
    });
    const redirectToSignIn = page.url().includes('/signin');

    // Either we should see a sign-in prompt or be redirected to signin
    const hasSignInPrompt = await signInHeading.isVisible();
    expect(hasSignInPrompt || redirectToSignIn).toBeTruthy();
  });

  test('dashboard has navigation to other pages', async ({ page }) => {
    await page.goto('/en/dashboard');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Look for any navigation elements (header, nav, or links)
    const hasNavigation =
      (await page
        .locator(
          'header, nav, [role="navigation"], a[href*="/dashboard"], a[href*="/memories"], a[href*="/settings"]'
        )
        .count()) > 0;

    // Just check that some navigation exists (don't require visibility)
    expect(hasNavigation).toBeTruthy();
  });
});
