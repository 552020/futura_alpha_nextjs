/**
 * USER MANAGEMENT UTILITIES
 *
 * This module handles user creation and management operations.
 * These functions are schema-agnostic and work with the user system.
 *
 * USAGE:
 * - Create temporary users for uploads
 * - Handle user creation errors gracefully
 * - Manage user-related operations
 * - Handle user authentication for uploads
 */

import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db/db';
import { allUsers, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';

import { fatLogger } from '@/lib/logger';
/**
 * Helper function to get allUserId for both authenticated and temporary users
 * This centralizes the user lookup logic used across multiple endpoints
 */
export async function getAllUserId(request: NextRequest): Promise<{ allUserId: string; error?: NextResponse }> {
  const session = await auth();

  if (session?.user?.id) {
    // Handle authenticated user
    // First get the user from users table
    const [permanentUser] = await db.select().from(users).where(eq(users.id, session.user.id));

    if (!permanentUser) {
      fatLogger.error('Permanent user not found', 'be');
      return { allUserId: '', error: NextResponse.json({ error: 'User not found' }, { status: 404 }) };
    }

    // Then get their allUserId
    const [allUserRecord] = await db.select().from(allUsers).where(eq(allUsers.userId, permanentUser.id));

    if (!allUserRecord) {
      fatLogger.error('No all_users record found for permanent user', 'be');
      return { allUserId: '', error: NextResponse.json({ error: 'User record not found' }, { status: 404 }) };
    }

    return { allUserId: allUserRecord.id };
  } else {
    // Handle temporary user - check for provided allUserId in form data
    try {
      const formData = await request.formData();
      const providedAllUserId = formData.get('userId') as string;

      if (providedAllUserId) {
        fatLogger.info('Using provided allUserId for temporary user', 'be');
        // For temporary users, directly check the allUsers table
        const [tempUser] = await db.select().from(allUsers).where(eq(allUsers.id, providedAllUserId));
        fatLogger.info('Found temporary user', 'be', {
          allUserId: tempUser?.id,
          type: tempUser?.type,
        });

        if (!tempUser || tempUser.type !== 'temporary') {
          fatLogger.error('Valid temporary user not found', 'be');
          return { allUserId: '', error: NextResponse.json({ error: 'Invalid temporary user' }, { status: 404 }) };
        }

        return { allUserId: tempUser.id };
      } else {
        fatLogger.error('No valid user identification provided', 'be');
        return { allUserId: '', error: NextResponse.json({ error: 'User identification required' }, { status: 401 }) };
      }
    } catch {
      // If form parsing fails, it might be a JSON request - return auth error
      fatLogger.error('No valid user identification provided', 'be');
      return { allUserId: '', error: NextResponse.json({ error: 'User identification required' }, { status: 401 }) };
    }
  }
}

/**
 * Get user ID for uploads (authenticated or temporary)
 * This function handles the complex logic of determining which user to use for uploads
 */
export async function getUserIdForUpload(params: {
  providedUserId?: string;
}): Promise<{ allUserId: string; error: NextResponse | null }> {
  const { providedUserId } = params;

  try {
    const session = await auth();
    fatLogger.info('Auth session data', 'be', {
      hasUser: !!session?.user,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
    });

    if (session?.user?.id) {
      fatLogger.info('Looking up authenticated user in users table', 'be');
      // First get the user from users table
      const [permanentUser] = await db.select().from(users).where(eq(users.id, session.user.id));
      fatLogger.info('Found permanent user', 'be', { userId: permanentUser?.id });

      if (!permanentUser) {
        fatLogger.error('Permanent user not found in database', 'be');
        fatLogger.error('Session user ID', 'be', { userId: session.user.id });
        fatLogger.error('User email', 'be', { email: session.user.email });

        // Try to create the user if they don't exist
        try {
          fatLogger.info('Attempting to create user from session data', 'be');
          const [newUser] = await db
            .insert(users)
            .values({
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.name || '',
              image: session.user.image || null,
            })
            .returning();

          if (newUser) {
            fatLogger.info('Successfully created user from session', 'be', {
              userId: newUser.id,
            });
            // Create corresponding all_users entry
            const [allUserRecord] = await db
              .insert(allUsers)
              .values({
                type: 'user',
                userId: newUser.id,
                // Add any other required fields with default values
              })
              .returning();

            if (allUserRecord) {
              return { allUserId: allUserRecord.id, error: null };
            }
          }
        } catch (createError) {
          fatLogger.error('Failed to create user', 'be', { error: createError });
        }

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
      }

      // Then get their allUserId
      const [allUserRecord] = await db.select().from(allUsers).where(eq(allUsers.userId, permanentUser.id));
      fatLogger.info('Found all_users record', 'be', { allUserId: allUserRecord?.id });

      if (!allUserRecord) {
        fatLogger.error('No all_users record found for permanent user', 'be');
        return {
          allUserId: '',
          error: NextResponse.json({ error: 'User record not found' }, { status: 404 }),
        };
      }

      return { allUserId: allUserRecord.id, error: null };
    } else if (providedUserId) {
      fatLogger.info('Using provided allUserId for temporary user', 'be');
      // For temporary users, directly check the allUsers table
      const [tempUser] = await db.select().from(allUsers).where(eq(allUsers.id, providedUserId));
      fatLogger.info('Found temporary user', 'be', {
        allUserId: tempUser?.id,
        type: tempUser?.type,
      });

      if (!tempUser || tempUser.type !== 'temporary') {
        fatLogger.error('Valid temporary user not found', 'be');
        return {
          allUserId: '',
          error: NextResponse.json({ error: 'Invalid temporary user' }, { status: 404 }),
        };
      }

      return { allUserId: tempUser.id, error: null };
    } else {
      fatLogger.error('No valid user identification provided', 'be');
      return {
        allUserId: '',
        error: NextResponse.json({ error: 'User identification required' }, { status: 401 }),
      };
    }
  } catch (error) {
    fatLogger.error('Error getting user ID for upload', 'be', { error });
    return {
      allUserId: '',
      error: NextResponse.json(
        { error: 'Failed to get user ID', details: error instanceof Error ? error.message : String(error) },
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
  createTemporaryUserBase: (role: 'inviter' | 'invitee') => Promise<{ allUser: { id: string } }>
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
