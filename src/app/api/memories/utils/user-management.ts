/**
 * USER MANAGEMENT UTILITIES
 *
 * This module provides utility functions for user management operations.
 * All database operations are now handled through the service layer.
 *
 * ARCHITECTURE:
 * - Uses service layer functions instead of direct database operations
 * - Maintains the same interface for backward compatibility
 * - Provides proper error handling and logging
 *
 * USAGE:
 * - Create temporary users for uploads
 * - Handle user creation errors gracefully
 * - Manage user-related operations
 * - Handle user authentication for uploads
 */

import { NextResponse, NextRequest } from 'next/server';
import { auth } from '@/auth';
import {
  getAuthenticatedUserId,
  getTemporaryUserId,
  createUserWithAllUser,
} from '@/services/user';
import { fatLogger } from '@/lib/logger';
/**
 * Helper function to get allUserId for both authenticated and temporary users
 * This centralizes the user lookup logic used across multiple endpoints
 *
 * This function now uses the service layer instead of direct database operations.
 */
export async function getAllUserId(
  request: NextRequest
): Promise<{ allUserId: string; error?: NextResponse }> {
  try {
    const session = await auth();

    if (session?.user?.id) {
      fatLogger.info('Getting allUserId for authenticated user', 'be', {
        operation: 'get_all_user_id',
        sessionUserId: session.user.id,
      });

      // Use the service layer function
      const result = await getAuthenticatedUserId(session.user.id);

      if (!result.success) {
        fatLogger.error('Failed to get authenticated user ID', 'be', {
          operation: 'get_all_user_id',
          sessionUserId: session.user.id,
          error: result.error,
        });
        return {
          allUserId: '',
          error: NextResponse.json(
            { error: result.error || 'User not found' },
            { status: 404 }
          ),
        };
      }

      fatLogger.info(
        'Successfully got allUserId for authenticated user',
        'be',
        {
          operation: 'get_all_user_id',
          sessionUserId: session.user.id,
          allUserId: result.data,
        }
      );

      return { allUserId: result.data! };
    } else {
      // Handle temporary user - check for provided allUserId in form data
      try {
        const formData = await request.formData();
        const providedAllUserId = formData.get('userId') as string;

        if (providedAllUserId) {
          fatLogger.info('Getting allUserId for temporary user', 'be', {
            operation: 'get_all_user_id',
            providedAllUserId,
          });

          // Use the service layer function
          const result = await getTemporaryUserId(providedAllUserId);

          if (!result.success) {
            fatLogger.error('Failed to get temporary user ID', 'be', {
              operation: 'get_all_user_id',
              providedAllUserId,
              error: result.error,
            });
            return {
              allUserId: '',
              error: NextResponse.json(
                { error: result.error || 'Invalid temporary user' },
                { status: 404 }
              ),
            };
          }

          fatLogger.info(
            'Successfully got allUserId for temporary user',
            'be',
            {
              operation: 'get_all_user_id',
              providedAllUserId,
              allUserId: result.data,
            }
          );

          return { allUserId: result.data! };
        } else {
          fatLogger.error('No valid user identification provided', 'be', {
            operation: 'get_all_user_id',
          });
          return {
            allUserId: '',
            error: NextResponse.json(
              { error: 'User identification required' },
              { status: 401 }
            ),
          };
        }
      } catch {
        // If form parsing fails, it might be a JSON request - return auth error
        fatLogger.error('No valid user identification provided', 'be', {
          operation: 'get_all_user_id',
        });
        return {
          allUserId: '',
          error: NextResponse.json(
            { error: 'User identification required' },
            { status: 401 }
          ),
        };
      }
    }
  } catch (error) {
    fatLogger.error('Error in getAllUserId', 'be', {
      operation: 'get_all_user_id',
      error: error instanceof Error ? error : undefined,
    });
    return {
      allUserId: '',
      error: NextResponse.json(
        { error: 'Failed to get user ID' },
        { status: 500 }
      ),
    };
  }
}

/**
 * Get user ID for uploads (authenticated or temporary)
 * This function handles the complex logic of determining which user to use for uploads
 *
 * This function now uses the service layer instead of direct database operations.
 */
export async function getUserIdForUpload(params: {
  providedUserId?: string;
}): Promise<{ allUserId: string; error: NextResponse | null }> {
  const { providedUserId } = params;

  try {
    const session = await auth();
    fatLogger.info('Getting user ID for upload', 'be', {
      operation: 'get_user_id_for_upload',
      hasUser: !!session?.user,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      providedUserId,
    });

    if (session?.user?.id) {
      // Try to get existing user first
      const result = await getAuthenticatedUserId(session.user.id);

      if (result.success && result.data) {
        fatLogger.info('Found existing authenticated user', 'be', {
          operation: 'get_user_id_for_upload',
          sessionUserId: session.user.id,
          allUserId: result.data,
        });
        return { allUserId: result.data!, error: null };
      }

      // If user doesn't exist, try to create them
      fatLogger.info(
        'User not found, attempting to create from session data',
        'be',
        {
          operation: 'get_user_id_for_upload',
          sessionUserId: session.user.id,
        }
      );

      const createResult = await createUserWithAllUser({
        id: session.user.id,
        email: session.user.email || '',
        name: session.user.name || '',
        image: session.user.image || null,
        type: 'user',
      });

      if (createResult.success && createResult.data) {
        const allUser = createResult.data.allUser as { id: string };
        fatLogger.info('Successfully created user from session', 'be', {
          operation: 'get_user_id_for_upload',
          sessionUserId: session.user.id,
          allUserId: allUser.id,
        });
        return { allUserId: allUser.id, error: null };
      }

      fatLogger.error('Failed to create user from session', 'be', {
        operation: 'get_user_id_for_upload',
        sessionUserId: session.user.id,
        error: createResult.error,
      });

      return {
        allUserId: '',
        error: NextResponse.json(
          {
            error: 'User not found in database',
            details: 'The authenticated user does not exist in the database',
            sessionUserId: session.user.id,
          },
          { status: 404 }
        ),
      };
    } else if (providedUserId) {
      fatLogger.info('Getting user ID for temporary user', 'be', {
        operation: 'get_user_id_for_upload',
        providedUserId,
      });

      const result = await getTemporaryUserId(providedUserId);

      if (result.success && result.data) {
        fatLogger.info('Found temporary user', 'be', {
          operation: 'get_user_id_for_upload',
          providedUserId,
          allUserId: result.data,
        });
        return { allUserId: result.data!, error: null };
      }

      fatLogger.error('Invalid temporary user', 'be', {
        operation: 'get_user_id_for_upload',
        providedUserId,
        error: result.error,
      });

      return {
        allUserId: '',
        error: NextResponse.json(
          { error: result.error || 'Invalid temporary user' },
          { status: 404 }
        ),
      };
    } else {
      fatLogger.error('No valid user identification provided', 'be', {
        operation: 'get_user_id_for_upload',
      });
      return {
        allUserId: '',
        error: NextResponse.json(
          { error: 'User identification required' },
          { status: 401 }
        ),
      };
    }
  } catch (error) {
    fatLogger.error('Error in getUserIdForUpload', 'be', {
      operation: 'get_user_id_for_upload',
      error: error instanceof Error ? error : undefined,
    });
    return {
      allUserId: '',
      error: NextResponse.json(
        {
          error: 'Failed to get user ID',
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      ),
    };
  }
}

/**
 * Create temporary user with error handling
 * Returns user or error response
 */
export async function createTemporaryUserWithErrorHandling(
  createTemporaryUserBase: (
    role: 'inviter' | 'invitee'
  ) => Promise<{ allUser: { id: string } }>
): Promise<{ allUser: { id: string }; error: string | null }> {
  try {
    // fatLogger.info("👤 Creating temporary user...");
    const { allUser } = await createTemporaryUserBase('inviter');
    // fatLogger.info("✅ Temporary user created:", undefined, { userId: allUser.id });
    return { allUser, error: null };
  } catch (userError) {
    fatLogger.error('User creation error', 'be', { error: userError });
    return {
      allUser: { id: '' },
      error: userError instanceof Error ? userError.message : String(userError),
    };
  }
}
