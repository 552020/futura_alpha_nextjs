import { test, expect } from '@playwright/test';

test('the homepage is reachable', async ({ page }) => {
  await page.goto('/en'); // Use the actual locale route
  await expect(page).toHaveTitle(/Futura|Next\.js/i); // check the title
});
