import { auth } from "../../auth";

export type SessionLike = {
  user: {
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
  };
  expires?: string;
} | null;

/**
 * Authentication wrapper that bypasses NextAuth in test environment
 * This allows us to test ICP endpoints without complex session mocking
 */
export async function requireAuth(req: Request): Promise<SessionLike> {
  // 🧪 TEST MODE: Bypass NextAuth for automated testing
  if (process.env.TEST_AUTH_BYPASS === "1") {
    const testUserId = req.headers.get("x-test-user-id")?.toString() || "test-user-id";
    const testEmail = req.headers.get("x-test-user-email")?.toString() || "test@example.com";
    const testName = req.headers.get("x-test-user-name")?.toString() || "Test User";
    const testRole = req.headers.get("x-test-user-role")?.toString() || "user";
    const testLinkedPrincipal = req.headers.get("x-test-linked-principal")?.toString();
    const testActivePrincipal = req.headers.get("x-test-active-principal")?.toString();

    return {
      user: {
        id: testUserId,
        email: testEmail,
        name: testName,
        role: testRole,
        loginProvider: "google",
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
