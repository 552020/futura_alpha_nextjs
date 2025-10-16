import { db } from '@/db/db';
import { users, allUsers } from '@/db/tables';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
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
 * Check if user exists by email
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
