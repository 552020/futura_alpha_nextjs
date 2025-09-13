import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createServer, IncomingMessage, ServerResponse } from "http";

// ============================================================================
// SIMPLE ENDPOINT FOR SUPERTEST EXPERIMENTATION
// ============================================================================

// This is a simple mock server to experiment with supertest patterns
// Perfect for learning HTTP testing without complex setup

let server: ReturnType<typeof createServer>;

// Simple mock endpoints for experimentation
const simpleEndpoints = {
  // Basic GET endpoint
  "/api/hello": {
    GET: () => ({
      status: 200,
      body: { message: "Hello, World!", timestamp: new Date().toISOString() },
    }),
  },

  // Basic POST endpoint
  "/api/echo": {
    POST: (body: Record<string, unknown>) => ({
      status: 200,
      body: {
        message: "Echo response",
        received: body,
        timestamp: new Date().toISOString(),
      },
    }),
  },

  // Endpoint with validation
  "/api/users": {
    POST: (body: Record<string, unknown>) => {
      // Simple validation
      if (!body.name || typeof body.name !== "string") {
        return {
          status: 400,
          body: { error: "Name is required and must be a string" },
        };
      }

      if (!body.email || typeof body.email !== "string") {
        return {
          status: 400,
          body: { error: "Email is required and must be a string" },
        };
      }

      // Mock user creation
      return {
        status: 201,
        body: {
          id: "user-" + Math.random().toString(36).substr(2, 9),
          name: body.name,
          email: body.email,
          createdAt: new Date().toISOString(),
        },
      };
    },

    GET: () => ({
      status: 200,
      body: {
        users: [
          { id: "user-1", name: "Alice", email: "alice@example.com" },
          { id: "user-2", name: "Bob", email: "bob@example.com" },
        ],
      },
    }),
  },

  // Endpoint with different response types
  "/api/status": {
    GET: () => ({
      status: 200,
      body: { status: "healthy", uptime: "2h 15m" },
    }),
  },

  // Endpoint that simulates errors
  "/api/error-demo": {
    GET: () => ({
      status: 500,
      body: { error: "Internal server error", code: "DEMO_ERROR" },
    }),

    POST: () => ({
      status: 422,
      body: { error: "Validation failed", details: ["Field 'name' is required"] },
    }),
  },
};

// Create a simple test server
beforeAll(async () => {
  const app = (req: IncomingMessage, res: ServerResponse) => {
    const url = req.url;
    const method = req.method;

    console.log(`🔍 Simple Server: ${method} ${url}`);

    // Handle requests to our simple endpoints
    if (url && simpleEndpoints[url as keyof typeof simpleEndpoints]) {
      const endpoint = simpleEndpoints[url as keyof typeof simpleEndpoints];

      if (method === "GET" && endpoint.GET) {
        const result = endpoint.GET();
        res.writeHead(result.status, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result.body));
        return;
      }

      if (method === "POST" && endpoint.POST) {
        // Parse request body
        let body = "";
        req.on("data", (chunk: Buffer) => {
          body += chunk.toString();
        });

        req.on("end", () => {
          let parsedBody: Record<string, unknown> = {};
          try {
            if (body) {
              parsedBody = JSON.parse(body);
            }
          } catch {
            parsedBody = {};
          }

          console.log(`🔍 Request body:`, parsedBody);
          const result = endpoint.POST(parsedBody);
          res.writeHead(result.status, { "Content-Type": "application/json" });
          res.end(JSON.stringify(result.body));
        });
        return;
      }
    }

    // Default 404
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  };

  server = createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, () => resolve());
  });
});

afterAll(async () => {
  if (server) {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }
});

describe("Simple Endpoint - Supertest Experimentation", () => {
  // ============================================================================
  // 1. BASIC GET REQUESTS
  // ============================================================================

  describe("GET Requests", () => {
    it("should get hello message", async () => {
      const response = await request(server).get("/api/hello");

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Hello, World!");
      expect(response.body.timestamp).toBeDefined();
    });

    it("should get user list", async () => {
      const response = await request(server).get("/api/users");

      expect(response.status).toBe(200);
      expect(response.body.users).toBeDefined();
      expect(response.body.users).toHaveLength(2);
      expect(response.body.users[0].name).toBe("Alice");
    });

    it("should get status information", async () => {
      const response = await request(server).get("/api/status");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("healthy");
      expect(response.body.uptime).toBeDefined();
    });

    it("should return 404 for unknown endpoint", async () => {
      const response = await request(server).get("/api/unknown");

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

      const response = await request(server).post("/api/echo").set("Content-Type", "application/json").send(testData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Echo response");
      expect(response.body.received).toEqual(testData);
      expect(response.body.timestamp).toBeDefined();
    });

    it("should create user with valid data", async () => {
      const userData = { name: "Charlie", email: "charlie@example.com" };

      const response = await request(server).post("/api/users").set("Content-Type", "application/json").send(userData);

      expect(response.status).toBe(201);
      expect(response.body.name).toBe(userData.name);
      expect(response.body.email).toBe(userData.email);
      expect(response.body.id).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
    });
  });

  // ============================================================================
  // 3. VALIDATION TESTING
  // ============================================================================

  describe("Validation Testing", () => {
    it("should reject user creation without name", async () => {
      const userData = { email: "test@example.com" };

      const response = await request(server).post("/api/users").set("Content-Type", "application/json").send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Name is required and must be a string");
    });

    it("should reject user creation without email", async () => {
      const userData = { name: "Test User" };

      const response = await request(server).post("/api/users").set("Content-Type", "application/json").send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Email is required and must be a string");
    });

    it("should reject user creation with invalid name type", async () => {
      const userData = { name: 123, email: "test@example.com" };

      const response = await request(server).post("/api/users").set("Content-Type", "application/json").send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Name is required and must be a string");
    });
  });

  // ============================================================================
  // 4. ERROR SCENARIO TESTING
  // ============================================================================

  describe("Error Scenario Testing", () => {
    it("should handle server error endpoint", async () => {
      const response = await request(server).get("/api/error-demo");

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Internal server error");
      expect(response.body.code).toBe("DEMO_ERROR");
    });

    it("should handle validation error endpoint", async () => {
      const response = await request(server).post("/api/error-demo").set("Content-Type", "application/json").send({});

      expect(response.status).toBe(422);
      expect(response.body.error).toBe("Validation failed");
      expect(response.body.details).toContain("Field 'name' is required");
    });
  });

  // ============================================================================
  // 5. HEADER TESTING
  // ============================================================================

  describe("Header Testing", () => {
    it("should work without Content-Type header", async () => {
      const response = await request(server).post("/api/echo").send({ test: "data" });

      expect(response.status).toBe(200);
      expect(response.body.received).toEqual({ test: "data" });
    });

    it("should work with custom headers", async () => {
      const response = await request(server)
        .post("/api/echo")
        .set("X-Custom-Header", "test-value")
        .set("Authorization", "Bearer test-token")
        .send({ message: "test" });

      expect(response.status).toBe(200);
      expect(response.body.received.message).toBe("test");
    });
  });

  // ============================================================================
  // 6. RESPONSE STRUCTURE VALIDATION
  // ============================================================================

  describe("Response Structure Validation", () => {
    it("should validate user response structure", async () => {
      const userData = { name: "Test User", email: "test@example.com" };

      const response = await request(server).post("/api/users").set("Content-Type", "application/json").send(userData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("name");
      expect(response.body).toHaveProperty("email");
      expect(response.body).toHaveProperty("createdAt");

      expect(typeof response.body.id).toBe("string");
      expect(typeof response.body.name).toBe("string");
      expect(typeof response.body.email).toBe("string");
      expect(typeof response.body.createdAt).toBe("string");
    });

    it("should validate error response structure", async () => {
      const response = await request(server).post("/api/users").set("Content-Type", "application/json").send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(typeof response.body.error).toBe("string");
    });
  });
});
