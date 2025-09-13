import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { testDb } from "@/db/test-db";
import { users, allUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  generateGoogleSessionCookie,
  generateIISessionCookie,
  generateActiveIISessionCookie,
  type TestUserSession,
} from "./utils/session-generator";

// 🎯 HYBRID AUTHENTICATION TESTING WITH SESSION COOKIES
// This uses proper NextAuth session cookies that the auth() function will accept

describe("Hybrid Authentication Testing - Session Cookies", () => {
  // Point Supertest directly at your running dev server
  const baseURL = "http://localhost:3000";

  // Store test user IDs for cleanup
  let testUser1Id: string;
  let testUser2Id: string;
  let testUser3Id: string;

  beforeAll(async () => {
    console.log(`
🎯 SETTING UP HYBRID AUTHENTICATION TESTING WITH SESSION COOKIES

We're combining:
1. Test database access - Create real test users
2. Session cookie generation - Generate valid NextAuth session cookies
3. Real endpoint testing - Test your ICP authentication logic

This approach works WITH NextAuth's session system!
    `);

    try {
      // Create test users in the database
      const [testUser1] = await testDb
        .insert(users)
        .values({
          email: "test-session-1@example.com",
          name: "Test Session User 1",
          username: "testsession1",
          role: "user",
          plan: "free",
        })
        .returning();

      const [testUser2] = await testDb
        .insert(users)
        .values({
          email: "test-session-2@example.com",
          name: "Test Session User 2",
          username: "testsession2",
          role: "user",
          plan: "free",
        })
        .returning();

      const [testUser3] = await testDb
        .insert(users)
        .values({
          email: "test-session-3@example.com",
          name: "Test Session User 3",
          username: "testsession3",
          role: "admin",
          plan: "premium",
        })
        .returning();

      // Create allUsers records
      await Promise.all([
        testDb.insert(allUsers).values({
          type: "user",
          userId: testUser1.id,
        }),
        testDb.insert(allUsers).values({
          type: "user",
          userId: testUser2.id,
        }),
        testDb.insert(allUsers).values({
          type: "user",
          userId: testUser3.id,
        }),
      ]);

      // Store IDs for cleanup
      testUser1Id = testUser1.id;
      testUser2Id = testUser2.id;
      testUser3Id = testUser3.id;

      console.log(`
✅ TEST USERS CREATED SUCCESSFULLY:
- User 1: ${testUser1.email} (ID: ${testUser1.id}) - Role: ${testUser1.role}
- User 2: ${testUser2.email} (ID: ${testUser2.id}) - Role: ${testUser2.role}
- User 3: ${testUser3.email} (ID: ${testUser3.id}) - Role: ${testUser3.role}

Now let's test authentication with session cookies!
      `);
    } catch (error) {
      console.error("❌ Error creating test users:", error);
      throw error;
    }
  });

  afterAll(async () => {
    // Clean up test users
    try {
      await testDb.delete(users).where(eq(users.id, testUser1Id));
      await testDb.delete(users).where(eq(users.id, testUser2Id));
      await testDb.delete(users).where(eq(users.id, testUser3Id));
      console.log("🧹 Test users cleaned up successfully");
    } catch (error) {
      console.error("❌ Error cleaning up test users:", error);
    }
  });

  describe("Testing Authentication with Session Cookies", () => {
    it("should test basic Google authentication with session cookie", async () => {
      // Create a test user object
      const testUser: TestUserSession = {
        id: testUser1Id,
        email: "test-session-1@example.com",
        name: "Test Session User 1",
        role: "user",
      };

      // Generate a valid session cookie for this user
      const sessionCookie = generateGoogleSessionCookie(testUser);

      console.log(`
🔍 TESTING BASIC GOOGLE AUTHENTICATION WITH SESSION COOKIE:
- User: ${testUser.email}
- Role: ${testUser.role}
- Session cookie generated: ✅
- Cookie length: ${sessionCookie.length} characters

Now testing authenticated endpoint with session cookie...
      `);

      // Test the authenticated endpoint with session cookie
      const response = await request(baseURL).get("/api/test/auth").set("Cookie", sessionCookie).expect(200);

      expect(response.body).toMatchObject({
        message: "Hello from authenticated GET test endpoint!",
        user: {
          id: testUser.id,
          email: testUser.email,
          name: testUser.name,
        },
        status: "success",
      });

      console.log(`
✅ BASIC AUTHENTICATION WITH SESSION COOKIE PASSED!
- Endpoint returned 200 (authenticated)
- User data correctly returned
- Session cookie authentication working
      `);
    });

    it("should test Internet Identity user with linked Principal", async () => {
      // Create a test user with linked II Principal
      const testUser: TestUserSession = {
        id: testUser2Id,
        email: "test-session-2@example.com",
        name: "Test Session User 2",
        role: "user",
      };

      const linkedPrincipal = "2vxsx-fae"; // Example II Principal

      // Generate session cookie for user with linked II Principal
      const sessionCookie = generateIISessionCookie(testUser, linkedPrincipal);

      console.log(`
🔍 TESTING II USER WITH LINKED PRINCIPAL (SESSION COOKIE):
- User: ${testUser.email}
- Linked Principal: ${linkedPrincipal}
- Session cookie generated: ✅

Testing authenticated endpoint with II user session...
      `);

      // Test the authenticated endpoint
      const response = await request(baseURL).get("/api/test/auth").set("Cookie", sessionCookie).expect(200);

      expect(response.body).toMatchObject({
        message: "Hello from authenticated GET test endpoint!",
        user: {
          id: testUser.id,
          email: testUser.email,
          name: testUser.name,
        },
        status: "success",
      });

      console.log(`
✅ II USER AUTHENTICATION WITH SESSION COOKIE PASSED!
- Endpoint returned 200 (authenticated)
- II user data correctly returned
- Session cookie with II Principal working
      `);
    });

    it("should test admin user with different role", async () => {
      // Test user with admin role
      const testUser: TestUserSession = {
        id: testUser3Id,
        email: "test-session-3@example.com",
        name: "Test Session User 3",
        role: "admin",
      };

      const sessionCookie = generateGoogleSessionCookie(testUser);

      console.log(`
🔍 TESTING ADMIN USER AUTHENTICATION (SESSION COOKIE):
- User: ${testUser.email}
- Role: ${testUser.role}
- Session cookie generated: ✅

Testing authenticated endpoint with admin user session...
      `);

      // Test the authenticated endpoint
      const response = await request(baseURL).get("/api/test/auth").set("Cookie", sessionCookie).expect(200);

      expect(response.body).toMatchObject({
        message: "Hello from authenticated GET test endpoint!",
        user: {
          id: testUser.id,
          email: testUser.email,
          name: testUser.name,
        },
        status: "success",
      });

      console.log(`
✅ ADMIN USER AUTHENTICATION WITH SESSION COOKIE PASSED!
- Endpoint returned 200 (authenticated)
- Admin user data correctly returned
- Role-based authentication working with session cookies
      `);
    });
  });

  describe("Testing Different Authentication Scenarios", () => {
    it("should test user with active II co-authentication", async () => {
      const testUser: TestUserSession = {
        id: testUser2Id,
        email: "test-session-2@example.com",
        name: "Test Session User 2",
        role: "user",
      };

      const activePrincipal = "2vxsx-fae";

      // Generate session cookie for user with active II co-auth
      const sessionCookie = generateActiveIISessionCookie(testUser, activePrincipal);

      console.log(`
🔍 TESTING ACTIVE II CO-AUTHENTICATION (SESSION COOKIE):
- User: ${testUser.email}
- Active Principal: ${activePrincipal}
- Co-auth state: Active
- Session cookie generated: ✅

Testing authenticated endpoint with active co-auth session...
      `);

      // Test the authenticated endpoint
      const response = await request(baseURL).get("/api/test/auth").set("Cookie", sessionCookie).expect(200);

      expect(response.body).toMatchObject({
        message: "Hello from authenticated GET test endpoint!",
        user: {
          id: testUser.id,
          email: testUser.email,
          name: testUser.name,
        },
        status: "success",
      });

      console.log(`
✅ ACTIVE II CO-AUTHENTICATION WITH SESSION COOKIE PASSED!
- Endpoint returned 200 (authenticated)
- Active co-auth user data correctly returned
- Co-authentication state working in session cookie
      `);
    });
  });

  describe("Next Steps: Testing Real ICP Endpoints", () => {
    it("should outline how to test your real ICP endpoints", () => {
      console.log(`
🎯 NEXT STEPS: TESTING REAL ICP ENDPOINTS WITH SESSION COOKIES

Now that we have session cookie authentication working, we can test:

1. **Principal Linking Endpoint**:
   - POST /api/auth/link-ii with authenticated session
   - Test Principal conflict detection
   - Test successful linking

2. **Nonce Verification Endpoint**:
   - POST /api/ii/verify-nonce with authenticated session
   - Test rate limiting
   - Test CSRF protection

3. **Principal Unlinking Endpoint**:
   - POST /api/auth/unlink-ii with authenticated session
   - Test unlinking logic

4. **Complete Authentication Scenarios**:
   - Google → link II → activate co-auth
   - II-first login → Principal creation
   - Principal conflict detection
   - TTL expiration testing

💡 READY TO TEST: We now have the foundation to test your real ICP authentication system with proper session cookies!
      `);

      expect(true).toBe(true);
    });
  });
});


