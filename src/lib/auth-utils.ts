import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '../../auth';

export type SessionLike = {
  user: User;
  expires?: string;
} | null;

export interface User {
  id: string;
  email?: string;
  name?: string;
  image?: string;
  role?: string;
  businessUserId?: string;
  loginProvider?: string;
  linkedIcPrincipal?: string;
  icpPrincipal?: string;
  icpPrincipalAssertedAt?: number;
}

/**
 * Get the current user ID from the session
 * @param req The Next.js request object
 * @returns The user ID if authenticated, null otherwise
 */
export async function getUserId(req: NextRequest): Promise<string | null> {
  try {
    const session = await requireAuth(req);
    return session?.user?.id || null;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
}

/**
 * Get the current user from the session
 * @param req The Next.js request object
 * @returns The user object if authenticated, null otherwise
 */
export async function getUser(req: NextRequest): Promise<User | null> {
  try {
    const session = await requireAuth(req);
    return session?.user || null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

/**
 * Check if the current user has a specific role
 * @param req The Next.js request object
 * @param role The role to check for
 * @returns True if the user has the role, false otherwise
 */
export async function hasRole(req: NextRequest, role: string): Promise<boolean> {
  const user = await getUser(req);
  return user?.role === role;
}

/**
 * Get the current user's authentication token from cookies
 * @returns The authentication token if available, null otherwise
 */
export async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('next-auth.session-token')?.value || null;
}

/**
 * Authentication wrapper that bypasses NextAuth in test environment
 * This allows us to test ICP endpoints without complex session mocking
 */
export async function requireAuth(req: Request): Promise<SessionLike> {
  // 🧪 TEST MODE: Bypass NextAuth for automated testing
  if (process.env.TEST_AUTH_BYPASS === '1') {
    const testUserId = req.headers.get('x-test-user-id')?.toString() || 'test-user-id';
    const testEmail = req.headers.get('x-test-user-email')?.toString() || 'test@example.com';
    const testName = req.headers.get('x-test-user-name')?.toString() || 'Test User';
    const testRole = req.headers.get('x-test-user-role')?.toString() || 'user';
    const testLinkedPrincipal = req.headers.get('x-test-linked-principal')?.toString();
    const testActivePrincipal = req.headers.get('x-test-active-principal')?.toString();

    return {
      user: {
        id: testUserId,
        email: testEmail,
        name: testName,
        role: testRole,
        loginProvider: 'google',
        linkedIcPrincipal: testLinkedPrincipal,
        icpPrincipal: testActivePrincipal,
        icpPrincipalAssertedAt: testActivePrincipal ? Date.now() : undefined,
      },
      expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
    };
  }

  // 🚀 PRODUCTION MODE: Use real NextAuth
  return (await auth()) as SessionLike;
}
