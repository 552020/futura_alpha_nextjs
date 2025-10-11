import { pgEnum } from 'drizzle-orm/pg-core';

// Storage Edge Enums
export const artifact_t = pgEnum('artifact_t', ['metadata', 'asset']);
export const memory_type_t = pgEnum('memory_type_t', ['image', 'video', 'note', 'document', 'audio']);
export const sync_t = pgEnum('sync_t', ['idle', 'migrating', 'failed']);

// Hosting preference enums
export const frontend_hosting_t = pgEnum('frontend_hosting_t', ['vercel', 'icp']);
export const backend_hosting_t = pgEnum('backend_hosting_t', ['vercel', 'icp']);
export const database_hosting_t = pgEnum('database_hosting_t', ['neon', 'icp']);
export const blob_hosting_t = pgEnum('blob_hosting_t', ['s3', 'vercel_blob', 'icp', 'arweave', 'ipfs', 'neon']);

// TypeScript types for hosting values (used in JSONB arrays)
export type BlobHosting = 's3' | 'vercel_blob' | 'icp' | 'arweave' | 'ipfs' | 'neon';
export type DatabaseHosting = 'neon' | 'icp';

/**
 * STORAGE PREFERENCE - User's preferred storage strategy
 *
 * This enum defines the user's preferred storage approach, which determines
 * the primary storage providers used for their memories and assets.
 *
 * PREFERENCES:
 * - neon: Neon database + Vercel Blob (centralized, reliable, easy)
 * - icp: ICP Canister (decentralized, Web3, user-controlled)
 * - dual: Both systems (redundancy, migration, hybrid approach)
 *
 * MAPPING TO STORAGE BACKENDS:
 * - neon preference → metadata in Neon, assets in Vercel Blob/S3
 * - icp preference → metadata in ICP, assets in ICP Storage
 * - dual preference → metadata in both, assets in multiple providers
 *
 * USAGE:
 * This preference is stored in the user's profile and used to determine
 * which storage_backend_t providers to use for new memories.
 */
export const storage_pref_t = pgEnum('storage_pref_t', ['neon', 'icp', 'dual']);

// Memory Assets Enums - for multiple optimized assets per memory
export const asset_type_t = pgEnum('asset_type_t', [
  'original',
  'display',
  'thumb',
  'placeholder',
  'poster',
  'waveform',
]);
export const processing_status_t = pgEnum('processing_status_t', [
  'pending',
  'processing',
  'completed',
  'skipped',
  'failed',
]);
/**
 * STORAGE BACKEND - Where assets are actually stored
 *
 * This enum defines all supported storage providers for memory assets.
 * Different providers are optimized for different use cases and user preferences.
 *
 * PROVIDERS:
 * - s3: AWS S3 (large files, high performance, enterprise)
 * - vercel_blob: Vercel Blob Storage (medium files, CDN, easy integration)
 * - icp: ICP Canister Storage (decentralized, user preference, Web3)
 * - arweave: Arweave (permanent storage, immutable, pay-once)
 * - ipfs: IPFS (decentralized, content-addressed, peer-to-peer)
 * - neon: Neon database (small files, metadata, fast access)
 *
 * SELECTION LOGIC:
 * - User preference (storage_pref_t) determines primary strategy
 * - Asset type and size determine optimal provider
 * - Dual storage for redundancy and performance
 *
 * EXAMPLES:
 * - Original 20MB photo → s3 or vercel_blob
 * - Thumbnail 50KB → neon (stored in database)
 * - Waveform data → arweave (permanent, immutable)
 * - User prefers ICP → icp for all assets
 */
export const storage_backend_t = pgEnum('storage_backend_t', ['s3', 'vercel_blob', 'icp', 'arweave', 'ipfs', 'neon']);

// Constants for application logic
export const MEMORY_TYPES = ['image', 'document', 'note', 'video', 'audio'] as const;
export const _ACCESS_LEVELS = ['read', 'write'] as const;
export const MEMBER_ROLES = ['admin', 'member'] as const;

// Types of relationships between users (e.g., brother, aunt, friend)
export const RELATIONSHIP_TYPES = ['friend', 'colleague', 'acquaintance', 'family', 'other'] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

// Types of sharing relationships (based on trust/proximity)
export const _SHARING_RELATIONSHIP_TYPES = [
  'close_family', // e.g., parents, siblings
  'family', // extended family
  'partner', // romantic partner
  'close_friend', // trusted friends
  'friend', // regular friends
  'colleague', // work relationships
  'acquaintance', // casual relationships
] as const;
export type SharingRelationshipType = (typeof _SHARING_RELATIONSHIP_TYPES)[number];

export const RELATIONSHIP_STATUS = ['pending', 'accepted', 'declined'] as const;
export type RelationshipStatus = (typeof RELATIONSHIP_STATUS)[number];

export const FAMILY_RELATIONSHIP_TYPES = [
  'parent',
  'child',
  'sibling',
  'cousin',
  'spouse',
  'grandparent',
  'grandchild',
  'aunt_uncle',
  'niece_nephew',
  'extended_family',
  'other',
] as const;
export type FamilyRelationshipType = (typeof FAMILY_RELATIONSHIP_TYPES)[number];

// Enum for primary relationships
export const PRIMARY_RELATIONSHIP_ROLES = ['son', 'daughter', 'father', 'mother', 'sibling', 'spouse'] as const;
export type PrimaryRelationshipRole = (typeof PRIMARY_RELATIONSHIP_ROLES)[number];

// Shared types for file metadata
export type CommonFileMetadata = {
  size: number;
  mimeType: string;
  originalName: string;
  uploadedAt: string;
  dateOfMemory?: string;
  format?: string; // File format (e.g., "JPEG", "PNG", "PDF")
};

export type ImageMetadata = CommonFileMetadata & {
  dimensions?: { width: number; height: number };
};

// Type for flexible user-defined metadata
export type CustomMetadata = {
  [key: string]: string | number | boolean | null;
};

// Type helpers for the enums
export type MemoryType = (typeof MEMORY_TYPES)[number];
export type AccessLevel = (typeof _ACCESS_LEVELS)[number];
export type MemberRole = (typeof MEMBER_ROLES)[number];

// Asset type helpers
export type AssetType = (typeof asset_type_t.enumValues)[number];
export type ProcessingStatus = (typeof processing_status_t.enumValues)[number];
export type StorageBackend = (typeof storage_backend_t.enumValues)[number];