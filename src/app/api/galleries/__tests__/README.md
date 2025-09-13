# Gallery API Testing

This directory contains comprehensive tests for the Gallery API endpoints using **Vitest**.

## Test Setup

### Dependencies

- **Vitest**: Fast unit testing framework
- **@testing-library/react**: React component testing utilities
- **jsdom**: DOM environment for testing
- **@vitest/ui**: Visual test runner

### Configuration

- **vitest.config.ts**: Main configuration with path aliases
- **src/test/setup.ts**: Global test setup and environment variables

## Test Structure

### Current Tests

#### 1. Basic Test (`basic.test.ts`)

- ✅ Simple arithmetic test
- ✅ Async operation test
- **Purpose**: Verify Vitest setup is working correctly

#### 2. Gallery Logic Test (`gallery-logic.test.ts`)

- ✅ **Gallery Creation Logic**
  - Parameter validation (type, folderName, memories)
  - Memory processing and positioning
- ✅ **Gallery Access Control Logic**
  - Owner access verification
  - Public gallery access
  - Private gallery restrictions
- ✅ **Gallery Item Management**
  - Add items to gallery
  - Remove items from gallery
  - Reorder items in gallery

#### 3. POST Route Test (`route-post.test.ts`)

- ✅ **From-Folder Creation**
  - Parameter validation
  - Default value generation
- ✅ **From-Memories Creation**
  - Array validation
  - Memory processing
- ✅ **Gallery Data Creation**
  - Title and description defaults
  - Public/private settings

#### 4. Individual Gallery Routes Test (`route-id.test.ts`)

- ✅ **GET /api/galleries/[id]**
  - Access control logic
  - Item filtering
- ✅ **PATCH /api/galleries/[id]**
  - Metadata update validation
  - Item operation validation
- ✅ **DELETE /api/galleries/[id]**
  - Ownership validation
  - Cascade deletion preparation

#### 5. Shared Galleries Test (`route-shared.test.ts`)

- ✅ **GET /api/galleries/shared**
  - Shared gallery data processing
  - Pagination logic
  - Null gallery filtering
  - Authentication validation

#### 6. Gallery Sharing Test (`route-share.test.ts`)

- ✅ **POST /api/galleries/[id]/share**
  - Share parameter validation
  - Share record creation
- ✅ **DELETE /api/galleries/[id]/share**
  - Unshare parameter validation
  - Deletion criteria preparation
- ✅ **Sharing Utilities**
  - Existing share checking
  - Secure code generation
  - Access level validation

## Running Tests

### Commands

```bash
# Run all tests
pnpm test:run

# Run tests in watch mode
pnpm test

# Run tests with UI
pnpm test:ui

# Run specific test file
pnpm test:run src/app/api/galleries/__tests__/gallery-logic.test.ts

# Run tests with coverage
pnpm test:coverage
```

### Test Scripts

```json
{
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:run": "vitest run",
  "test:coverage": "vitest run --coverage"
}
```

## Testing Approach

### 1. Logic Testing (Current)

- **Focus**: Business logic and data processing
- **Benefits**: Fast, reliable, no external dependencies
- **Coverage**: Validation, data transformation, access control

### 2. Integration Testing (Future)

- **Focus**: API endpoint behavior with mocked database
- **Benefits**: Tests actual HTTP requests/responses
- **Coverage**: Status codes, response formats, error handling

### 3. End-to-End Testing (Future)

- **Focus**: Complete user workflows
- **Benefits**: Tests real user scenarios
- **Coverage**: UI interactions, database operations

## Mock Strategy

### Database Mocking

```typescript
vi.mock("@/db/db", () => ({
  db: {
    query: {
      galleries: { findMany: vi.fn(), findFirst: vi.fn() },
      allUsers: { findFirst: vi.fn() },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => [{ id: "test-gallery-id" }]),
      })),
    })),
  },
}));
```

### Authentication Mocking

```typescript
vi.mock("@/auth", () => ({
  auth: vi.fn(() => ({
    user: { id: "test-user-id" },
  })),
}));
```

## Test Coverage

### Current Coverage Areas

- ✅ **Parameter Validation**: Gallery creation requirements
- ✅ **Data Processing**: Memory to gallery item conversion
- ✅ **Access Control**: Gallery visibility and permissions
- ✅ **Item Management**: Add, remove, reorder operations

### Future Coverage Areas

- 🔄 **API Endpoints**: HTTP request/response testing
- 🔄 **Error Handling**: Database errors, validation errors
- 🔄 **Edge Cases**: Empty galleries, invalid data
- 🔄 **Performance**: Large gallery handling

## Best Practices

### 1. Test Organization

- Group related tests in `describe` blocks
- Use descriptive test names
- Keep tests focused and atomic

### 2. Mock Management

- Clear mocks before each test
- Use realistic mock data
- Test both success and failure scenarios

### 3. Assertions

- Test specific values, not implementation details
- Use appropriate matchers (`toEqual`, `toHaveLength`, etc.)
- Verify error conditions

## Example Test Structure

```typescript
describe("Feature Name", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Sub-feature", () => {
    it("should handle valid input", () => {
      // Arrange
      const input = {
        /* test data */
      };

      // Act
      const result = functionUnderTest(input);

      // Assert
      expect(result).toEqual(expectedOutput);
    });

    it("should handle invalid input", () => {
      // Test error conditions
    });
  });
});
```

## Next Steps

1. **Add Integration Tests**: Test actual API endpoints
2. **Add Error Scenarios**: Test database failures, validation errors
3. **Add Performance Tests**: Test with large datasets
4. **Add UI Tests**: Test gallery components
5. **Add E2E Tests**: Test complete user workflows

## Troubleshooting

### Common Issues

1. **Import Errors**: Check path aliases in `vitest.config.ts`
2. **Mock Issues**: Ensure mocks are cleared between tests
3. **Async Issues**: Use `await` for async operations
4. **Type Errors**: Ensure TypeScript types are correct

### Debug Commands

```bash
# Run with verbose output
pnpm test:run --reporter=verbose

# Run single test with debug
pnpm test:run --reporter=verbose src/app/api/galleries/__tests__/gallery-logic.test.ts
```
