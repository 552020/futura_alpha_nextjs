import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { db } from "@/db/db";
import { iiNonces, type NewDBIINonce } from "@/db/schema";
import { eq, and, lt, gt, isNull, isNotNull, gte, count, sql } from "drizzle-orm";

/**
 * Enhanced nonce management for Internet Identity authentication
 *
 * SECURITY IMPROVEMENTS IMPLEMENTED:
 * - Atomic nonce consumption prevents TOCTOU race conditions
 * - Server-side TTL clamping prevents excessively long-lived nonces
 * - 32-byte (256-bit) nonces for future-proofing
 * - HMAC-SHA-256 instead of plain SHA-256 for additional protection
 * - Timing-safe hash comparison
 * - Rate limiting per IP address
 * - Optimized database queries with proper indexing
 * - Opportunistic cleanup to maintain database health
 *
 * MIGRATION NOTE:
 * - Existing nonces will continue to work during transition
 * - New nonces will use enhanced security features
 * - Database indexes should be added via migration
 * - Set NONCE_HMAC_SECRET environment variable in production
 */

/**
 * Configuration for nonce generation and validation
 */
export const NONCE_CONFIG = {
  // TTL in seconds (3 minutes by default)
  DEFAULT_TTL_SECONDS: 180,
  // TTL bounds for security
  MIN_TTL_SECONDS: 60, // 1 minute minimum
  MAX_TTL_SECONDS: 600, // 10 minutes maximum
  // Nonce length in bytes (256 bits for future-proofing)
  NONCE_LENGTH_BYTES: 32,
  // Hash algorithm for storing nonces
  HASH_ALGORITHM: "sha256" as const,
  // Server secret for HMAC (should be from env in production)
  HMAC_SECRET: process.env.NONCE_HMAC_SECRET || "fallback-secret-change-in-production",
  // Rate limiting configuration
  RATE_LIMIT_WINDOW_MS: 60 * 1000, // 1 minute window
  RATE_LIMIT_MAX_REQUESTS: 10, // Max 10 nonces per IP per minute
} as const;

/**
 * Generate a cryptographically secure random nonce
 */
export function generateNonce(): string {
  return randomBytes(NONCE_CONFIG.NONCE_LENGTH_BYTES).toString("base64url");
}

/**
 * Hash a nonce for secure storage using HMAC-SHA-256
 */
export function hashNonce(nonce: string): string {
  return createHmac(NONCE_CONFIG.HASH_ALGORITHM, NONCE_CONFIG.HMAC_SECRET).update(nonce, "utf8").digest("hex");
}

/**
 * Verify that a plain nonce matches the stored hash using timing-safe comparison
 */
export function verifyNonceHash(nonce: string, storedHash: string): boolean {
  const computedHash = hashNonce(nonce);
  const computedBuffer = Buffer.from(computedHash, "hex");
  const storedBuffer = Buffer.from(storedHash, "hex");

  // Ensure both buffers are the same length for timing-safe comparison
  if (computedBuffer.length !== storedBuffer.length) {
    return false;
  }

  return timingSafeEqual(computedBuffer, storedBuffer);
}

/**
 * Clamp TTL to safe bounds
 */
function clampTTL(requestedTTL?: number): number {
  const ttl = requestedTTL ?? NONCE_CONFIG.DEFAULT_TTL_SECONDS;
  return Math.max(NONCE_CONFIG.MIN_TTL_SECONDS, Math.min(NONCE_CONFIG.MAX_TTL_SECONDS, ttl));
}

/**
 * Check rate limit for nonce creation per IP address
 */
async function checkRateLimit(ipAddress?: string): Promise<boolean> {
  if (!ipAddress) return true; // Allow if no IP provided

  const windowStart = new Date(Date.now() - NONCE_CONFIG.RATE_LIMIT_WINDOW_MS);

  const recentCount = await db
    .select({ count: count() })
    .from(iiNonces)
    .where(and(gte(iiNonces.createdAt, windowStart), sql`${iiNonces.context}->>'ipAddress' = ${ipAddress}`));

  return (recentCount[0]?.count || 0) < NONCE_CONFIG.RATE_LIMIT_MAX_REQUESTS;
}

/**
 * Create a new nonce and store it in the database
 */
export async function createNonce(context: {
  callbackUrl?: string;
  userAgent?: string;
  ipAddress?: string;
  sessionId?: string;
  ttlSeconds?: number;
}): Promise<{ nonceId: string; nonce: string; ttlSeconds: number }> {
  // Check rate limit
  const rateLimitOk = await checkRateLimit(context.ipAddress);
  if (!rateLimitOk) {
    throw new Error("Rate limit exceeded for nonce creation");
  }
  const nonce = generateNonce();
  const nonceHash = hashNonce(nonce);
  const ttlSeconds = clampTTL(context.ttlSeconds);
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  const insertData: NewDBIINonce = {
    nonceHash,
    expiresAt,
    context: {
      callbackUrl: context.callbackUrl,
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
      sessionId: context.sessionId,
      // Store the actual TTL used for auditing
      ...(ttlSeconds && { ttlSeconds }),
    },
  };

  const [inserted] = await db.insert(iiNonces).values(insertData).returning({ id: iiNonces.id });

  // Run opportunistic cleanup to maintain database
  await opportunisticCleanup();

  return {
    nonceId: inserted.id,
    nonce,
    ttlSeconds,
  };
}

/**
 * Validate a nonce by ID and plain value
 */
export async function validateNonce(
  nonceId: string,
  nonce: string
): Promise<{
  valid: boolean;
  expired?: boolean;
  used?: boolean;
  context?: NonceContext | null;
}> {
  const record = await db.query.iiNonces.findFirst({
    where: eq(iiNonces.id, nonceId),
  });

  if (!record) {
    return { valid: false };
  }

  // Check if already used
  if (record.usedAt) {
    return { valid: false, used: true, context: record.context };
  }

  // Check if expired
  if (record.expiresAt < new Date()) {
    return { valid: false, expired: true, context: record.context };
  }

  // Verify the nonce hash
  const hashValid = verifyNonceHash(nonce, record.nonceHash);
  if (!hashValid) {
    return { valid: false, context: record.context };
  }

  return { valid: true, context: record.context };
}

/**
 * Atomically consume a nonce if it's valid (recommended for security)
 * This prevents TOCTOU race conditions by combining validation and consumption
 */
export async function consumeNonceIfValid(
  nonceId: string,
  nonce: string
): Promise<{
  ok: boolean;
  reason?: "not_found" | "already_used" | "expired" | "invalid_hash";
  context?: NonceContext | null;
}> {
  const nonceHash = hashNonce(nonce);
  const now = new Date();

  const result = await db
    .update(iiNonces)
    .set({ usedAt: now })
    .where(
      and(
        eq(iiNonces.id, nonceId),
        eq(iiNonces.nonceHash, nonceHash),
        isNull(iiNonces.usedAt),
        gt(iiNonces.expiresAt, now) // expiresAt > now
      )
    )
    .returning({
      id: iiNonces.id,
      context: iiNonces.context,
    });

  if (result.length > 0) {
    return { ok: true, context: result[0].context };
  }

  // If update failed, determine why by checking the record
  const record = await db.query.iiNonces.findFirst({
    where: eq(iiNonces.id, nonceId),
  });

  if (!record) {
    return { ok: false, reason: "not_found" };
  }

  if (record.usedAt) {
    return { ok: false, reason: "already_used", context: record.context };
  }

  if (record.expiresAt < now) {
    return { ok: false, reason: "expired", context: record.context };
  }

  // Must be invalid hash
  return { ok: false, reason: "invalid_hash", context: record.context };
}

/**
 * Mark a nonce as used (consume it)
 * NOTE: Use consumeNonceIfValid() instead for better security
 */
export async function consumeNonce(nonceId: string): Promise<boolean> {
  const result = await db
    .update(iiNonces)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(iiNonces.id, nonceId),
        isNull(iiNonces.usedAt),
        gt(iiNonces.expiresAt, new Date()) // Also check expiration
      )
    )
    .returning({ id: iiNonces.id });

  return result.length > 0;
}

/**
 * Clean up expired nonces (should be run periodically)
 */
export async function cleanupExpiredNonces(): Promise<number> {
  const result = await db.delete(iiNonces).where(lt(iiNonces.expiresAt, new Date())).returning({ id: iiNonces.id });

  return result.length;
}

/**
 * Get nonce statistics (for monitoring/debugging) - optimized with COUNT queries
 */
export async function getNonceStats(): Promise<{
  total: number;
  expired: number;
  used: number;
  active: number;
}> {
  const now = new Date();

  // Use parallel COUNT queries for better performance
  const [totalResult, usedResult, expiredResult, activeResult] = await Promise.all([
    // Total count
    db.select({ count: count() }).from(iiNonces),

    // Used count (has usedAt timestamp)
    db.select({ count: count() }).from(iiNonces).where(isNotNull(iiNonces.usedAt)),

    // Expired count (not used AND expired)
    db
      .select({ count: count() })
      .from(iiNonces)
      .where(and(isNull(iiNonces.usedAt), lt(iiNonces.expiresAt, now))),

    // Active count (not used AND not expired)
    db
      .select({ count: count() })
      .from(iiNonces)
      .where(and(isNull(iiNonces.usedAt), gte(iiNonces.expiresAt, now))),
  ]);

  return {
    total: totalResult[0]?.count || 0,
    used: usedResult[0]?.count || 0,
    expired: expiredResult[0]?.count || 0,
    active: activeResult[0]?.count || 0,
  };
}

/**
 * Type definitions for external use
 */
export type NonceContext = {
  callbackUrl?: string;
  userAgent?: string;
  ipAddress?: string;
  sessionId?: string;
  ttlSeconds?: number;
};

export type NonceValidationResult = {
  valid: boolean;
  expired?: boolean;
  used?: boolean;
  context?: NonceContext | null;
};

export type NonceConsumptionResult = {
  ok: boolean;
  reason?: "not_found" | "already_used" | "expired" | "invalid_hash";
  context?: NonceContext | null;
};

/**
 * Opportunistic cleanup - runs cleanup on a small percentage of calls
 * This helps maintain the database without requiring a separate scheduled job
 */
export async function opportunisticCleanup(): Promise<void> {
  // Run cleanup on ~1% of calls
  if (Math.random() < 0.01) {
    try {
      await cleanupExpiredNonces();
    } catch (error) {
      // Don't let cleanup failures affect the main operation
      console.warn("Opportunistic nonce cleanup failed:", error);
    }
  }
}
