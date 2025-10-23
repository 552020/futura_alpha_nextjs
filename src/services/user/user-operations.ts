import { db } from '@/db/db';
import { users, allUsers, temporaryUsers } from '@/db/tables';
import { eq } from 'drizzle-orm';
import { randomUUID, randomBytes } from 'crypto';
import { hash } from 'bcrypt';
import { fatLogger } from '@/lib/logger';
import type { UserOperationResult, CreateUserParams, CreateAllUserParams } from './types';

/**
 * Create a new user record in the database
 */
export const createUserRecord = async (params: CreateUserParams): Promise<UserOperationResult> => {
  try {
    const [createdUser] = await db
      .insert(users)
      .values({
        id: params.id,
        email: params.email,
        name: params.name,
        image: params.image || null,
      })
      .returning();

    fatLogger.info('Created user', 'be', {
      operation: 'create_user',
      userId: createdUser.id,
      email: createdUser.email,
    });

    return { success: true, data: createdUser };
  } catch (error) {
    fatLogger.error('Failed to create user', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'create_user',
      userId: params.id,
      email: params.email,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Create a new all_user record in the database
 */
export const createAllUserRecord = async (params: CreateAllUserParams): Promise<UserOperationResult> => {
  try {
    const newUserId = randomUUID();
    const [createdAllUser] = await db
      .insert(allUsers)
      .values({
        id: newUserId,
        type: params.type,
        userId: params.userId,
        createdAt: new Date(),
      })
      .returning();

    fatLogger.info('Created all_user record', 'be', {
      operation: 'create_all_user',
      allUserId: createdAllUser.id,
      userId: params.userId,
      type: params.type,
    });

    return { success: true, data: createdAllUser };
  } catch (error) {
    fatLogger.error('Failed to create all_user record', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'create_all_user',
      userId: params.userId,
      type: params.type,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Get user record by ID
 */
export const getUserRecord = async (userId: string): Promise<UserOperationResult> => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    return { success: true, data: user };
  } catch (error) {
    fatLogger.error('Failed to get user', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'get_user',
      userId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Get all_user record by user ID
 */
export const getAllUserRecord = async (userId: string): Promise<UserOperationResult> => {
  try {
    const allUser = await db.query.allUsers.findFirst({
      where: eq(allUsers.userId, userId),
    });

    if (!allUser) {
      return { success: false, error: 'All user record not found' };
    }

    return { success: true, data: allUser };
  } catch (error) {
    fatLogger.error('Failed to get all_user record', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'get_all_user',
      userId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Get all_user record by all_user ID
 */
export const getAllUserRecordById = async (allUserId: string): Promise<UserOperationResult> => {
  try {
    const allUser = await db.query.allUsers.findFirst({
      where: eq(allUsers.id, allUserId),
    });

    if (!allUser) {
      return { success: false, error: 'All user record not found' };
    }

    return { success: true, data: allUser };
  } catch (error) {
    fatLogger.error('Failed to get all_user record by ID', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'get_all_user_by_id',
      allUserId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Create user and all_user records in a single operation
 * This is a higher-level function that combines user and all_user creation
 */
export const createUserWithAllUser = async (params: {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  type?: 'user' | 'temporary';
}): Promise<UserOperationResult<{ user: unknown; allUser: unknown }>> => {
  try {
    // Create user record
    const userResult = await createUserRecord({
      id: params.id,
      email: params.email,
      name: params.name,
      image: params.image,
    });

    if (!userResult.success || !userResult.data) {
      return { success: false, error: userResult.error || 'Failed to create user' };
    }

    // Create all_user record
    const allUserResult = await createAllUserRecord({
      type: params.type || 'user',
      userId: params.id,
    });

    if (!allUserResult.success || !allUserResult.data) {
      // If all_user creation fails, we should clean up the user record
      fatLogger.warn('Failed to create all_user record, user record was created', 'be', {
        operation: 'create_user_with_all_user',
        userId: params.id,
        error: allUserResult.error,
      });
      return { success: false, error: allUserResult.error || 'Failed to create all_user record' };
    }

    const allUser = allUserResult.data as { id: string };
    fatLogger.info('Created user with all_user record', 'be', {
      operation: 'create_user_with_all_user',
      userId: params.id,
      allUserId: allUser.id,
    });

    return {
      success: true,
      data: {
        user: userResult.data,
        allUser: allUserResult.data,
      },
    };
  } catch (error) {
    fatLogger.error('Failed to create user with all_user record', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'create_user_with_all_user',
      userId: params.id,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Get user ID for authenticated user (session-based)
 * This function handles the complex logic of getting the allUserId for authenticated users
 */
export const getAuthenticatedUserId = async (sessionUserId: string): Promise<UserOperationResult<string>> => {
  try {
    // First get the user from users table
    const userResult = await getUserRecord(sessionUserId);
    if (!userResult.success || !userResult.data) {
      return { success: false, error: 'User not found' };
    }

    // Then get their allUserId
    const allUserResult = await getAllUserRecord(sessionUserId);
    if (!allUserResult.success || !allUserResult.data) {
      return { success: false, error: 'User record not found' };
    }

    const allUser = allUserResult.data as { id: string };
    return { success: true, data: allUser.id };
  } catch (error) {
    fatLogger.error('Failed to get authenticated user ID', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'get_authenticated_user_id',
      sessionUserId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Create a temporary user for onboarding
 * This creates both a temporaryUser record and an allUser record
 */
export const createTemporaryUser = async (params: {
  name?: string;
  email?: string;
}): Promise<
  UserOperationResult<{ temporaryUser: unknown; allUser: unknown; tempUserId: string; allUserId: string }>
> => {
  try {
    const tempUserId = `temp-${randomUUID()}`;
    const allUserId = randomUUID();

    // Create temporary user record
    const [createdTemporaryUser] = await db
      .insert(temporaryUsers)
      .values({
        id: tempUserId,
        name: params.name || 'Temporary User',
        email: params.email || 'temp@example.com',
        secureCode: randomBytes(16).toString('hex'),
        secureCodeExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        role: 'invitee',
        registrationStatus: 'pending',
      })
      .returning();

    // Create allUser record
    const [createdAllUser] = await db
      .insert(allUsers)
      .values({
        id: allUserId,
        type: 'temporary',
        temporaryUserId: tempUserId,
        createdAt: new Date(),
      })
      .returning();

    fatLogger.info('Created temporary user', 'be', {
      operation: 'create_temporary_user',
      tempUserId,
      allUserId,
      name: params.name,
      email: params.email,
    });

    return {
      success: true,
      data: {
        temporaryUser: createdTemporaryUser,
        allUser: createdAllUser,
        tempUserId,
        allUserId,
      },
    };
  } catch (error) {
    fatLogger.error('Failed to create temporary user', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'create_temporary_user',
      name: params.name,
      email: params.email,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Update user information (handles both temporary and permanent users)
 */
export const updateUser = async (params: {
  allUserId: string;
  name: string;
  email: string;
}): Promise<UserOperationResult<{ user: unknown; allUser: unknown }>> => {
  try {
    // First, get the allUser record
    const allUserResult = await getAllUserRecordById(params.allUserId);
    if (!allUserResult.success || !allUserResult.data) {
      return { success: false, error: 'User not found' };
    }

    const allUser = allUserResult.data as { type: string; temporaryUserId?: string; userId?: string };

    if (allUser.type === 'temporary') {
      // Handle case where temporaryUserId is missing (old broken records)
      if (!allUser.temporaryUserId) {
        fatLogger.warn('temporaryUserId is missing from allUser - this is an old broken record', 'be', {
          operation: 'update_user',
          allUserId: params.allUserId,
        });

        // Try to find the temporary user by the userId field (old structure)
        if (allUser.userId) {
          const tempUser = await db.query.temporaryUsers.findFirst({
            where: eq(temporaryUsers.id, allUser.userId),
          });

          if (tempUser) {
            const [updatedTemporaryUser] = await db
              .update(temporaryUsers)
              .set({
                name: params.name,
                email: params.email,
                updatedAt: new Date(),
              })
              .where(eq(temporaryUsers.id, allUser.userId))
              .returning();

            fatLogger.info('Updated temporary user (legacy record)', 'be', {
              operation: 'update_user',
              tempUserId: updatedTemporaryUser.id,
              name: updatedTemporaryUser.name,
              email: updatedTemporaryUser.email,
            });

            return {
              success: true,
              data: {
                user: updatedTemporaryUser,
                allUser,
              },
            };
          }
        }

        return { success: false, error: 'Invalid user data - missing temporaryUserId' };
      }

      // Update temporary user
      const [updatedTemporaryUser] = await db
        .update(temporaryUsers)
        .set({
          name: params.name,
          email: params.email,
          updatedAt: new Date(),
        })
        .where(eq(temporaryUsers.id, allUser.temporaryUserId))
        .returning();

      fatLogger.info('Updated temporary user', 'be', {
        operation: 'update_user',
        tempUserId: updatedTemporaryUser.id,
        name: updatedTemporaryUser.name,
        email: updatedTemporaryUser.email,
      });

      return {
        success: true,
        data: {
          user: updatedTemporaryUser,
          allUser,
        },
      };
    } else {
      // Update permanent user
      if (!allUser.userId) {
        return { success: false, error: 'Invalid user data - missing userId' };
      }

      const [updatedUser] = await db
        .update(users)
        .set({
          name: params.name,
          email: params.email,
          updatedAt: new Date(),
        })
        .where(eq(users.id, allUser.userId))
        .returning();

      fatLogger.info('Updated permanent user', 'be', {
        operation: 'update_user',
        userId: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
      });

      return {
        success: true,
        data: {
          user: updatedUser,
          allUser,
        },
      };
    }
  } catch (error) {
    fatLogger.error('Failed to update user', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'update_user',
      allUserId: params.allUserId,
      name: params.name,
      email: params.email,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Get user by ID or email
 */
export const getUserByIdOrEmail = async (params: {
  id?: string;
  email?: string;
}): Promise<UserOperationResult<{ user: unknown; allUser: unknown }>> => {
  try {
    if (params.email) {
      // Search by email
      const user = await db.query.users.findFirst({
        where: eq(users.email, params.email),
      });

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Find corresponding allUsers entry
      const allUser = await db.query.allUsers.findFirst({
        where: eq(allUsers.userId, user.id),
      });

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            username: user.username,
            userType: user.userType,
            role: user.role,
            plan: user.plan,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          },
          allUser: allUser
            ? {
                id: allUser.id,
                type: allUser.type,
                userId: allUser.userId,
                createdAt: allUser.createdAt,
              }
            : null,
        },
      };
    } else if (params.id) {
      // Search by allUser ID
      const allUser = await db.query.allUsers.findFirst({
        where: eq(allUsers.id, params.id),
      });

      if (!allUser) {
        return { success: false, error: 'User not found' };
      }

      if (allUser.type === 'temporary') {
        // Get temporary user
        if (!allUser.temporaryUserId) {
          return { success: false, error: 'Invalid temporary user data' };
        }

        const tempUser = await db.query.temporaryUsers.findFirst({
          where: eq(temporaryUsers.id, allUser.temporaryUserId),
        });

        if (!tempUser) {
          return { success: false, error: 'Temporary user not found' };
        }

        return {
          success: true,
          data: {
            user: tempUser,
            allUser,
          },
        };
      } else {
        // Get permanent user
        if (!allUser.userId) {
          return { success: false, error: 'Invalid user data' };
        }

        const user = await db.query.users.findFirst({
          where: eq(users.id, allUser.userId),
        });

        if (!user) {
          return { success: false, error: 'User not found' };
        }

        return {
          success: true,
          data: {
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              image: user.image,
              username: user.username,
              userType: user.userType,
              role: user.role,
              plan: user.plan,
              createdAt: user.createdAt,
              updatedAt: user.updatedAt,
            },
            allUser,
          },
        };
      }
    } else {
      return { success: false, error: 'Either id or email must be provided' };
    }
  } catch (error) {
    fatLogger.error('Failed to get user by ID or email', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'get_user_by_id_or_email',
      id: params.id,
      email: params.email,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Get user ID for temporary user
 * This function validates and returns the allUserId for temporary users
 */
export const getTemporaryUserId = async (providedAllUserId: string): Promise<UserOperationResult<string>> => {
  try {
    const allUserResult = await getAllUserRecordById(providedAllUserId);
    if (!allUserResult.success || !allUserResult.data) {
      return { success: false, error: 'Invalid temporary user' };
    }

    const allUser = allUserResult.data as { type: string; id: string };
    if (allUser.type !== 'temporary') {
      return { success: false, error: 'Invalid temporary user' };
    }

    return { success: true, data: allUser.id };
  } catch (error) {
    fatLogger.error('Failed to get temporary user ID', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'get_temporary_user_id',
      providedAllUserId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * WARNING: this returns ALL user data from the table
 *          -> Including password
 */
export const getUserByEmail = async (email: string): Promise<UserOperationResult> => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    return { success: true, data: user };
  } catch (error) {
    fatLogger.error('Failed to get user by email', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'get_user_by_email',
      email,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Create user with password (for signup)
 */
export const createUserWithPassword = async (params: {
  email: string;
  password: string;
  name?: string;
}): Promise<UserOperationResult<{ user: unknown; allUser: unknown }>> => {
  try {
    // Check if user already exists
    const existingUserResult = await getUserByEmail(params.email);
    if (existingUserResult.success) {
      return { success: false, error: 'User with this email already exists' };
    }

    // Hash password
    const hashedPassword = await hash(params.password, 12);
    const displayName = params.name || params.email.split('@')[0];

    // Create user with password
    const [newUser] = await db
      .insert(users)
      .values({
        email: params.email,
        password: hashedPassword,
        name: displayName,
        role: 'user',
      })
      .returning();

    // Create allUsers entry for consistency with OAuth flow
    const [newAllUser] = await db
      .insert(allUsers)
      .values({
        type: 'user',
        userId: newUser.id,
        temporaryUserId: null,
      })
      .returning();

    fatLogger.info('Created user with password and allUsers entry', 'be', {
      operation: 'create_user_with_password',
      userId: newUser.id,
      allUserId: newAllUser.id,
      email: newUser.email,
    });

    return {
      success: true,
      data: {
        user: newUser,
        allUser: newAllUser,
      },
    };
  } catch (error) {
    fatLogger.error('Failed to create user with password', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'create_user_with_password',
      email: params.email,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Delete the current user's account (hard delete with cascade)
 * This will delete all user data including memories, galleries, folders, etc.
 */
export const deleteAccount = async (userId: string): Promise<UserOperationResult> => {
  try {
    // Get the allUser record for this user
    const allUserRecord = await db.query.allUsers.findFirst({
      where: eq(allUsers.userId, userId),
    });

    if (!allUserRecord) {
      return {
        success: false,
        error: 'User record not found',
      };
    }

    fatLogger.info('Starting hard delete of account and all data', 'be', {
      operation: 'delete_account',
      userId,
      allUserId: allUserRecord.id,
    });

    // HARD DELETE: Delete the allUsers record first
    // This will trigger cascade deletes for all related data:
    // - memories (via ownerId)
    // - galleries (via ownerId)
    // - folders (via ownerId)
    // - storage edges (via allUserId)
    // - user settings (via userId)
    // - relationships (via allUserId)
    // - etc.
    await db.delete(allUsers).where(eq(allUsers.id, allUserRecord.id));

    // Delete the user record (this will also cascade to any user-specific data)
    await db.delete(users).where(eq(users.id, userId));

    fatLogger.info('Account and all data deleted successfully', 'be', {
      operation: 'delete_account',
      userId,
      allUserId: allUserRecord.id,
      deletedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error) {
    fatLogger.error('Failed to delete account', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'delete_account',
      userId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Soft delete the current user's account (for audit purposes)
 * This keeps the user record but marks it as deleted
 */
export const softDeleteAccount = async (userId: string): Promise<UserOperationResult> => {
  try {
    // Get the allUser record for this user
    const allUserRecord = await db.query.allUsers.findFirst({
      where: eq(allUsers.userId, userId),
    });

    if (!allUserRecord) {
      return {
        success: false,
        error: 'User record not found',
      };
    }

    // Soft delete the user by setting deleted_at timestamp
    const now = new Date();

    // Update the user record with deletedAt
    await db
      .update(users)
      .set({
        deletedAt: now,
        email: `deleted_${now.getTime()}_${users.email}`, // Anonymize email
        name: 'Deleted User',
        image: null,
      })
      .where(eq(users.id, userId));

    // Update the allUsers record
    await db
      .update(allUsers)
      .set({
        deletedAt: now,
      })
      .where(eq(allUsers.id, allUserRecord.id));

    fatLogger.info('Account soft deleted (for audit)', 'be', {
      operation: 'soft_delete_account',
      userId,
      allUserId: allUserRecord.id,
      deletedAt: now.toISOString(),
    });

    return { success: true };
  } catch (error) {
    fatLogger.error('Failed to soft delete account', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'soft_delete_account',
      userId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Get temporary user record by ID
 */
export const getTemporaryUserRecord = async (temporaryUserId: string): Promise<UserOperationResult> => {
  try {
    const temporaryUser = await db.query.temporaryUsers.findFirst({
      where: eq(temporaryUsers.id, temporaryUserId),
    });

    if (!temporaryUser) {
      return { success: false, error: 'Temporary user not found' };
    }

    return { success: true, data: temporaryUser };
  } catch (error) {
    fatLogger.error('Failed to get temporary user', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'get_temporary_user',
      temporaryUserId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Get user email by allUserId (works for both regular and temporary users)
 */
export const getUserEmailByAllUserId = async (allUserId: string): Promise<UserOperationResult<string>> => {
  try {
    // First get the allUsers record to determine type
    const allUserResult = await getAllUserRecordById(allUserId);
    if (!allUserResult.success || !allUserResult.data) {
      return { success: false, error: 'User not found' };
    }

    const allUser = allUserResult.data as typeof allUsers.$inferSelect;

    if (allUser.type === 'temporary' && allUser.temporaryUserId) {
      // Get email from temporaryUsers table
      const tempUserResult = await getTemporaryUserRecord(allUser.temporaryUserId);
      if (!tempUserResult.success || !tempUserResult.data) {
        return { success: false, error: 'Temporary user not found' };
      }
      const email = (tempUserResult.data as typeof temporaryUsers.$inferSelect).email;
      return { success: true, data: email || '' };
    } else if (allUser.type === 'user' && allUser.userId) {
      // Get email from users table
      const userResult = await getUserRecord(allUser.userId);
      if (!userResult.success || !userResult.data) {
        return { success: false, error: 'User not found' };
      }
      return { success: true, data: (userResult.data as { email: string }).email };
    }

    return { success: false, error: 'Invalid user type' };
  } catch (error) {
    fatLogger.error('Failed to get user email', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'get_user_email',
      allUserId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
