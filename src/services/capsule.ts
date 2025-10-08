import { fatLogger } from '@/lib/logger';
import type { CapsuleInfo, Capsule, PersonRef, CapsuleUpdateData, CapsuleError } from '@/types/capsule';
import type { BackendActor } from '@/ic/backend';
import type { Identity } from '@dfinity/agent';
import {
  isBackendConnectionError,
  isAuthenticationError,
  createBackendConnectionError,
  createAuthenticationExpiredError,
  createServiceError,
} from '@/lib/icp-error-handling';

/**
 * Create typed capsule errors
 */
export function createCapsuleError(kind: CapsuleError['kind'], message: string): CapsuleError {
  return { kind, message };
}

/**
 * Get full capsule data for the authenticated user
 * @param getActor - Function to get authenticated actor
 * @param clearActor - Function to clear cached actor
 * @returns Promise<Capsule | null> - Full capsule data or null if no capsule exists
 * @throws CapsuleServiceError - For general service errors
 * @throws AuthenticationExpiredError - When authentication expires
 */
export async function getCapsuleFull(
  getActor: () => Promise<BackendActor>,
  clearActor: () => void
): Promise<Capsule | null> {
  try {
    fatLogger.info('Getting full capsule data for authenticated user', 'be');

    const authenticatedActor = await getActor();
    const capsuleResult = await authenticatedActor.capsules_read_full([]);

    if ('Ok' in capsuleResult) {
      fatLogger.info('Successfully retrieved full capsule data', 'be');
      return capsuleResult.Ok;
    } else {
      fatLogger.info('No capsule found for user', 'be');
      return null;
    }
  } catch (error) {
    fatLogger.error('Failed to get full capsule data', 'be', { data: error as Error });

    const errorMessage = error instanceof Error ? error.message : String(error);

    // Handle backend connection issues
    if (isBackendConnectionError(error)) {
      throw createCapsuleError(
        'connection',
        'Cannot connect to the backend service. Please check your internet connection and try again.'
      );
    }

    // Handle authentication expiration
    if (isAuthenticationError(error)) {
      clearActor();
      throw createCapsuleError('authExpired', 'Your session has expired. Please sign in again.');
    }

    // Handle business logic errors
    if (errorMessage.includes('NotFound') || errorMessage.includes('not found')) {
      throw createCapsuleError('notFound', 'Capsule not found');
    }

    if (errorMessage.includes('Unauthorized') || errorMessage.includes('access denied')) {
      throw createCapsuleError('unauthorized', 'Access denied to capsule');
    }

    if (errorMessage.includes('InvalidArgument') || errorMessage.includes('invalid')) {
      throw createCapsuleError('invalid', 'Invalid request parameters');
    }

    // Fallback to internal error
    throw createCapsuleError('internal', `Failed to get full capsule data: ${errorMessage}`);
  }
}

/**
 * Get basic capsule information for the authenticated user
 * @param getActor - Function to get authenticated actor
 * @param clearActor - Function to clear cached actor
 * @returns Promise<CapsuleInfo | null> - Capsule info or null if no capsule exists
 * @throws CapsuleServiceError - For general service errors
 * @throws AuthenticationExpiredError - When authentication expires
 */
export async function getCapsuleInfo(
  getActor: () => Promise<BackendActor>,
  clearActor: () => void
): Promise<CapsuleInfo | null> {
  try {
    fatLogger.info('Getting capsule info for authenticated user', 'be');

    const authenticatedActor = await getActor();
    const capsuleResult = await authenticatedActor.capsules_read_basic([]);

    if ('Ok' in capsuleResult) {
      fatLogger.info('Successfully retrieved capsule info', 'be');
      return capsuleResult.Ok;
    } else {
      fatLogger.info('No capsule found for user', 'be');
      return null;
    }
  } catch (error) {
    fatLogger.error('Failed to get capsule info', 'be', { data: error as Error });

    const errorMessage = error instanceof Error ? error.message : String(error);

    // Handle backend connection issues
    if (isBackendConnectionError(error)) {
      throw createCapsuleError(
        'connection',
        'Cannot connect to the backend service. Please check your internet connection and try again.'
      );
    }

    // Handle authentication expiration
    if (isAuthenticationError(error)) {
      clearActor();
      throw createCapsuleError('authExpired', 'Your session has expired. Please sign in again.');
    }

    // Handle business logic errors
    if (errorMessage.includes('NotFound') || errorMessage.includes('not found')) {
      throw createCapsuleError('notFound', 'Capsule not found');
    }

    if (errorMessage.includes('Unauthorized') || errorMessage.includes('access denied')) {
      throw createCapsuleError('unauthorized', 'Access denied to capsule');
    }

    if (errorMessage.includes('InvalidArgument') || errorMessage.includes('invalid')) {
      throw createCapsuleError('invalid', 'Invalid request parameters');
    }

    // Fallback to internal error
    throw createCapsuleError('internal', `Failed to get capsule info: ${errorMessage}`);
  }
}

/**
 * Read full capsule data by ID
 * @param capsuleId - The capsule ID to read
 * @param getActor - Function to get authenticated actor
 * @param clearActor - Function to clear cached actor
 * @returns Promise<Capsule | null> - Full capsule data or null if not found
 * @throws CapsuleNotFoundError - When capsule doesn't exist
 * @throws CapsuleUnauthorizedError - When user lacks access
 * @throws CapsuleServiceError - For general service errors
 * @throws AuthenticationExpiredError - When authentication expires
 */
export async function readCapsule(
  capsuleId: string,
  getActor: () => Promise<BackendActor>,
  clearActor: () => void
): Promise<Capsule | null> {
  if (!capsuleId.trim()) {
    throw createServiceError('Capsule ID is required');
  }

  try {
    fatLogger.info(`Reading capsule: ${capsuleId}`, 'be');

    const authenticatedActor = await getActor();
    const capsuleResult = await authenticatedActor.capsules_read_full([capsuleId.trim()]);

    if ('Ok' in capsuleResult) {
      fatLogger.info(`Successfully read capsule: ${capsuleId}`, 'be');
      return capsuleResult.Ok;
    } else {
      fatLogger.info(`Capsule not found or no access: ${capsuleId}`, 'be');
      return null;
    }
  } catch (error) {
    fatLogger.error(`Failed to read capsule: ${capsuleId}`, 'be', { data: error as Error });

    const errorMessage = error instanceof Error ? error.message : String(error);

    // Handle backend connection issues
    if (isBackendConnectionError(error)) {
      throw createCapsuleError(
        'connection',
        'Cannot connect to the backend service. Please check your internet connection and try again.'
      );
    }

    // Handle authentication expiration
    if (isAuthenticationError(error)) {
      clearActor();
      throw createCapsuleError('authExpired', 'Your session has expired. Please sign in again.');
    }

    // Handle business logic errors
    if (errorMessage.includes('NotFound') || errorMessage.includes('not found')) {
      throw createCapsuleError('notFound', 'Capsule not found');
    }

    if (errorMessage.includes('Unauthorized') || errorMessage.includes('access denied')) {
      throw createCapsuleError('unauthorized', 'Access denied to capsule');
    }

    if (errorMessage.includes('InvalidArgument') || errorMessage.includes('invalid')) {
      throw createCapsuleError('invalid', 'Invalid request parameters');
    }

    // Fallback to internal error
    throw createCapsuleError('internal', `Failed to get capsule info: ${errorMessage}`);
  }
}

/**
 * Create a new capsule
 * @param subject - Optional subject for the capsule (if None, creates self-capsule)
 * @param getActor - Function to get authenticated actor
 * @param clearActor - Function to clear cached actor
 * @returns Promise<Capsule> - Created capsule
 * @throws CapsuleServiceError - For general service errors
 * @throws AuthenticationExpiredError - When authentication expires
 */
export async function createCapsule(
  subject: PersonRef | null,
  getActor: () => Promise<BackendActor>,
  clearActor: () => void
): Promise<Capsule> {
  try {
    fatLogger.info('Creating new capsule', 'be');
    console.log('🔍 Create Capsule Debug:', {
      subject,
      subjectType: subject ? ('Principal' in subject ? 'Principal' : 'Opaque') : 'null',
    });

    const authenticatedActor = await getActor();
    console.log('🔍 Actor obtained:', {
      actorType: typeof authenticatedActor,
      hasCapsulesCreate: typeof authenticatedActor.capsules_create === 'function',
    });

    const capsuleResult = await authenticatedActor.capsules_create(subject ? [subject] : []);
    console.log('🔍 Capsule creation result:', {
      resultType: typeof capsuleResult,
      hasOk: 'Ok' in capsuleResult,
      hasErr: 'Err' in capsuleResult,
      result: capsuleResult,
    });

    if ('Ok' in capsuleResult) {
      fatLogger.info('Successfully created capsule', 'be');
      return capsuleResult.Ok;
    } else {
      throw createServiceError(`Failed to create capsule: ${JSON.stringify(capsuleResult.Err)}`);
    }
  } catch (error) {
    console.log('🔍 Create Capsule Error Debug:', {
      error,
      errorType: typeof error,
      errorName: error instanceof Error ? error.name : 'unknown',
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : 'no stack',
    });

    fatLogger.error('Failed to create capsule', 'be', { data: error as Error });

    const errorMessage = error instanceof Error ? error.message : String(error);

    // Handle backend connection issues
    if (isBackendConnectionError(error)) {
      console.log('🔍 Detected backend connection error');
      throw createBackendConnectionError(
        'Cannot connect to the backend service. Please check your internet connection and try again.'
      );
    }

    // Handle authentication expiration
    if (isAuthenticationError(error)) {
      console.log('🔍 Detected authentication error, clearing actor');
      clearActor();
      throw createAuthenticationExpiredError('Your session has expired. Please sign in again.');
    }

    console.log('🔍 Throwing generic service error');
    throw createServiceError(`Failed to create capsule: ${errorMessage}`);
  }
}

/**
 * Update a capsule
 * @param capsuleId - The capsule ID to update
 * @param updates - The updates to apply
 * @param getActor - Function to get authenticated actor
 * @param clearActor - Function to clear cached actor
 * @returns Promise<Capsule> - Updated capsule
 * @throws CapsuleNotFoundError - When capsule doesn't exist
 * @throws CapsuleUnauthorizedError - When user lacks access
 * @throws CapsuleServiceError - For general service errors
 * @throws AuthenticationExpiredError - When authentication expires
 */
export async function updateCapsule(
  capsuleId: string,
  updates: CapsuleUpdateData,
  getActor: () => Promise<BackendActor>,
  clearActor: () => void
): Promise<Capsule> {
  if (!capsuleId.trim()) {
    throw createServiceError('Capsule ID is required');
  }

  try {
    fatLogger.info(`Updating capsule: ${capsuleId}`, 'be');

    const authenticatedActor = await getActor();
    const capsuleResult = await authenticatedActor.capsules_update(capsuleId, updates);

    if ('Ok' in capsuleResult) {
      fatLogger.info(`Successfully updated capsule: ${capsuleId}`, 'be');
      return capsuleResult.Ok;
    } else {
      throw createServiceError(`Failed to update capsule: ${JSON.stringify(capsuleResult.Err)}`);
    }
  } catch (error) {
    fatLogger.error(`Failed to update capsule: ${capsuleId}`, 'be', { data: error as Error });

    const errorMessage = error instanceof Error ? error.message : String(error);

    // Handle authentication expiration
    if (
      errorMessage.includes('Invalid delegation') ||
      errorMessage.includes('expired') ||
      errorMessage.includes('401') ||
      errorMessage.includes('Not authenticated')
    ) {
      clearActor();
      throw createAuthenticationExpiredError('Your session has expired. Please sign in again.');
    }

    // Handle specific error types
    if (errorMessage.includes('NotFound') || errorMessage.includes('not found')) {
      throw createCapsuleError('notFound', `Capsule not found: ${capsuleId}`);
    }

    if (errorMessage.includes('Unauthorized') || errorMessage.includes('access denied')) {
      throw createCapsuleError('unauthorized', `No access to capsule: ${capsuleId}`);
    }

    throw createServiceError(`Failed to update capsule: ${errorMessage}`);
  }
}

/**
 * Delete a capsule
 * @param capsuleId - The capsule ID to delete
 * @param getActor - Function to get authenticated actor
 * @param clearActor - Function to clear cached actor
 * @returns Promise<void>
 * @throws CapsuleNotFoundError - When capsule doesn't exist
 * @throws CapsuleUnauthorizedError - When user lacks access
 * @throws CapsuleServiceError - For general service errors
 * @throws AuthenticationExpiredError - When authentication expires
 */
export async function deleteCapsule(
  capsuleId: string,
  getActor: () => Promise<BackendActor>,
  clearActor: () => void
): Promise<void> {
  if (!capsuleId.trim()) {
    throw createServiceError('Capsule ID is required');
  }

  try {
    fatLogger.info(`Deleting capsule: ${capsuleId}`, 'be');

    const authenticatedActor = await getActor();
    const result = await authenticatedActor.capsules_delete(capsuleId);

    if ('Ok' in result) {
      fatLogger.info(`Successfully deleted capsule: ${capsuleId}`, 'be');
      return;
    } else {
      throw createServiceError(`Failed to delete capsule: ${JSON.stringify(result.Err)}`);
    }
  } catch (error) {
    fatLogger.error(`Failed to delete capsule: ${capsuleId}`, 'be', { data: error as Error });

    const errorMessage = error instanceof Error ? error.message : String(error);

    // Handle authentication expiration
    if (
      errorMessage.includes('Invalid delegation') ||
      errorMessage.includes('expired') ||
      errorMessage.includes('401') ||
      errorMessage.includes('Not authenticated')
    ) {
      clearActor();
      throw createAuthenticationExpiredError('Your session has expired. Please sign in again.');
    }

    // Handle specific error types
    if (errorMessage.includes('NotFound') || errorMessage.includes('not found')) {
      throw createCapsuleError('notFound', `Capsule not found: ${capsuleId}`);
    }

    if (errorMessage.includes('Unauthorized') || errorMessage.includes('access denied')) {
      throw createCapsuleError('unauthorized', `No access to capsule: ${capsuleId}`);
    }

    throw createServiceError(`Failed to delete capsule: ${errorMessage}`);
  }
}

/**
 * List all capsules for the authenticated user
 * @param getActor - Function to get authenticated actor
 * @param clearActor - Function to clear cached actor
 * @returns Promise<CapsuleHeader[]> - List of capsule headers
 * @throws CapsuleServiceError - For general service errors
 * @throws AuthenticationExpiredError - When authentication expires
 */
export async function listCapsules(getActor: () => Promise<BackendActor>, clearActor: () => void): Promise<unknown[]> {
  try {
    fatLogger.info('Listing capsules for authenticated user', 'be');

    const authenticatedActor = await getActor();
    const capsules = await authenticatedActor.capsules_list();

    fatLogger.info(`Successfully listed ${capsules.length} capsules`, 'be');
    return capsules;
  } catch (error) {
    fatLogger.error('Failed to list capsules', 'be', { data: error as Error });

    const errorMessage = error instanceof Error ? error.message : String(error);

    // Handle authentication expiration
    if (
      errorMessage.includes('Invalid delegation') ||
      errorMessage.includes('expired') ||
      errorMessage.includes('401') ||
      errorMessage.includes('Not authenticated')
    ) {
      clearActor();
      throw createAuthenticationExpiredError('Your session has expired. Please sign in again.');
    }

    throw createServiceError(`Failed to list capsules: ${errorMessage}`);
  }
}

/**
 * Ensures a self-capsule exists for the authenticated user.
 * This function is idempotent - if the capsule already exists, it just returns it.
 * Used for auto-creation during sign-in flow.
 */
export async function ensureSelfCapsule(
  getActor: () => Promise<BackendActor>,
  clearActor: () => void
): Promise<Capsule> {
  try {
    fatLogger.info('Ensuring self-capsule exists', 'be');

    const actor = await getActor();

    // Try to create a self-capsule (subject = null means self-capsule)
    const capsuleResult = await actor.capsules_create([]);

    // Handle the Result type
    if ('Ok' in capsuleResult) {
      fatLogger.info('Self-capsule ensured successfully', 'be');
      return capsuleResult.Ok;
    } else {
      throw createServiceError(`Failed to create capsule: ${JSON.stringify(capsuleResult.Err)}`);
    }
  } catch (error) {
    fatLogger.error('Failed to ensure self-capsule:', 'be', {
      data: error instanceof Error ? error : undefined,
    });

    // Clear actor on authentication errors
    if (isAuthenticationError(error)) {
      clearActor();
      throw createAuthenticationExpiredError('Your session has expired. Please sign in again.');
    }

    throw error;
  }
}

/**
 * Ensures a self-capsule exists using a raw Identity object.
 * This is a convenience wrapper for the sign-in flow where we have raw Identity.
 * Used for auto-creation during sign-in flow.
 */
export async function ensureSelfCapsuleWithIdentity(identity: Identity): Promise<Capsule> {
  try {
    fatLogger.info('Ensuring self-capsule exists with raw identity', 'be');

    // Create actor with the provided identity
    const { backendActor } = await import('@/ic/backend');
    const actor = await backendActor(identity);

    // Try to create a self-capsule (subject = null means self-capsule)
    const capsuleResult = await actor.capsules_create([]);

    // Handle the Result type
    if ('Ok' in capsuleResult) {
      fatLogger.info('Self-capsule ensured successfully with raw identity', 'be');
      return capsuleResult.Ok;
    } else {
      throw createServiceError(`Failed to create capsule: ${JSON.stringify(capsuleResult.Err)}`);
    }
  } catch (error) {
    fatLogger.error('Failed to ensure self-capsule with raw identity:', 'be', {
      data: error instanceof Error ? error : undefined,
    });
    throw error;
  }
}
