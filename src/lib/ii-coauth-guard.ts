/**
 * II Co-Auth Server-Side Guard
 *
 * Provides server-side verification of II co-auth status for protecting ICP routes.
 * Can be used in API routes, middleware, and server components.
 */

import { auth } from "@/auth";
import { requiresIIReAuth, checkIICoAuthTTL } from "./ii-coauth-ttl";

// Extended session user interface for II co-auth
interface ExtendedSessionUser {
  linkedIcPrincipal?: string;
  icpPrincipal?: string;
  icpPrincipalAssertedAt?: number;
  loginProvider?: string;
}

// Extended error interface for II co-auth errors
interface IICoAuthError extends Error {
  status?: number;
  code?: string;
  requiresReAuth?: boolean;
}

/**
 * Result of II co-auth verification
 */
export type IICoAuthVerificationResult = {
  isValid: boolean;
  requiresReAuth: boolean;
  status: "valid" | "expired" | "inactive" | "error";
  message: string;
  principal?: string;
  assertedAt?: number;
  ttlStatus?: ReturnType<typeof checkIICoAuthTTL>;
  error?: string;
};

/**
 * Verify II co-auth status server-side
 * @returns Verification result with detailed status
 */
export async function verifyIICoAuth(): Promise<IICoAuthVerificationResult> {
  try {
    // Get session using NextAuth v5 auth() helper
    const session = await auth();

    if (!session?.user) {
      return {
        isValid: false,
        requiresReAuth: false,
        status: "inactive",
        message: "No active session found",
      };
    }

    // Check if user has II co-auth active
    const icpPrincipal = (session.user as ExtendedSessionUser).icpPrincipal;
    const icpPrincipalAssertedAt = (session.user as ExtendedSessionUser).icpPrincipalAssertedAt;

    if (!icpPrincipal || !icpPrincipalAssertedAt) {
      return {
        isValid: false,
        requiresReAuth: false,
        status: "inactive",
        message: "II co-auth not active",
      };
    }

    // Check TTL status
    const ttlStatus = checkIICoAuthTTL(icpPrincipalAssertedAt);
    const isValid = ttlStatus.status === "active" || ttlStatus.status === "grace";
    const requiresReAuth = requiresIIReAuth(icpPrincipalAssertedAt);

    return {
      isValid,
      requiresReAuth,
      status: isValid ? "valid" : "expired",
      message:
        ttlStatus.status === "active"
          ? "II co-auth active and valid"
          : ttlStatus.status === "grace"
          ? "II co-auth in grace period"
          : "II co-auth expired",
      principal: icpPrincipal,
      assertedAt: icpPrincipalAssertedAt,
      ttlStatus,
    };
  } catch (error) {
    console.error("II co-auth verification failed:", error);
    return {
      isValid: false,
      requiresReAuth: false,
      status: "error",
      message: "Failed to verify II co-auth status",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Guard function that throws an error if II co-auth is invalid
 * @throws Error if II co-auth is invalid
 */
export async function guardIICoAuth(): Promise<void> {
  const result = await verifyIICoAuth();

  if (!result.isValid) {
    const error = new Error(result.message) as IICoAuthError;
    error.status = 403;
    error.code = "II_COAUTH_REQUIRED";
    error.requiresReAuth = result.requiresReAuth;
    throw error;
  }
}

/**
 * Check if user has linked II account (without requiring active co-auth)
 * @returns true if user has linked II account
 */
export async function hasLinkedIIAccount(): Promise<boolean> {
  try {
    const session = await auth();
    if (!session?.user) return false;

    const linkedIcPrincipal = (session.user as ExtendedSessionUser).linkedIcPrincipal;
    return !!linkedIcPrincipal;
  } catch (error) {
    console.error("Failed to check linked II account:", error);
    return false;
  }
}

/**
 * Get user's II account information
 * @returns II account info or null
 */
export async function getIIAccountInfo(): Promise<{
  linkedIcPrincipal?: string;
  activeIcPrincipal?: string;
  assertedAt?: number;
  loginProvider?: string;
} | null> {
  try {
    const session = await auth();
    if (!session?.user) return null;

    return {
      linkedIcPrincipal: (session.user as ExtendedSessionUser).linkedIcPrincipal,
      activeIcPrincipal: (session.user as ExtendedSessionUser).icpPrincipal,
      assertedAt: (session.user as ExtendedSessionUser).icpPrincipalAssertedAt,
      loginProvider: (session.user as ExtendedSessionUser).loginProvider,
    };
  } catch (error) {
    console.error("Failed to get II account info:", error);
    return null;
  }
}

/**
 * Create a Next.js API route handler that requires II co-auth
 * @param handler - The actual API route handler function
 * @returns Wrapped handler with II co-auth protection
 */
export function withIICoAuth<T extends unknown[]>(handler: (req: Request, ...args: T) => Promise<Response>) {
  return async (req: Request, ...args: T): Promise<Response> => {
    try {
      await guardIICoAuth();
      return handler(req, ...args);
    } catch (error) {
      if (error instanceof Error && (error as IICoAuthError).code === "II_COAUTH_REQUIRED") {
        return new Response(
          JSON.stringify({
            error: "II co-auth required",
            message: error.message,
            requiresReAuth: (error as IICoAuthError).requiresReAuth,
            code: "II_COAUTH_REQUIRED",
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Re-throw other errors
      throw error;
    }
  };
}
