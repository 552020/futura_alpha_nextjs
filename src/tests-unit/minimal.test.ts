import { describe, it, expect } from 'vitest';

// This is a test suite - it groups related tests together
describe('Minimal Test', () => {
  // This is a test case - it tests one specific thing
  it('should work', () => {
    // This assertion checks if 1 + 1 equals 2
    // If it doesn't, the test will fail
    expect(1 + 1).toBe(2);
  });

  // Another test case - testing string comparison
  it('should handle strings', () => {
    // This checks if the string 'hello' equals 'hello'
    // It will pass because they are the same
    expect('hello').toBe('hello');
  });

  // Testing array operations
  it('should handle arrays', () => {
    // Create an array with 3 numbers
    const arr = [1, 2, 3];

    // Check if the array has exactly 3 elements
    expect(arr).toHaveLength(3);

    // Check if the first element (index 0) equals 1
    expect(arr[0]).toBe(1);
  });
});
