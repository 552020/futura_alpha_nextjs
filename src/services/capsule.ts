import { logger } from '@/lib/logger';
import type { CapsuleInfo, Capsule } from '@/ic/declarations/backend/backend.did';
import type { BackendActor } from '@/ic/backend';

/**
 * Custom error types for capsule operations
 */
export function createCapsuleNotFoundError(message: string = 'Capsule not found'): Error {
  const error = new Error(message);
  error.name = 'CapsuleNotFoundError';
  return error;
}

export function createCapsuleUnauthorizedError(message: string = 'Unauthorized access to capsule'): Error {
  const error = new Error(message);
  error.name = 'CapsuleUnauthorizedError';
  return error;
}

export function createCapsuleServiceError(message: string = 'Capsule service error'): Error {
  const error = new Error(message);
  error.name = 'CapsuleServiceError';
  return error;
}

export function createAuthenticationExpiredError(message: string = 'Authentication expired'): Error {
  const error = new Error(message);
  error.name = 'AuthenticationExpiredError';
  return error;
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
    logger.info('Getting capsule info for authenticated user');

    const authenticatedActor = await getActor();
    const capsuleResult = await authenticatedActor.capsules_read_basic([]);

    if ('Ok' in capsuleResult) {
      logger.info('Successfully retrieved capsule info');
      return capsuleResult.Ok;
    } else {
      logger.info('No capsule found for user');
      return null;
    }
  } catch (error) {
    logger.error('Failed to get capsule info', undefined, { data: error as Error });

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

    throw createCapsuleServiceError(`Failed to get capsule info: ${errorMessage}`);
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
    throw createCapsuleServiceError('Capsule ID is required');
  }

  try {
    logger.info(`Reading capsule: ${capsuleId}`);

    const authenticatedActor = await getActor();
    const capsuleResult = await authenticatedActor.capsules_read_full([capsuleId.trim()]);

    if ('Ok' in capsuleResult) {
      logger.info(`Successfully read capsule: ${capsuleId}`);
      return capsuleResult.Ok;
    } else {
      logger.info(`Capsule not found or no access: ${capsuleId}`);
      return null;
    }
  } catch (error) {
    logger.error(`Failed to read capsule: ${capsuleId}`, undefined, { data: error as Error });

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
      throw createCapsuleNotFoundError(`Capsule not found: ${capsuleId}`);
    }

    if (errorMessage.includes('Unauthorized') || errorMessage.includes('access denied')) {
      throw createCapsuleUnauthorizedError(`No access to capsule: ${capsuleId}`);
    }

    throw createCapsuleServiceError(`Failed to read capsule: ${errorMessage}`);
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
  subject: unknown,
  getActor: () => Promise<BackendActor>,
  clearActor: () => void
): Promise<Capsule> {
  try {
    logger.info('Creating new capsule');

    const authenticatedActor = await getActor();
    const capsuleResult = await authenticatedActor.capsules_create(subject ? [subject] : []);

    if ('Ok' in capsuleResult) {
      logger.info('Successfully created capsule');
      return capsuleResult.Ok;
    } else {
      throw createCapsuleServiceError(`Failed to create capsule: ${JSON.stringify(capsuleResult.Err)}`);
    }
  } catch (error) {
    logger.error('Failed to create capsule', undefined, { data: error as Error });

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

    throw createCapsuleServiceError(`Failed to create capsule: ${errorMessage}`);
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
  updates: any,
  getActor: () => Promise<BackendActor>,
  clearActor: () => void
): Promise<Capsule> {
  if (!capsuleId.trim()) {
    throw createCapsuleServiceError('Capsule ID is required');
  }

  try {
    logger.info(`Updating capsule: ${capsuleId}`);

    const authenticatedActor = await getActor();
    const capsuleResult = await authenticatedActor.capsules_update(capsuleId, updates);

    if ('Ok' in capsuleResult) {
      logger.info(`Successfully updated capsule: ${capsuleId}`);
      return capsuleResult.Ok;
    } else {
      throw createCapsuleServiceError(`Failed to update capsule: ${JSON.stringify(capsuleResult.Err)}`);
    }
  } catch (error) {
    logger.error(`Failed to update capsule: ${capsuleId}`, undefined, { data: error as Error });

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
      throw createCapsuleNotFoundError(`Capsule not found: ${capsuleId}`);
    }

    if (errorMessage.includes('Unauthorized') || errorMessage.includes('access denied')) {
      throw createCapsuleUnauthorizedError(`No access to capsule: ${capsuleId}`);
    }

    throw createCapsuleServiceError(`Failed to update capsule: ${errorMessage}`);
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
    throw createCapsuleServiceError('Capsule ID is required');
  }

  try {
    logger.info(`Deleting capsule: ${capsuleId}`);

    const authenticatedActor = await getActor();
    const result = await authenticatedActor.capsules_delete(capsuleId);

    if ('Ok' in result) {
      logger.info(`Successfully deleted capsule: ${capsuleId}`);
      return;
    } else {
      throw createCapsuleServiceError(`Failed to delete capsule: ${JSON.stringify(result.Err)}`);
    }
  } catch (error) {
    logger.error(`Failed to delete capsule: ${capsuleId}`, undefined, { data: error as Error });

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
      throw createCapsuleNotFoundError(`Capsule not found: ${capsuleId}`);
    }

    if (errorMessage.includes('Unauthorized') || errorMessage.includes('access denied')) {
      throw createCapsuleUnauthorizedError(`No access to capsule: ${capsuleId}`);
    }

    throw createCapsuleServiceError(`Failed to delete capsule: ${errorMessage}`);
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
export async function listCapsules(getActor: () => Promise<any>, clearActor: () => void): Promise<any[]> {
  try {
    logger.info('Listing capsules for authenticated user');

    const authenticatedActor = await getActor();
    const capsules = await authenticatedActor.capsules_list();

    logger.info(`Successfully listed ${capsules.length} capsules`);
    return capsules;
  } catch (error) {
    logger.error('Failed to list capsules', undefined, { data: error as Error });

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

    throw createCapsuleServiceError(`Failed to list capsules: ${errorMessage}`);
  }
}
