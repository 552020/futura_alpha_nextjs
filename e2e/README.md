# End-to-End Tests with Playwright

This directory contains Playwright end-to-end tests for the Futura application.

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
```

## 🔧 **Configuration**

The tests are configured in `playwright.config.ts`:

- **Base URL**: `http://localhost:3000`
- **Auto-start dev server**: Runs `pnpm dev` before tests
- **Screenshots**: Taken on failure
- **Videos**: Recorded on failure
- **Traces**: Collected on retry

## 🔐 **Internet Identity Integration**

The Internet Identity Playwright plugin is **already installed and configured** for automated ICP authentication testing.

### **Running Internet Identity Tests**

```bash
# Run Internet Identity tests
PLAYWRIGHT=true pnpm exec playwright test auth.internet-identity.spec.ts

# Run with UI mode (interactive)
PLAYWRIGHT=true pnpm exec playwright test auth.internet-identity.spec.ts --ui

# Run in headed mode (visible browser)
PLAYWRIGHT=true pnpm exec playwright test auth.internet-identity.spec.ts --headed
```

### **Test Coverage**

The Internet Identity tests (`auth.internet-identity.spec.ts`) cover:

- **Basic Sign-in Flow**: New identity → authenticated user
- **Callback URL Handling**: Returns to original page after authentication
- **API Integration**: Verifies challenge/nonce flow
- **State Management**: Shows connected/disconnected states
- **Sign-out Flow**: Can disconnect from Internet Identity
- **Error Handling**: Graceful handling of authentication errors
- **Locale Support**: Preserves language in callback URLs
- **Session Linking**: Handles existing session scenarios

### **Test Flow**

```
1. Navigate to /en/user/icp
2. Click "Connect Internet Identity" button
3. Redirect to /en/sign-ii-only?callbackUrl=...
4. Click "Sign in with Internet Identity" button
5. Internet Identity plugin handles authentication
6. App processes challenge/nonce
7. NextAuth 'ii' provider handles session
8. Redirect back to original page
9. Verify authenticated state
```

### **Required Test IDs**

The tests rely on these `data-testid` attributes:

- `ii-connect` - "Connect Internet Identity" button on ICP page
- `ii-start` - "Sign in with Internet Identity" button on sign-ii-only page
- `user-avatar` - User avatar/authentication indicator

## 🧪 **Test Strategy**

### **Smart Skipping**

Tests intelligently skip when prerequisites aren't met:

- No authentication → Skip upload/delete tests
- No images present → Skip image verification tests
- No delete button → Skip delete workflow tests

### **Debugging Features**

- **Console logging**: Detailed logs for debugging
- **Network monitoring**: Tracks asset requests and responses
- **Error detection**: Identifies specific error patterns (like NotFound errors)

### **Real-world Scenarios**

Tests cover the exact workflows that were causing manual debugging:

- Upload → Process → Display → Verify dimensions
- Delete All → Handle capsule creation → Verify success
- Asset serving → Check content type and size

## 🐛 **Debugging Failed Tests**

### **Screenshots & Videos**

Failed tests automatically capture:

- Screenshots of the failure point
- Video recordings of the entire test
- Network traces for request/response debugging

### **Console Output**

Tests provide detailed console output:

```
🔍 [Playwright] Found 3 asset requests
🔍 [Playwright] Request 1: GET /api/assets/display/123?token=abc
✅ [Playwright] Asset size looks correct: 248540 bytes
```

### **Common Issues**

1. **Authentication Required**
   - Tests skip if Internet Identity isn't connected
   - Connect to Internet Identity before running tests

2. **No Images Present**
   - Upload some images first, or tests will skip
   - Tests are designed to work with existing data

3. **Backend Not Running**
   - Ensure ICP backend is deployed locally
   - Check that asset endpoints are accessible

## 🔄 **Integration with Existing Tests**

These Playwright tests complement the existing test suite:

- **Backend tests**: Rust unit tests + Bash integration tests
- **Frontend tests**: Vitest unit/integration tests
- **E2E tests**: Playwright browser automation tests

The Playwright tests fill the gap for **complete user workflow testing** that was previously done manually.

## ⚠️ **Current GitHub Actions Status**

**Status:** 🔧 **In Progress** - Working on resolving CI timeout issues

### **Known Issues:**

- **Server Startup Timeout**: Web server fails to start within 2-minute timeout in GitHub Actions
- **Environment Variables**: Database connection issues in CI environment
- **Middleware Locale Crashes**: Fixed with `PLAYWRIGHT=true` environment variable

### **Recent Fixes Applied:**

- ✅ **Updated GitHub Actions workflow** to follow official Playwright template
- ✅ **Added proper environment variables** (DATABASE_URL, AUTH_SECRET, II configs)
- ✅ **Implemented caching** for dependencies and Playwright browsers
- ✅ **Fixed middleware issues** with Playwright environment detection
- ✅ **Manual server startup** instead of webServer config
- ✅ **Added deployment-based workflow** as alternative approach

### **Next Steps:**

1. **Verify GitHub Secrets** are properly configured
2. **Test database connectivity** from GitHub Actions
3. **Monitor CI performance** after fixes
4. **Resolve any remaining timeout issues**

### **For Local Development:**

All tests work perfectly locally. The issues are specific to the GitHub Actions CI environment.

## 🔄 **Two Testing Approaches**

### **1. Standard Workflow (`playwright.yml`)**
- **Triggers:** Push/PR to main/master
- **Approach:** Starts server in CI, then runs tests
- **Status:** 🔧 Working on server startup issues
- **Use case:** Development testing, PR validation

### **2. Deployment Workflow (`playwright-deployment.yml`)**
- **Triggers:** After successful deployment
- **Approach:** Tests against live deployed app
- **Status:** ✅ Ready to use (when deployment is set up)
- **Use case:** Production testing, deployment validation

### **Benefits of Deployment Approach:**
- ✅ **No server startup issues** - App already running
- ✅ **Real database** - Tests against production database
- ✅ **Proper environment** - All variables set correctly
- ✅ **No timeout issues** - No need to start servers

---

## 📈 **Future Enhancements**

- **Complete Upload Workflows**: Test full image upload → processing → display pipeline with real authentication
- **Cross-browser Testing**: Ensure ICP integration works in all browsers (Chrome, Firefox, Safari)
- **Performance Testing**: Measure asset loading times and optimization
- **Identity Management**: Test multiple user scenarios with different Internet Identity accounts
- **Capsule Operations**: Test capsule creation, sharing, and management workflows
