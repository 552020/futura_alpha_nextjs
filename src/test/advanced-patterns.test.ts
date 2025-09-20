import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';

// ============================================================================
// 1. MOCKING - Replacing real functions with fake ones for testing
// ============================================================================

// Mock a database function
const mockDatabase = {
  getUser: vi.fn(),
  saveUser: vi.fn(),
  deleteUser: vi.fn(),
};

// ============================================================================
// 2. FUNCTIONS TO TEST
// ============================================================================

// Function that uses the database
async function getUserProfile(userId: string) {
  const user = await mockDatabase.getUser(userId);
  if (!user) {
    throw new Error('User not found');
  }
  return user;
}

// Function with side effects
function updateUserStatus(userId: string, status: string) {
  // This would normally update a database
  mockDatabase.saveUser({ id: userId, status });

  // Return success/failure
  return { success: true, userId, status };
}

// ============================================================================
// 3. TEST SUITE WITH SETUP/TEARDOWN
// ============================================================================

describe('Advanced Testing Patterns', () => {
  // Runs once before ALL tests in this suite
  beforeAll(() => {
    console.log('🚀 Setting up test environment...');
  });

  // Runs before EACH test
  beforeEach(() => {
    console.log('📝 Starting new test...');
    // Clear all mocks before each test
    vi.clearAllMocks();

    // Set up default mock return values
    mockDatabase.getUser.mockResolvedValue({
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      status: 'active',
    });
  });

  // Runs after EACH test
  afterEach(() => {
    console.log('✅ Test completed');
  });

  // Runs once after ALL tests in this suite
  afterAll(() => {
    console.log('🏁 All tests completed, cleaning up...');
  });

  // ============================================================================
  // 4. TESTING ASYNC FUNCTIONS
  // ============================================================================

  describe('Async Function Testing', () => {
    it('should successfully get user profile', async () => {
      // Arrange: Set up mock to return specific data
      mockDatabase.getUser.mockResolvedValue({
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
      });

      // Act: Call the async function
      const result = await getUserProfile('user-123');

      // Assert: Check the result
      expect(result).toEqual({
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
      });

      // Verify the mock was called correctly
      expect(mockDatabase.getUser).toHaveBeenCalledWith('user-123');
      expect(mockDatabase.getUser).toHaveBeenCalledTimes(1);
    });

    it('should throw error when user not found', async () => {
      // Arrange: Mock database to return null (user not found)
      mockDatabase.getUser.mockResolvedValue(null);

      // Act & Assert: Check that the function throws an error
      await expect(getUserProfile('nonexistent-user')).rejects.toThrow('User not found');
    });
  });

  // ============================================================================
  // 5. TESTING WITH MOCKS AND SPIES
  // ============================================================================

  describe('Mock and Spy Testing', () => {
    it('should call database save function', () => {
      // Act: Call the function
      const result = updateUserStatus('user-123', 'inactive');

      // Assert: Check return value
      expect(result).toEqual({
        success: true,
        userId: 'user-123',
        status: 'inactive',
      });

      // Verify the mock was called with correct parameters
      expect(mockDatabase.saveUser).toHaveBeenCalledWith({
        id: 'user-123',
        status: 'inactive',
      });
    });

    it('should track multiple function calls', () => {
      // Act: Call function multiple times
      updateUserStatus('user-1', 'active');
      updateUserStatus('user-2', 'inactive');
      updateUserStatus('user-3', 'pending');

      // Assert: Check call count and parameters
      expect(mockDatabase.saveUser).toHaveBeenCalledTimes(3);

      // Check first call
      expect(mockDatabase.saveUser).toHaveBeenNthCalledWith(1, {
        id: 'user-1',
        status: 'active',
      });

      // Check last call
      expect(mockDatabase.saveUser).toHaveBeenNthCalledWith(3, {
        id: 'user-3',
        status: 'pending',
      });
    });
  });

  // ============================================================================
  // 6. TESTING ERROR CONDITIONS
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Arrange: Mock database to throw an error
      mockDatabase.getUser.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert: Check that the error is properly thrown
      await expect(getUserProfile('user-123')).rejects.toThrow('Database connection failed');
    });
  });

  // ============================================================================
  // 7. TESTING WITH DIFFERENT DATA SCENARIOS
  // ============================================================================

  describe('Data Scenarios', () => {
    it('should handle empty user data', async () => {
      // Arrange: Mock database to return minimal user data
      mockDatabase.getUser.mockResolvedValue({
        id: 'user-123',
        name: '',
        email: '',
      });

      // Act
      const result = await getUserProfile('user-123');

      // Assert
      expect(result.name).toBe('');
      expect(result.email).toBe('');
    });

    it('should handle large user data', async () => {
      // Arrange: Mock database to return large user object
      const largeUser = {
        id: 'user-123',
        name: 'Very Long Name That Exceeds Normal Length',
        email: 'very.long.email.address.that.might.cause.issues@very.long.domain.com',
        metadata: {
          preferences: Array(1000).fill('preference'),
          history: Array(5000).fill('action'),
          settings: {
            nested: {
              deep: {
                configuration: 'value',
              },
            },
          },
        },
      };

      mockDatabase.getUser.mockResolvedValue(largeUser);

      // Act
      const result = await getUserProfile('user-123');

      // Assert
      expect(result.metadata.preferences).toHaveLength(1000);
      expect(result.metadata.history).toHaveLength(5000);
      expect(result.metadata.settings.nested.deep.configuration).toBe('value');
    });
  });
});
