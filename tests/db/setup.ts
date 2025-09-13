import { beforeAll, afterAll, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Clean up after each test
afterEach(() => {
  cleanup();
});

// Global test setup
beforeAll(() => {
  // Mock environment variables for testing
  process.env.NEXTAUTH_SECRET = "test-secret";
  process.env.NEXTAUTH_URL = "http://localhost:3000";
});

// Global test teardown
afterAll(() => {
  // Clean up any global test state
});
