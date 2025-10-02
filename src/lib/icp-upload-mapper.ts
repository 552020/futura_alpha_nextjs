/**
 * ICP Upload Mapper - Wire ⇄ Domain conversion
 *
 * Converts between ICP Candid wire types and domain types
 * Only this file should import wire types from backend.did
 */

import type { UploadFinishResult as Wire, StorageBackend as WireSB } from '@/ic/declarations/backend/backend.did';
import type { UploadResult, StorageBackend as DomainSB } from '@/types/upload';

// ============================================================================
// ENUM MAPPING - Canonical mapping table
// ============================================================================

/**
 * Maps Candid wire storage backend variants to domain strings
 * This is the single source of truth for backend enum conversion
 */
const toDomainSB = (w: WireSB): DomainSB =>
  'S3' in w
    ? 's3'
    : 'Icp' in w
      ? 'icp'
      : 'VercelBlob' in w
        ? 'vercel_blob'
        : 'Arweave' in w
          ? 'arweave'
          : 'Ipfs' in w
            ? 'ipfs'
            : ((): never => {
                throw new Error('unknown backend');
              })();

// ============================================================================
// WIRE TO DOMAIN CONVERSION
// ============================================================================

/**
 * Converts ICP wire types to domain types
 * Handles all type conversions: snake_case → camelCase, []|[T] → T|undefined, etc.
 */
export function wireToDomain(w: Wire): UploadResult {
  return {
    memoryId: w.memory_id, // snake_case → camelCase
    blobId: w.blob_id, // snake_case → camelCase
    remoteId: w.remote_id?.[0], // []|[T] → T|undefined
    size: w.size, // bigint → bigint
    checksumSha256: w.checksum_sha256?.[0] instanceof Uint8Array ? w.checksum_sha256[0] : undefined, // []|[Uint8Array] → Uint8Array|undefined
    storageBackend: toDomainSB(w.storage_backend), // Candid variant → string
    storageLocation: w.storage_location, // snake_case → camelCase
    uploadedAt: w.uploaded_at, // bigint → bigint
    expiresAt: w.expires_at?.[0], // []|[bigint] → bigint|undefined
  };
}

// ============================================================================
// DOMAIN TO WIRE CONVERSION (if needed)
// ============================================================================

/**
 * Maps domain storage backend strings to Candid wire variants
 * Used when sending data to ICP backend
 */
const toWireSB = (d: DomainSB): WireSB => {
  switch (d) {
    case 's3':
      return { S3: null };
    case 'icp':
      return { Icp: null };
    case 'vercel_blob':
      return { VercelBlob: null };
    case 'arweave':
      return { Arweave: null };
    case 'ipfs':
      return { Ipfs: null };
    case 'neon':
      // Neon is database-only, not sent to ICP
      throw new Error('Neon storage not supported on ICP wire');
    default:
      throw new Error(`Unknown domain storage backend: ${d}`);
  }
};

/**
 * Converts domain types to ICP wire types
 * Used when sending data to ICP backend (if needed)
 */
export function domainToWire(d: UploadResult): Wire {
  return {
    memory_id: d.memoryId, // camelCase → snake_case
    blob_id: d.blobId, // camelCase → snake_case
    remote_id: d.remoteId ? [d.remoteId] : [], // T|undefined → []|[T]
    size: d.size, // bigint → bigint
    checksum_sha256: d.checksumSha256 ? [d.checksumSha256] : [], // Uint8Array|undefined → []|[Uint8Array]
    storage_backend: toWireSB(d.storageBackend), // string → Candid variant
    storage_location: d.storageLocation, // camelCase → snake_case
    uploaded_at: d.uploadedAt, // bigint → bigint
    expires_at: d.expiresAt ? [d.expiresAt] : [], // bigint|undefined → []|[bigint]
  };
}
