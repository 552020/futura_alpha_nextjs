import { test } from '@playwright/test';

test('simple signup with email and password', async ({ page }) => {
  // Go to signin page with full URL
  await page.goto('http://localhost:3000/en/signin');

  // Click the Sign Up tab
  await page.getByRole('button', { name: /sign up/i }).click();

  // Fill the form
  await page.getByLabel(/email/i).fill('test@example.com');
  await page.locator('#password').fill('password123');
  await page.locator('#confirmPassword').fill('password123');

  // Click signup button
  await page.getByRole('button', { name: /sign up with email/i }).click();

  // Wait a bit to see what happens
  await page.waitForTimeout(2000);

  // Check if we're redirected to dashboard or if there's an error
  const currentUrl = page.url();
  console.log('Current URL after signup:', currentUrl);

  // If there's an error message, let's see it
  const errorMessage = await page.locator('text=/error|failed|invalid/i').first();
  if (await errorMessage.isVisible()) {
    const errorText = await errorMessage.textContent();
    console.log('Error message:', errorText);
  }
});
