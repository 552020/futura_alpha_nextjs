import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { testDb } from '@/db/test-db';
import { users, allUsers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
  generateGoogleUserJWT,
  generateIIUserJWT,
  generateActiveIIUserJWT,
  generateExpiredJWT,
  type TestUserJWT,
} from './utils/jwt-generator';

describe('Hybrid Authentication Testing - Database + JWT', () => {
  const baseURL = 'http://localhost:3000';
  let testUser1Id: string;
  let testUser2Id: string;
  let testUser3Id: string;

  beforeAll(async () => {
    console.log(`
🎯 SETTING UP HYBRID AUTHENTICATION TESTING

We're combining:
1. Test database for user creation
2. JWT generation for authentication
3. Supertest for endpoint testing

This should give us realistic authentication testing!
    `);

    try {
      // Create test users in the database
      const [testUser1] = await testDb
        .insert(users)
        .values({
          email: 'test-hybrid-1@example.com',
          name: 'Test Hybrid User 1',
          username: 'testhybrid1',
          role: 'user',
          plan: 'free',
        })
        .returning();

      const [testUser2] = await testDb
        .insert(users)
        .values({
          email: 'test-hybrid-2@example.com',
          name: 'Test Hybrid User 2',
          username: 'testhybrid2',
          role: 'admin',
          plan: 'premium',
        })
        .returning();

      const [testUser3] = await testDb
        .insert(users)
        .values({
          email: 'test-hybrid-3@example.com',
          name: 'Test Hybrid User 3',
          username: 'testhybrid3',
          role: 'user',
          plan: 'free',
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
        testDb.insert(allUsers).values({
          type: 'user',
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

Now let's test authentication with JWT tokens!
      `);
    } catch (error) {
      console.error('❌ Error creating test users:', error);
      throw error;
    }
  });

  afterAll(async () => {
    // Clean up test users
    try {
      await testDb.delete(users).where(eq(users.id, testUser1Id));
      await testDb.delete(users).where(eq(users.id, testUser2Id));
      await testDb.delete(users).where(eq(users.id, testUser3Id));
      console.log('🧹 Test users cleaned up successfully');
    } catch (error) {
      console.error('❌ Error cleaning up test users:', error);
    }
  });

  describe('Testing Authentication with Real Database Users', () => {
    it('should test basic Google authentication', async () => {
      const testUser: TestUserJWT = {
        id: testUser1Id,
        email: 'test-hybrid-1@example.com',
        name: 'Test Hybrid User 1',
        role: 'user',
      };

      const validToken = generateGoogleUserJWT(testUser);

      const response = await request(baseURL)
        .get('/api/test/auth')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Hello from authenticated GET test endpoint!',
        user: {
          id: testUser.id,
          email: testUser.email,
          name: testUser.name,
        },
        status: 'success',
      });
    });

    it('should test admin user authentication', async () => {
      const testUser: TestUserJWT = {
        id: testUser2Id,
        email: 'test-hybrid-2@example.com',
        name: 'Test Hybrid User 2',
        role: 'admin',
      };

      const validToken = generateGoogleUserJWT(testUser);

      const response = await request(baseURL)
        .get('/api/test/auth')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Hello from authenticated GET test endpoint!',
        user: {
          id: testUser.id,
          email: testUser.email,
          name: testUser.name,
          role: 'admin',
        },
        status: 'success',
      });
    });

    it('should test user with linked Internet Identity Principal', async () => {
      const testUser: TestUserJWT = {
        id: testUser3Id,
        email: 'test-hybrid-3@example.com',
        name: 'Test Hybrid User 3',
        role: 'user',
        linkedIcPrincipal: '2vxsx-fae',
      };

      const validToken = generateIIUserJWT(testUser, '2vxsx-fae');

      const response = await request(baseURL)
        .get('/api/test/auth')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Hello from authenticated GET test endpoint!',
        user: {
          id: testUser.id,
          email: testUser.email,
          name: testUser.name,
        },
        status: 'success',
      });
    });

    it('should test user with active II co-authentication', async () => {
      const testUser: TestUserJWT = {
        id: testUser3Id,
        email: 'test-hybrid-3@example.com',
        name: 'Test Hybrid User 3',
        role: 'user',
        linkedIcPrincipal: '2vxsx-fae',
        activeIcPrincipal: '2vxsx-fae',
      };

      const validToken = generateActiveIIUserJWT(testUser, '2vxsx-fae');

      const response = await request(baseURL)
        .get('/api/test/auth')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Hello from authenticated GET test endpoint!',
        user: {
          id: testUser.id,
          email: testUser.email,
          name: testUser.name,
        },
        status: 'success',
      });
    });

    it('should test expired JWT token', async () => {
      const testUser: TestUserJWT = {
        id: testUser1Id,
        email: 'test-hybrid-1@example.com',
        name: 'Test Hybrid User 1',
        role: 'user',
      };

      const expiredToken = generateExpiredJWT(testUser);

      const response = await request(baseURL)
        .get('/api/test/auth')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body).toMatchObject({
        message: 'Authentication required',
        error: 'No valid session found',
        status: 'unauthorized',
      });
    });
  });

  describe('Testing Different Authentication States', () => {
    it('should test unauthenticated request', async () => {
      const response = await request(baseURL).get('/api/test/auth').expect(401);

      expect(response.body).toMatchObject({
        message: 'Authentication required',
        error: 'No valid session found',
        status: 'unauthorized',
      });
    });

    it('should test malformed authorization header', async () => {
      const response = await request(baseURL).get('/api/test/auth').set('Authorization', 'InvalidToken').expect(401);

      expect(response.body).toMatchObject({
        message: 'Authentication required',
        error: 'No valid session found',
        status: 'unauthorized',
      });
    });
  });

  describe('Next Steps: Testing Real ICP Endpoints', () => {
    it('should outline how to test ICP endpoints', () => {
      console.log(`
🎯 NEXT STEPS: TESTING REAL ICP ENDPOINTS WITH HYBRID AUTH

Now that we have hybrid authentication working, we can test:

1. **Principal Linking Endpoint**:
   - POST /api/auth/link-ii with valid JWT
   - Test Principal conflict detection
   - Test successful linking

2. **Nonce Verification Endpoint**:
   - POST /api/ii/verify-nonce with valid JWT
   - Test rate limiting
   - Test CSRF protection

3. **Principal Unlinking Endpoint**:
   - POST /api/auth/unlink-ii with valid JWTt p
   - Test unlinking logic

4. **Complete Authentication Scenarios**:
   - Google → link II → activate co-auth
   - II-first login → Principal creation
   - Principal conflict detection
   - TTL expiration testing

💡 READY TO TEST: We now have the foundation to test your real ICP authentication system!
      `);

      expect(true).toBe(true);
    });
  });
});
