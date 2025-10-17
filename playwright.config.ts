import { defineConfig, devices } from '@playwright/test';
import { execSync } from 'child_process';

/**
 * See https://playwright.dev/docs/test-configuration.
 */

// Check if dev server is running in local development
function checkDevServer() {
  if (process.env.CI) return; // Skip check in CI

  try {
    execSync('curl -s http://localhost:3000 > /dev/null', { stdio: 'ignore' });
    console.log('✅ Dev server is running on http://localhost:3000');
  } catch (_error) {
    console.error('❌ Dev server is not running on http://localhost:3000');
    console.error('Please start the dev server first:');
    console.error('  pnpm dev:nextjs');
    console.error('Then run the tests again.');
    process.exit(1);
  }
}

// Check dev server before running tests
checkDevServer();

export default defineConfig({
  testDir: '.',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Timeout for Internet Identity tests */
  timeout: 60_000,
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: process.env.CI
    ? {
        command: 'pnpm dev:nextjs',
        url: 'http://localhost:3000',
        reuseExistingServer: false,
        timeout: 120 * 1000, // 2 minutes timeout for dev server startup
      }
    : {
        // For local dev: just reuse existing server (we already checked it's running)
        command: 'echo "Using existing dev server"',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 5000, // Quick timeout since server should already be running
      },
});
