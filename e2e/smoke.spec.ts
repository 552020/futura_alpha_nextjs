import { test, expect } from '@playwright/test';

test('the homepage is reachable', async ({ page }) => {
  await page.goto('http://localhost:3000'); // or whatever your local dev port is
  await expect(page).toHaveTitle(/Futura|Next\.js/i); // check the title
});
