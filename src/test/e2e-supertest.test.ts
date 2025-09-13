import { describe, it, expect } from "vitest";
import request from "supertest";

// 🎯 E2E TESTING APPROACH - Testing your running dev server directly
// This is NOT mocking or replicating endpoints - it's real integration testing

describe("E2E Testing with Supertest - Real Dev Server", () => {
  // Point Supertest directly at your running dev server
  const baseURL = "http://localhost:3000";

  describe("/api/test/hello - Public Endpoint (No Authentication Required)", () => {
    it("should return hello message on GET request", async () => {
      const response = await request(baseURL).get("/api/test/hello").expect(200);

      expect(response.body).toMatchObject({
        message: "Hello from test endpoint!",
        method: "GET",
        endpoint: "/api/test/hello",
        status: "success",
      });
      expect(response.body.timestamp).toBeDefined();
    });

    it("should accept POST request with JSON data", async () => {
      const testData = { test: "hello data", number: 42 };

      const response = await request(baseURL).post("/api/test/hello").send(testData).expect(200);

      expect(response.body).toMatchObject({
        message: "Hello from POST test endpoint!",
        receivedData: testData,
        method: "POST",
        endpoint: "/api/test/hello",
        status: "success",
      });
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe("/api/test/auth - Protected Endpoint (Authentication Required)", () => {
    it("should return 401 on GET request without authentication", async () => {
      const response = await request(baseURL).get("/api/test/auth").expect(401);

      expect(response.body).toMatchObject({
        message: "Authentication required",
        error: "No valid session found",
        status: "unauthorized",
      });
    });

    it("should return 401 on POST request without authentication", async () => {
      const testData = { test: "auth data" };

      const response = await request(baseURL).post("/api/test/auth").send(testData).expect(401);

      expect(response.body).toMatchObject({
        message: "Authentication required",
        error: "No valid session found",
        status: "unauthorized",
      });
    });
  });

  describe("Next Learning Steps - Authentication Mocking", () => {
    it("should document what we need to learn next", () => {
      // This test documents what we need to learn next
      expect(true).toBe(true);

      console.log(`
🎯 NEXT LEARNING STEPS - AUTHENTICATION MOCKING:
1. Learn how to "fake" Google authentication in tests
2. Learn how to "fake" Internet Identity authentication in tests  
3. Test authenticated endpoints with fake sessions
4. Understand how to simulate different user states
5. Practice with these simple endpoints before testing real ICP system

💡 KEY INSIGHT: We're doing REAL E2E testing of your running dev server!
   - No mock servers
   - No endpoint replication
   - Real HTTP requests to localhost:3000
   - Real Next.js app responses
      `);
    });
  });
});
