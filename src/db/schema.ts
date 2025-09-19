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
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import type { AdapterAccount } from 'next-auth/adapters';

// Storage Edge Enums
export const artifact_t = pgEnum('artifact_t', ['metadata', 'asset']);
export const memory_type_t = pgEnum('memory_type_t', ['image', 'video', 'note', 'document', 'audio']);
export const sync_t = pgEnum('sync_t', ['idle', 'migrating', 'failed']);
// Memory and Asset Status Enums
export const memory_status_t = pgEnum('memory_status_t', [
  'pending', // Any asset pending/uploading
  'active', // ≥1 asset active & none pending
  'failed', // All assets failed/aborted
  'tombstoned', // Marked for deletion
  'deleted', // Fully deleted
]);
// Asset upload status - purely about transfer
export const asset_upload_status_t = pgEnum('asset_upload_status_t', [
  'pending', // Not yet uploaded
  'uploading', // Currently uploading
  'completed', // Upload completed
  'failed', // Upload failed
]);
// Asset lifecycle status
export const asset_lifecycle_status_t = pgEnum('asset_lifecycle_status_t', [
  'active', // Available for use
  'tombstoned', // Marked for deletion
  'deleted', // Fully deleted
]);
// Processing status for multi-asset creation
export const processing_status_t = pgEnum('processing_status_t', ['pending', 'processing', 'completed', 'failed']);
// Storage location enum
export const hosting_provider_t = pgEnum('hosting_provider_t', [
  'vercel',
  's3',
  'vercel_blob',
  'neon',
  'icp',
  'arweave',
  'ipfs',
]);
// Hosting preference enums
export const frontend_hosting_t = pgEnum('frontend_hosting_t', ['vercel', 'icp']);
export const backend_hosting_t = pgEnum('backend_hosting_t', ['vercel', 'icp']);
export const database_hosting_t = pgEnum('database_hosting_t', ['neon', 'icp']);
export const blob_hosting_t = pgEnum('blob_hosting_t', ['s3', 'vercel_blob', 'icp', 'arweave', 'ipfs', 'neon']);
// Memory Assets Enums - for multiple optimized assets per memory
export const asset_type_t = pgEnum('asset_type_t', [
  'original',
  'display',
  'thumb',
  'placeholder',
  'poster',
  'waveform',
]);
// Storage backend type
export const storage_backend_t = pgEnum('storage_backend_t', ['s3', 'vercel_blob', 'icp', 'arweave', 'ipfs', 'neon']);

// Users table - Core user data - required for auth.js
export const users = pgTable(
  'user',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text('name'),
    email: text('email').unique(),
    emailVerified: timestamp('emailVerified', { mode: 'date' }),
    image: text('image'),
    password: text('password'),
    username: text('username').unique(),
    parentId: text('parent_id'),
    invitedByAllUserId: text('invited_by_all_user_id'),
    invitedAt: timestamp('invited_at'),
    registrationStatus: text('registration_status', {
      enum: ['pending', 'visited', 'initiated', 'completed', 'declined', 'expired'],
    })
      .default('pending')
      .notNull(),
    userType: text('user_type', {
      enum: ['personal', 'professional'],
    })
      .default('personal')
      .notNull(),
    role: text('role', {
      enum: ['user', 'moderator', 'admin', 'developer', 'superadmin'],
    })
      .default('user')
      .notNull(),
    plan: text('plan', {
      enum: ['free', 'premium'],
    })
      .default('free')
      .notNull(),
    premiumExpiresAt: timestamp('premium_expires_at', { mode: 'date' }),
    activeDeploymentId: uuid('active_deployment_id').references(() => serviceDeployments.id, { onDelete: 'set null' }),
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
    foreignKey({
      columns: [table.invitedByAllUserId],
      foreignColumns: [allUsers.id],
      name: 'user_invited_by_fk',
    }),
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
    userId: text('user_id'),
    temporaryUserId: text('temporary_user_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => [
    uniqueIndex('all_users_one_ref_guard').on(table.id)
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
    invitedByAllUserId: text('invited_by_all_user_id'),
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
    primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
    index('accounts_user_provider_idx').on(account.userId, account.provider),
    index('accounts_user_idx').on(account.userId),
  ]
);

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
  format?: string;
};
export type ImageMetadata = CommonFileMetadata & {
  dimensions?: { width: number; height: number };
};
export type CustomMetadata = {
  [key: string]: string | number | boolean | null;
};

export const MEMORY_TYPES = ['image', 'document', 'note', 'video', 'audio'] as const;
export const ACCESS_LEVELS = ['read', 'write'] as const;
export const MEMBER_ROLES = ['admin', 'member'] as const;

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
    status: memory_status_t('status').default('pending').notNull(),
    expiresAt: timestamp('expires_at'),
    tags: text('tags').array().default([]),
    recipients: text('recipients').array().default([]),
    fileCreatedAt: timestamp('file_created_at', { mode: 'date' }),
    unlockDate: timestamp('unlock_date', { mode: 'date' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at'),
    createdBy: text('created_by')
      .notNull()
      .references(() => users.id),
    updatedBy: text('updated_by').references(() => users.id),
    metadata: json('metadata')
      .$type<{
        originalPath?: string;
        custom?: Record<string, unknown>;
      }>()
      .default({}),
    storageLocations: storage_backend_t('storage_locations').array().default([]),
    storageDuration: integer('storage_duration'),
    storageCount: integer('storage_count').default(0),
  },
  table => [
    index('memories_owner_created_idx').on(table.ownerId, table.createdAt.desc()),
    index('memories_status_updated_idx').on(table.status, table.updatedAt.desc()),
    index('memories_expires_at_idx').on(table.expiresAt),
    index('memories_type_idx').on(table.type),
    index('memories_public_idx').on(table.isPublic),
    index('memories_tags_idx').on(table.tags),
    index('memories_storage_locations_idx').on(table.storageLocations),
    index('memories_storage_duration_idx').on(table.storageDuration),
    check(
      'memories_expires_at_check',
      sql`expires_at IS NULL OR (SELECT COUNT(*) FROM memory_assets WHERE memory_assets.memory_id = memories.id AND memory_assets.upload_status = 'pending') > 0`
    ),
  ]
);

export const memoryAssets = pgTable(
  'memory_assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    memoryId: uuid('memory_id')
      .notNull()
      .references(() => memories.id, { onDelete: 'cascade' }),
    variantOfAssetId: uuid('variant_of_asset_id').references(() => memoryAssets.id),
    variantType: text('variant_type', { enum: ['display', 'thumb'] }),
    assetType: asset_type_t('asset_type').notNull(),
    url: text('url').notNull(),
    storageBackend: storage_backend_t('storage_backend').notNull(),
    bucket: text('bucket'),
    storageKey: text('storage_key').notNull(),
    recipeVersion: text('recipe_version').default('v1'),
    transformSpec: jsonb('transform_spec').$type<{
      displayMaxSize: number;
      thumbMaxSize: number;
      displayQuality: number;
      thumbQuality: number;
      displayFormat: 'avif' | 'webp';
      thumbFormat: 'webp';
    }>(),
    bytes: bigint('bytes', { mode: 'number' }).notNull(),
    width: integer('width'),
    height: integer('height'),
    colorSpace: text('color_space'),
    iccProfile: text('icc_profile'),
    megapixels: integer('megapixels'),
    mimeType: text('mime_type').notNull(),
    uploadStatus: asset_upload_status_t('upload_status').default('pending'),
    processingStatus: processing_status_t('processing_status').default('pending'),
    lifecycleStatus: asset_lifecycle_status_t('lifecycle_status').default('active'),
    storageVisibility: text('storage_visibility', { enum: ['public', 'private'] }).default('private'),
    contentHash: text('content_hash'),
    computedBy: text('computed_by', { enum: ['client', 'server'] }),
    etag: text('etag'),
    retryCount: integer('retry_count').default(0).notNull(),
    maxRetries: integer('max_retries').default(3).notNull(),
    originalName: text('original_name'),
    originalMimeType: text('original_mime_type'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at'),
  },
  table => [
    unique('memory_assets_variant_of_unique').on(table.variantOfAssetId, table.variantType),
    index('memory_assets_memory_idx').on(table.memoryId),
    index('memory_assets_type_idx').on(table.assetType),
    index('memory_assets_url_idx').on(table.url),
    index('memory_assets_storage_idx').on(table.storageBackend, table.storageKey),
    index('memory_assets_content_hash_idx').on(table.contentHash),
    check('memory_assets_bytes_positive', sql`${table.bytes} > 0`),
    check(
      'memory_assets_dimensions_positive',
      sql`(${table.width} IS NULL OR ${table.width} > 0) AND (${table.height} IS NULL OR ${table.height} > 0)`
    ),
    check('memory_assets_variant_check', sql`(variant_of_asset_id IS NULL) = (variant_type IS NULL)`),
    check(
      'memory_assets_processing_status_check',
      sql`processing_status = 'completed' OR (width IS NULL AND height IS NULL)`
    ),
    check('memory_assets_megapixels_check', sql`megapixels IS NULL OR megapixels <= 80`),
  ]
);

export const folders = pgTable(
  'folders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => allUsers.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    parentFolderId: uuid('parent_folder_id'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => [index('folders_owner_idx').on(table.ownerId), index('folders_parent_idx').on(table.parentFolderId)]
);

export const imageDetails = pgTable('image_details', {
  memoryId: uuid('memory_id')
    .primaryKey()
    .references(() => memories.id, { onDelete: 'cascade' }),
  width: integer('width'),
  height: integer('height'),
  camera: text('camera'),
  focal: integer('focal'),
  iso: integer('iso'),
  aperture: text('aperture'),
  shutterSpeed: text('shutter_speed'),
  orientation: integer('orientation'),
});

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

export const documentDetails = pgTable('document_details', {
  memoryId: uuid('memory_id')
    .primaryKey()
    .references(() => memories.id, { onDelete: 'cascade' }),
  pages: integer('pages'),
  mimeType: text('mime_type'),
});

export const audioDetails = pgTable('audio_details', {
  memoryId: uuid('memory_id')
    .primaryKey()
    .references(() => memories.id, { onDelete: 'cascade' }),
  durationMs: integer('duration_ms'),
  bitrate: integer('bitrate'),
  sampleRate: integer('sample_rate'),
  channels: integer('channels'),
});

export const noteDetails = pgTable('note_details', {
  memoryId: uuid('memory_id')
    .primaryKey()
    .references(() => memories.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
});

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
    role: text('role').default('subject'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  table => [
    uniqueIndex('people_in_memories_unique').on(table.memoryId, table.allUserId),
    index('people_in_memories_memory_idx').on(table.memoryId),
    index('people_in_memories_user_idx').on(table.allUserId),
  ]
);

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
    uniqueIndex('memory_likes_unique').on(table.memoryId, table.allUserId),
    index('memory_likes_memory_idx').on(table.memoryId),
    index('memory_likes_user_idx').on(table.allUserId),
  ]
);

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
    parentCommentId: uuid('parent_comment_id'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at'),
  },
  table => [
    index('memory_comments_memory_created_idx').on(table.memoryId, table.createdAt.desc()),
    index('memory_comments_user_idx').on(table.allUserId),
    index('memory_comments_parent_idx').on(table.parentCommentId),
  ]
);

export const RELATIONSHIP_TYPES = ['friend', 'colleague', 'acquaintance', 'family', 'other'] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];
export const SHARING_RELATIONSHIP_TYPES = [
  'close_family',
  'family',
  'partner',
  'close_friend',
  'friend',
  'colleague',
  'acquaintance',
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

export const memoryShares = pgTable('memory_share', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  memoryId: uuid('memory_id').notNull(),
  memoryType: text('memory_type', { enum: MEMORY_TYPES }).notNull(),
  ownerId: text('owner_id')
    .notNull()
    .references(() => allUsers.id, { onDelete: 'cascade' }),
  sharedWithType: text('shared_with_type', {
    enum: ['user', 'group', 'relationship'],
  }).notNull(),
  sharedWithId: text('shared_with_id').references(() => allUsers.id, { onDelete: 'cascade' }),
  groupId: text('group_id').references(() => group.id, { onDelete: 'cascade' }),
  sharedRelationshipType: text('shared_relationship_type', {
    enum: SHARING_RELATIONSHIP_TYPES,
  }),
  accessLevel: text('access_level', { enum: ACCESS_LEVELS }).default('read').notNull(),
  inviteeSecureCode: text('invitee_secure_code').notNull(),
  inviteeSecureCodeCreatedAt: timestamp('secure_code_created_at', { mode: 'date' }).notNull().defaultNow(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

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
  relationshipClarity: text('relationship_clarity', {
    enum: ['resolved', 'fuzzy'],
  })
    .default('fuzzy')
    .notNull(),
  sharedAncestorId: text('shared_ancestor_id').references(() => allUsers.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const businessRelationship = pgTable(
  'business_relationship',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    businessId: text('business_id')
      .notNull()
      .references(() => allUsers.id, { onDelete: 'cascade' }),
    clientId: text('client_id').references(() => allUsers.id, { onDelete: 'cascade' }),
    clientName: text('client_name'),
    clientEmail: text('client_email'),
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
    index('business_relationship_business_idx').on(table.businessId),
    index('business_relationship_client_idx').on(table.clientId),
  ]
);

export const PRIMARY_RELATIONSHIP_ROLES = ['son', 'daughter', 'father', 'mother', 'sibling', 'spouse'] as const;
export type PrimaryRelationshipRole = (typeof PRIMARY_RELATIONSHIP_ROLES)[number];
export const familyMember = pgTable(
  'family_member',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    ownerId: text('owner_id')
      .notNull()
      .references(() => allUsers.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => allUsers.id, { onDelete: 'set null' }),
    fullName: text('full_name').notNull(),
    primaryRelationship: text('primary_relationship', { enum: PRIMARY_RELATIONSHIP_ROLES }).notNull(),
    fuzzyRelationships: text('fuzzy_relationships', { enum: FAMILY_RELATIONSHIP_TYPES }).array().notNull().default([]),
    birthDate: timestamp('birth_date', { mode: 'date' }),
    deathDate: timestamp('death_date', { mode: 'date' }),
    birthplace: text('birthplace'),
    metadata: json('metadata').$type<{ notes?: string }>().default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [allUsers.id],
      name: 'family_member_user_fk',
    }),
  ]
);

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
    totalMemories: integer('total_memories').default(0),
    storageLocations: storage_backend_t('storage_locations').array().default([]),
    averageStorageDuration: integer('average_storage_duration'),
    storageDistribution: json('storage_distribution').$type<Record<string, number>>().default({}),
  },
  table => [
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
    memoryType: text('memory_type', { enum: MEMORY_TYPES }).notNull(),
    position: integer('position').notNull(),
    caption: text('caption'),
    isFeatured: boolean('is_featured').default(false).notNull(),
    metadata: json('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  t => [
    index('gallery_items_gallery_position_idx').on(t.galleryId, t.position),
    uniqueIndex('gallery_items_gallery_memory_uq').on(t.galleryId, t.memoryId, t.memoryType),
    index('gallery_items_by_memory_idx').on(t.memoryId, t.memoryType),
  ]
);

export const iiNonces = pgTable(
  'ii_nonce',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    nonceHash: text('nonce_hash').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
    usedAt: timestamp('used_at', { mode: 'date' }),
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
    index('ii_nonces_hash_idx').on(table.nonceHash),
    index('ii_nonces_expires_idx').on(table.expiresAt),
    index('ii_nonces_used_idx').on(table.usedAt),
    index('ii_nonces_active_idx').on(table.usedAt, table.expiresAt),
    index('ii_nonces_created_idx').on(table.createdAt),
  ]
);

export const storageEdges = pgTable(
  'storage_edges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    memoryId: uuid('memory_id').notNull(),
    memoryType: memory_type_t('memory_type').notNull(),
    artifact: artifact_t('artifact').notNull(),
    backend: storage_backend_t('backend').notNull(),
    present: boolean('present').notNull().default(false),
    location: text('location'),
    contentHash: text('content_hash'),
    sizeBytes: bigint('size_bytes', { mode: 'number' }),
    syncState: sync_t('sync_state').notNull().default('idle'),
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

export const memoryMetadata = pgTable(
  'memory_metadata',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    memoryId: uuid('memory_id').notNull(),
    memoryType: memory_type_t('memory_type').notNull(),
    universalData: json('universal_data').$type<{
      gps?: {
        latitude?: number;
        longitude?: number;
        altitude?: number;
      };
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

export const syncStatus = sql<DBSyncStatus>`SELECT * FROM sync_status`.as('sync_status');
export const getSyncStatusByState = (syncState: 'migrating' | 'failed') =>
  sql<DBSyncStatus>`SELECT * FROM sync_status WHERE sync_state = ${syncState}`;
export const getStuckSyncs = () => sql<DBSyncStatus>`SELECT * FROM sync_status WHERE is_stuck = true`;
export const getSyncStatusByBackend = (backend: 'neon-db' | 'vercel-blob' | 'icp-canister') =>
  sql<DBSyncStatus>`SELECT * FROM sync_status WHERE backend = ${backend}`;

// Drizzle Relations
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

// Hosting Preferences Tables
export const userHostingPreferences = pgTable(
  'user_hosting_preferences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    frontendHosting: frontend_hosting_t('frontend_hosting').default('vercel').notNull(),
    backendHosting: backend_hosting_t('backend_hosting').default('vercel').notNull(),
    databaseHosting: database_hosting_t('database_hosting').default('neon').notNull(),
    blobHosting: blob_hosting_t('blob_hosting').default('vercel_blob').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    userIdIdx: uniqueIndex('user_hosting_preferences_user_id_idx').on(table.userId),
  })
);

export const serviceDeployments = pgTable(
  'service_deployments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    frontendLocation: frontend_hosting_t('frontend_location').notNull(),
    backendLocation: backend_hosting_t('backend_location').notNull(),
    databaseLocation: database_hosting_t('database_location').notNull(),
    blobLocation: blob_hosting_t('blob_location').notNull(),
    isActive: boolean('is_active').default(false).notNull(),
    deployedAt: timestamp('deployed_at').defaultNow().notNull(),
    lastCheckedAt: timestamp('last_checked_at'),
    deploymentMetadata: json('deployment_metadata')
      .$type<{
        version?: string;
        region?: string;
        url?: string;
        status?: 'deploying' | 'active' | 'failed' | 'deleting' | 'migrating';
        error?: string;
        migration?: {
          from: string;
          startedAt: string;
          progress?: number;
        };
      }>()
      .default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    activeDeploymentIdx: index('service_deployments_user_active_idx').on(table.userId, table.isActive),
    userIdx: index('service_deployments_user_idx').on(table.userId),
  })
);

// Idempotency Keys Table
export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    id: text('id').primaryKey(),
    operation: text('operation').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: text('status', {
      enum: ['pending', 'completed', 'failed'],
    })
      .notNull()
      .default('pending'),
    requestParams: jsonb('request_params'),
    result: jsonb('result'),
    error: jsonb('error'),
    attemptCount: integer('attempt_count').default(0).notNull(),
    maxAttempts: integer('max_attempts').default(3).notNull(),
    lastAttemptAt: timestamp('last_attempt_at'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    lockedUntil: timestamp('locked_until'),
    lockedBy: text('locked_by'),
  },
  table => ({
    userStatusIdx: index('idempotency_keys_user_status_idx').on(table.userId, table.status, table.expiresAt),
    expiresAtIdx: index('idempotency_keys_expires_at_idx')
      .on(table.expiresAt)
      .where(sql`${table.status} != 'completed'`),
    uniquePendingOp: uniqueIndex('idempotency_keys_pending_uniq')
      .on(table.id, table.status)
      .where(sql`${table.status} = 'pending'`),
    checkStatus: check(
      'idempotency_keys_status_check',
      sql`(
        (${table.status} = 'pending' AND ${table.lockedUntil} IS NOT NULL) OR
        (${table.status} IN ('completed', 'failed') AND ${table.lockedUntil} IS NULL)
      )`
    ),
    checkExpiry: check('idempotency_keys_expiry_check', sql`${table.expiresAt} > ${table.createdAt}`),
    checkAttempts: check('idempotency_keys_attempts_check', sql`${table.attemptCount} <= ${table.maxAttempts}`),
  })
);

// Background Jobs Table
export const backgroundJobs = pgTable(
  'background_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: text('type').notNull(),
    status: text('status', {
      enum: ['pending', 'running', 'completed', 'failed', 'retry', 'cancelled'],
    })
      .notNull()
      .default('pending'),
    priority: integer('priority').default(0).notNull(),
    scheduledAt: timestamp('scheduled_at').defaultNow().notNull(),
    runAt: timestamp('run_at'),
    progress: integer('progress').default(0),
    totalItems: integer('total_items'),
    processedItems: integer('processed_items').default(0),
    result: jsonb('result'),
    error: jsonb('error'),
    retryCount: integer('retry_count').default(0).notNull(),
    maxRetries: integer('max_retries').default(3).notNull(),
    lastError: text('last_error'),
    nextRetryAt: timestamp('next_retry_at'),
    context: jsonb('context').default({}),
    createdBy: text('created_by'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
  },
  table => ({
    statusRunAtIdx: index('background_jobs_status_run_at_idx').on(table.status, table.runAt, table.priority.desc()),
    createdAtIdx: index('background_jobs_created_at_idx').on(table.createdAt),
    typeStatusIdx: index('background_jobs_type_status_idx').on(table.type, table.status, table.scheduledAt),
    checkProgress: check('background_jobs_progress_check', sql`${table.progress} >= 0 AND ${table.progress} <= 100`),
    checkRetries: check('background_jobs_retries_check', sql`${table.retryCount} <= ${table.maxRetries}`),
    checkTiming: check(
      'background_jobs_timing_check',
      sql`(
        (${table.status} = 'pending' AND ${table.startedAt} IS NULL) OR
        (${table.status} = 'running' AND ${table.startedAt} IS NOT NULL) OR
        (${table.status} IN ('completed', 'failed', 'cancelled') AND
         ${table.startedAt} IS NOT NULL AND
         ${table.completedAt} IS NOT NULL)
      )`
    ),
  })
);

// S3 Configurations Table
export const s3Configurations = pgTable(
  's3_configurations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    endpoint: text('endpoint').notNull(),
    region: text('region').notNull(),
    bucket: text('bucket').notNull(),
    accessKeyId: text('access_key_id').notNull(),
    secretAccessKey: text('secret_access_key').notNull(),
    pathStyle: boolean('path_style').default(false),
    sslEnabled: boolean('ssl_enabled').default(true),
    port: integer('port'),
    isValid: boolean('is_valid').default(false),
    lastValidatedAt: timestamp('last_validated_at'),
    validationError: text('validation_error'),
    totalAssets: integer('total_assets').default(0),
    totalBytes: bigint('total_bytes', { mode: 'number' }).default(0),
    isDefault: boolean('is_default').default(false),
    tags: jsonb('tags').default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    userIdx: index('s3_configs_user_idx').on(table.userId, table.isDefault.desc()),
    uniqueDefaultPerUser: uniqueIndex('s3_configs_user_default_uniq')
      .on(table.userId, table.isDefault)
      .where(sql`${table.isDefault} = true`),
    checkPort: check(
      's3_configs_port_check',
      sql`${table.port} IS NULL OR (${table.port} > 0 AND ${table.port} <= 65535)`
    ),
  })
);

// Asset Delete Jobs Table
export const assetDeleteJobs = pgTable(
  'asset_delete_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: text('status', {
      enum: ['pending', 'processing', 'completed', 'failed', 'partially_failed'],
    })
      .notNull()
      .default('pending'),
    assetIds: uuid('asset_ids').array().notNull(),
    storageBackend: storage_backend_t('storage_backend').notNull(),
    totalAssets: integer('total_assets').notNull(),
    processedAssets: integer('processed_assets').default(0).notNull(),
    failedAssets: integer('failed_assets').default(0).notNull(),
    results: jsonb('results'),
    error: text('error'),
    retryCount: integer('retry_count').default(0).notNull(),
    maxRetries: integer('max_retries').default(3).notNull(),
    nextRetryAt: timestamp('next_retry_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
  },
  table => ({
    statusIdx: index('asset_delete_jobs_status_idx').on(table.status, table.nextRetryAt),
    userIdx: index('asset_delete_jobs_user_idx').on(table.userId, table.createdAt.desc()),
    checkCounts: check(
      'asset_delete_jobs_counts_check',
      sql`${table.processedAssets} + ${table.failedAssets} <= ${table.totalAssets}`
    ),
    checkStatus: check(
      'asset_delete_jobs_status_check',
      sql`(
        (${table.status} = 'pending' AND ${table.startedAt} IS NULL) OR
        (${table.status} = 'processing' AND ${table.startedAt} IS NOT NULL) OR
        (${table.status} IN ('completed', 'failed', 'partially_failed') AND
         ${table.startedAt} IS NOT NULL)
      )`
    ),
  })
);

// Blobs Table
export const blobs = pgTable(
  'blobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contentHash: text('content_hash').notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
    mimeType: text('mime_type'),
    storageBackend: storage_backend_t('storage_backend').notNull(),
    storageKey: text('storage_key').notNull(),
    storageBucket: text('storage_bucket'),
    referenceCount: integer('reference_count').default(1).notNull(),
    isPublic: boolean('is_public').default(false).notNull(),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    lastAccessedAt: timestamp('last_accessed_at').defaultNow().notNull(),
    expiresAt: timestamp('expires_at'),
  },
  table => ({
    contentHashIdx: uniqueIndex('blobs_content_hash_idx').on(table.contentHash, table.storageBackend),
    storageIdx: index('blobs_storage_idx').on(table.storageBackend, table.storageKey, table.storageBucket),
    refCountIdx: index('blobs_ref_count_idx')
      .on(table.referenceCount, table.lastAccessedAt)
      .where(sql`${table.referenceCount} <= 0`),
    expiresAtIdx: index('blobs_expires_at_idx')
      .on(table.expiresAt)
      .where(sql`${table.expiresAt} IS NOT NULL`),
  })
);

// Upload Sessions Table
export const uploadSessions = pgTable(
  'upload_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    fileName: text('file_name').notNull(),
    fileSize: bigint('file_size', { mode: 'number' }).notNull(),
    fileType: text('file_type').notNull(),
    status: text('status', {
      enum: ['pending', 'uploading', 'processing', 'completed', 'failed', 'aborted'],
    })
      .notNull()
      .default('pending'),
    chunkSize: integer('chunk_size'),
    totalChunks: integer('total_chunks'),
    uploadedChunks: integer('uploaded_chunks').default(0).notNull(),
    storageBackend: storage_backend_t('storage_backend').notNull(),
    storageKey: text('storage_key'),
    contentHash: text('content_hash'),
    error: text('error'),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    expiresAt: timestamp('expires_at').notNull(),
  },
  table => ({
    userStatusIdx: index('upload_sessions_user_status_idx').on(table.userId, table.status, table.expiresAt),
    expiresAtIdx: index('upload_sessions_expires_at_idx').on(table.expiresAt),
    checkChunks: check(
      'upload_sessions_chunks_check',
      sql`(
        ${table.chunkSize} IS NULL OR
        (${table.chunkSize} > 0 AND
         ${table.totalChunks} IS NOT NULL AND
         ${table.uploadedChunks} <= ${table.totalChunks})
      )`
    ),
    checkStatus: check(
      'upload_sessions_status_check',
      sql`(
        (${table.status} = 'completed' AND ${table.storageKey} IS NOT NULL) OR
        (${table.status} != 'completed')
      )`
    ),
  })
);

// Upload Chunks Table
export const uploadChunks = pgTable(
  'upload_chunks',
  {
    uploadSessionId: uuid('upload_session_id')
      .notNull()
      .references(() => uploadSessions.id, { onDelete: 'cascade' }),
    chunkNumber: integer('chunk_number').notNull(),
    chunkSize: integer('chunk_size').notNull(),
    storageBackend: storage_backend_t('storage_backend').notNull(),
    storageKey: text('storage_key').notNull(),
    contentHash: text('content_hash'),
    status: text('status', {
      enum: ['pending', 'uploaded', 'verified', 'failed'],
    })
      .notNull()
      .default('pending'),
    error: text('error'),
    uploadedAt: timestamp('uploaded_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    pk: primaryKey(table.uploadSessionId, table.chunkNumber),
    sessionStatusIdx: index('upload_chunks_session_status_idx').on(
      table.uploadSessionId,
      table.status,
      table.chunkNumber
    ),
    storageIdx: index('upload_chunks_storage_idx').on(table.storageBackend, table.storageKey),
  })
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
export type DBMemoryShare = typeof memoryShares.$inferSelect;
export type NewDBMemoryShare = typeof memoryShares.$inferInsert;
export type DBGroup = typeof group.$inferSelect;
export type NewDBGroup = typeof group.$inferInsert;
export type DBGroupMember = typeof groupMember.$inferSelect;
export type NewDBGroupMember = typeof groupMember.$inferInsert;
export type DBGallery = typeof galleries.$inferSelect;
export type NewDBGallery = typeof galleries.$inferInsert;
export type DBGalleryItem = typeof galleryItems.$inferSelect;
export type NewDBGalleryItem = typeof galleryItems.$inferInsert;
export type DBGalleryShare = typeof galleryShares.$inferSelect;
export type NewDBGalleryShare = typeof galleryShares.$inferInsert;
export type DBIINonce = typeof iiNonces.$inferSelect;
export type NewDBIINonce = typeof iiNonces.$inferInsert;
export type DBStorageEdge = typeof storageEdges.$inferSelect;
export type NewDBStorageEdge = typeof storageEdges.$inferInsert;
export type DBMemoryMetadata = typeof memoryMetadata.$inferSelect;
export type NewDBMemoryMetadata = typeof memoryMetadata.$inferInsert;
export type DBMemory = typeof memories.$inferSelect;
export type NewDBMemory = typeof memories.$inferInsert;
export type DBMemoryAsset = typeof memoryAssets.$inferSelect;
export type NewDBMemoryAsset = typeof memoryAssets.$inferInsert;
export type DBMemoryWithAssets = DBMemory & {
  assets: DBMemoryAsset[];
};
export type AssetType = (typeof asset_type_t.enumValues)[number];
export type ProcessingStatus = (typeof processing_status_t.enumValues)[number];
export type StorageBackend = (typeof storage_backend_t.enumValues)[number];
export type DBFolder = typeof folders.$inferSelect;
export type NewDBFolder = typeof folders.$inferInsert;
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
export type DBMemoryWithDetails = DBMemory & {
  assets: DBMemoryAsset[];
  folder?: DBFolder | null;
  imageDetails?: DBImageDetails | null;
  videoDetails?: DBVideoDetails | null;
  documentDetails?: DBDocumentDetails | null;
  audioDetails?: DBAudioDetails | null;
  noteDetails?: DBNoteDetails | null;
};
export type DBRelationship = typeof relationship.$inferSelect;
export type DBFamilyRelationship = typeof familyRelationship.$inferSelect;
export type DBBusinessRelationship = typeof businessRelationship.$inferSelect;
export type NewDBBusinessRelationship = typeof businessRelationship.$inferInsert;
export type UserHostingPreference = typeof userHostingPreferences.$inferSelect;
export type NewUserHostingPreference = typeof userHostingPreferences.$inferInsert;
export type ServiceDeployment = typeof serviceDeployments.$inferSelect;
export type NewServiceDeployment = typeof serviceDeployments.$inferInsert;
export type IdempotencyKey = typeof idempotencyKeys.$inferSelect;
export type NewIdempotencyKey = typeof idempotencyKeys.$inferInsert;
export type BackgroundJob = typeof backgroundJobs.$inferSelect;
export type NewBackgroundJob = typeof backgroundJobs.$inferInsert;
export type S3Configuration = typeof s3Configurations.$inferSelect;
export type NewS3Configuration = typeof s3Configurations.$inferInsert;
export type AssetDeleteJob = typeof assetDeleteJobs.$inferSelect;
export type NewAssetDeleteJob = typeof assetDeleteJobs.$inferInsert;
export type Blob = typeof blobs.$inferSelect;
export type NewBlob = typeof blobs.$inferInsert;
export type UploadSession = typeof uploadSessions.$inferSelect;
export type NewUploadSession = typeof uploadSessions.$inferInsert;
export type UploadChunk = typeof uploadChunks.$inferSelect;
export type NewUploadChunk = typeof uploadChunks.$inferInsert;
export type MemoryType = (typeof MEMORY_TYPES)[number];
export type AccessLevel = (typeof ACCESS_LEVELS)[number];
export type MemberRole = (typeof MEMBER_ROLES)[number];
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
