import { NextRequest, NextResponse } from 'next/server';
import { createNonce, type NonceContext } from '@/lib/ii-nonce';
import { headers } from 'next/headers';

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute per IP

// TTL limits
const MIN_TTL_SECONDS = 60; // 1 minute minimum
const MAX_TTL_SECONDS = 600; // 10 minutes maximum
const DEFAULT_TTL_SECONDS = 180; // 3 minutes default

/**
 * Validate callback URL to prevent open redirects
 */
function isValidCallbackUrl(url: string): boolean {
  // Allow relative paths
  if (url.startsWith('/')) {
    return true;
  }

  // Allow same-origin absolute URLs
  try {
    const parsed = new URL(url);
    const allowedOrigin = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL;
    if (allowedOrigin) {
      const allowedParsed = new URL(allowedOrigin);
      return parsed.origin === allowedParsed.origin;
    }
  } catch {
    // Invalid URL format
  }

  return false;
}

/**
 * Basic rate limiting check
 */
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const key = `rate_limit_${ip}`;
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
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
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
 * POST /api/ii/challenge
 *
 * Creates a new nonce for Internet Identity canister-first signup flow.
 *
 * Request body:
 * {
 *   "callbackUrl"?: string,
 *   "ttlSeconds"?: number
 * }
 *
 * Response:
 * {
 *   "nonceId": string,
 *   "nonce": string,
 *   "ttlSeconds": number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Extract request context first for security checks
    const headersList = await headers();
    const userAgent = headersList.get('user-agent') || undefined;
    const forwardedFor = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown';

    // Security Check 1: Origin/Referer validation (CSRF protection)
    if (!checkOrigin(request)) {
      console.warn(`II Challenge: Invalid origin/referer from IP ${ipAddress}`);
      return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
    }

    // Security Check 2: Rate limiting
    if (!checkRateLimit(ipAddress)) {
      console.warn(`II Challenge: Rate limit exceeded for IP ${ipAddress}`);
      return NextResponse.json({ error: 'Rate limit exceeded. Please try again later.' }, { status: 429 });
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { callbackUrl, ttlSeconds: clientTtlSeconds } = body;

    // Security Check 3: CallbackUrl validation (prevent open redirects)
    if (callbackUrl && typeof callbackUrl !== 'string') {
      return NextResponse.json({ error: 'callbackUrl must be a string' }, { status: 400 });
    }

    if (callbackUrl && !isValidCallbackUrl(callbackUrl)) {
      console.warn(`II Challenge: Invalid callbackUrl attempted: ${callbackUrl} from IP ${ipAddress}`);
      return NextResponse.json(
        { error: 'Invalid callbackUrl. Must be a relative path or same-origin URL.' },
        { status: 400 }
      );
    }

    // Security Check 4: TTL clamping (don't trust client values)
    let ttlSeconds = DEFAULT_TTL_SECONDS;
    if (typeof clientTtlSeconds === 'number') {
      ttlSeconds = Math.max(MIN_TTL_SECONDS, Math.min(MAX_TTL_SECONDS, clientTtlSeconds));
    }

    // Create nonce context
    const context: NonceContext = {
      callbackUrl,
      userAgent,
      ipAddress,
      ttlSeconds,
    };

    // Generate and store nonce
    const result = await createNonce(context);

    // Security logging (never log raw nonce)
    // console.log(
    //   `II Challenge created: nonceId=${result.nonceId}, ttl=${
    //     result.ttlSeconds
    //   }s, ip=${ipAddress}, ua=${userAgent?.substring(0, 50)}...`
    // );

    // Return nonce data (the plain nonce is sent to client, hash is stored)
    return NextResponse.json({
      nonceId: result.nonceId,
      nonce: result.nonce,
      ttlSeconds: result.ttlSeconds,
    });
  } catch (error) {
    console.error('Error creating II challenge nonce:', error);
    return NextResponse.json({ error: 'Failed to create challenge nonce' }, { status: 500 });
  }
}

/**
 * GET /api/ii/challenge
 *
 * Returns information about the challenge endpoint (for debugging)
 * Disabled in production for security
 */
export async function GET() {
  // Disable in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Endpoint not available' }, { status: 404 });
  }

  return NextResponse.json({
    endpoint: '/api/ii/challenge',
    method: 'POST',
    description: 'Creates a nonce for Internet Identity canister-first signup',
    security: {
      rateLimit: `${RATE_LIMIT_MAX_REQUESTS} requests per ${RATE_LIMIT_WINDOW_MS / 1000}s per IP`,
      ttlLimits: `${MIN_TTL_SECONDS}-${MAX_TTL_SECONDS} seconds`,
      originCheck: 'Same-origin requests only',
      callbackValidation: 'Relative paths or same-origin URLs only',
    },
    requestBody: {
      callbackUrl: 'string (optional) - URL to redirect after successful auth',
      ttlSeconds: 'number (optional) - TTL in seconds, clamped to server limits',
    },
    response: {
      nonceId: 'string - unique identifier for this nonce',
      nonce: 'string - the actual nonce value to prove to canister',
      ttlSeconds: 'number - actual TTL in seconds (server-clamped)',
    },
  });
}
