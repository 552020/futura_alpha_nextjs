import { test, expect } from '@playwright/test';

test.describe('Mobile Overflow Testing', () => {
  test('mobile viewport - no horizontal overflow', async ({ page }) => {
    // Set mobile viewport (iPhone SE)
    await page.setViewportSize({ width: 375, height: 667 });

    // Go to homepage first (no auth required)
    await page.goto('/en');

    // Check that page width doesn't exceed viewport
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);

    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth);

    // Verify no horizontal scroll
    const hasHorizontalScroll = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
    );
    expect(hasHorizontalScroll).toBe(false);
  });

  test('viewport meta tag is present', async ({ page }) => {
    await page.goto('/en');

    // Check viewport meta tag
    const viewportMeta = await page.evaluate(() =>
      document.querySelector('meta[name=viewport]')?.getAttribute('content')
    );

    expect(viewportMeta).toBe('width=device-width, initial-scale=1');
  });

  test('toolbar buttons wrap on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/en');

    // Check if toolbar exists and is visible
    const toolbar = page.locator('[class*="flex"][class*="gap-2"]').first();
    await expect(toolbar).toBeVisible();

    // Verify no horizontal overflow
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
    );
    expect(overflow).toBe(false);
  });

  test('container respects max-width', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/en');

    // Check container element
    const container = page.locator('.container');
    await expect(container).toBeVisible();

    // Get container width
    const containerWidth = await container.evaluate(
      (el) => el.getBoundingClientRect().width
    );
    const viewportWidth = await page.evaluate(() => window.innerWidth);

    // Container should not exceed viewport width
    expect(containerWidth).toBeLessThanOrEqual(viewportWidth);
  });

  test('button text can wrap', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/en');

    // Look for buttons with text that might overflow
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    // Check each button for overflow
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const isVisible = await button.isVisible();

      if (isVisible) {
        const buttonRect = await button.boundingBox();
        if (buttonRect) {
          // Button should not extend beyond viewport
          expect(buttonRect.x + buttonRect.width).toBeLessThanOrEqual(375);
        }
      }
    }
  });

  test('responsive layout - multiple viewports', async ({ page }) => {
    const viewports = [
      { width: 375, height: 667, name: 'iPhone SE' },
      { width: 768, height: 1024, name: 'iPad' },
      { width: 1024, height: 768, name: 'Desktop' },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await page.goto('/en');

      // Check for horizontal overflow
      const hasOverflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth
      );

      expect(
        hasOverflow,
        `Should not have horizontal overflow on ${viewport.name}`
      ).toBe(false);
    }
  });

  test('header and content alignment', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/en');

    // Get header and main content widths
    const headerWidth = await page.evaluate(() => {
      const header = document.querySelector('header');
      return header ? header.getBoundingClientRect().width : 0;
    });

    const contentWidth = await page.evaluate(() => {
      const main = document.querySelector('main');
      return main ? main.getBoundingClientRect().width : 0;
    });

    // Header and content should have similar widths (no major misalignment)
    const widthDifference = Math.abs(headerWidth - contentWidth);
    expect(widthDifference).toBeLessThan(50); // Allow some margin for padding
  });

  test('find overflowing elements', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/en');

    // Find elements that extend beyond viewport
    const overflowingElements = await page.evaluate(() => {
      const elements: Array<{
        tagName: string;
        className: string;
        right: number;
        viewportWidth: number;
      }> = [];
      const viewportWidth = document.documentElement.clientWidth;

      document.querySelectorAll('*').forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.right > viewportWidth) {
          elements.push({
            tagName: el.tagName,
            className: el.className,
            right: rect.right,
            viewportWidth: viewportWidth,
          });
        }
      });

      return elements;
    });

    // Should have no overflowing elements
    expect(overflowingElements).toHaveLength(0);

    if (overflowingElements.length > 0) {
      console.log('Overflowing elements found:', overflowingElements);
    }
  });
});
