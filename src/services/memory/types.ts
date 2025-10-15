/**
 * Shared types and interfaces for memory operations
 */

export interface OperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface SortParams {
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface FilterParams {
  includeDeleted?: boolean;
}

// Re-export commonly used types from schema
export type { MemoryType, AssetType, ProcessingStatus } from '@/db';
