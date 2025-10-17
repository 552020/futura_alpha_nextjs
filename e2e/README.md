# End-to-End Tests with Playwright

This directory contains Playwright end-to-end tests for Playwright.

## 🎯 **Purpose**

This directory contains comprehensive end-to-end tests covering authentication, user workflows, and Internet Identity integration.

## 📁 **Getting Started**

Create new test files with the `.spec.ts` extension in this directory. Playwright will automatically discover and run them.

## 🚀 **Running Tests**

- Start the Next.js development server with `npm run dev`
- ICP backend only needed for Internet Identity tests
- Some tests require authentication

### Basic Commands

```bash
# Run all tests
pnpm exec playwright test

# Run single test
pnpm exec playwright test example.spec.ts

# Run only with Chrome
pnpm exec playwright test --project=chromium

# Run with reporter list
pnpm exec playwright test --reporter=list
```

### Other Commands

```bash
# Start the interactive UI mode
pnpm exec playwright test --ui

# Run tests in debug mode
pnpm exec playwright test --debug

# Auto generate tests with Codegen
pnpm exec playwright codegen
```

## 📋 **Test Files**

- `auth.internet-identity.spec.ts` - Internet Identity authentication flow with II plugin integration
- `dashboard.spec.ts` - Dashboard page loading and authentication state verification
- `debug-signin.spec.ts` - Diagnostic test for signin modal structure and OAuth providers
- `delete-account.spec.ts` - Complete account deletion workflow with confirmation
- `mobile-overflow.spec.ts` - Mobile responsive layout and horizontal overflow testing
- `signin.spec.ts` - Sign-in page functionality and OAuth provider testing
- `signup.spec.ts` - Comprehensive email/password signup with validation tests
- `smoke.spec.ts` - Basic smoke test for homepage accessibility
- `user-creation.spec.ts` - API tests for programmatic user creation via /api/users endpoint

## 🔧 **Configuration**

The tests are configured in `playwright.config.ts`:

- **Base URL**: `http://localhost:3000`
- **Auto-start dev server**: Runs `pnpm dev` before tests
- **Screenshots**: Taken on failure
- **Videos**: Recorded on failure
- **Traces**: Collected on retry
