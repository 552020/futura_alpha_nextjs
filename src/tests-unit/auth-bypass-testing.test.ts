import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { testDb } from '@/db/test-db';
import { users, allUsers } from '@/db';
import { eq } from 'drizzle-orm';

import { fatLogger } from '@/lib/logger';
// 🎯 AUTH BYPASS TESTING - IMMEDIATE UNBLOCKING
// This test demonstrates that we can now test authenticated endpoints
// by bypassing NextAuth complexity in test environment

describe('Auth Bypass Testing - Immediate ICP Endpoint Testing', () => {
  // Point Supertest directly at your running dev server
  const baseURL = 'http://localhost:3000';

  // Store test user IDs for cleanup
  let testUser1Id: string;
  let testUser2Id: string;

  beforeAll(async () => {
    fatLogger.info(
      `
🎯 SETTING UP AUTH BYPASS TESTING

We're now using the senior dev's recommended approach:
1. Auth shim that bypasses NextAuth in test mode
2. Header-based user identity injection
3. Immediate testing of authenticated endpoints

This should unblock your ICP endpoint testing!
    `,
      'be'
    );

    try {
      // Create test users in the database
      const [testUser1] = await testDb
        .insert(users)
        .values({
          email: 'test-bypass-1@example.com',
          name: 'Test Bypass User 1',
          username: 'testbypass1',
          role: 'user',
          plan: 'free',
        })
        .returning();

      const [testUser2] = await testDb
        .insert(users)
        .values({
          email: 'test-bypass-2@example.com',
          name: 'Test Bypass User 2',
          username: 'testbypass2',
          role: 'admin',
          plan: 'premium',
        })
        .returning();

      // Create allUsers records
      await Promise.all([
        testDb.insert(allUsers).values({
          type: 'user',
          userId: testUser1.id,
        }),
        testDb.insert(allUsers).values({
          type: 'user',
          userId: testUser2.id,
        }),
      ]);

      // Store IDs for cleanup
      testUser1Id = testUser1.id;
      testUser2Id = testUser2.id;

      fatLogger.info(
        `
✅ TEST USERS CREATED SUCCESSFULLY:
- User 1: ${testUser1.email} (ID: ${testUser1.id}) - Role: ${testUser1.role}
- User 2: ${testUser2.email} (ID: ${testUser2.id}) - Role: ${testUser2.role}

Now let's test the auth bypass!
      `,
        'be'
      );
    } catch (error) {
      fatLogger.error('❌ Error creating test users:', 'be', {
        data: error instanceof Error ? error : undefined,
      });
      throw error;
    }
  });

  afterAll(async () => {
    // Clean up test users
    try {
      await testDb.delete(users).where(eq(users.id, testUser1Id));
      await testDb.delete(users).where(eq(users.id, testUser2Id));
      fatLogger.info('🧹 Test users cleaned up successfully', 'be');
    } catch (error) {
      fatLogger.error('❌ Error cleaning up test users:', 'be', {
        data: error instanceof Error ? error : undefined,
      });
    }
  });

  describe('Testing Auth Bypass with Headers', () => {
    it('should test basic user authentication bypass', async () => {
      fatLogger.info(
        `
🔍 TESTING BASIC AUTH BYPASS:
- Setting TEST_AUTH_BYPASS=1
- Using x-test-user-id header
- Should bypass NextAuth and return 200

Testing authenticated endpoint with auth bypass...
      `,
        'be'
      );

      // Test the authenticated endpoint with auth bypass
      const response = await request(baseURL)
        .get('/api/test/auth')
        .set('x-test-user-id', testUser1Id)
        .set('x-test-user-email', 'test-bypass-1@example.com')
        .set('x-test-user-name', 'Test Bypass User 1')
        .set('x-test-user-role', 'user')
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Hello from authenticated GET test endpoint!',
        user: {
          id: testUser1Id,
          email: 'test-bypass-1@example.com',
          name: 'Test Bypass User 1',
          role: 'user',
          loginProvider: 'google',
        },
        status: 'success',
      });

      fatLogger.info(
        `
✅ BASIC AUTH BYPASS TEST PASSED!
- Endpoint returned 200 (authenticated)
- User data correctly returned
- NextAuth bypass working
- We can now test authenticated endpoints!
      `,
        'be'
      );
    });

    it('should test admin user with different role', async () => {
      fatLogger.info(
        `
🔍 TESTING ADMIN USER AUTH BYPASS:
- User: ${testUser2Id}
- Role: admin
- Should bypass NextAuth and return 200

Testing admin endpoint with auth bypass...
      `,
        'be'
      );

      // Test the authenticated endpoint
      const response = await request(baseURL)
        .get('/api/test/auth')
        .set('x-test-user-id', testUser2Id)
        .set('x-test-user-email', 'test-bypass-2@example.com')
        .set('x-test-user-name', 'Test Bypass User 2')
        .set('x-test-user-role', 'admin')
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Hello from authenticated GET test endpoint!',
        user: {
          id: testUser2Id,
          email: 'test-bypass-2@example.com',
          name: 'Test Bypass User 2',
          role: 'admin',
          loginProvider: 'google',
        },
        status: 'success',
      });

      fatLogger.info(
        `
✅ ADMIN USER AUTH BYPASS TEST PASSED!
- Endpoint returned 200 (authenticated)
- Admin user data correctly returned
- Role-based authentication working
- Auth bypass is fully functional!
      `,
        'be'
      );
    });

    it('should test user with linked Internet Identity Principal', async () => {
      fatLogger.info(
        `
🔍 TESTING II USER WITH LINKED PRINCIPAL:
- User: ${testUser1Id}
- Linked Principal: 2vxsx-fae
- Should include II data in session

Testing II user with auth bypass...
      `,
        'be'
      );

      const linkedPrincipal = '2vxsx-fae';

      // Test the authenticated endpoint with II Principal
      const response = await request(baseURL)
        .get('/api/test/auth')
        .set('x-test-user-id', testUser1Id)
        .set('x-test-user-email', 'test-bypass-1@example.com')
        .set('x-test-user-name', 'Test Bypass User 1')
        .set('x-test-user-role', 'user')
        .set('x-test-linked-principal', linkedPrincipal)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Hello from authenticated GET test endpoint!',
        user: {
          id: testUser1Id,
          email: 'test-bypass-1@example.com',
          name: 'Test Bypass User 1',
          role: 'user',
          loginProvider: 'google',
          linkedIcPrincipal: linkedPrincipal,
        },
        status: 'success',
      });

      fatLogger.info(
        `
✅ II USER AUTH BYPASS TEST PASSED!
- Endpoint returned 200 (authenticated)
- II Principal data correctly included
- Auth bypass working with complex user states
      `,
        'be'
      );
    });

    it('should test user with active II co-authentication', async () => {
      fatLogger.info(
        `
🔍 TESTING ACTIVE II CO-AUTHENTICATION:
- User: ${testUser1Id}
- Active Principal: 2vxsx-fae
- Co-auth state: Active
- Should include active II data

Testing active co-auth with auth bypass...
      `,
        'be'
      );

      const activePrincipal = '2vxsx-fae';

      // Test the authenticated endpoint with active II co-auth
      const response = await request(baseURL)
        .get('/api/test/auth')
        .set('x-test-user-id', testUser1Id)
        .set('x-test-user-email', 'test-bypass-1@example.com')
        .set('x-test-user-name', 'Test Bypass User 1')
        .set('x-test-user-role', 'user')
        .set('x-test-linked-principal', activePrincipal)
        .set('x-test-active-principal', activePrincipal)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Hello from authenticated GET test endpoint!',
        user: {
          id: testUser1Id,
          email: 'test-bypass-1@example.com',
          name: 'Test Bypass User 1',
          role: 'user',
          loginProvider: 'google',
          linkedIcPrincipal: activePrincipal,
          icpPrincipal: activePrincipal,
        },
        status: 'success',
      });

      fatLogger.info(
        `
✅ ACTIVE II CO-AUTHENTICATION TEST PASSED!
- Endpoint returned 200 (authenticated)
- Active co-auth data correctly included
- Complex authentication states working
- Ready to test real ICP endpoints!
      `,
        'be'
      );
    });
  });

  describe('Next Steps: Testing Real ICP Endpoints', () => {
    it('should outline how to test your real ICP endpoints', () => {
      fatLogger.info(
        `
🎯 NEXT STEPS: TESTING REAL ICP ENDPOINTS WITH AUTH BYPASS

Now that we have auth bypass working, we can test:

1. **Principal Linking Endpoint**:
   - POST /api/auth/link-ii with auth bypass
   - Test Principal conflict detection
   - Test successful linking

2. **Nonce Verification Endpoint**:
   - POST /api/ii/verify-nonce with auth bypass
   - Test rate limiting
   - Test CSRF protection

3. **Principal Unlinking Endpoint**:
   - POST /api/auth/unlink-ii with auth bypass
   - Test unlinking logic

4. **Complete Authentication Scenarios**:
   - Google → link II → activate co-auth
   - II-first login → Principal creation
   - Principal conflict detection
   - TTL expiration testing

💡 READY TO TEST: We now have the foundation to test your real ICP authentication system!
      `,
        'be'
      );

      expect(true).toBe(true);
    });
  });
});
