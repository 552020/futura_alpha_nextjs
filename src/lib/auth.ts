import { NextRequest } from 'next/server';
import { requireAuth } from './requireAuth';
import { cookies } from 'next/headers';

export interface User {
  id: string;
  email?: string;
  name?: string;
  role?: string;
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
