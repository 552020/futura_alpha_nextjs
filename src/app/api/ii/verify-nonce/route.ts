import { NextRequest, NextResponse } from "next/server";
import { createServerSideActor } from "@/lib/server-actor";

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20; // 20 requests per minute per IP (higher than challenge)

/**
 * Basic rate limiting check
 */
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const key = `verify_rate_limit_${ip}`;
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // Reset or first request
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  entry.count++;
  return true;
}

/**
 * Check origin/referer for basic CSRF protection
 */
function checkOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const allowedOrigin = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL;

  if (!allowedOrigin) {
    // If no allowed origin configured, skip check (dev mode)
    return true;
  }

  // Check origin header first
  if (origin && origin === allowedOrigin) {
    return true;
  }

  // Check referer header as fallback
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const allowedUrl = new URL(allowedOrigin);
      return refererUrl.origin === allowedUrl.origin;
    } catch {
      // Invalid referer URL
    }
  }

  return false;
}

/**
 * POST /api/ii/verify-nonce
 *
 * Verifies a nonce with the canister for Internet Identity authentication.
 *
 * Request body:
 * {
 *   "nonce": string
 * }
 *
 * Response:
 * {
 *   "success": boolean,
 *   "principal"?: string,
 *   "error"?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Extract request context first for security checks
    const headersList = await request.headers;
    const forwardedFor = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || realIp || "unknown";

    // Security Check 1: Origin/Referer validation (CSRF protection)
    if (!checkOrigin(request)) {
      console.warn(`II Verify: Invalid origin/referer from IP ${ipAddress}`);
      return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    }

    // Security Check 2: Rate limiting
    if (!checkRateLimit(ipAddress)) {
      console.warn(`II Verify: Rate limit exceeded for IP ${ipAddress}`);
      return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { nonce } = body;

    // Security Check 3: Validate nonce
    if (!nonce || typeof nonce !== "string") {
      return NextResponse.json({ error: "nonce is required and must be a string" }, { status: 400 });
    }

    if (nonce.length < 10) {
      return NextResponse.json({ error: "nonce is too short" }, { status: 400 });
    }

    // Security logging (never log raw nonce)
    // console.log(`II Verify: Attempting verification for nonce length ${nonce.length} from IP ${ipAddress}`);

    // Call canister to verify nonce
    const actor = await createServerSideActor();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nonceResult = (await actor.verify_nonce(nonce)) as { Ok: any } | { Err: any };

    if ("Err" in nonceResult) {
      // console.log(`II Verify: No proof found for nonce from IP ${ipAddress}`);
      return NextResponse.json({
        success: false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        error: `Authentication failed: ${JSON.stringify((nonceResult as { Err: any }).Err)}`,
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const principalStr = (nonceResult as { Ok: any }).Ok.toString();
    // console.log(`II Verify: Successfully verified nonce for principal ${principalStr} from IP ${ipAddress}`);

    return NextResponse.json({
      success: true,
      principal: principalStr,
    });
  } catch (error) {
    console.error("Error verifying II nonce:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to verify nonce",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ii/verify-nonce
 *
 * Returns information about the verify endpoint (for debugging)
 * Disabled in production for security
 */
export async function GET() {
  // Disable in production
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Endpoint not available" }, { status: 404 });
  }

  return NextResponse.json({
    endpoint: "/api/ii/verify-nonce",
    method: "POST",
    description: "Verifies a nonce with the canister for Internet Identity authentication",
    security: {
      rateLimit: `${RATE_LIMIT_MAX_REQUESTS} requests per ${RATE_LIMIT_WINDOW_MS / 1000}s per IP`,
      originCheck: "Same-origin requests only",
    },
    requestBody: {
      nonce: "string - the nonce to verify with the canister",
    },
    response: {
      success: "boolean - whether verification was successful",
      principal: "string (optional) - the principal that proved the nonce",
      error: "string (optional) - error message if verification failed",
    },
  });
}
