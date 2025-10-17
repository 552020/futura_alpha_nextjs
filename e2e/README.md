# End-to-End Tests with Playwright

This directory contains Playwright end-to-end tests for Playwright.

## 🎯 **Purpose**

This directory contains comprehensive end-to-end tests covering authentication, user workflows, and Internet Identity integration.

## 📁 **Getting Started**

Create new test files with the `.spec.ts` extension in this directory. Playwright will automatically discover and run them.

## 🚀 **Running Tests**

### Basic Commands

```bash
# Run all end-to-end tests
pnpm exec playwright test

# Start the interactive UI mode
pnpm exec playwright test --ui

# Run tests only on Desktop Chrome
pnpm exec playwright test --project=chromium

# Run tests in a specific file
pnpm exec playwright test example

# Run tests in debug mode
pnpm exec playwright test --debug

# Auto generate tests with Codegen
pnpm exec playwright codegen
```

### Getting Started

We suggest that you begin by typing:

```bash
pnpm exec playwright test
```

## 📋 **Test Files**

- `auth.spec.ts` - Authentication page tests
- `auth.internet-identity.spec.ts` - Internet Identity authentication flow tests
- `dashboard.spec.ts` - Dashboard page tests
- `delete-account.spec.ts` - Account deletion workflow tests
- `mobile-overflow.spec.ts` - Mobile responsive layout tests
- `signin.spec.ts` - Sign-in page tests
- `signup.spec.ts` - Sign-up page tests
- `simple-signup.spec.ts` - Basic sign-up test
- `smoke.spec.ts` - Basic smoke tests
- `user-creation.spec.ts` - User creation API tests
- `example.spec.ts` - Example test file

Visit https://playwright.dev/docs/intro for more information. ✨

Happy hacking! 🎭

### Prerequisites

1. **Backend running**: Make sure the ICP backend is deployed locally
2. **Frontend running**: The dev server will be started automatically by Playwright
3. **Authentication**: Some tests require Internet Identity authentication

### Commands

```bash
# Run all e2e tests
pnpm test:e2e

# Run tests with UI (interactive mode)
pnpm test:e2e:ui

# Run tests in headed mode (see browser)
pnpm test:e2e:headed

# Debug tests step by step
pnpm test:e2e:debug

# Run specific test file
pnpm playwright test asset-serving.spec.ts

# Run specific test
pnpm playwright test asset-serving.spec.ts -g "images display with correct dimensions"

# Run single test file
pnpm playwright test signup.spec.ts
```

## 🔧 **Configuration**

The tests are configured in `playwright.config.ts`:

- **Base URL**: `http://localhost:3000`
- **Auto-start dev server**: Runs `pnpm dev` before tests
- **Screenshots**: Taken on failure
- **Videos**: Recorded on failure
- **Traces**: Collected on retry
