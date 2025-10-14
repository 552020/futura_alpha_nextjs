# End-to-End Tests with Playwright

This directory contains Playwright end-to-end tests that automate the UI workflows that were previously done manually.

## 🎯 **Purpose**

These tests were created to solve the "clicking through UI" problem - automating the tedious manual testing that was required to debug issues like:

- **Asset serving bugs** - Images displaying as 32x32px placeholders instead of proper dimensions
- **Delete all memories failures** - "NotFound" errors when trying to clear memories
- **Upload workflow issues** - Problems in the image processing pipeline

## 📁 **Test Files**

### `asset-serving.spec.ts`

Tests the asset serving workflow that was causing manual debugging:

- **Image dimension verification** - Ensures images display with correct dimensions (not 32x32 placeholders)
- **Asset URL validation** - Checks that asset endpoints serve correct content
- **Network request monitoring** - Debugs asset serving issues by monitoring requests

### `delete-memories.spec.ts`

Tests the delete all memories functionality:

- **Delete workflow** - Automates the complete delete all memories process
- **Capsule creation handling** - Verifies the get-or-create capsule pattern works
- **User feedback** - Checks that appropriate loading/success/error messages are shown

## 🚀 **Running Tests**

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

For proper ICP authentication testing, we should integrate the **Internet Identity Playwright plugin**:

### **Installation**

```bash
pnpm add -D @dfinity/internet-identity-playwright
```

### **Usage Example**

```javascript
import { testWithII } from '@dfinity/internet-identity-playwright';

testWithII('should sign-in with a new user', async ({ page, iiPage }) => {
  await page.goto('/');
  await iiPage.signInWithNewIdentity();

  // Now authenticated, test protected functionality
  await page.goto('/vault');
  // ... continue with asset serving tests
});
```

### **Benefits**

- **Automated authentication**: No manual Internet Identity setup required
- **New identity creation**: Each test can create fresh identities
- **Real ICP integration**: Tests actual Internet Identity flows
- **Isolated testing**: Each test gets a clean authentication state

### **Integration with Our Tests**

The current tests skip when authentication is required. With the ICP plugin, we can:

1. **Automate upload tests**: Create identities and test complete upload workflows
2. **Test delete functionality**: Verify delete all memories works with real authentication
3. **End-to-end workflows**: Test complete user journeys from login to asset management

### **Resources**

- [Official Developer Update](https://internetcomputer.org/blog/2024/07/10/news-and-updates/update#internet-identity-e2e-testing-playwright-plugin)
- [DFINITY Forum Post](https://forum.dfinity.org/t/37390)

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

## 📈 **Future Enhancements**

- **ICP Plugin Integration**: Install and configure `@dfinity/internet-identity-playwright` for automated authentication
- **Complete Upload Workflows**: Test full image upload → processing → display pipeline with real authentication
- **Cross-browser Testing**: Ensure ICP integration works in all browsers (Chrome, Firefox, Safari)
- **Performance Testing**: Measure asset loading times and optimization
- **Identity Management**: Test multiple user scenarios with different Internet Identity accounts
- **Capsule Operations**: Test capsule creation, sharing, and management workflows
