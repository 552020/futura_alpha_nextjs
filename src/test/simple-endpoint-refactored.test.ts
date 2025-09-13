import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { endpointTemplates, createCommonTestServer } from "./utils/test-server";

// ============================================================================
// SIMPLE ENDPOINT TESTING WITH REUSABLE TEST SERVER
// ============================================================================

let testServer: Awaited<ReturnType<typeof createCommonTestServer>>;

// ============================================================================
// SETUP: USING THE REUSABLE TEST SERVER
// ============================================================================

beforeAll(async () => {
  // Use the predefined common server
  testServer = await createCommonTestServer();
});

afterAll(async () => {
  await testServer.close();
});

// ============================================================================
// TESTS USING THE REUSABLE SERVER
// ============================================================================

describe("Simple Endpoint - Reusable Test Server", () => {
  // ============================================================================
  // 1. BASIC GET REQUESTS
  // ============================================================================

  describe("GET Requests", () => {
    it("should get hello message", async () => {
      const response = await request(testServer.server).get("/api/hello");

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Hello, World!");
      expect(response.body.timestamp).toBeDefined();
    });

    it("should get status information", async () => {
      const response = await request(testServer.server).get("/api/status");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("healthy");
      expect(response.body.uptime).toBeDefined();
    });

    it("should return 404 for unknown endpoint", async () => {
      const response = await request(testServer.server).get("/api/unknown");

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Not found");
    });
  });

  // ============================================================================
  // 2. BASIC POST REQUESTS
  // ============================================================================

  describe("POST Requests", () => {
    it("should echo back sent data", async () => {
      const testData = { message: "Hello", number: 42, active: true };

      const response = await request(testServer.server)
        .post("/api/echo")
        .set("Content-Type", "application/json")
        .send(testData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Echo response");
      expect(response.body.received).toEqual(testData);
      expect(response.body.timestamp).toBeDefined();
    });
  });

  // ============================================================================
  // 3. ERROR SCENARIO TESTING
  // ============================================================================

  describe("Error Scenario Testing", () => {
    it("should handle server error endpoint", async () => {
      const response = await request(testServer.server).get("/api/error-demo");

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Internal server error");
      expect(response.body.code).toBe("DEMO_ERROR");
    });
  });

  // ============================================================================
  // 4. DYNAMIC ENDPOINT TESTING
  // ============================================================================

  describe("Dynamic Endpoint Testing", () => {
    it("should allow adding endpoints at runtime", async () => {
      // Add a new endpoint during the test
      testServer.addEndpoint("/api/dynamic", {
        GET: () => ({
          status: 200,
          body: { message: "Dynamic endpoint added!", dynamic: true },
        }),
      });

      const response = await request(testServer.server).get("/api/dynamic");
      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Dynamic endpoint added!");
      expect(response.body.dynamic).toBe(true);
    });

    it("should allow removing endpoints at runtime", async () => {
      // Remove the dynamic endpoint
      testServer.removeEndpoint("/api/dynamic");

      const response = await request(testServer.server).get("/api/dynamic");
      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Not found");
    });
  });

  // ============================================================================
  // 5. TEMPLATE ENDPOINT TESTING
  // ============================================================================
  // Template endpoints are pre-built, reusable endpoint patterns that you can
  // customize with different parameters. Think of them as "cookie cutters" for
  // common HTTP response patterns.
  //
  // WHY USE TEMPLATES?
  // - Quick setup: No need to write the same endpoint structure repeatedly
  // - Consistent behavior: All similar endpoints behave the same way
  // - Easy customization: Just pass different parameters
  // - Maintainable: Change the template, update all endpoints using it
  //
  // EXAMPLES:
  // - simpleGet: Creates GET endpoints with customizable messages
  // - healthCheck: Creates health check endpoints with configurable status
  // - errorSimulator: Creates error endpoints with custom status codes and messages
  // - validationEndpoint: Creates POST endpoints with custom validation logic

  describe("Template Endpoint Testing", () => {
    it("should demonstrate template usage", async () => {
      // Show how you could use templates in other tests
      const customHello = endpointTemplates.simpleGet("Custom Hello!");
      const customHealth = endpointTemplates.healthCheck("degraded");
      const customError = endpointTemplates.errorSimulator(429, "Rate limited");

      // These templates can be used to quickly build endpoints
      expect(customHello.GET?.().body.message).toBe("Custom Hello!");
      expect(customHealth.GET?.().body.status).toBe("degraded");
      expect(customError.GET?.().status).toBe(429);
    });
  });
});
