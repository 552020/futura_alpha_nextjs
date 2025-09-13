import jwt from "jsonwebtoken";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });

// 🎯 SESSION GENERATION UTILITY FOR TESTING
// This creates proper NextAuth session cookies that the auth() function will accept

export interface TestUserSession {
  id: string;
  email: string;
  name: string;
  role?: string;
  businessUserId?: string;
  loginProvider?: string;
  activeIcPrincipal?: string;
  linkedIcPrincipal?: string;
}

export interface NextAuthSession {
  user: {
    id: string;
    email: string;
    name: string;
    image?: string;
    role?: string;
    businessUserId?: string;
    loginProvider?: string;
    linkedIcPrincipal?: string;
    icpPrincipal?: string;
    icpPrincipalAssertedAt?: number;
  };
  expires: string;
  accessToken?: string;
}

/**
 * Generate a NextAuth session cookie for testing
 * This creates a session that the auth() function will accept
 */
export function generateNextAuthSession(user: TestUserSession): NextAuthSession {
  const now = new Date();
  const expires = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || "user",
      businessUserId: user.businessUserId,
      loginProvider: user.loginProvider || "google",
      linkedIcPrincipal: user.linkedIcPrincipal,
      icpPrincipal: user.activeIcPrincipal,
      icpPrincipalAssertedAt: user.activeIcPrincipal ? Date.now() : undefined,
    },
    expires: expires.toISOString(),
  };
}

/**
 * Generate a session cookie string for Supertest
 * This creates the actual cookie that NextAuth expects
 */
export function generateSessionCookie(user: TestUserSession): string {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("❌ AUTH_SECRET is missing! Make sure it's set in .env.local");
  }

  // Create the session data
  const sessionData = generateNextAuthSession(user);

  // Create a JWT token for the session
  const sessionToken = jwt.sign(sessionData, secret, {
    algorithm: "HS256",
    expiresIn: "1h",
  });

  // Return the cookie string that NextAuth expects
  return `next-auth.session-token=${sessionToken}`;
}

/**
 * Generate a session cookie for a Google user
 */
export function generateGoogleSessionCookie(user: TestUserSession): string {
  return generateSessionCookie({
    ...user,
    loginProvider: "google",
  });
}

/**
 * Generate a session cookie for a user with linked Internet Identity
 */
export function generateIISessionCookie(user: TestUserSession, linkedPrincipal: string): string {
  return generateSessionCookie({
    ...user,
    linkedIcPrincipal: linkedPrincipal,
  });
}

/**
 * Generate a session cookie for a user with active II co-authentication
 */
export function generateActiveIISessionCookie(user: TestUserSession, activePrincipal: string): string {
  return generateSessionCookie({
    ...user,
    linkedIcPrincipal: activePrincipal,
    activeIcPrincipal: activePrincipal,
  });
}

/**
 * Generate multiple session cookies for complex scenarios
 */
export function generateSessionCookies(user: TestUserSession): string[] {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("❌ AUTH_SECRET is missing! Make sure it's set in .env.local");
  }

  const cookies: string[] = [];

  // Main session cookie
  const sessionCookie = generateSessionCookie(user);
  cookies.push(sessionCookie);

  // Add CSRF token cookie if needed
  const csrfToken = jwt.sign({ csrf: true }, secret, { algorithm: "HS256" });
  cookies.push(`next-auth.csrf-token=${csrfToken}`);

  return cookies;
}


