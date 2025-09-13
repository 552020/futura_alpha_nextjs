/**
 * Centralized error handling utilities for consistent error responses
 */

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  statusCode?: number;
}

export interface NormalizedError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  isRetryable: boolean;
  userMessage: string;
}

/**
 * Parse API error response from fetch
 */
export async function parseApiError(response: Response): Promise<ApiError> {
  try {
    const data = await response.json();
    return {
      code: data.code || `HTTP_${response.status}`,
      message: data.message || response.statusText || `HTTP ${response.status}`,
      details: data.details || {},
      statusCode: response.status,
    };
  } catch {
    // Fallback for non-JSON responses
    const text = await response.text().catch(() => "");
    return {
      code: `HTTP_${response.status}`,
      message: text || response.statusText || `HTTP ${response.status}`,
      details: {},
      statusCode: response.status,
    };
  }
}

/**
 * Normalize API errors into consistent format for UI
 */
export function normalizeError(error: ApiError | Error): NormalizedError {
  // Handle ApiError objects
  if ("code" in error && "statusCode" in error) {
    const apiError = error as ApiError;

    return {
      code: apiError.code,
      message: apiError.message,
      details: apiError.details,
      isRetryable: isRetryableError(apiError),
      userMessage: getUserFriendlyMessage(apiError),
    };
  }

  // Handle generic Error objects
  const genericError = error as Error;
  return {
    code: "UNKNOWN_ERROR",
    message: genericError.message,
    details: {},
    isRetryable: false,
    userMessage: "An unexpected error occurred. Please try again.",
  };
}

/**
 * Determine if an error is retryable
 */
function isRetryableError(error: ApiError): boolean {
  const retryableCodes = ["NETWORK_ERROR", "TIMEOUT", "HTTP_500", "HTTP_502", "HTTP_503", "HTTP_504"];

  return retryableCodes.includes(error.code) || (error.statusCode !== undefined && error.statusCode >= 500);
}

/**
 * Get user-friendly error messages
 */
function getUserFriendlyMessage(error: ApiError): string {
  const userMessages: Record<string, string> = {
    PREFERENCE_DENIED: "Your storage preference was denied. Please try a different option.",
    QUOTA_EXCEEDED: "You have reached your storage quota. Please upgrade your plan.",
    FEATURE_DISABLED: "This feature is currently disabled for your account.",
    INVALID_PREFERENCE: "Invalid storage preference. Please select a valid option.",
    HTTP_401: "Please sign in to continue.",
    HTTP_403: "You do not have permission to perform this action.",
    HTTP_404: "The requested resource was not found.",
    HTTP_409: "There was a conflict with your request. Please try again.",
    HTTP_422: "Invalid data provided. Please check your input.",
    HTTP_429: "Too many requests. Please wait a moment and try again.",
    HTTP_500: "Server error. Please try again later.",
    HTTP_502: "Service temporarily unavailable. Please try again later.",
    HTTP_503: "Service temporarily unavailable. Please try again later.",
    HTTP_504: "Request timeout. Please try again later.",
  };

  return userMessages[error.code] || userMessages[`HTTP_${error.statusCode}`] || "An error occurred. Please try again.";
}

/**
 * Create a standardized error for storage preferences
 */
export function createStoragePreferenceError(
  code: string,
  message: string,
  details?: Record<string, unknown>
): NormalizedError {
  return {
    code,
    message,
    details,
    isRetryable: false,
    userMessage: getUserFriendlyMessage({ code, message, details, statusCode: 400 }),
  };
}

/**
 * Error codes for storage preferences
 */
export const STORAGE_ERROR_CODES = {
  PREFERENCE_DENIED: "PREFERENCE_DENIED",
  QUOTA_EXCEEDED: "QUOTA_EXCEEDED",
  FEATURE_DISABLED: "FEATURE_DISABLED",
  INVALID_PREFERENCE: "INVALID_PREFERENCE",
  NETWORK_ERROR: "NETWORK_ERROR",
  TIMEOUT: "TIMEOUT",
} as const;
