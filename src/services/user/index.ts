/**
 * User Service Layer - Pure Functions
 *
 * This module provides pure functions for user operations.
 * All functions are stateless and can be easily tested and composed.
 */

// User operations
export {
  createUserRecord,
  createAllUserRecord,
  getUserRecord,
  getAllUserRecord,
  getAllUserRecordById,
  createUserWithAllUser,
  getAuthenticatedUserId,
  getTemporaryUserId,
} from './user-operations';

// Shared types
export {
  type UserOperationResult,
  type CreateUserParams,
  type CreateAllUserParams,
  type UserQueryParams,
  type DBUser,
  type NewDBUser,
  type DBAllUser,
  type NewDBAllUser,
} from './types';
