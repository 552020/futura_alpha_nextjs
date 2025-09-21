import {
  pgTable,
  uniqueIndex,
  text,
  timestamp,
  foreignKey,
  uuid,
  integer,
  unique,
  boolean,
  index,
  json,
  check,
  bigint,
  serial,
  varchar,
  jsonb,
  primaryKey,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const artifactT = pgEnum('artifact_t', ['metadata', 'asset']);
export const assetTypeT = pgEnum('asset_type_t', ['original', 'display', 'thumb', 'placeholder', 'poster', 'waveform']);
export const backendHostingT = pgEnum('backend_hosting_t', ['vercel', 'icp']);
export const backendT = pgEnum('backend_t', ['neon-db', 'vercel-blob', 'icp-canister']);
export const blobHostingT = pgEnum('blob_hosting_t', ['s3', 'vercel_blob', 'icp', 'arweave', 'ipfs', 'neon']);
export const databaseHostingT = pgEnum('database_hosting_t', ['neon', 'icp']);
export const frontendHostingT = pgEnum('frontend_hosting_t', ['vercel', 'icp']);
export const memoryTypeT = pgEnum('memory_type_t', ['image', 'video', 'note', 'document', 'audio']);
export const processingStatusT = pgEnum('processing_status_t', ['pending', 'processing', 'completed', 'failed']);
export const storageBackendT = pgEnum('storage_backend_t', ['s3', 'vercel_blob', 'icp', 'arweave', 'ipfs', 'neon']);
export const storageLocationT = pgEnum('storage_location_t', ['neon-db', 'vercel-blob', 'icp-canister', 'aws-s3']);
export const storagePrefT = pgEnum('storage_pref_t', ['neon', 'icp', 'dual']);
export const syncT = pgEnum('sync_t', ['idle', 'migrating', 'failed']);

export const allUser = pgTable(
  'all_user',
  {
    id: text().primaryKey().notNull(),
    type: text().notNull(),
    userId: text('user_id'),
    temporaryUserId: text('temporary_user_id'),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    uniqueIndex('all_users_one_ref_guard').using('btree', table.id.asc().nullsLast().op('text_ops')).where(sql`((
CASE
    WHEN (user_id IS NOT NULL) THEN 1
    ELSE 0
END +
CASE
    WHEN (temporary_user_id IS NOT NULL) THEN 1
    ELSE 0
END) = 1)`),
  ]
);

export const audioDetails = pgTable(
  'audio_details',
  {
    memoryId: uuid('memory_id').primaryKey().notNull(),
    durationMs: integer('duration_ms'),
    bitrate: integer(),
    sampleRate: integer('sample_rate'),
    channels: integer(),
  },
  table => [
    foreignKey({
      columns: [table.memoryId],
      foreignColumns: [memories.id],
      name: 'audio_details_memory_id_memories_id_fk',
    }).onDelete('cascade'),
  ]
);

export const authenticator = pgTable(
  'authenticator',
  {
    credentialId: text().notNull(),
    userId: text().notNull(),
    providerAccountId: text().notNull(),
    credentialPublicKey: text().notNull(),
    counter: integer().notNull(),
    credentialDeviceType: text().notNull(),
    credentialBackedUp: boolean().notNull(),
    transports: text(),
  },
  table => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: 'authenticator_userId_user_id_fk',
    }).onDelete('cascade'),
    unique('authenticator_credentialID_unique').on(table.credentialId),
  ]
);

export const businessRelationship = pgTable(
  'business_relationship',
  {
    id: text().primaryKey().notNull(),
    businessId: text('business_id').notNull(),
    clientId: text('client_id'),
    clientName: text('client_name'),
    clientEmail: text('client_email'),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    index('business_relationship_business_idx').using('btree', table.businessId.asc().nullsLast().op('text_ops')),
    index('business_relationship_client_idx').using('btree', table.clientId.asc().nullsLast().op('text_ops')),
    foreignKey({
      columns: [table.businessId],
      foreignColumns: [allUser.id],
      name: 'business_relationship_business_id_all_user_id_fk',
    }),
    foreignKey({
      columns: [table.clientId],
      foreignColumns: [allUser.id],
      name: 'business_relationship_client_id_all_user_id_fk',
    }),
  ]
);

export const documentDetails = pgTable(
  'document_details',
  {
    memoryId: uuid('memory_id').primaryKey().notNull(),
    pages: integer(),
    mimeType: text('mime_type'),
  },
  table => [
    foreignKey({
      columns: [table.memoryId],
      foreignColumns: [memories.id],
      name: 'document_details_memory_id_memories_id_fk',
    }).onDelete('cascade'),
  ]
);

export const familyMember = pgTable(
  'family_member',
  {
    id: text().primaryKey().notNull(),
    ownerId: text('owner_id').notNull(),
    userId: text('user_id'),
    fullName: text('full_name').notNull(),
    primaryRelationship: text('primary_relationship').notNull(),
    fuzzyRelationships: text('fuzzy_relationships').array().default(['']).notNull(),
    birthDate: timestamp('birth_date', { mode: 'string' }),
    deathDate: timestamp('death_date', { mode: 'string' }),
    birthplace: text(),
    metadata: json().default({}),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    foreignKey({
      columns: [table.ownerId],
      foreignColumns: [allUser.id],
      name: 'family_member_owner_id_all_user_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [allUser.id],
      name: 'family_member_user_id_all_user_id_fk',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [allUser.id],
      name: 'family_member_user_fk',
    }),
  ]
);

export const familyRelationship = pgTable(
  'family_relationship',
  {
    id: text().primaryKey().notNull(),
    relationshipId: text('relationship_id').notNull(),
    familyRole: text('family_role').notNull(),
    relationshipClarity: text('relationship_clarity').default('fuzzy').notNull(),
    sharedAncestorId: text('shared_ancestor_id'),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    foreignKey({
      columns: [table.relationshipId],
      foreignColumns: [relationship.id],
      name: 'family_relationship_relationship_id_relationship_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.sharedAncestorId],
      foreignColumns: [allUser.id],
      name: 'family_relationship_shared_ancestor_id_all_user_id_fk',
    }).onDelete('set null'),
  ]
);

export const folders = pgTable(
  'folders',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    ownerId: text('owner_id').notNull(),
    name: text().notNull(),
    parentFolderId: uuid('parent_folder_id'),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    index('folders_owner_idx').using('btree', table.ownerId.asc().nullsLast().op('text_ops')),
    index('folders_parent_idx').using('btree', table.parentFolderId.asc().nullsLast().op('uuid_ops')),
    foreignKey({
      columns: [table.ownerId],
      foreignColumns: [allUser.id],
      name: 'folders_owner_id_all_user_id_fk',
    }).onDelete('cascade'),
  ]
);

export const gallery = pgTable(
  'gallery',
  {
    id: text().primaryKey().notNull(),
    ownerId: text('owner_id').notNull(),
    title: text().notNull(),
    description: text(),
    isPublic: boolean('is_public').default(false).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
    totalMemories: integer('total_memories').default(0),
    storageLocations: storageLocationT('storage_locations').array().default(['neon-db']),
    averageStorageDuration: integer('average_storage_duration'),
    storageDistribution: json('storage_distribution').default({}),
  },
  table => [
    index('galleries_storage_duration_idx').using(
      'btree',
      table.averageStorageDuration.asc().nullsLast().op('int4_ops')
    ),
    index('galleries_storage_locations_idx').using('btree', table.storageLocations.asc().nullsLast().op('array_ops')),
    foreignKey({
      columns: [table.ownerId],
      foreignColumns: [allUser.id],
      name: 'gallery_owner_id_all_user_id_fk',
    }).onDelete('cascade'),
  ]
);

export const group = pgTable(
  'group',
  {
    id: text().primaryKey().notNull(),
    name: text().notNull(),
    ownerId: text('owner_id').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    metadata: json().default({}),
  },
  table => [
    foreignKey({
      columns: [table.ownerId],
      foreignColumns: [user.id],
      name: 'group_owner_id_user_id_fk',
    }).onDelete('cascade'),
  ]
);

export const galleryItem = pgTable(
  'gallery_item',
  {
    id: text().primaryKey().notNull(),
    galleryId: text('gallery_id').notNull(),
    memoryId: uuid('memory_id').notNull(),
    memoryType: text('memory_type').notNull(),
    position: integer().notNull(),
    caption: text(),
    isFeatured: boolean('is_featured').default(false).notNull(),
    metadata: json().default({}).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    index('gallery_items_by_memory_idx').using(
      'btree',
      table.memoryId.asc().nullsLast().op('text_ops'),
      table.memoryType.asc().nullsLast().op('uuid_ops')
    ),
    uniqueIndex('gallery_items_gallery_memory_uq').using(
      'btree',
      table.galleryId.asc().nullsLast().op('text_ops'),
      table.memoryId.asc().nullsLast().op('uuid_ops'),
      table.memoryType.asc().nullsLast().op('uuid_ops')
    ),
    index('gallery_items_gallery_position_idx').using(
      'btree',
      table.galleryId.asc().nullsLast().op('text_ops'),
      table.position.asc().nullsLast().op('int4_ops')
    ),
    foreignKey({
      columns: [table.galleryId],
      foreignColumns: [gallery.id],
      name: 'gallery_item_gallery_id_gallery_id_fk',
    }).onDelete('cascade'),
  ]
);

export const iiNonce = pgTable(
  'ii_nonce',
  {
    id: text().primaryKey().notNull(),
    nonceHash: text('nonce_hash').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { mode: 'string' }).notNull(),
    usedAt: timestamp('used_at', { mode: 'string' }),
    context: json().default({}),
  },
  table => [
    index('ii_nonces_active_idx').using(
      'btree',
      table.usedAt.asc().nullsLast().op('timestamp_ops'),
      table.expiresAt.asc().nullsLast().op('timestamp_ops')
    ),
    index('ii_nonces_created_idx').using('btree', table.createdAt.asc().nullsLast().op('timestamp_ops')),
    index('ii_nonces_expires_idx').using('btree', table.expiresAt.asc().nullsLast().op('timestamp_ops')),
    index('ii_nonces_hash_idx').using('btree', table.nonceHash.asc().nullsLast().op('text_ops')),
    index('ii_nonces_used_idx').using('btree', table.usedAt.asc().nullsLast().op('timestamp_ops')),
  ]
);

export const imageDetails = pgTable(
  'image_details',
  {
    memoryId: uuid('memory_id').primaryKey().notNull(),
    width: integer(),
    height: integer(),
    camera: text(),
    focal: integer(),
    iso: integer(),
    aperture: text(),
    shutterSpeed: text('shutter_speed'),
    orientation: integer(),
  },
  table => [
    foreignKey({
      columns: [table.memoryId],
      foreignColumns: [memories.id],
      name: 'image_details_memory_id_memories_id_fk',
    }).onDelete('cascade'),
  ]
);

export const memoryComments = pgTable(
  'memory_comments',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    memoryId: uuid('memory_id').notNull(),
    allUserId: text('all_user_id').notNull(),
    content: text().notNull(),
    parentCommentId: uuid('parent_comment_id'),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { mode: 'string' }),
  },
  table => [
    index('memory_comments_memory_created_idx').using(
      'btree',
      table.memoryId.asc().nullsLast().op('uuid_ops'),
      table.createdAt.desc().nullsLast().op('timestamp_ops')
    ),
    index('memory_comments_parent_idx').using('btree', table.parentCommentId.asc().nullsLast().op('uuid_ops')),
    index('memory_comments_user_idx').using('btree', table.allUserId.asc().nullsLast().op('text_ops')),
    foreignKey({
      columns: [table.memoryId],
      foreignColumns: [memories.id],
      name: 'memory_comments_memory_id_memories_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.allUserId],
      foreignColumns: [allUser.id],
      name: 'memory_comments_all_user_id_all_user_id_fk',
    }).onDelete('cascade'),
  ]
);

export const memoryLikes = pgTable(
  'memory_likes',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    memoryId: uuid('memory_id').notNull(),
    allUserId: text('all_user_id').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    index('memory_likes_memory_idx').using('btree', table.memoryId.asc().nullsLast().op('uuid_ops')),
    uniqueIndex('memory_likes_unique').using(
      'btree',
      table.memoryId.asc().nullsLast().op('uuid_ops'),
      table.allUserId.asc().nullsLast().op('uuid_ops')
    ),
    index('memory_likes_user_idx').using('btree', table.allUserId.asc().nullsLast().op('text_ops')),
    foreignKey({
      columns: [table.memoryId],
      foreignColumns: [memories.id],
      name: 'memory_likes_memory_id_memories_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.allUserId],
      foreignColumns: [allUser.id],
      name: 'memory_likes_all_user_id_all_user_id_fk',
    }).onDelete('cascade'),
  ]
);

export const memoryShare = pgTable(
  'memory_share',
  {
    id: text().primaryKey().notNull(),
    memoryId: uuid('memory_id').notNull(),
    memoryType: text('memory_type').notNull(),
    ownerId: text('owner_id').notNull(),
    sharedWithType: text('shared_with_type').notNull(),
    sharedWithId: text('shared_with_id'),
    groupId: text('group_id'),
    sharedRelationshipType: text('shared_relationship_type'),
    accessLevel: text('access_level').default('read').notNull(),
    inviteeSecureCode: text('invitee_secure_code').notNull(),
    secureCodeCreatedAt: timestamp('secure_code_created_at', { mode: 'string' }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    foreignKey({
      columns: [table.ownerId],
      foreignColumns: [allUser.id],
      name: 'memory_share_owner_id_all_user_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.sharedWithId],
      foreignColumns: [allUser.id],
      name: 'memory_share_shared_with_id_all_user_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.groupId],
      foreignColumns: [group.id],
      name: 'memory_share_group_id_group_id_fk',
    }).onDelete('cascade'),
  ]
);

export const memoryMetadata = pgTable(
  'memory_metadata',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    memoryId: uuid('memory_id').notNull(),
    memoryType: memoryTypeT('memory_type').notNull(),
    universalData: json('universal_data'),
    processingStatus: processingStatusT('processing_status').default('pending').notNull(),
    processingError: text('processing_error'),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    index('memory_metadata_memory_idx').using(
      'btree',
      table.memoryId.asc().nullsLast().op('uuid_ops'),
      table.memoryType.asc().nullsLast().op('enum_ops')
    ),
    index('memory_metadata_status_idx').using('btree', table.processingStatus.asc().nullsLast().op('enum_ops')),
    uniqueIndex('memory_metadata_unique').using(
      'btree',
      table.memoryId.asc().nullsLast().op('enum_ops'),
      table.memoryType.asc().nullsLast().op('enum_ops')
    ),
  ]
);

export const noteDetails = pgTable(
  'note_details',
  {
    memoryId: uuid('memory_id').primaryKey().notNull(),
    content: text().notNull(),
  },
  table => [
    foreignKey({
      columns: [table.memoryId],
      foreignColumns: [memories.id],
      name: 'note_details_memory_id_memories_id_fk',
    }).onDelete('cascade'),
  ]
);

export const peopleInMemories = pgTable(
  'people_in_memories',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    memoryId: uuid('memory_id').notNull(),
    allUserId: text('all_user_id').notNull(),
    role: text().default('subject'),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    index('people_in_memories_memory_idx').using('btree', table.memoryId.asc().nullsLast().op('uuid_ops')),
    uniqueIndex('people_in_memories_unique').using(
      'btree',
      table.memoryId.asc().nullsLast().op('uuid_ops'),
      table.allUserId.asc().nullsLast().op('uuid_ops')
    ),
    index('people_in_memories_user_idx').using('btree', table.allUserId.asc().nullsLast().op('text_ops')),
    foreignKey({
      columns: [table.memoryId],
      foreignColumns: [memories.id],
      name: 'people_in_memories_memory_id_memories_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.allUserId],
      foreignColumns: [allUser.id],
      name: 'people_in_memories_all_user_id_all_user_id_fk',
    }).onDelete('cascade'),
  ]
);

export const memoryAssets = pgTable(
  'memory_assets',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    memoryId: uuid('memory_id').notNull(),
    assetType: assetTypeT('asset_type').notNull(),
    variant: text(),
    url: text().notNull(),
    storageBackend: storageBackendT('storage_backend').notNull(),
    bucket: text(),
    storageKey: text('storage_key').notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    bytes: bigint({ mode: 'number' }).notNull(),
    width: integer(),
    height: integer(),
    mimeType: text('mime_type').notNull(),
    sha256: text(),
    processingStatus: processingStatusT('processing_status').default('pending').notNull(),
    processingError: text('processing_error'),
    deletedAt: timestamp('deleted_at', { mode: 'string' }),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    index('memory_assets_memory_idx').using('btree', table.memoryId.asc().nullsLast().op('uuid_ops')),
    index('memory_assets_storage_idx').using(
      'btree',
      table.storageBackend.asc().nullsLast().op('enum_ops'),
      table.storageKey.asc().nullsLast().op('enum_ops')
    ),
    index('memory_assets_type_idx').using('btree', table.assetType.asc().nullsLast().op('enum_ops')),
    uniqueIndex('memory_assets_unique').using(
      'btree',
      table.memoryId.asc().nullsLast().op('enum_ops'),
      table.assetType.asc().nullsLast().op('uuid_ops')
    ),
    index('memory_assets_url_idx').using('btree', table.url.asc().nullsLast().op('text_ops')),
    foreignKey({
      columns: [table.memoryId],
      foreignColumns: [memories.id],
      name: 'memory_assets_memory_id_memories_id_fk',
    }).onDelete('cascade'),
    check('memory_assets_bytes_positive', sql`bytes > 0`),
    check(
      'memory_assets_dimensions_positive',
      sql`((width IS NULL) OR (width > 0)) AND ((height IS NULL) OR (height > 0))`
    ),
  ]
);

export const relationship = pgTable(
  'relationship',
  {
    id: text().primaryKey().notNull(),
    userId: text('user_id').notNull(),
    relatedUserId: text('related_user_id').notNull(),
    type: text().notNull(),
    status: text().default('pending').notNull(),
    note: text(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    uniqueIndex('unique_relation_idx').using(
      'btree',
      table.userId.asc().nullsLast().op('text_ops'),
      table.relatedUserId.asc().nullsLast().op('text_ops')
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [allUser.id],
      name: 'relationship_user_id_all_user_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.relatedUserId],
      foreignColumns: [allUser.id],
      name: 'relationship_related_user_id_all_user_id_fk',
    }).onDelete('cascade'),
  ]
);

export const temporaryUser = pgTable(
  'temporary_user',
  {
    id: text().primaryKey().notNull(),
    name: text(),
    email: text(),
    secureCode: text('secure_code').notNull(),
    secureCodeExpiresAt: timestamp('secure_code_expires_at', { mode: 'string' }).notNull(),
    role: text().notNull(),
    invitedByAllUserId: text('invited_by_all_user_id'),
    registrationStatus: text('registration_status').default('pending').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
    metadata: json().default({}),
  },
  table => [
    foreignKey({
      columns: [table.invitedByAllUserId],
      foreignColumns: [allUser.id],
      name: 'temporary_user_invited_by_fk',
    }),
  ]
);

export const userHostingPreferences = pgTable(
  'user_hosting_preferences',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: text('user_id').notNull(),
    frontendHosting: frontendHostingT('frontend_hosting').default('vercel').notNull(),
    backendHosting: backendHostingT('backend_hosting').default('vercel').notNull(),
    databaseHosting: databaseHostingT('database_hosting').default('neon').notNull(),
    blobHosting: blobHostingT('blob_hosting').default('vercel_blob').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    uniqueIndex('user_hosting_preferences_user_id_idx').using('btree', table.userId.asc().nullsLast().op('text_ops')),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: 'user_hosting_preferences_user_id_user_id_fk',
    }).onDelete('cascade'),
  ]
);

export const serviceDeployments = pgTable(
  'service_deployments',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: text('user_id').notNull(),
    frontendLocation: frontendHostingT('frontend_location').notNull(),
    backendLocation: backendHostingT('backend_location').notNull(),
    databaseLocation: databaseHostingT('database_location').notNull(),
    blobLocation: text('blob_location').notNull(),
    isActive: boolean('is_active').default(false).notNull(),
    deployedAt: timestamp('deployed_at', { mode: 'string' }).defaultNow().notNull(),
    lastCheckedAt: timestamp('last_checked_at', { mode: 'string' }),
    deploymentMetadata: json('deployment_metadata').default({}),
  },
  table => [
    index('service_deployments_user_active_idx').using(
      'btree',
      table.userId.asc().nullsLast().op('text_ops'),
      table.isActive.asc().nullsLast().op('text_ops')
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: 'service_deployments_user_id_user_id_fk',
    }).onDelete('cascade'),
  ]
);

export const user = pgTable(
  'user',
  {
    id: text().primaryKey().notNull(),
    name: text(),
    email: text(),
    emailVerified: timestamp({ mode: 'string' }),
    image: text(),
    password: text(),
    username: text(),
    parentId: text('parent_id'),
    invitedByAllUserId: text('invited_by_all_user_id'),
    invitedAt: timestamp('invited_at', { mode: 'string' }),
    registrationStatus: text('registration_status').default('pending').notNull(),
    userType: text('user_type').default('personal').notNull(),
    role: text().default('user').notNull(),
    plan: text().default('free').notNull(),
    premiumExpiresAt: timestamp('premium_expires_at', { mode: 'string' }),
    storagePreference: storagePrefT('storage_preference').default('neon').notNull(),
    storagePrimaryStorage: backendT('storage_primary_storage').default('neon-db').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
    metadata: json().default({}),
  },
  table => [
    foreignKey({
      columns: [table.invitedByAllUserId],
      foreignColumns: [allUser.id],
      name: 'user_invited_by_fk',
    }),
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: 'user_parent_fk',
    }),
    unique('user_email_unique').on(table.email),
    unique('user_username_unique').on(table.username),
  ]
);

export const session = pgTable(
  'session',
  {
    sessionToken: text().primaryKey().notNull(),
    userId: text().notNull(),
    expires: timestamp({ mode: 'string' }).notNull(),
  },
  table => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: 'session_userId_user_id_fk',
    }).onDelete('cascade'),
  ]
);

export const memories = pgTable(
  'memories',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    ownerId: text('owner_id').notNull(),
    type: memoryTypeT().notNull(),
    title: text(),
    description: text(),
    isPublic: boolean('is_public').default(false).notNull(),
    ownerSecureCode: text('owner_secure_code').notNull(),
    parentFolderId: uuid('parent_folder_id'),
    tags: text().array().default(['']),
    recipients: text().array().default(['']),
    fileCreatedAt: timestamp('file_created_at', { mode: 'string' }),
    unlockDate: timestamp('unlock_date', { mode: 'string' }),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { mode: 'string' }),
    metadata: json().default({}),
    storageLocations: storageLocationT('storage_locations').array().default(['neon-db']),
    storageDuration: integer('storage_duration'),
    storageCount: integer('storage_count').default(0),
  },
  table => [
    index('memories_owner_created_idx').using(
      'btree',
      table.ownerId.asc().nullsLast().op('text_ops'),
      table.createdAt.desc().nullsLast().op('text_ops')
    ),
    index('memories_public_idx').using('btree', table.isPublic.asc().nullsLast().op('bool_ops')),
    index('memories_storage_duration_idx').using('btree', table.storageDuration.asc().nullsLast().op('int4_ops')),
    index('memories_storage_locations_idx').using('btree', table.storageLocations.asc().nullsLast().op('array_ops')),
    index('memories_tags_idx').using('btree', table.tags.asc().nullsLast().op('array_ops')),
    index('memories_type_idx').using('btree', table.type.asc().nullsLast().op('enum_ops')),
    foreignKey({
      columns: [table.ownerId],
      foreignColumns: [allUser.id],
      name: 'memories_owner_id_all_user_id_fk',
    }).onDelete('cascade'),
  ]
);

export const galleryShare = pgTable(
  'gallery_share',
  {
    id: text().primaryKey().notNull(),
    galleryId: text('gallery_id').notNull(),
    ownerId: text('owner_id').notNull(),
    sharedWithType: text('shared_with_type').notNull(),
    sharedWithId: text('shared_with_id'),
    groupId: text('group_id'),
    sharedRelationshipType: text('shared_relationship_type'),
    accessLevel: text('access_level').default('read').notNull(),
    inviteeSecureCode: text('invitee_secure_code').notNull(),
    secureCodeCreatedAt: timestamp('secure_code_created_at', { mode: 'string' }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    foreignKey({
      columns: [table.galleryId],
      foreignColumns: [gallery.id],
      name: 'gallery_share_gallery_id_gallery_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.ownerId],
      foreignColumns: [allUser.id],
      name: 'gallery_share_owner_id_all_user_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.sharedWithId],
      foreignColumns: [allUser.id],
      name: 'gallery_share_shared_with_id_all_user_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.groupId],
      foreignColumns: [group.id],
      name: 'gallery_share_group_id_group_id_fk',
    }).onDelete('cascade'),
  ]
);

export const videoDetails = pgTable(
  'video_details',
  {
    memoryId: uuid('memory_id').primaryKey().notNull(),
    durationMs: integer('duration_ms').notNull(),
    width: integer(),
    height: integer(),
    codec: text(),
    fps: text(),
  },
  table => [
    foreignKey({
      columns: [table.memoryId],
      foreignColumns: [memories.id],
      name: 'video_details_memory_id_memories_id_fk',
    }).onDelete('cascade'),
  ]
);

export const storageEdges = pgTable('storage_edges', {
  id: serial().primaryKey().notNull(),
  memoryId: integer('memory_id').notNull(),
  memoryType: varchar('memory_type', { length: 50 }).notNull(),
  artifact: varchar({ length: 50 }).notNull(),
  locationMetadata: jsonb('location_metadata'),
  locationAsset: varchar('location_asset', { length: 500 }),
  present: boolean().default(true),
  locationUrl: varchar('location_url', { length: 500 }),
  contentHash: varchar('content_hash', { length: 64 }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  sizeBytes: bigint('size_bytes', { mode: 'number' }),
  syncState: varchar('sync_state', { length: 50 }).default('pending'),
  lastSyncedAt: timestamp('last_synced_at', { mode: 'string' }),
  syncError: text('sync_error'),
  createdAt: timestamp('created_at', { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp('updated_at', { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const groupMember = pgTable(
  'group_member',
  {
    groupId: text('group_id').notNull(),
    userId: text('user_id').notNull(),
    role: text().default('member').notNull(),
  },
  table => [
    foreignKey({
      columns: [table.groupId],
      foreignColumns: [group.id],
      name: 'group_member_group_id_group_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: 'group_member_user_id_user_id_fk',
    }).onDelete('cascade'),
    primaryKey({ columns: [table.groupId, table.userId], name: 'group_member_group_id_user_id_pk' }),
  ]
);

export const verificationToken = pgTable(
  'verificationToken',
  {
    identifier: text().notNull(),
    token: text().notNull(),
    expires: timestamp({ mode: 'string' }).notNull(),
  },
  table => [primaryKey({ columns: [table.identifier, table.token], name: 'verificationToken_identifier_token_pk' })]
);

export const account = pgTable(
  'account',
  {
    userId: text().notNull(),
    type: text().notNull(),
    provider: text().notNull(),
    providerAccountId: text().notNull(),
    refreshToken: text('refresh_token'),
    accessToken: text('access_token'),
    expiresAt: integer('expires_at'),
    tokenType: text('token_type'),
    scope: text(),
    idToken: text('id_token'),
    sessionState: text('session_state'),
  },
  table => [
    index('accounts_user_idx').using('btree', table.userId.asc().nullsLast().op('text_ops')),
    index('accounts_user_provider_idx').using(
      'btree',
      table.userId.asc().nullsLast().op('text_ops'),
      table.provider.asc().nullsLast().op('text_ops')
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: 'account_userId_user_id_fk',
    }).onDelete('cascade'),
    primaryKey({ columns: [table.provider, table.providerAccountId], name: 'account_provider_providerAccountId_pk' }),
  ]
);
