/**
 * ICP Error Handling Utilities
 *
 * Shared utilities for handling ICP backend connectivity and error detection
 * Based on ICP expert guidance + tech lead recommendations
 */

export type ClassifiedError =
  | { kind: 'connection'; cause: unknown }
  | { kind: 'auth'; code: 'delegation_expired' | 'unauthorized'; cause: unknown }
  | {
      kind: 'business';
      code: 'NotFound' | 'InvalidArgument' | 'Conflict' | 'ResourceExhausted' | 'NotImplemented' | 'Internal';
      message?: string;
    }
  | { kind: 'protocol'; cause: unknown };

/**
 * Classify ICP errors based on tech lead guidance
 * @param error - The error to classify
 * @returns ClassifiedError - Categorized error with metadata
 */
export function classifyIcpError(e: unknown): ClassifiedError {
  const msg = (e as Error)?.message ?? String(e ?? '');

  // Transport-level (browser & node-ish) - Tech lead guidance
  if (
    msg.includes('Failed to fetch') ||
    msg.includes('NetworkError') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('ENOTFOUND') ||
    msg.includes('ETIMEDOUT') ||
    msg.includes('503') ||
    msg.includes('502') ||
    msg.includes('504') ||
    msg.includes('RequestTimeout')
  ) {
    return { kind: 'connection', cause: e };
  }

  // Delegation / identity expired - Tech lead guidance
  if (msg.match(/delegation|expired|signature|invalid/i)) {
    return { kind: 'auth', code: 'delegation_expired', cause: e };
  }

  // Our canister business errors (Result::Err) - Tech lead guidance
  const errorObj = e as { code?: string; message?: string };
  const code = errorObj?.code;
  if (
    code &&
    ['NotFound', 'InvalidArgument', 'Conflict', 'ResourceExhausted', 'NotImplemented', 'Internal'].includes(code)
  ) {
    return {
      kind: 'business',
      code: code as 'NotFound' | 'InvalidArgument' | 'Conflict' | 'ResourceExhausted' | 'NotImplemented' | 'Internal',
      message: errorObj?.message,
    };
  }

  // Unauthorized via canister reject - Tech lead guidance
  if (msg.match(/not authorized|unauthorized/i)) {
    return { kind: 'auth', code: 'unauthorized', cause: e };
  }

  // Fallback - Tech lead guidance
  return { kind: 'protocol', cause: e };
}

/**
 * Check if an error indicates backend connectivity issues
 * @param error - The error to check
 * @returns boolean - True if this is a backend connection error
 */
export function isBackendConnectionError(error: unknown): boolean {
  return classifyIcpError(error).kind === 'connection';
}

/**
 * Check if an error indicates authentication issues
 * @param error - The error to check
 * @returns boolean - True if this is an authentication error
 */
export function isAuthenticationError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('invalid delegation') ||
      message.includes('expired') ||
      message.includes('401') ||
      message.includes('not authenticated') ||
      message.includes('unauthorized')
    );
  }
  return false;
}

/**
 * Create a backend connection error
 * @param message - Error message
 * @returns Error with BackendConnectionError name
 */
export function createBackendConnectionError(message: string = 'Backend connection failed'): Error {
  const error = new Error(message);
  error.name = 'BackendConnectionError';
  return error;
}

/**
 * Create an authentication expired error
 * @param message - Error message
 * @returns Error with AuthenticationExpiredError name
 */
export function createAuthenticationExpiredError(message: string = 'Authentication expired'): Error {
  const error = new Error(message);
  error.name = 'AuthenticationExpiredError';
  return error;
}

/**
 * Create a service error
 * @param message - Error message
 * @returns Error with CapsuleServiceError name
 */
export function createServiceError(message: string = 'Service error'): Error {
  const error = new Error(message);
  error.name = 'CapsuleServiceError';
  return error;
}

/**
 * Add timeout to a promise (tech lead recommendation)
 * @param promise - The promise to add timeout to
 * @param ms - Timeout in milliseconds (default 15s)
 * @returns Promise with timeout
 */
export function withTimeout<T>(promise: Promise<T>, ms = 15_000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('RequestTimeout')), ms)),
  ]);
}

/**
 * Error classes for consistent error handling (tech lead recommendation)
 */
export class BackendConnectionError extends Error {
  constructor(message: string = 'Backend connection failed') {
    super(message);
    this.name = 'BackendConnectionError';
  }
}

export class AuthenticationExpiredError extends Error {
  constructor(message: string = 'Authentication expired') {
    super(message);
    this.name = 'AuthenticationExpiredError';
  }
}

export class CapsuleUnauthorizedError extends Error {
  constructor(message: string = 'Unauthorized access to capsule') {
    super(message);
    this.name = 'CapsuleUnauthorizedError';
  }
}

export class CapsuleNotFoundError extends Error {
  constructor(message: string = 'Capsule not found') {
    super(message);
    this.name = 'CapsuleNotFoundError';
  }
}

export class CapsuleServiceError extends Error {
  constructor(message: string = 'Capsule service error') {
    super(message);
    this.name = 'CapsuleServiceError';
  }
}

/**
 * Safe call wrapper with timeout and error normalization (tech lead recommendation)
 * @param fn - Function to call
 * @returns Promise with normalized errors
 */
export async function safeCall<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await withTimeout(fn(), 15_000);
  } catch (raw) {
    const err = classifyIcpError(raw);
    switch (err.kind) {
      case 'connection':
        throw new BackendConnectionError('Backend unavailable');
      case 'auth':
        if (err.code === 'delegation_expired') throw new AuthenticationExpiredError('Session expired');
        throw new CapsuleUnauthorizedError('Not authorized');
      case 'business':
        if (err.code === 'NotFound') throw new CapsuleNotFoundError(err.message ?? 'Not found');
        throw new CapsuleServiceError(err.message ?? err.code);
      case 'protocol':
      default:
        throw new CapsuleServiceError('Protocol error');
    }
  }
}
