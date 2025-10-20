/**
 * Storage Edge Service Layer - Pure Functions
 *
 * This module provides pure functions for storage edge operations.
 * All functions are stateless and can be easily tested and composed.
 */

// Storage edge operations
export {
  createStorageEdge,
  createStorageEdges,
  getStorageEdges,
  deleteStorageEdges,
  createICPStorageEdges,
  type CreateStorageEdgeParams,
  type StorageEdgeOperationResult,
  type StorageEdgeQueryParams,
} from './storage-edge-operations';

export { getStorageStatusForMemory } from './storage-status';
