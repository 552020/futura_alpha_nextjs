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
export type { MemoryType, AssetType, ProcessingStatus } from '@/db/enums';

// Memory with galleries type for complex queries
export type MemoryWithGalleries = {
  id: string;
  type: 'image' | 'video' | 'document' | 'note' | 'audio';
  owner_id: string;
  title: string | null;
  description: string | null;
  url: string;
  created_at: string; // ISO string from PG
  updated_at: string | null;
  // aggregated
  galleries: { id: string; title: string }[];
};
