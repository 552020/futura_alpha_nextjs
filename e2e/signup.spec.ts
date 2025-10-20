import { test, expect } from '@playwright/test';

test.describe('Email/Password Signup', () => {
  test('user can sign up with email and password', async ({ page }) => {
    // Navigate to signin page
    await page.goto('/en/signin');

    // Wait for the page to load
    await expect(page).toHaveURL(/\/signin/);

    // Switch to signup tab
    await page.getByRole('button', { name: /sign up/i }).click();

    // Fill in signup form
    const email = `test-${Date.now()}@example.com`;
    const password = 'testpassword123';

    await page.getByLabel(/email/i).fill(email);
    await page.locator('#password').fill(password);
    await page.locator('#confirmPassword').fill(password);

    // Submit signup form
    await page.getByRole('button', { name: /sign up with email/i }).click();

    // Wait for the operation to complete (button becomes enabled again)
    await page.waitForFunction(
      () => {
        const button = document.querySelector('button[type="submit"]') as HTMLButtonElement;
        return button && !button.disabled;
      },
      { timeout: 10000 }
    );

    // Add extra wait for redirect to complete
    await page.waitForTimeout(2000);

    // Check if we're still on signin page (indicating failure)
    if (page.url().includes('/signin')) {
      // Look for error messages
      const errorElement = page.locator('p.text-red-500');
      if (await errorElement.isVisible()) {
        const errorText = await errorElement.textContent();
        throw new Error(`Signup failed: ${errorText}`);
      } else {
        throw new Error('Signup failed: No redirect occurred and no error message shown');
      }
    }

    // Wait for successful redirect
    await expect(page).toHaveURL(/\/dashboard/);

    // Verify user is signed in (should see dashboard content)
    await expect(page.locator('h1, h2, h3')).toContainText(/dashboard|vault|memories/i);
  });

  test('signup shows validation errors for mismatched passwords', async ({ page }) => {
    await page.goto('/en/signin');

    // Switch to signup tab
    await page.getByRole('button', { name: /sign up/i }).click();

    // Fill form with mismatched passwords
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.locator('#password').fill('password123');
    await page.locator('#confirmPassword').fill('different123');

    // Submit form
    await page.getByRole('button', { name: /sign up with email/i }).click();

    // Should show validation error
    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
  });

  test('signup shows validation errors for invalid email', async ({ page }) => {
    await page.goto('/en/signin');
    await page.getByRole('button', { name: /sign up/i }).click();

    // Fill fields with invalid email that should fail server validation
    await page.getByLabel(/email/i).fill('invalid@email');
    await page.locator('#password').fill('Validpass123!');
    await page.locator('#confirmPassword').fill('Validpass123!');

    // Submit form and wait for response
    await page.getByRole('button', { name: /sign up with email/i }).click();

    // Wait for error message to appear
    await page.waitForTimeout(2000);

    // Check if error message appears (either from client validation or server)
    await expect(page.getByText(/invalid email format/i)).toBeVisible();
  });

  test('signup shows validation errors for short password', async ({ page }) => {
    await page.goto('/en/signin');
    await page.getByRole('button', { name: /sign up/i }).click();

    await page.getByLabel(/email/i).fill('ok@example.com');
    await page.locator('#password').fill('123');
    await page.locator('#confirmPassword').fill('123');

    // Submit form and wait for response
    await page.getByRole('button', { name: /sign up with email/i }).click();

    // Wait for error message to appear
    await page.waitForTimeout(2000);

    // Check if error message appears
    await expect(page.getByText(/at least 6 characters/i)).toBeVisible();
  });

  test('@db signup shows error for existing email', async ({ page }) => {
    await page.goto('/en/signin');

    // Switch to signup tab
    await page.getByRole('button', { name: /sign up/i }).click();

    // First, create a user to test with
    const existingEmail = `existing-${Date.now()}@example.com`;
    const password = 'testpassword123';

    // Create the user first
    await page.getByLabel(/email/i).fill(existingEmail);
    await page.locator('#password').fill(password);
    await page.locator('#confirmPassword').fill(password);
    await page.getByRole('button', { name: /sign up with email/i }).click();

    // Wait for successful signup
    await page.waitForFunction(
      () => {
        const button = document.querySelector('button[type="submit"]') as HTMLButtonElement;
        return button && !button.disabled;
      },
      { timeout: 10000 }
    );
    await page.waitForTimeout(2000);

    // Now try to sign up with the same email again
    await page.goto('/en/signin');
    await page.getByRole('button', { name: /sign up/i }).click();
    await page.getByLabel(/email/i).fill(existingEmail);
    await page.locator('#password').fill('password123');
    await page.locator('#confirmPassword').fill('password123');

    // Submit form
    await page.getByRole('button', { name: /sign up with email/i }).click();

    // Wait for form submission to complete
    await page.waitForTimeout(2000);

    // Should show error for existing email
    await expect(page.getByText(/user with this email already exists/i)).toBeVisible();
  });

  test('signup form has all required fields', async ({ page }) => {
    await page.goto('/en/signin');

    // Switch to signup tab
    await page.getByRole('button', { name: /sign up/i }).click();

    // Check that all required fields are present
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#confirmPassword')).toBeVisible();

    // Check that submit button is present
    await expect(page.getByRole('button', { name: /sign up with email/i })).toBeVisible();
  });

  test('can switch between signin and signup tabs', async ({ page }) => {
    await page.goto('/en/signin');

    // Initially should be on signin tab
    await expect(page.getByRole('button', { name: /sign in with email/i })).toBeVisible();
    await expect(page.getByLabel(/confirm password/i)).not.toBeVisible();

    // Switch to signup tab
    await page.getByRole('button', { name: /sign up/i }).click();

    // Should show signup form
    await expect(page.getByRole('button', { name: /sign up with email/i })).toBeVisible();
    await expect(page.getByLabel(/confirm password/i)).toBeVisible();

    // Switch back to signin tab
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();

    // Should show signin form
    await expect(page.getByRole('button', { name: /sign in with email/i })).toBeVisible();
    await expect(page.getByLabel(/confirm password/i)).not.toBeVisible();
  });
});
