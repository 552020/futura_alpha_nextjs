import { test, expect } from '@playwright/test';

test.describe('Delete Account', () => {
  test('user can delete their account', async ({ page }) => {
    // First, sign up a new user
    await page.goto('/en/signin');
    await expect(page).toHaveURL(/\/signin/);

    // Switch to signup tab
    await page.getByRole('button', { name: /sign up/i }).click();

    // Fill in signup form
    const email = `delete-test-${Date.now()}@example.com`;
    const password = 'testpassword123';

    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/confirm password/i).fill(password);
    await page.getByLabel(/password/i).fill(password);

    // Submit signup
    await page.getByRole('button', { name: /sign up with email/i }).click();

    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Navigate to settings
    await page.goto('/en/user/settings');
    await expect(page).toHaveURL(/\/settings/);

    // Find and click delete account button
    await page.getByRole('button', { name: /delete account/i }).click();

    // Confirm deletion in modal
    await page.getByRole('button', { name: /delete account/i }).click();

    // Should be redirected to home page after deletion
    await expect(page).toHaveURL('/en');
  });

  test('user can cancel account deletion', async ({ page }) => {
    // First, sign up a new user
    await page.goto('/en/signin');
    await expect(page).toHaveURL(/\/signin/);

    // Switch to signup tab
    await page.getByRole('button', { name: /sign up/i }).click();

    // Fill in signup form
    const email = `cancel-delete-test-${Date.now()}@example.com`;
    const password = 'testpassword123';

    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/confirm password/i).fill(password);
    await page.getByLabel(/password/i).fill(password);

    // Submit signup
    await page.getByRole('button', { name: /sign up with email/i }).click();

    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Navigate to settings
    await page.goto('/en/user/settings');
    await expect(page).toHaveURL(/\/settings/);

    // Find and click delete account button
    await page.getByRole('button', { name: /delete account/i }).click();

    // Cancel deletion in modal
    await page.getByRole('button', { name: /cancel/i }).click();

    // Should still be on settings page
    await expect(page).toHaveURL(/\/settings/);
  });
});
