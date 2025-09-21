import { createServer, IncomingMessage, ServerResponse } from 'http';

// ============================================================================
// REUSABLE TEST SERVER UTILITY
// ============================================================================

// Generic types for endpoint definitions
export interface MockEndpoint {
  GET?: () => MockResponse;
  POST?: (body: Record<string, unknown>) => MockResponse;
  PUT?: (body: Record<string, unknown>) => MockResponse;
  DELETE?: () => MockResponse;
}

export interface MockResponse {
  status: number;
  body: Record<string, unknown>;
  headers?: Record<string, string>;
}

export interface TestServer {
  server: ReturnType<typeof createServer>;
  addEndpoint: (path: string, endpoint: MockEndpoint) => void;
  removeEndpoint: (path: string) => void;
  clearEndpoints: () => void;
  close: () => Promise<void>;
}

// ============================================================================
// TEST SERVER BUILDER
// ============================================================================

export class TestServerBuilder {
  private endpoints: Map<string, MockEndpoint> = new Map();
  private server: ReturnType<typeof createServer> | null = null;

  // Add a single endpoint
  addEndpoint(path: string, endpoint: MockEndpoint): this {
    this.endpoints.set(path, endpoint);
    return this;
  }

  // Add multiple endpoints at once
  addEndpoints(endpoints: Record<string, MockEndpoint>): this {
    Object.entries(endpoints).forEach(([path, endpoint]) => {
      this.endpoints.set(path, endpoint);
    });
    return this;
  }

  // Build and start the server
  async build(): Promise<TestServer> {
    const app = (req: IncomingMessage, res: ServerResponse) => {
      const url = req.url;
      const method = req.method;

      console.log(`🔍 Test Server: ${method} ${url}`);

      // Handle requests to our mock endpoints
      if (url && this.endpoints.has(url)) {
        const endpoint = this.endpoints.get(url)!;

        if (method === 'GET' && endpoint.GET) {
          const result = endpoint.GET();
          const headers = { 'Content-Type': 'application/json', ...result.headers };
          res.writeHead(result.status, headers);
          res.end(JSON.stringify(result.body));
          return;
        }

        if (method === 'POST' && endpoint.POST) {
          // Parse request body
          let body = '';
          req.on('data', (chunk: Buffer) => {
            body += chunk.toString();
          });

          req.on('end', () => {
            let parsedBody: Record<string, unknown> = {};
            try {
              if (body) {
                parsedBody = JSON.parse(body);
              }
            } catch {
              parsedBody = {};
            }

            console.log(`🔍 Request body:`, parsedBody);
            const result = endpoint.POST!(parsedBody);
            const headers = { 'Content-Type': 'application/json', ...result.headers };
            res.writeHead(result.status, headers);
            res.end(JSON.stringify(result.body));
          });
          return;
        }

        if (method === 'PUT' && endpoint.PUT) {
          // Parse request body (similar to POST)
          let body = '';
          req.on('data', (chunk: Buffer) => {
            body += chunk.toString();
          });

          req.on('end', () => {
            let parsedBody: Record<string, unknown> = {};
            try {
              if (body) {
                parsedBody = JSON.parse(body);
              }
            } catch {
              parsedBody = {};
            }

            const result = endpoint.PUT!(parsedBody);
            const headers = { 'Content-Type': 'application/json', ...result.headers };
            res.writeHead(result.status, headers);
            res.end(JSON.stringify(result.body));
          });
          return;
        }

        if (method === 'DELETE' && endpoint.DELETE) {
          const result = endpoint.DELETE();
          const headers = { 'Content-Type': 'application/json', ...result.headers };
          res.writeHead(result.status, headers);
          res.end(JSON.stringify(result.body));
          return;
        }
      }

      // Default 404
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    };

    this.server = createServer(app);
    await new Promise<void>(resolve => {
      this.server!.listen(0, () => resolve());
    });

    return {
      server: this.server,
      addEndpoint: (path: string, endpoint: MockEndpoint) => {
        this.endpoints.set(path, endpoint);
      },
      removeEndpoint: (path: string) => {
        this.endpoints.delete(path);
      },
      clearEndpoints: () => {
        this.endpoints.clear();
      },
      close: async () => {
        if (this.server) {
          await new Promise<void>(resolve => {
            this.server!.close(() => resolve());
          });
        }
      },
    };
  }
}

// ============================================================================
// PREDEFINED ENDPOINT TEMPLATES
// ============================================================================

// Common endpoint patterns you can reuse
export const endpointTemplates = {
  // Simple GET endpoint
  simpleGet: (message: string) => ({
    GET: () => ({
      status: 200,
      body: { message, timestamp: new Date().toISOString() },
    }),
  }),

  // Echo POST endpoint
  echo: () => ({
    POST: (body: Record<string, unknown>) => ({
      status: 200,
      body: {
        message: 'Echo response',
        received: body,
        timestamp: new Date().toISOString(),
      },
    }),
  }),

  // Health check endpoint
  healthCheck: (status = 'healthy') => ({
    GET: () => ({
      status: 200,
      body: { status, uptime: '2h 15m' },
    }),
  }),

  // Error simulation endpoint
  errorSimulator: (statusCode: number, errorMessage: string) => ({
    GET: () => ({
      status: statusCode,
      body: { error: errorMessage, code: 'DEMO_ERROR' },
    }),
  }),

  // Validation endpoint with custom validation logic
  validationEndpoint: (
    validator: (body: Record<string, unknown>) => { isValid: boolean; error?: string },
    successResponse: (body: Record<string, unknown>) => MockResponse
  ) => ({
    POST: (body: Record<string, unknown>) => {
      const validation = validator(body);
      if (!validation.isValid) {
        return {
          status: 400,
          body: { error: validation.error || 'Validation failed' },
        };
      }
      return successResponse(body);
    },
  }),
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Create a test server with common endpoints
export async function createCommonTestServer() {
  const builder = new TestServerBuilder();

  // Add some common endpoints
  builder
    .addEndpoint('/api/hello', endpointTemplates.simpleGet('Hello, World!'))
    .addEndpoint('/api/echo', endpointTemplates.echo())
    .addEndpoint('/api/status', endpointTemplates.healthCheck())
    .addEndpoint('/api/error-demo', endpointTemplates.errorSimulator(500, 'Internal server error'));

  return builder.build();
}

// Create a test server for specific use cases
export async function createICPServer() {
  const builder = new TestServerBuilder();

  // Add ICP-specific endpoints
  builder.addEndpoint('/api/auth/link-ii', {
    POST: (body: Record<string, unknown>) => {
      const nonce = body.nonce;
      if (!nonce || typeof nonce !== 'string' || nonce.length < 10) {
        return { status: 400, body: { error: 'Invalid nonce' } };
      }

      if (nonce === 'valid-nonce-123') {
        return {
          status: 200,
          body: {
            success: true,
            principal: 'ffso4-hbyyy-se2mz-l7nlp-fpqbb-yn4rf-ilnen-yb3ng-izeoj-rxexn-6qe',
          },
        };
      }

      return { status: 400, body: { error: 'Nonce verification failed' } };
    },
  });

  return builder.build();
}
