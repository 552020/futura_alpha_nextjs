/**
 * SHARED SERVICE TYPES
 *
 * Common types used across all service modules to avoid duplication.
 */

// Base operation result type (used by all services)
export interface OperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Pagination and sorting (used by multiple services)
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FilterParams {
  [key: string]: unknown;
}

// Common query parameters
export interface QueryParams extends PaginationParams {
  sort?: SortParams;
  filters?: FilterParams;
}


