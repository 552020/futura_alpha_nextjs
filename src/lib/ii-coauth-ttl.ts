/**
 * II Co-Auth TTL Management
 *
 * Manages the time-based expiration of Internet Identity co-authentication.
 * Provides utilities for checking TTL status, grace periods, and expiration handling.
 */

// TTL Configuration
export const II_COAUTH_CONFIG = {
  // Main TTL: 15 minutes for II co-auth
  TTL_MINUTES: 15,
  TTL_MS: 15 * 60 * 1000,

  // Grace period: 1 minute before forcing re-auth
  GRACE_PERIOD_MINUTES: 1,
  GRACE_PERIOD_MS: 1 * 60 * 1000,

  // Warning threshold: 2 minutes before expiration (for UI warnings)
  WARNING_THRESHOLD_MINUTES: 2,
  WARNING_THRESHOLD_MS: 2 * 60 * 1000,
} as const;

/**
 * TTL Status for II co-auth
 */
export type IICoAuthTTLStatus =
  | "active" // Within main TTL window
  | "grace" // Within grace period (expired but still usable)
  | "expired" // Fully expired, requires re-auth
  | "warning" // Approaching expiration (for UI warnings)
  | "inactive"; // No co-auth active

/**
 * Check the TTL status of II co-auth
 * @param assertedAt - Timestamp when II proof was last verified
 * @returns TTL status and remaining time information
 */
export function checkIICoAuthTTL(assertedAt?: number): {
  status: IICoAuthTTLStatus;
  remainingMs: number;
  remainingMinutes: number;
  isExpired: boolean;
  isInGracePeriod: boolean;
  isWarning: boolean;
} {
  if (!assertedAt) {
    return {
      status: "inactive",
      remainingMs: 0,
      remainingMinutes: 0,
      isExpired: true,
      isInGracePeriod: false,
      isWarning: false,
    };
  }

  const now = Date.now();
  const elapsed = now - assertedAt;
  const remainingMs = II_COAUTH_CONFIG.TTL_MS - elapsed;
  const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));

  // Check if fully expired (beyond grace period)
  if (elapsed > II_COAUTH_CONFIG.TTL_MS + II_COAUTH_CONFIG.GRACE_PERIOD_MS) {
    return {
      status: "expired",
      remainingMs: 0,
      remainingMinutes: 0,
      isExpired: true,
      isInGracePeriod: false,
      isWarning: false,
    };
  }

  // Check if in grace period
  if (elapsed > II_COAUTH_CONFIG.TTL_MS) {
    return {
      status: "grace",
      remainingMs: Math.max(0, II_COAUTH_CONFIG.TTL_MS + II_COAUTH_CONFIG.GRACE_PERIOD_MS - elapsed),
      remainingMinutes: Math.ceil(
        Math.max(0, II_COAUTH_CONFIG.TTL_MS + II_COAUTH_CONFIG.GRACE_PERIOD_MS - elapsed) / (60 * 1000)
      ),
      isExpired: true,
      isInGracePeriod: true,
      isWarning: false,
    };
  }

  // Check if approaching expiration (warning threshold)
  if (remainingMs <= II_COAUTH_CONFIG.WARNING_THRESHOLD_MS) {
    return {
      status: "warning",
      remainingMs,
      remainingMinutes,
      isExpired: false,
      isInGracePeriod: false,
      isWarning: true,
    };
  }

  // Active within main TTL window
  return {
    status: "active",
    remainingMs,
    remainingMinutes,
    isExpired: false,
    isInGracePeriod: false,
    isWarning: false,
  };
}

/**
 * Check if II co-auth is currently valid for ICP operations
 * @param assertedAt - Timestamp when II proof was last verified
 * @returns true if co-auth is valid (active or in grace period)
 */
export function isIICoAuthValid(assertedAt?: number): boolean {
  const ttlStatus = checkIICoAuthTTL(assertedAt);
  return ttlStatus.status === "active" || ttlStatus.status === "grace";
}

/**
 * Check if II co-auth requires immediate re-authentication
 * @param assertedAt - Timestamp when II proof was last verified
 * @returns true if co-auth is fully expired (beyond grace period)
 */
export function requiresIIReAuth(assertedAt?: number): boolean {
  const ttlStatus = checkIICoAuthTTL(assertedAt);
  return ttlStatus.status === "expired";
}

/**
 * Get human-readable TTL status for UI display
 * @param assertedAt - Timestamp when II proof was last verified
 * @returns User-friendly status message
 */
export function getIICoAuthStatusMessage(assertedAt?: number): string {
  const ttlStatus = checkIICoAuthTTL(assertedAt);

  switch (ttlStatus.status) {
    case "active":
      return `II Active (${ttlStatus.remainingMinutes}m remaining)`;
    case "grace":
      return `II Expired (${ttlStatus.remainingMinutes}m grace period)`;
    case "warning":
      return `II Expiring Soon (${ttlStatus.remainingMinutes}m remaining)`;
    case "expired":
      return "II Expired - Re-authenticate Required";
    case "inactive":
      return "II Not Active";
    default:
      return "II Status Unknown";
  }
}

/**
 * Get CSS class for TTL status (for UI styling)
 * @param assertedAt - Timestamp when II proof was last verified
 * @returns CSS class name for styling
 */
export function getIICoAuthStatusClass(assertedAt?: number): string {
  const ttlStatus = checkIICoAuthTTL(assertedAt);

  switch (ttlStatus.status) {
    case "active":
      return "text-green-600";
    case "grace":
      return "text-orange-600";
    case "warning":
      return "text-yellow-600";
    case "expired":
      return "text-red-600";
    case "inactive":
      return "text-gray-500";
    default:
      return "text-gray-500";
  }
}
