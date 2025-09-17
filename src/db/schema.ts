import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  json,
  boolean,
  primaryKey,
  integer,
  uniqueIndex,
  foreignKey,
  index,
  uuid,
  bigint,
  check,
  //   IndexBuilder,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

// import type { AdapterAccount } from "@auth/core/adapters";
import type { AdapterAccount } from 'next-auth/adapters';

// Storage Edge Enums
export const artifact_t = pgEnum('artifact_t', ['metadata', 'asset']);
export const backend_t = pgEnum('backend_t', ['neon-db', 'vercel-blob', 'icp-canister']); // add more later
export const memory_type_t = pgEnum('memory_type_t', ['image', 'video', 'note', 'document', 'audio']);
export const sync_t = pgEnum('sync_t', ['idle', 'migrating', 'failed']);

// Storage location enum (for storage status fields)
export const storage_location_t = pgEnum('storage_location_t', ['neon-db', 'vercel-blob', 'icp-canister', 'aws-s3']);

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
export const processing_status_t = pgEnum('processing_status_t', ['pending', 'processing', 'completed', 'failed']);
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
// Users table - Core user data - required for auth.js
export const users = pgTable(
  'user',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()), // required for auth.js
    name: text('name'), // required for auth.js
    email: text('email').unique(), // required for auth.js
    emailVerified: timestamp('emailVerified', { mode: 'date' }), // required for auth.js
    image: text('image'), // required for auth.js
    // Our additional fields
    password: text('password'),
    username: text('username').unique(),
    parentId: text('parent_id'), // This links a child to their parent (can be NULL for root nodes)

    // New invitation-related fields:
    invitedByAllUserId: text('invited_by_all_user_id'), // No `.references()` here!
    invitedAt: timestamp('invited_at'), // When the invitation was sent
    registrationStatus: text('registration_status', {
      enum: ['pending', 'visited', 'initiated', 'completed', 'declined', 'expired'],
    })
      .default('pending')
      .notNull(), // Tracks signup progress

    // User type (what kind of user you are)
    userType: text('user_type', {
      enum: ['personal', 'professional'],
    })
      .default('personal')
      .notNull(),

    // Platform role (what permissions you have)
    role: text('role', {
      enum: ['user', 'moderator', 'admin', 'developer', 'superadmin'],
    })
      .default('user')
      .notNull(),

    // Payment-related
    plan: text('plan', {
      enum: ['free', 'premium'],
    })
      .default('free')
      .notNull(),

    premiumExpiresAt: timestamp('premium_expires_at', { mode: 'date' }),

    // Storage preferences
    // Using enum instead of booleans to avoid CHECK constraints and keep everything in Drizzle
    storagePreference: storage_pref_t('storage_preference').default('neon').notNull(),
    storagePrimaryStorage: backend_t('storage_primary_storage').default('neon-db').notNull(),

    // Timestamp fields
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    metadata: json('metadata')
      .$type<{
        bio?: string;
        location?: string;
        website?: string;
      }>()
      .default({}),
  },
  table => [
    // Define the foreign key to allUsers
    foreignKey({
      columns: [table.invitedByAllUserId],
      foreignColumns: [allUsers.id],
      name: 'user_invited_by_fk',
    }),
    // Self-referencing Foreign Key
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: 'user_parent_fk',
    }),
  ]
);

export const allUsers = pgTable(
  'all_user',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    type: text('type', { enum: ['user', 'temporary'] }).notNull(),

    userId: text('user_id'), // FK defined below
    temporaryUserId: text('temporary_user_id'), // FK defined below

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => [
    // Ensure exactly one of userId or temporaryUserId is set
    uniqueIndex('all_users_one_ref_guard').on(table.id) // dummy index anchor
      .where(sql`(CASE WHEN ${table.userId} IS NOT NULL THEN 1 ELSE 0 END +
                   CASE WHEN ${table.temporaryUserId} IS NOT NULL THEN 1 ELSE 0 END) = 1`),
  ]
);

export const temporaryUsers = pgTable(
  'temporary_user',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    name: text('name'),
    email: text('email'),
    secureCode: text('secure_code').notNull(),
    secureCodeExpiresAt: timestamp('secure_code_expires_at', { mode: 'date' }).notNull(),

    role: text('role', { enum: ['inviter', 'invitee'] }).notNull(),

    invitedByAllUserId: text('invited_by_all_user_id'), // FK declared later

    registrationStatus: text('registration_status', {
      enum: ['pending', 'visited', 'initiated', 'completed', 'declined', 'expired'],
    })
      .default('pending')
      .notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),

    metadata: json('metadata')
      .$type<{
        notes?: string;
        location?: string;
        campaign?: string;
      }>()
      .default({}),
  },
  (table): [ReturnType<typeof foreignKey>] => [
    foreignKey({
      columns: [table.invitedByAllUserId],
      foreignColumns: [allUsers.id],
      name: 'temporary_user_invited_by_fk',
    }),
  ]
);

// Auth.js required tables
export const accounts = pgTable(
  'account',
  {
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccount['type']>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  account => [
    // ✅ EXISTING: Composite primary key already enforces uniqueness
    // This prevents the same II principal from being linked to multiple users
    primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),

    // 🚀 PERFORMANCE: Index for common lookups
    // Find all accounts for a user by provider (e.g., "does user have II linked?")
    index('accounts_user_provider_idx').on(account.userId, account.provider),

    // 🚀 PERFORMANCE: Index for finding all accounts for a user
    // Useful for "show me all linked accounts" queries
    index('accounts_user_idx').on(account.userId),
  ]
);

// Auth.js required tables
export const sessions = pgTable('session', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable(
  'verificationToken',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  verificationToken => ({
    compositePk: primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  })
);

// required for webauthn by auth.js
export const authenticators = pgTable(
  'authenticator',
  {
    credentialID: text('credentialID').notNull().unique(),
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    providerAccountId: text('providerAccountId').notNull(),
    credentialPublicKey: text('credentialPublicKey').notNull(),
    counter: integer('counter').notNull(),
    credentialDeviceType: text('credentialDeviceType').notNull(),
    credentialBackedUp: boolean('credentialBackedUp').notNull(),
    transports: text('transports'),
  },
  authenticator => [
    {
      compositePK: primaryKey({
        columns: [authenticator.userId, authenticator.credentialID],
      }),
    },
  ]
);

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

// Application tables - OLD PER-TYPE TABLES REMOVED
// These have been replaced by the unified 'memories' table with 'memory_assets'
// and optional detail tables for type-specific data.

export const MEMORY_TYPES = ['image', 'document', 'note', 'video', 'audio'] as const;
export const ACCESS_LEVELS = ['read', 'write'] as const;
export const MEMBER_ROLES = ['admin', 'member'] as const;

/**
 * MEMORIES TABLE - Base memory storage with inheritance pattern
 *
 * This table stores all types of memories (images, videos, audio, documents) in a single
 * base table following an OOP inheritance pattern. Each memory can have multiple optimized assets
 * and type-specific extension data in separate tables.
 *
 * COMPOSITION:
 * - Basic info: id, title, description, takenAt, type
 * - Ownership: ownerId, ownerSecureCode, isPublic
 * - Organization: parentFolderId
 * - Tags: tags (for fast search and queries)
 * - Flexible metadata: metadata JSON field for additional data
 * - Timestamps: createdAt, updatedAt
 *
 * INHERITANCE PATTERN:
 * - Base table: Common fields for all memory types
 * - Extension tables: imageDetails, videoDetails, noteDetails, etc. for type-specific data
 * - 1:1 relationship between base memory and its extension table
 *
 * RELATED DATA (via relations):
 * - assets: MemoryAsset[] - Multiple optimized versions (original, display, thumb, etc.)
 * - extensions: Type-specific detail tables (imageDetails, videoDetails, etc.)
 * - shares: MemoryShare[] - Sharing permissions
 *
 * USAGE EXAMPLES:
 * ```typescript
 * // Get memory with all assets
 * const memory = await db.query.memories.findFirst({
 *   where: eq(memories.id, memoryId),
 *   with: { assets: true }
 * });
 *
 * // Get memory with type-specific details
 * const imageMemory = await db.query.memories.findFirst({
 *   where: eq(memories.id, memoryId),
 *   with: {
 *     assets: true,
 *     imageDetails: true // Only exists for image memories
 *   }
 * });
 *
 * // Search by tags
 * const taggedMemories = await db.select()
 *   .from(memories)
 *   .where(arrayContains(memories.tags, ['nature', 'sunset']));
 * ```
 */
export const memories = pgTable(
  'memories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => allUsers.id, { onDelete: 'cascade' }),
    type: memory_type_t('type').notNull(),
    title: text('title'),
    description: text('description'),
    isPublic: boolean('is_public').default(false).notNull(),
    ownerSecureCode: text('owner_secure_code').notNull(),
    parentFolderId: uuid('parent_folder_id'),
    // Tags for better performance and search
    tags: text('tags').array().default([]),
    // Universal fields for all memory types
    recipients: text('recipients').array().default([]),
    // Date fields - grouped together
    fileCreatedAt: timestamp('file_created_at', { mode: 'date' }), // When file was originally created
    unlockDate: timestamp('unlock_date', { mode: 'date' }), // When memory becomes accessible
    createdAt: timestamp('created_at').notNull().defaultNow(), // When memory was uploaded/created in our system
    updatedAt: timestamp('updated_at').notNull().defaultNow(), // When memory was last modified
    deletedAt: timestamp('deleted_at'), // Soft delete support
    // Flexible metadata for truly common additional data
    metadata: json('metadata')
      .$type<{
        // File upload context (applies to all types)
        originalPath?: string; // Original file path from upload
        // Custom user data (truly universal)
        custom?: Record<string, unknown>;
      }>()
      .default({}),
    // Storage status fields
    storageLocations: storage_location_t('storage_locations').array().default([]), // Array of storage backends: ['neon-db', 'vercel-blob', 'icp-canister', 'aws-s3']
    storageDuration: integer('storage_duration'), // Duration in days, null for permanent
    storageCount: integer('storage_count').default(0), // Number of storage locations for verification
  },
  table => [
    // Performance indexes for common queries
    index('memories_owner_created_idx').on(table.ownerId, table.createdAt.desc()),
    index('memories_type_idx').on(table.type),
    index('memories_public_idx').on(table.isPublic),
    // Performance indexes for tags and people
    index('memories_tags_idx').on(table.tags),
    // Storage status indexes
    index('memories_storage_locations_idx').on(table.storageLocations),
    index('memories_storage_duration_idx').on(table.storageDuration),
  ]
);

/**
 * MEMORY ASSETS TABLE - Multiple optimized assets per memory
 *
 * This table stores different optimized versions of each memory (original, display, thumb, etc.).
 * Each memory can have multiple assets, but only one asset per type per memory.
 *
 * COMPOSITION:
 * - Identity: id, memoryId (FK to memories)
 * - Asset info: assetType, variant, url, storageBackend, storageKey
 * - Media properties: bytes, width, height, mimeType, sha256
 * - Processing: processingStatus, processingError
 * - Timestamps: createdAt, updatedAt
 *
 * ASSET TYPES:
 * - original: Full resolution, unprocessed file
 * - display: Optimized for viewing (~1600-2048px, WebP)
 * - thumb: Thumbnail for grids (~320-512px, WebP)
 * - placeholder: Low-quality placeholder (blurhash, base64)
 * - poster: Video poster frame
 * - waveform: Audio waveform visualization
 *
 * USAGE EXAMPLES:
 * ```typescript
 * // Get all assets for a memory
 * const assets = await db.select()
 *   .from(memoryAssets)
 *   .where(eq(memoryAssets.memoryId, memoryId));
 *
 * // Get specific asset type
 * const thumbnail = await db.select()
 *   .from(memoryAssets)
 *   .where(
 *     and(
 *       eq(memoryAssets.memoryId, memoryId),
 *       eq(memoryAssets.assetType, 'thumb')
 *     )
 *   );
 * ```
 */
export const memoryAssets = pgTable(
  'memory_assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    memoryId: uuid('memory_id')
      .notNull()
      .references(() => memories.id, { onDelete: 'cascade' }),
    assetType: asset_type_t('asset_type').notNull(),
    variant: text('variant'), // Optional for future variants (2k, mobile, etc.)
    url: text('url').notNull(), // Derived/public URL
    storageBackend: storage_backend_t('storage_backend').notNull(),
    bucket: text('bucket'), // Storage bucket/container
    storageKey: text('storage_key').notNull(), // Bucket/key or blob ID
    bytes: bigint('bytes', { mode: 'number' }).notNull(), // Use bigint for >2GB files
    width: integer('width'), // Nullable for non-image assets
    height: integer('height'), // Nullable for non-image assets
    mimeType: text('mime_type').notNull(), // Consistent naming
    sha256: text('sha256'), // 64-char hex (enforced by validation)
    processingStatus: processing_status_t('processing_status').default('pending').notNull(),
    processingError: text('processing_error'),
    deletedAt: timestamp('deleted_at'), // Soft delete support
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => [
    // Ensure one asset type per memory
    uniqueIndex('memory_assets_unique').on(table.memoryId, table.assetType),
    // Performance indexes
    index('memory_assets_memory_idx').on(table.memoryId),
    index('memory_assets_type_idx').on(table.assetType),
    index('memory_assets_url_idx').on(table.url),
    index('memory_assets_storage_idx').on(table.storageBackend, table.storageKey),
    // Data integrity constraints
    check('memory_assets_bytes_positive', sql`${table.bytes} > 0`),
    check(
      'memory_assets_dimensions_positive',
      sql`(${table.width} IS NULL OR ${table.width} > 0) AND (${table.height} IS NULL OR ${table.height} > 0)`
    ),
  ]
);

/**
 * FOLDERS TABLE - Google Drive-style organization
 *
 * This table enables folder-based organization of memories, similar to Google Drive.
 * Folders can be nested (parentFolderId) and contain both memories and subfolders.
 *
 * COMPOSITION:
 * - Identity: id, ownerId (FK to allUsers)
 * - Organization: name, parentFolderId (self-referencing FK)
 * - Timestamps: createdAt, updatedAt
 *
 * USAGE EXAMPLES:
 * ```typescript
 * // Create a folder
 * const folder = await db.insert(folders).values({
 *   ownerId: userId,
 *   name: "Wedding Photos",
 *   parentFolderId: null // Root level
 * });
 *
 * // Get folder with contents
 * const folderWithContents = await db.query.folders.findFirst({
 *   where: eq(folders.id, folderId),
 *   with: { memories: true, subfolders: true }
 * });
 * ```
 */
export const folders = pgTable(
  'folders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => allUsers.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    parentFolderId: uuid('parent_folder_id'), // Self-referencing FK for nested folders
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => [
    // Performance indexes
    index('folders_owner_idx').on(table.ownerId),
    index('folders_parent_idx').on(table.parentFolderId),
  ]
);

/**
 * IMAGE DETAILS TABLE - Type-specific data for image memories
 *
 * This optional table stores image-specific metadata that doesn't belong in the
 * core memories table. Only created when actually needed for image memories.
 *
 * COMPOSITION:
 * - Identity: memoryId (FK to memories, 1:1)
 * - Image data: width, height, exif metadata
 *
 * USAGE:
 * Only create this table when you need image-specific fields beyond what's
 * stored in the memoryAssets table (which already has width/height).
 */
export const imageDetails = pgTable('image_details', {
  memoryId: uuid('memory_id')
    .primaryKey()
    .references(() => memories.id, { onDelete: 'cascade' }),
  width: integer('width'),
  height: integer('height'),
  // Image-specific EXIF data as proper columns
  camera: text('camera'),
  focal: integer('focal'),
  iso: integer('iso'),
  aperture: text('aperture'), // e.g., "f/2.8"
  shutterSpeed: text('shutter_speed'), // e.g., "1/125"
  orientation: integer('orientation'),
});

/**
 * VIDEO DETAILS TABLE - Type-specific data for video memories
 *
 * This optional table stores video-specific metadata like duration, codec, etc.
 * Only created when actually needed for video memories.
 *
 * COMPOSITION:
 * - Identity: memoryId (FK to memories, 1:1)
 * - Video data: durationMs, width, height, codec, fps
 */
export const videoDetails = pgTable('video_details', {
  memoryId: uuid('memory_id')
    .primaryKey()
    .references(() => memories.id, { onDelete: 'cascade' }),
  durationMs: integer('duration_ms').notNull(),
  width: integer('width'),
  height: integer('height'),
  codec: text('codec'),
  fps: text('fps'),
});

/**
 * DOCUMENT DETAILS TABLE - Type-specific data for document memories
 *
 * This optional table stores document-specific metadata like page count, etc.
 * Only created when actually needed for document memories.
 *
 * COMPOSITION:
 * - Identity: memoryId (FK to memories, 1:1)
 * - Document data: pages, mimeType
 */
export const documentDetails = pgTable('document_details', {
  memoryId: uuid('memory_id')
    .primaryKey()
    .references(() => memories.id, { onDelete: 'cascade' }),
  pages: integer('pages'),
  mimeType: text('mime_type'),
});

/**
 * AUDIO DETAILS TABLE - Type-specific data for audio memories
 *
 * This optional table stores audio-specific metadata like duration, bitrate, etc.
 * Only created when actually needed for audio memories.
 *
 * COMPOSITION:
 * - Identity: memoryId (FK to memories, 1:1)
 * - Audio data: durationMs, bitrate, sampleRate, channels
 */
export const audioDetails = pgTable('audio_details', {
  memoryId: uuid('memory_id')
    .primaryKey()
    .references(() => memories.id, { onDelete: 'cascade' }),
  durationMs: integer('duration_ms'),
  bitrate: integer('bitrate'),
  sampleRate: integer('sample_rate'),
  channels: integer('channels'),
});

/**
 * NOTE DETAILS TABLE - Type-specific data for note memories
 *
 * This optional table stores note-specific content and formatting.
 * Only created when actually needed for note memories.
 *
 * COMPOSITION:
 * - Identity: memoryId (FK to memories, 1:1)
 * - Note data: content (the actual note text)
 */
export const noteDetails = pgTable('note_details', {
  memoryId: uuid('memory_id')
    .primaryKey()
    .references(() => memories.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
});

/**
 * PEOPLE IN MEMORIES TABLE - Links people to memories
 *
 * This table connects people (both registered and temporary users) to memories.
 * People can be tagged in photos, videos, notes, etc. and can be either:
 * - Registered users (via allUsers -> users)
 * - Temporary users (via allUsers -> temporaryUsers)
 *
 * COMPOSITION:
 * - Identity: memoryId (FK to memories), allUserId (FK to allUsers)
 * - Role: What role the person has in the memory
 * - Timestamps: createdAt
 *
 * USAGE EXAMPLES:
 * ```typescript
 * // Get all people in a memory
 * const people = await db.select()
 *   .from(peopleInMemories)
 *   .leftJoin(allUsers, eq(peopleInMemories.allUserId, allUsers.id))
 *   .leftJoin(users, eq(allUsers.userId, users.id))
 *   .leftJoin(temporaryUsers, eq(allUsers.temporaryUserId, temporaryUsers.id))
 *   .where(eq(peopleInMemories.memoryId, memoryId));
 * ```
 */
export const peopleInMemories = pgTable(
  'people_in_memories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    memoryId: uuid('memory_id')
      .notNull()
      .references(() => memories.id, { onDelete: 'cascade' }),
    allUserId: text('all_user_id')
      .notNull()
      .references(() => allUsers.id, { onDelete: 'cascade' }),
    role: text('role').default('subject'), // "subject", "photographer", "witness", etc.
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  table => [
    // Ensure a person can only be tagged once per memory
    uniqueIndex('people_in_memories_unique').on(table.memoryId, table.allUserId),
    // Performance indexes
    index('people_in_memories_memory_idx').on(table.memoryId),
    index('people_in_memories_user_idx').on(table.allUserId),
  ]
);

/**
 * MEMORY LIKES TABLE - Tracks likes on memories
 *
 * This table tracks which users have liked which memories.
 * Each user can like a memory only once, but multiple users can like the same memory.
 *
 * COMPOSITION:
 * - Identity: memoryId (FK to memories), allUserId (FK to allUsers)
 * - Timestamps: createdAt
 *
 * USAGE EXAMPLES:
 * ```typescript
 * // Get all likes for a memory
 * const likes = await db.select()
 *   .from(memoryLikes)
 *   .leftJoin(allUsers, eq(memoryLikes.allUserId, allUsers.id))
 *   .where(eq(memoryLikes.memoryId, memoryId));
 *
 * // Check if a user liked a memory
 * const userLike = await db.query.memoryLikes.findFirst({
 *   where: and(
 *     eq(memoryLikes.memoryId, memoryId),
 *     eq(memoryLikes.allUserId, userId)
 *   )
 * });
 * ```
 */
export const memoryLikes = pgTable(
  'memory_likes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    memoryId: uuid('memory_id')
      .notNull()
      .references(() => memories.id, { onDelete: 'cascade' }),
    allUserId: text('all_user_id')
      .notNull()
      .references(() => allUsers.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  table => [
    // Ensure a user can only like a memory once
    uniqueIndex('memory_likes_unique').on(table.memoryId, table.allUserId),
    // Performance indexes
    index('memory_likes_memory_idx').on(table.memoryId),
    index('memory_likes_user_idx').on(table.allUserId),
  ]
);

/**
 * MEMORY COMMENTS TABLE - Tracks comments on memories
 *
 * This table tracks comments made by users on memories.
 * Unlike likes, users can make multiple comments on the same memory.
 * Comments are displayed chronologically and support nested replies.
 *
 * COMPOSITION:
 * - Identity: memoryId (FK to memories), allUserId (FK to allUsers)
 * - Content: content (the actual comment text)
 * - Threading: parentCommentId (for nested replies)
 * - Timestamps: createdAt, updatedAt, deletedAt (soft delete)
 *
 * USAGE EXAMPLES:
 * ```typescript
 * // Get all comments for a memory (chronological order)
 * const comments = await db.select()
 *   .from(memoryComments)
 *   .leftJoin(allUsers, eq(memoryComments.allUserId, allUsers.id))
 *   .where(eq(memoryComments.memoryId, memoryId))
 *   .orderBy(desc(memoryComments.createdAt));
 *
 * // Get nested replies to a comment
 * const replies = await db.select()
 *   .from(memoryComments)
 *   .where(eq(memoryComments.parentCommentId, parentCommentId));
 * ```
 */
export const memoryComments = pgTable(
  'memory_comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    memoryId: uuid('memory_id')
      .notNull()
      .references(() => memories.id, { onDelete: 'cascade' }),
    allUserId: text('all_user_id')
      .notNull()
      .references(() => allUsers.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    parentCommentId: uuid('parent_comment_id'), // For nested replies
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at'), // Soft delete
  },
  table => [
    // Performance indexes - ordered by date for chronological display
    index('memory_comments_memory_created_idx').on(table.memoryId, table.createdAt.desc()),
    index('memory_comments_user_idx').on(table.allUserId),
    index('memory_comments_parent_idx').on(table.parentCommentId),
  ]
);

// Types of relationships between users (e.g., brother, aunt, friend)
export const RELATIONSHIP_TYPES = ['friend', 'colleague', 'acquaintance', 'family', 'other'] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

// Types of sharing relationships (based on trust/proximity)
export const SHARING_RELATIONSHIP_TYPES = [
  'close_family', // e.g., parents, siblings
  'family', // extended family
  'partner', // romantic partner
  'close_friend', // trusted friends
  'friend', // regular friends
  'colleague', // work relationships
  'acquaintance', // casual relationships
] as const;
export type SharingRelationshipType = (typeof SHARING_RELATIONSHIP_TYPES)[number];

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

// This table supports three types of sharing:
// 1. Direct user sharing (sharedWithId)
// 2. Group sharing (groupId)
// 3. Relationship-based sharing (sharedRelationshipType)
// Only one of these sharing methods should be used per record.
// Relationship-based sharing is dynamic - access is determined by current relationships
// rather than static lists, making it more maintainable and accurate.
// Note: Application logic must enforce that exactly one of sharedWithId, groupId, or sharedRelationshipType is set.
export const memoryShares = pgTable('memory_share', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  memoryId: uuid('memory_id').notNull(), // The ID of the memory (e.g., image, note, document)
  memoryType: text('memory_type', { enum: MEMORY_TYPES }).notNull(), // Type of memory (e.g., "image", "note", "document", "video")
  ownerId: text('owner_id') // The user who originally created (or owns) the memory
    .notNull()
    .references(() => allUsers.id, { onDelete: 'cascade' }),

  sharedWithType: text('shared_with_type', {
    enum: ['user', 'group', 'relationship'],
  }).notNull(),

  sharedWithId: text('shared_with_id') // For direct user sharing
    .references(() => allUsers.id, { onDelete: 'cascade' }),
  groupId: text('group_id') // For group sharing
    .references(() => group.id, { onDelete: 'cascade' }),
  sharedRelationshipType: text('shared_relationship_type', {
    // For relationship-based sharing
    enum: SHARING_RELATIONSHIP_TYPES,
  }),

  accessLevel: text('access_level', { enum: ACCESS_LEVELS }).default('read').notNull(),
  inviteeSecureCode: text('invitee_secure_code').notNull(), // For invitee to access the memory
  inviteeSecureCodeCreatedAt: timestamp('secure_code_created_at', { mode: 'date' }).notNull().defaultNow(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// This table is for shared groups where all members see the same group composition
// (e.g., book clubs, work teams, shared family groups).
// For personal 'groups' like friend lists, use the relationship table instead,
// querying with type='friend' and status='accepted' to get a user's friends.
export const group = pgTable('group', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  ownerId: text('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  metadata: json('metadata')
    .$type<{
      description?: string;
    }>()
    .default({}),
});

export const groupMember = pgTable(
  'group_member',
  {
    groupId: text('group_id')
      .notNull()
      .references(() => group.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role', { enum: MEMBER_ROLES }).default('member').notNull(),
  },
  groupMember => [
    primaryKey({
      columns: [groupMember.groupId, groupMember.userId],
    }),
  ]
);

export const relationship = pgTable(
  'relationship',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => allUsers.id, { onDelete: 'cascade' }),
    relatedUserId: text('related_user_id')
      .notNull()
      .references(() => allUsers.id, { onDelete: 'cascade' }),
    type: text('type', { enum: RELATIONSHIP_TYPES }).notNull(),
    status: text('status', { enum: RELATIONSHIP_STATUS }).default('pending').notNull(),
    note: text('note'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  t => [uniqueIndex('unique_relation_idx').on(t.userId, t.relatedUserId)]
);

export const familyRelationship = pgTable('family_relationship', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  relationshipId: text('relationship_id')
    .notNull()
    .references(() => relationship.id, { onDelete: 'cascade' }),
  familyRole: text('family_role', { enum: FAMILY_RELATIONSHIP_TYPES }).notNull(),
  // New: Fuzziness Indicator
  relationshipClarity: text('relationship_clarity', {
    enum: ['resolved', 'fuzzy'],
  })
    .default('fuzzy')
    .notNull(),
  // New: Store the common ancestor if known
  sharedAncestorId: text('shared_ancestor_id').references(() => allUsers.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Business Relationships Table
// Minimal client-provider relationships
export const businessRelationship = pgTable(
  'business_relationship',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    // The business (service provider) - must be a registered user
    businessId: text('business_id')
      .notNull()
      .references(() => allUsers.id, { onDelete: 'cascade' }),

    // The client - can be a registered user or external client
    clientId: text('client_id').references(() => allUsers.id, { onDelete: 'cascade' }), // Optional - for external clients

    // Client details (for external clients who aren't registered users)
    clientName: text('client_name'), // For external clients
    clientEmail: text('client_email'), // For external clients

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => [
    foreignKey({
      columns: [table.businessId],
      foreignColumns: [allUsers.id],
      name: 'business_relationship_business_id_all_user_id_fk',
    }),
    foreignKey({
      columns: [table.clientId],
      foreignColumns: [allUsers.id],
      name: 'business_relationship_client_id_all_user_id_fk',
    }),
    // Index for efficient querying
    index('business_relationship_business_idx').on(table.businessId),
    index('business_relationship_client_idx').on(table.clientId),
  ]
);

// Enum for primary relationships
export const PRIMARY_RELATIONSHIP_ROLES = ['son', 'daughter', 'father', 'mother', 'sibling', 'spouse'] as const;
export type PrimaryRelationshipRole = (typeof PRIMARY_RELATIONSHIP_ROLES)[number];

export const familyMember = pgTable(
  'family_member',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    // The owner of the family tree (the user who created the record)
    ownerId: text('owner_id')
      .notNull()
      .references(() => allUsers.id, { onDelete: 'cascade' }),

    // If this family member is a registered user, link them here (optional)
    userId: text('user_id').references(() => allUsers.id, { onDelete: 'set null' }),

    // Basic information
    fullName: text('full_name').notNull(),

    // Primary (resolved) relationship: e.g. "son", "father", etc.
    primaryRelationship: text('primary_relationship', { enum: PRIMARY_RELATIONSHIP_ROLES }).notNull(),

    // Fuzzy relationships: an array of strings (e.g. ["grandfather"])
    // Requires Postgres array support via pgArray.
    fuzzyRelationships: text('fuzzy_relationships', { enum: FAMILY_RELATIONSHIP_TYPES }).array().notNull().default([]),

    // Additional details for the family member
    birthDate: timestamp('birth_date', { mode: 'date' }),
    deathDate: timestamp('death_date', { mode: 'date' }),
    birthplace: text('birthplace'),

    // Optional metadata field for extra details
    metadata: json('metadata').$type<{ notes?: string }>().default({}),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => [
    // Optional foreign key constraints (if needed) for userId can be defined here.
    foreignKey({
      columns: [table.userId],
      foreignColumns: [allUsers.id],
      name: 'family_member_user_fk',
    }),
  ]
);

// Gallery tables for gallery functionality
export const galleries = pgTable(
  'gallery',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    ownerId: text('owner_id')
      .notNull()
      .references(() => allUsers.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    isPublic: boolean('is_public').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    // Storage status fields
    totalMemories: integer('total_memories').default(0), // Total number of memories in this gallery
    storageLocations: storage_location_t('storage_locations').array().default([]), // All storage backends used by memories in this gallery
    averageStorageDuration: integer('average_storage_duration'), // Average duration in days, null if all permanent
    storageDistribution: json('storage_distribution').$type<Record<string, number>>().default({}), // Count of memories per storage backend
  },
  table => [
    // Storage status indexes
    index('galleries_storage_locations_idx').on(table.storageLocations),
    index('galleries_storage_duration_idx').on(table.averageStorageDuration),
  ]
);

export const galleryItems = pgTable(
  'gallery_item',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    galleryId: text('gallery_id')
      .notNull()
      .references(() => galleries.id, { onDelete: 'cascade' }),
    memoryId: uuid('memory_id').notNull(),
    memoryType: text('memory_type', { enum: MEMORY_TYPES }).notNull(), // 'image' | 'video' | 'document' | 'note' | 'audio'
    position: integer('position').notNull(),
    caption: text('caption'),
    isFeatured: boolean('is_featured').default(false).notNull(),
    metadata: json('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  t => [
    // Fast ordering inside a gallery
    index('gallery_items_gallery_position_idx').on(t.galleryId, t.position),
    // Prevent duplicates of same memory in the same gallery
    uniqueIndex('gallery_items_gallery_memory_uq').on(t.galleryId, t.memoryId, t.memoryType),
    // Quickly find all galleries for a memory
    index('gallery_items_by_memory_idx').on(t.memoryId, t.memoryType),
  ]
);

// Type inference helpers
export type DBUser = typeof users.$inferSelect;
export type NewDBUser = typeof users.$inferInsert;

export type DBAllUser = typeof allUsers.$inferSelect;
export type NewDBAllUser = typeof allUsers.$inferInsert;

export type DBTemporaryUser = typeof temporaryUsers.$inferSelect;
export type NewDBTemporaryUser = typeof temporaryUsers.$inferInsert;

export type DBAccount = typeof accounts.$inferSelect;
export type NewDBAccount = typeof accounts.$inferInsert;

export type DBSession = typeof sessions.$inferSelect;
export type NewDBSession = typeof sessions.$inferInsert;

// Old per-type table types removed - replaced by unified memory types

export type DBMemoryShare = typeof memoryShares.$inferSelect;
export type NewDBMemoryShare = typeof memoryShares.$inferInsert;

export type DBGroup = typeof group.$inferSelect;
export type NewDBGroup = typeof group.$inferInsert;

export type DBGroupMember = typeof groupMember.$inferSelect;
export type NewDBGroupMember = typeof groupMember.$inferInsert;

// DBVideo types removed - replaced by unified memory types

export type DBGallery = typeof galleries.$inferSelect;
export type NewDBGallery = typeof galleries.$inferInsert;

// Gallery sharing table - similar to memoryShares but for galleries
export const galleryShares = pgTable('gallery_share', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  galleryId: text('gallery_id')
    .notNull()
    .references(() => galleries.id, { onDelete: 'cascade' }),
  ownerId: text('owner_id') // The user who owns the gallery
    .notNull()
    .references(() => allUsers.id, { onDelete: 'cascade' }),

  sharedWithType: text('shared_with_type', {
    enum: ['user', 'group', 'relationship'],
  }).notNull(),

  sharedWithId: text('shared_with_id') // For direct user sharing
    .references(() => allUsers.id, { onDelete: 'cascade' }),
  groupId: text('group_id') // For group sharing
    .references(() => group.id, { onDelete: 'cascade' }),
  sharedRelationshipType: text('shared_relationship_type', {
    // For relationship-based sharing
    enum: SHARING_RELATIONSHIP_TYPES,
  }),

  accessLevel: text('access_level', { enum: ACCESS_LEVELS }).default('read').notNull(),
  inviteeSecureCode: text('invitee_secure_code').notNull(), // For invitee to access the gallery
  inviteeSecureCodeCreatedAt: timestamp('secure_code_created_at', { mode: 'date' }).notNull().defaultNow(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type DBGalleryItem = typeof galleryItems.$inferSelect;
export type NewDBGalleryItem = typeof galleryItems.$inferInsert;

export type DBGalleryShare = typeof galleryShares.$inferSelect;
export type NewDBGalleryShare = typeof galleryShares.$inferInsert;

// Internet Identity nonce table for canister-first signup
export const iiNonces = pgTable(
  'ii_nonce',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    nonceHash: text('nonce_hash').notNull(), // SHA-256 hash of the actual nonce
    createdAt: timestamp('created_at').defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
    usedAt: timestamp('used_at', { mode: 'date' }), // null = unused, timestamp = used
    context: json('context')
      .$type<{
        callbackUrl?: string;
        userAgent?: string;
        ipAddress?: string;
        sessionId?: string;
      }>()
      .default({}),
  },
  table => [
    // Index for fast lookup by hash
    index('ii_nonces_hash_idx').on(table.nonceHash),
    // Index for cleanup of expired nonces
    index('ii_nonces_expires_idx').on(table.expiresAt),
    // Index for stats queries on usedAt
    index('ii_nonces_used_idx').on(table.usedAt),
    // Composite index for active nonce lookups (usedAt IS NULL AND expiresAt > now)
    index('ii_nonces_active_idx').on(table.usedAt, table.expiresAt),
    // Index for rate limiting queries on createdAt
    index('ii_nonces_created_idx').on(table.createdAt),
  ]
);

export type DBIINonce = typeof iiNonces.$inferSelect;
export type NewDBIINonce = typeof iiNonces.$inferInsert;

// Storage Edges Table - Track storage presence per memory artifact and backend
export const storageEdges = pgTable(
  'storage_edges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    memoryId: uuid('memory_id').notNull(), // References memories.id
    memoryType: memory_type_t('memory_type').notNull(), // 'image' | 'video' | 'note' | 'document' | 'audio'
    artifact: artifact_t('artifact').notNull(), // 'metadata' | 'asset'
    backend: backend_t('backend').notNull(), // 'neon-db' | 'vercel-blob' | 'icp-canister'
    present: boolean('present').notNull().default(false),
    location: text('location'), // blob key / icp path / etc.
    contentHash: text('content_hash'), // SHA-256 for assets
    sizeBytes: bigint('size_bytes', { mode: 'number' }),
    syncState: sync_t('sync_state').notNull().default('idle'), // 'idle' | 'migrating' | 'failed'
    lastSyncedAt: timestamp('last_synced_at', { mode: 'date' }),
    syncError: text('sync_error'),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow(),
  },
  t => [
    uniqueIndex('uq_edge').on(t.memoryId, t.memoryType, t.artifact, t.backend),
    index('ix_edges_memory').on(t.memoryId, t.memoryType),
    index('ix_edges_backend_present').on(t.backend, t.artifact, t.present),
    index('ix_edges_sync_state').on(t.syncState),
  ]
);

export type DBStorageEdge = typeof storageEdges.$inferSelect;
export type NewDBStorageEdge = typeof storageEdges.$inferInsert;

// Memory Metadata Table - stores universal metadata and processing status
export const memoryMetadata = pgTable(
  'memory_metadata',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    memoryId: uuid('memory_id').notNull(),
    memoryType: memory_type_t('memory_type').notNull(),
    // Universal metadata that applies to all memory types
    universalData: json('universal_data').$type<{
      gps?: {
        latitude?: number;
        longitude?: number;
        altitude?: number;
      };
      // Add other universal fields as needed
    }>(),
    processingStatus: processing_status_t('processing_status').default('pending').notNull(),
    processingError: text('processing_error'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    uniqueIndex('memory_metadata_unique').on(table.memoryId, table.memoryType),
    index('memory_metadata_memory_idx').on(table.memoryId, table.memoryType),
    index('memory_metadata_status_idx').on(table.processingStatus),
  ]
);

// NOTE: Views are created/updated ONLY via SQL migrations.
// These helpers are read-only projections for typing & autocompletion.

// Note: Memory and Gallery presence views have been replaced with direct fields in the tables

export type DBSyncStatus = {
  memory_id: string;
  memory_type: 'image' | 'video' | 'note' | 'document' | 'audio';
  artifact: 'metadata' | 'asset';
  backend: 'neon-db' | 'vercel-blob' | 'icp-canister';
  sync_state: 'idle' | 'migrating' | 'failed';
  sync_error: string | null;
  last_synced_at: Date | null;
  created_at: Date;
  updated_at: Date;
  sync_duration_seconds: number | null;
  is_stuck: boolean;
};

// Read-only bindings for views (defined in migrations):
// These are NOT DDL; just typed selectors for application code.

export const syncStatus = sql<DBSyncStatus>`SELECT * FROM sync_status`.as('sync_status');

// Helper functions for common queries

export const getSyncStatusByState = (syncState: 'migrating' | 'failed') =>
  sql<DBSyncStatus>`SELECT * FROM sync_status WHERE sync_state = ${syncState}`;

export const getStuckSyncs = () => sql<DBSyncStatus>`SELECT * FROM sync_status WHERE is_stuck = true`;

export const getSyncStatusByBackend = (backend: 'neon-db' | 'vercel-blob' | 'icp-canister') =>
  sql<DBSyncStatus>`SELECT * FROM sync_status WHERE backend = ${backend}`;

/**
 * DRIZZLE RELATIONS - Define object-like access to related data
 *
 * These relations make it easy to query memories with their related assets,
 * making the composition clear and enabling clean, object-like queries.
 *
 * RELATIONSHIPS:
 * - memories (1) ↔ (many) memoryAssets
 * - memoryAssets (many) ↔ (1) memories
 *
 * USAGE EXAMPLES:
 * ```typescript
 * // Get memory with all assets (object-like access)
 * const memory = await db.query.memories.findFirst({
 *   where: eq(memories.id, memoryId),
 *   with: { assets: true }
 * });
 * // Result: memory.assets is an array of MemoryAsset[]
 *
 * // Get asset with its parent memory
 * const asset = await db.query.memoryAssets.findFirst({
 *   where: eq(memoryAssets.id, assetId),
 *   with: { memory: true }
 * });
 * // Result: asset.memory is the parent Memory object
 * ```
 */
export const memoriesRelations = relations(memories, ({ many, one }) => ({
  assets: many(memoryAssets),
  people: many(peopleInMemories),
  likes: many(memoryLikes),
  comments: many(memoryComments),
  folder: one(folders, {
    fields: [memories.parentFolderId],
    references: [folders.id],
  }),
}));

export const memoryAssetsRelations = relations(memoryAssets, ({ one }) => ({
  memory: one(memories, {
    fields: [memoryAssets.memoryId],
    references: [memories.id],
  }),
}));

// Folder relations
export const foldersRelations = relations(folders, ({ one, many }) => ({
  owner: one(allUsers, {
    fields: [folders.ownerId],
    references: [allUsers.id],
  }),
  parent: one(folders, {
    fields: [folders.parentFolderId],
    references: [folders.id],
  }),
  subfolders: many(folders),
  memories: many(memories),
}));

// Detail table relations (1:1 with memories)
export const imageDetailsRelations = relations(imageDetails, ({ one }) => ({
  memory: one(memories, {
    fields: [imageDetails.memoryId],
    references: [memories.id],
  }),
}));

export const videoDetailsRelations = relations(videoDetails, ({ one }) => ({
  memory: one(memories, {
    fields: [videoDetails.memoryId],
    references: [memories.id],
  }),
}));

export const documentDetailsRelations = relations(documentDetails, ({ one }) => ({
  memory: one(memories, {
    fields: [documentDetails.memoryId],
    references: [memories.id],
  }),
}));

export const audioDetailsRelations = relations(audioDetails, ({ one }) => ({
  memory: one(memories, {
    fields: [audioDetails.memoryId],
    references: [memories.id],
  }),
}));

export const noteDetailsRelations = relations(noteDetails, ({ one }) => ({
  memory: one(memories, {
    fields: [noteDetails.memoryId],
    references: [memories.id],
  }),
}));

// People in memories relations
export const peopleInMemoriesRelations = relations(peopleInMemories, ({ one }) => ({
  memory: one(memories, {
    fields: [peopleInMemories.memoryId],
    references: [memories.id],
  }),
  person: one(allUsers, {
    fields: [peopleInMemories.allUserId],
    references: [allUsers.id],
  }),
}));

// Memory likes relations
export const memoryLikesRelations = relations(memoryLikes, ({ one }) => ({
  memory: one(memories, {
    fields: [memoryLikes.memoryId],
    references: [memories.id],
  }),
  user: one(allUsers, {
    fields: [memoryLikes.allUserId],
    references: [allUsers.id],
  }),
}));

// Memory comments relations
export const memoryCommentsRelations = relations(memoryComments, ({ one, many }) => ({
  memory: one(memories, {
    fields: [memoryComments.memoryId],
    references: [memories.id],
  }),
  user: one(allUsers, {
    fields: [memoryComments.allUserId],
    references: [allUsers.id],
  }),
  parentComment: one(memoryComments, {
    fields: [memoryComments.parentCommentId],
    references: [memoryComments.id],
  }),
  replies: many(memoryComments),
}));

// Business relationship relations
export const businessRelationshipRelations = relations(businessRelationship, ({ one }) => ({
  business: one(allUsers, {
    fields: [businessRelationship.businessId],
    references: [allUsers.id],
  }),
  client: one(allUsers, {
    fields: [businessRelationship.clientId],
    references: [allUsers.id],
  }),
}));

// Type helpers for the enums
export type MemoryType = (typeof MEMORY_TYPES)[number];
export type AccessLevel = (typeof ACCESS_LEVELS)[number];
export type MemberRole = (typeof MEMBER_ROLES)[number];

export type DBRelationship = typeof relationship.$inferSelect;
export type DBFamilyRelationship = typeof familyRelationship.$inferSelect;
export type DBBusinessRelationship = typeof businessRelationship.$inferSelect;
export type NewDBBusinessRelationship = typeof businessRelationship.$inferInsert;

// Memory Assets Types
export type DBMemoryAsset = typeof memoryAssets.$inferSelect;
export type NewDBMemoryAsset = typeof memoryAssets.$inferInsert;
export type DBMemoryMetadata = typeof memoryMetadata.$inferSelect;
export type NewDBMemoryMetadata = typeof memoryMetadata.$inferInsert;

// New unified memory types
export type DBMemory = typeof memories.$inferSelect;
export type NewDBMemory = typeof memories.$inferInsert;

// Memory with assets relationship
export type DBMemoryWithAssets = DBMemory & {
  assets: DBMemoryAsset[];
};

// Asset type helpers
export type AssetType = (typeof asset_type_t.enumValues)[number];
export type ProcessingStatus = (typeof processing_status_t.enumValues)[number];
export type StorageBackend = (typeof storage_backend_t.enumValues)[number];

// Folder types
export type DBFolder = typeof folders.$inferSelect;
export type NewDBFolder = typeof folders.$inferInsert;

// Detail table types
export type DBImageDetails = typeof imageDetails.$inferSelect;
export type NewDBImageDetails = typeof imageDetails.$inferInsert;
export type DBVideoDetails = typeof videoDetails.$inferSelect;
export type NewDBVideoDetails = typeof videoDetails.$inferInsert;
export type DBDocumentDetails = typeof documentDetails.$inferSelect;
export type NewDBDocumentDetails = typeof documentDetails.$inferInsert;
export type DBAudioDetails = typeof audioDetails.$inferSelect;
export type NewDBAudioDetails = typeof audioDetails.$inferInsert;
export type DBNoteDetails = typeof noteDetails.$inferSelect;
export type NewDBNoteDetails = typeof noteDetails.$inferInsert;

// Memory with all relationships
export type DBMemoryWithDetails = DBMemory & {
  assets: DBMemoryAsset[];
  folder?: DBFolder | null;
  imageDetails?: DBImageDetails | null;
  videoDetails?: DBVideoDetails | null;
  documentDetails?: DBDocumentDetails | null;
  audioDetails?: DBAudioDetails | null;
  noteDetails?: DBNoteDetails | null;
};

// Temporary exports for backward compatibility during migration
// TODO: Remove these once all files are updated to use the new unified schema
export const images = memories;
export const videos = memories;
export const documents = memories;
export const notes = memories;
export const audio = memories;

// Temporary type exports for backward compatibility
export type DBImage = DBMemory;
export type DBVideo = DBMemory;
export type DBDocument = DBMemory;
export type DBNote = DBMemory;
export type DBAudio = DBMemory;
export type NewDBImage = NewDBMemory;
export type NewDBVideo = NewDBMemory;
export type NewDBDocument = NewDBMemory;
export type NewDBNote = NewDBMemory;
export type NewDBAudio = NewDBMemory;
