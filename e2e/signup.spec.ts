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
    await page.getByLabel(/password/i).fill(password);
    await page.getByLabel(/confirm password/i).fill(password);
    
    // Submit signup form
    await page.getByRole('button', { name: /sign up with email/i }).click();
    
    // Wait for successful signup and redirect
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
    await page.getByLabel(/password/i).fill('password123');
    await page.getByLabel(/confirm password/i).fill('different123');
    
    // Submit form
    await page.getByRole('button', { name: /sign up with email/i }).click();
    
    // Should show validation error
    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
  });

  test('signup shows validation errors for invalid email', async ({ page }) => {
    await page.goto('/en/signin');
    
    // Switch to signup tab
    await page.getByRole('button', { name: /sign up/i }).click();
    
    // Fill form with invalid email
    await page.getByLabel(/email/i).fill('invalid-email');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByLabel(/confirm password/i).fill('password123');
    
    // Submit form
    await page.getByRole('button', { name: /sign up with email/i }).click();
    
    // Should show validation error
    await expect(page.getByText(/invalid email format/i)).toBeVisible();
  });

  test('signup shows validation errors for short password', async ({ page }) => {
    await page.goto('/en/signin');
    
    // Switch to signup tab
    await page.getByRole('button', { name: /sign up/i }).click();
    
    // Fill form with short password
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('123');
    await page.getByLabel(/confirm password/i).fill('123');
    
    // Submit form
    await page.getByRole('button', { name: /sign up with email/i }).click();
    
    // Should show validation error
    await expect(page.getByText(/password must be at least 6 characters/i)).toBeVisible();
  });

  test('signup shows error for existing email', async ({ page }) => {
    await page.goto('/en/signin');
    
    // Switch to signup tab
    await page.getByRole('button', { name: /sign up/i }).click();
    
    // Use a known existing email (you might need to adjust this)
    await page.getByLabel(/email/i).fill('existing@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByLabel(/confirm password/i).fill('password123');
    
    // Submit form
    await page.getByRole('button', { name: /sign up with email/i }).click();
    
    // Should show error for existing email
    await expect(page.getByText(/user with this email already exists/i)).toBeVisible();
  });

  test('signup form has all required fields', async ({ page }) => {
    await page.goto('/en/signin');
    
    // Switch to signup tab
    await page.getByRole('button', { name: /sign up/i }).click();
    
    // Check that all required fields are present
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByLabel(/confirm password/i)).toBeVisible();
    
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
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Should show signin form
    await expect(page.getByRole('button', { name: /sign in with email/i })).toBeVisible();
    await expect(page.getByLabel(/confirm password/i)).not.toBeVisible();
  });
});
