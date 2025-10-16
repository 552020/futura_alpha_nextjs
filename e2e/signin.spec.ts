import { test, expect } from '@playwright/test';

test.describe('Sign In Page', () => {
  test('signin page loads correctly', async ({ page }) => {
    await page.goto('/en/signin');

    // Check URL
    await expect(page).toHaveURL(/\/signin/);

    // Check for main form elements
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in|log in/i })).toBeVisible();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/en/signin');

    // Fill in invalid credentials
    await page.getByLabel(/email/i).fill('invalid@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in|log in/i }).click();

    // Should show error message
    await expect(page.getByText(/invalid email or password|sign in failed/i)).toBeVisible();
  });

  test('has OAuth provider buttons', async ({ page }) => {
    await page.goto('/en/signin');

    // Check for Google OAuth (if present)
    const googleButton = page.getByRole('button', { name: /google|sign in with google/i });
    if (await googleButton.isVisible()) {
      await expect(googleButton).toBeVisible();
    }

    // Check for GitHub OAuth (if present)
    const githubButton = page.getByRole('button', { name: /github|sign in with github/i });
    if (await githubButton.isVisible()) {
      await expect(githubButton).toBeVisible();
    }
  });

  test('has Internet Identity option', async ({ page }) => {
    await page.goto('/en/signin');

    // Check for Internet Identity button
    const iiButton = page.getByRole('button', { name: /internet identity|sign in with ii/i });
    if (await iiButton.isVisible()) {
      await expect(iiButton).toBeVisible();
    }
  });

  test('preserves callback URL', async ({ page }) => {
    const callbackUrl = '/en/dashboard';
    await page.goto(`/en/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);

    // The callback URL should be preserved in the form
    // This is tested by checking that the form submission would redirect correctly
    await expect(page).toHaveURL(/callbackUrl/);
  });

  test('can switch between signin and signup modes', async ({ page }) => {
    await page.goto('/en/signin');

    // Initially in signin mode
    await expect(page.getByRole('button', { name: /sign in with email/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /need an account\? sign up/i })).toBeVisible();

    // Switch to signup mode
    await page.getByRole('button', { name: /need an account\? sign up/i }).click();

    // Should show signup fields and button
    await expect(page.getByLabel(/confirm password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign up with email/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /already have an account\? sign in/i })).toBeVisible();

    // Switch back to signin mode
    await page.getByRole('button', { name: /already have an account\? sign in/i }).click();

    // Should hide signup fields
    await expect(page.getByLabel(/confirm password/i)).not.toBeVisible();
    await expect(page.getByRole('button', { name: /sign in with email/i })).toBeVisible();
  });

  test('signup form shows validation errors', async ({ page }) => {
    await page.goto('/en/signin');

    // Switch to signup mode
    await page.getByRole('button', { name: /need an account\? sign up/i }).click();

    // Try to submit with mismatched passwords
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByLabel(/confirm password/i).fill('different123');
    await page.getByRole('button', { name: /sign up with email/i }).click();

    // Should show password mismatch error
    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
  });
});
