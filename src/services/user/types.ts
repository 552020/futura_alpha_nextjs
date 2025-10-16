/**
 * Shared types and interfaces for user operations
 */

export interface UserOperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CreateUserParams {
  id: string;
  email: string;
  name: string;
  image?: string | null;
}

export interface CreateAllUserParams {
  type: 'user' | 'temporary';
  userId: string;
}

export interface UserQueryParams {
  userId?: string;
  type?: 'user' | 'temporary';
}

// Re-export commonly used types from schema
export type { DBUser, NewDBUser, DBAllUser, NewDBAllUser } from '@/db/types';
