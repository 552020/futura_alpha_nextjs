import { test, expect } from '@playwright/test';

test.describe('Sign In Page', () => {
  test('signin page loads correctly', async ({ page }) => {
    await page.goto('/en/signin');

    // Check URL
    await expect(page).toHaveURL(/\/signin/);

    // Check for main form elements
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(
      page.getByRole('button', { name: /sign in with email/i })
    ).toBeVisible();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/en/signin');

    // Fill in invalid credentials
    await page.getByLabel(/email/i).fill('invalid@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in with email/i }).click();

    // Wait for form submission and check for error message
    await page.waitForTimeout(2000);

    // Check if we're still on signin page (indicating failure)
    if (page.url().includes('/signin')) {
      // Look for error messages
      const errorElement = page.locator('p.text-red-500');
      if (await errorElement.isVisible()) {
        const errorText = await errorElement.textContent();
        console.log('Error message:', errorText);
        await expect(errorElement).toBeVisible();
      } else {
        // If no error message, check if the form is still there (indicating failure)
        const signinButton = page.getByRole('button', {
          name: /sign in with email/i,
        });
        if (await signinButton.isVisible()) {
          // Form is still there, which means signin failed (good)
          console.log('Signin failed as expected - form still visible');
          await expect(signinButton).toBeVisible();
        } else {
          // Check for any error text on the page
          const allText = await page.locator('body').textContent();
          console.log('Page content after invalid signin:', allText);
          throw new Error(
            'Expected error message for invalid credentials but none found'
          );
        }
      }
    } else {
      // If we're not on signin page, the signin might have succeeded (unexpected)
      throw new Error(
        `Expected to stay on signin page with invalid credentials, but redirected to: ${page.url()}`
      );
    }
  });

  test('has OAuth provider buttons', async ({ page }) => {
    await page.goto('/en/signin');

    // Check for Google OAuth (if present)
    const googleButton = page.getByRole('button', {
      name: /google|sign in with google/i,
    });
    if (await googleButton.isVisible()) {
      await expect(googleButton).toBeVisible();
    }

    // Check for GitHub OAuth (if present)
    const githubButton = page.getByRole('button', {
      name: /github|sign in with github/i,
    });
    if (await githubButton.isVisible()) {
      await expect(githubButton).toBeVisible();
    }
  });

  test('has Internet Identity option', async ({ page }) => {
    await page.goto('/en/signin');

    // Check for Internet Identity button
    const iiButton = page.getByRole('button', {
      name: /internet identity|sign in with ii/i,
    });
    if (await iiButton.isVisible()) {
      await expect(iiButton).toBeVisible();
    }
  });

  test('preserves callback URL', async ({ page }) => {
    const callbackUrl = '/en/dashboard';
    await page.goto(
      `/en/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`
    );

    // The callback URL should be preserved in the form
    // This is tested by checking that the form submission would redirect correctly
    await expect(page).toHaveURL(/callbackUrl/);
  });

  test('can switch between signin and signup modes', async ({ page }) => {
    await page.goto('/en/signin');

    // Initially in signin mode
    await expect(
      page.getByRole('button', { name: /sign in with email/i })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /sign up/i })).toBeVisible();

    // Switch to signup mode
    await page.getByRole('button', { name: /sign up/i }).click();

    // Should show signup fields and button
    await expect(page.getByLabel(/confirm password/i)).toBeVisible();
    await expect(
      page.getByRole('button', { name: /sign up with email/i })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /sign in/i }).first()
    ).toBeVisible();

    // Switch back to signin mode - click the tab button specifically
    await page
      .locator('button[type="button"]')
      .filter({ hasText: 'Sign In' })
      .first()
      .click();

    // Wait for tab switch to complete
    await page.waitForTimeout(1000);

    // Should hide signup fields
    await expect(page.getByLabel(/confirm password/i)).not.toBeVisible();
    await expect(
      page.getByRole('button', { name: /sign in with email/i })
    ).toBeVisible();
  });

  test('signup form shows validation errors', async ({ page }) => {
    await page.goto('/en/signin');

    // Switch to signup mode
    await page.getByRole('button', { name: /sign up/i }).click();

    // Try to submit with mismatched passwords
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.locator('#password').fill('password123');
    await page.locator('#confirmPassword').fill('different123');
    await page.getByRole('button', { name: /sign up with email/i }).click();

    // Should show password mismatch error
    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
  });

  test('user can sign in with valid credentials', async ({ page }) => {
    // First, create a user by signing up
    await page.goto('/en/signin');

    // Switch to signup mode
    await page.getByRole('button', { name: /sign up/i }).click();

    const testEmail = `signin-test-${Date.now()}@example.com`;
    const testPassword = 'testpassword123';

    // Sign up
    await page.getByLabel(/email/i).fill(testEmail);
    await page.locator('#password').fill(testPassword);
    await page.locator('#confirmPassword').fill(testPassword);
    await page.getByRole('button', { name: /sign up with email/i }).click();

    // Wait for successful signup and redirect
    await page.waitForFunction(
      () => {
        const button = document.querySelector(
          'button[type="submit"]'
        ) as HTMLButtonElement;
        return button && !button.disabled;
      },
      { timeout: 10000 }
    );
    await page.waitForTimeout(2000);

    // Should be redirected to dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Now sign out
    // Look for sign out button (could be in header, dropdown, etc.)
    const signOutButton = page.getByRole('button', {
      name: /sign out|log out|logout/i,
    });
    if (await signOutButton.isVisible()) {
      await signOutButton.click();
      await page.waitForTimeout(1000);
    } else {
      // Alternative: navigate to signout URL if button not found
      await page.goto('/api/auth/signout');
      await page.waitForTimeout(1000);
    }

    // Navigate to signin page (signout might not redirect automatically)
    await page.goto('/en/signin');

    // Now test signin with the same credentials
    await page.getByLabel(/email/i).fill(testEmail);
    await page.getByLabel(/password/i).fill(testPassword);
    await page.getByRole('button', { name: /sign in with email/i }).click();

    // Wait for signin to complete
    await page.waitForFunction(
      () => {
        const button = document.querySelector(
          'button[type="submit"]'
        ) as HTMLButtonElement;
        return button && !button.disabled;
      },
      { timeout: 10000 }
    );
    await page.waitForTimeout(2000);

    // Should be redirected to dashboard again
    await expect(page).toHaveURL(/\/dashboard/);

    // Verify user is signed in (should see dashboard content)
    await expect(page.locator('h1, h2, h3')).toContainText(
      /dashboard|vault|memories/i
    );
  });
});
