import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  /* Serialize all tests to stop bleeding - prioritize delivery over purity */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Serialize all tests to stop bleeding - prioritize delivery over purity */
  workers: 1,
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

  /* Configure projects for test isolation */
  projects: [
    {
      name: 'ui',
      use: { ...devices['Desktop Chrome'] },
      grepInvert: /@db/,
    },
    {
      name: 'db',
      use: { ...devices['Desktop Chrome'] },
      grep: /@db/,
      // DB tests already serialized by global workers=1
    },
    // Cross-browser only in CI if needed:
    // { name: 'firefox', use: { ...devices['Desktop Firefox'] }, grepInvert: /@db/ },
    // { name: 'webkit',  use: { ...devices['Desktop Safari']  }, grepInvert: /@db/ },
  ],

  /* NEVER start dev server automatically - neither in local dev nor CI */
  /* CI pipeline should start the dev server, not Playwright */
  webServer: undefined,
});
