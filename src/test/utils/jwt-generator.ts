import jwt from 'jsonwebtoken';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

// 🎯 JWT GENERATION UTILITY FOR TESTING
// This creates valid JWT tokens that NextAuth will accept

export interface TestUserJWT {
  id: string;
  email: string;
  name: string;
  role?: string;
  businessUserId?: string;
  loginProvider?: string;
  activeIcPrincipal?: string;
  linkedIcPrincipal?: string;
}

export interface JWTPayload {
  sub: string; // User ID (required)
  email: string;
  name: string;
  role?: string;
  businessUserId?: string;
  loginProvider?: string;
  activeIcPrincipal?: string;
  linkedIcPrincipal?: string;
  iat: number; // Issued at
  exp: number; // Expiration
}

/**
 * Generate a valid JWT token for testing authentication
 * Uses the same AUTH_SECRET that NextAuth uses
 */
export function generateTestJWT(user: TestUserJWT): string {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("❌ AUTH_SECRET is missing! Make sure it's set in .env.local");
  }

  const now = Math.floor(Date.now() / 1000);

  const payload: JWTPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role || 'user',
    businessUserId: user.businessUserId,
    loginProvider: user.loginProvider || 'google',
    activeIcPrincipal: user.activeIcPrincipal,
    linkedIcPrincipal: user.linkedIcPrincipal,
    iat: now,
    exp: now + 60 * 60, // 1 hour from now
  };

  // Sign the JWT with the same secret NextAuth uses
  return jwt.sign(payload, secret, { algorithm: 'HS256' });
}

/**
 * Generate a JWT token for a Google-authenticated user
 */
export function generateGoogleUserJWT(user: TestUserJWT): string {
  return generateTestJWT({
    ...user,
    loginProvider: 'google',
  });
}

/**
 * Generate a JWT token for a user with linked Internet Identity
 */
export function generateIIUserJWT(user: TestUserJWT, linkedPrincipal: string): string {
  return generateTestJWT({
    ...user,
    linkedIcPrincipal: linkedPrincipal,
  });
}

/**
 * Generate a JWT token for a user with active II co-authentication
 */
export function generateActiveIIUserJWT(user: TestUserJWT, activePrincipal: string): string {
  return generateTestJWT({
    ...user,
    linkedIcPrincipal: activePrincipal,
    activeIcPrincipal: activePrincipal,
  });
}

/**
 * Generate an expired JWT token for testing expiration scenarios
 */
export function generateExpiredJWT(user: TestUserJWT): string {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("❌ AUTH_SECRET is missing! Make sure it's set in .env.local");
  }

  const now = Math.floor(Date.now() / 1000);

  const payload: JWTPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role || 'user',
    businessUserId: user.businessUserId,
    loginProvider: user.loginProvider || 'google',
    activeIcPrincipal: user.activeIcPrincipal,
    linkedIcPrincipal: user.linkedIcPrincipal,
    iat: now - 60 * 60 * 2, // 2 hours ago
    exp: now - 60 * 60, // 1 hour ago (expired)
  };

  return jwt.sign(payload, secret, { algorithm: 'HS256' });
}

/**
 * Verify a JWT token (useful for debugging)
 */
export function verifyTestJWT(token: string): JWTPayload {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("❌ AUTH_SECRET is missing! Make sure it's set in .env.local");
  }

  try {
    return jwt.verify(token, secret, { algorithms: ['HS256'] }) as JWTPayload;
  } catch (error) {
    throw new Error(`❌ Invalid JWT token: ${error}`);
  }
}
