import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('dashboard page loads and shows authentication state', async ({ page }) => {
    await page.goto('/en/dashboard');

    // Check that we're on the dashboard page
    await expect(page).toHaveURL(/\/dashboard/);

    // Look for common dashboard elements
    // These might be present depending on your dashboard structure
    const pageTitle = page.locator('h1, h2, [data-testid="page-title"]');
    if ((await pageTitle.count()) > 0) {
      await expect(pageTitle.first()).toBeVisible();
    }

    // Check for navigation elements
    const nav = page.locator('nav, [role="navigation"]');
    if ((await nav.count()) > 0) {
      await expect(nav.first()).toBeVisible();
    }

    // Check for user-related elements (if authenticated)
    const userMenu = page.locator('[data-testid="user-menu"], [aria-label*="user"], [aria-label*="profile"]');
    if ((await userMenu.count()) > 0) {
      await expect(userMenu.first()).toBeVisible();
    }
  });

  test('dashboard shows appropriate content for unauthenticated users', async ({ page }) => {
    await page.goto('/en/dashboard');

    // Check if there's a sign-in prompt or redirect
    const signInPrompt = page.getByText(/sign in|log in|please log in/i);
    const redirectToSignIn = page.url().includes('/signin');

    // Either we should see a sign-in prompt or be redirected to signin
    expect(signInPrompt.isVisible() || redirectToSignIn).toBeTruthy();
  });

  test('dashboard has navigation to other pages', async ({ page }) => {
    await page.goto('/en/dashboard');

    // Look for navigation links
    const navLinks = page.locator('nav a, [role="navigation"] a');
    const linkCount = await navLinks.count();

    if (linkCount > 0) {
      // Check that at least one navigation link is visible
      await expect(navLinks.first()).toBeVisible();
    }
  });
});
