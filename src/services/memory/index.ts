/**
 * Memory Service Layer - Pure Functions
 *
 * This module provides pure functions for memory and asset operations.
 * All functions are stateless and can be easily tested and composed.
 */

// Asset operations
export {
  createAssetRecord,
  updateAssetRecord,
  upsertAssetRecord,
  getAssetRecord,
  getAssetRecords,
  getAssetRecordsByMemory,
  getAssetRecordByType,
  deleteAssetRecord,
  hardDeleteAssetRecord,
  createAssetRecords,
  type CreateAssetParams,
  type UpdateAssetParams,
  type UpsertAssetParams,
  type AssetQueryParams,
  type AssetOperationResult,
} from './asset-operations';

// Memory operations
export {
  createMemoryRecord,
  createMemoryWithAssets,
  updateMemoryRecord,
  getMemoryRecord,
  getMemoryRecords,
  getMemoryRecordsByOwner,
  getMemoryRecordsByFolder,
  getMemoryRecordsByType,
  getMemoryRecordsWithGalleries,
  deleteMemoryRecord,
  hardDeleteMemoryRecord,
  checkMemoryRecordAccess,
  resolveOwnerId,
  extractMemoryType,
  getMemoryRecordStats,
  type CreateMemoryParams,
  type UpdateMemoryParams,
  type MemoryQueryParams,
  type MemoryOperationResult,
} from './memory-operations';

// Shared types
export {
  type OperationResult,
  type PaginationParams,
  type SortParams,
  type FilterParams,
  type MemoryWithGalleries,
} from './types';
