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

## Internet Identity tests against a local replica

`auth.internet-identity.spec.ts` drives the real II flow (popup, backend
canister nonce, NextAuth, Postgres). It needs the local ICP stack from
`futura_alpha_icp` and this app built for it.

1. In `futura_alpha_icp` (dfx 0.31.0 is pinned in `dfx.json`):

   ```bash
   dfx start --clean --background
   dfx deploy backend && dfx deploy canister_factory && dfx deploy internet_identity
   ```

   Deployed in this order on a clean replica, the IDs are the ones below.
   The local II is the dev build with captcha disabled (`init_arg`).

   For `personal-canister.spec.ts` the factory also needs cycles, a release
   and open creation (local only: on mainnet creation needs a credit from an
   admin, `personal_credit_set`):

   ```bash
   dfx ledger fabricate-cycles --canister canister_factory --t 20
   scripts/factory-release.sh 0.2.0
   dfx canister call canister_factory personal_open_set '(true)'
   ```

2. Local Postgres: `docker compose -f docker-compose.dev.yml up -d`, then
   `pnpm db:push` (see the README).

3. Build and start the app for the local replica (other secrets can be
   placeholders):

   ```bash
   export NEXT_PUBLIC_DFX_NETWORK=local
   export NEXT_PUBLIC_IC_HOST=http://127.0.0.1:4943
   export NEXT_PUBLIC_CANISTER_ID_BACKEND=uxrrr-q7777-77774-qaaaq-cai
   export NEXT_PUBLIC_CANISTER_ID_FACTORY=uzt4z-lp777-77774-qaabq-cai
   export NEXT_PUBLIC_CANISTER_ID_INTERNET_IDENTITY=umunu-kh777-77774-qaaca-cai
   export NEXT_PUBLIC_II_URL=http://umunu-kh777-77774-qaaca-cai.localhost:4943
   export PLAYWRIGHT=true
   pnpm build && pnpm start
   ```

4. `pnpm exec playwright test e2e/auth.internet-identity.spec.ts --project=ui`

If `playwright install` hangs while extracting on Node 24, run it with
Node 20.
