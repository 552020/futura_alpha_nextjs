## Additional Schema Modifications 
This section consolidates all schema changes needed across the S3 implementation documents to perform all modifications at once.

### Memory API Implementation Specs

#### 1. Status Enums (Simplified & Clear)

```typescript
// Add to src/db/schema.ts

// Memory status - derived from asset states
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

// Processing status for multi-asset creation (Tech Lead Surgical Fixes)
export const processing_status_t = pgEnum('processing_status_t', [
  'pending', // Not yet processed
  'processing', // Currently processing
  'completed', // Processing completed
  'failed', // Processing failed
]);
```

#### 2. Update Memories Table

```typescript
// Add to existing memories table
export const memories = pgTable(
  'memories',
  {
    // ... existing fields ...

    // State machine fields (computed from assets, not stored)
    // status: computed field - see status computation function

    // TTL and cleanup
    expiresAt: timestamp('expires_at'), // For pending memories (24h TTL)

    // Audit fields
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    updatedBy: uuid('updated_by').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    // Performance indexes
    index('memories_status_updated_idx').on(table.status, table.updatedAt.desc()),
    index('memories_expires_at_idx').on(table.expiresAt),

    // Constraints
    check('memories_expires_at_check', sql`expires_at IS NULL OR status = 'pending'`),
  ]
);
```

#### 3. Memory Items Table (Tech Lead Surgical Fix #1)

```typescript
// Tech Lead Surgical Fix #1 - Memory items table for per-file identity
export const memoryItems = pgTable(
  'memory_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    memoryId: uuid('memory_id')
      .notNull()
      .references(() => memories.id, { onDelete: 'cascade' }),
    displayName: text('display_name').notNull(), // Sanitized filename
    primaryAssetId: uuid('primary_asset_id').references(() => memoryAssets.id), // Original asset
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    // Performance indexes
    index('memory_items_memory_id_idx').on(table.memoryId),
    index('memory_items_primary_asset_idx').on(table.primaryAssetId),
  ]
);
```

#### 4. Update Memory Assets Table (Tech Lead Surgical Fixes)

```typescript
// Add to existing memoryAssets table with Tech Lead Surgical Fixes
export const memoryAssets = pgTable(
  'memory_assets',
  {
    // ... existing fields ...

    // Tech Lead Surgical Fix #1 - Per-file identity for multi-file memories
    groupId: uuid('group_id').notNull(), // Groups originals with their variants
    memoryItemId: uuid('memory_item_id').references(() => memoryItems.id, { onDelete: 'cascade' }), // FK to memory item

    // Variant modeling (Tech Lead Surgical Fix #1)
    variantOfAssetId: uuid('variant_of_asset_id').references(() => memoryAssets.id, { onDelete: 'cascade' }), // NULL = original
    variantType: text('variant_type', { enum: ['display', 'thumb'] }), // NULL = original

    // Processing metadata (Tech Lead Surgical Fix #5)
    recipeVersion: text('recipe_version').default('v1'), // For reprocessing when options change
    transformSpec: jsonb('transform_spec').$type<{
      displayMaxSize: number;
      thumbMaxSize: number;
      displayQuality: number; // 80-85 for display
      thumbQuality: number; // 70-75 for thumb
      displayFormat: 'avif' | 'webp';
      thumbFormat: 'webp';
    }>(),

    // Asset metadata (Tech Lead Surgical Fix #6)
    width: integer('width'),
    height: integer('height'),
    colorSpace: text('color_space'),
    iccProfile: text('icc_profile'), // For color accuracy
    megapixels: integer('megapixels'), // Tech Lead Surgical Fix #6 - Bound image bombs

    // Tech Lead Surgical Fix #2 - Three distinct statuses
    uploadStatus: asset_upload_status_t('upload_status').default('pending'), // Transfer only
    processingStatus: processing_status_t('processing_status').default('pending'), // Multi-asset pipeline
    lifecycleStatus: asset_lifecycle_status_t('lifecycle_status').default('active'), // Lifecycle

    // Tech Lead Surgical Fix #9 - Storage visibility
    storageVisibility: text('storage_visibility', { enum: ['public', 'private'] }).default('private'),

    // Content hashing for deduplication
    contentHash: text('content_hash'), // SHA-256 of file content
    computedBy: text('computed_by', { enum: ['client', 'server'] }),

    // Upload tracking
    etag: text('etag'), // S3/Blob upload ETag

    // Retry and cleanup
    retryCount: integer('retry_count').default(0).notNull(),
    maxRetries: integer('max_retries').default(3).notNull(),

    // ... rest of existing fields ...
  },
  table => [
    // Tech Lead Surgical Fix #1 - Correct variant constraints for multi-file memories
    unique('memory_assets_group_variant_unique').on(table.groupId, table.variantType), // One variant per type per group
    unique('memory_assets_variant_of_unique').on(table.variantOfAssetId, table.variantType), // Alternative constraint

    // Tech Lead Surgical Fix #2 - Status constraints
    check('memory_assets_variant_check', sql`(variant_of_asset_id IS NULL) = (variant_type IS NULL)`), // Original has no variant fields
    check(
      'memory_assets_processing_status_check',
      sql`processing_status = 'completed' OR (width IS NULL AND height IS NULL)`
    ), // Dimensions only when completed
    check('memory_assets_megapixels_check', sql`megapixels <= 80`), // Tech Lead Surgical Fix #6 - Bound image bombs
  ]
);
```

#### 5. Idempotency Keys Table (Tech Lead Surgical Fix #7)

```typescript
// Tech Lead Surgical Fix #7 - Idempotency storage, not just headers
export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    route: text('route').notNull(), // e.g., 'POST /api/memories'
    key: text('key').notNull(), // The idempotency key value
    response: jsonb('response').notNull(), // Stored response blob
    expiresAt: timestamp('expires_at').notNull(), // TTL
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => [
    // Unique constraint for idempotency
    unique('idempotency_keys_user_route_key_unique').on(table.userId, table.route, table.key),
    // TTL cleanup index
    index('idempotency_keys_expires_at_idx').on(table.expiresAt),
  ]
);
```

#### 6. Background Jobs Table (Tech Lead Surgical Fix #8)

```typescript
// New table for background job processing with Tech Lead Surgical Fix #8
export const backgroundJobs = pgTable(
  'background_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: text('type', {
      enum: ['cleanup_pending', 'asset_delete', 'content_hash_compute', 'process_assets'], // Added process_assets
    }).notNull(),

    // Job payload
    payload: jsonb('payload')
      .$type<{
        memoryId?: string;
        assetId?: string;
        originalAssetId?: string; // For process_assets jobs
        recipeVersion?: string; // For process_assets jobs
        retryCount?: number;
        [key: string]: unknown;
      }>()
      .notNull(),
    payloadHash: text('payload_hash').notNull(), // Tech Lead Surgical Fix #8 - For idempotent enqueue

    // Status tracking
    status: text('status', {
      enum: ['pending', 'processing', 'completed', 'failed', 'retry'],
    })
      .default('pending')
      .notNull(),

    // Tech Lead Surgical Fix #8 - Job locking fields
    lockedAt: timestamp('locked_at'),
    lockedBy: text('locked_by'),
    runAt: timestamp('run_at'),
    visibilityTimeout: integer('visibility_timeout').default(300), // 5 minutes

    // Timing
    scheduledAt: timestamp('scheduled_at').defaultNow().notNull(),
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),

    // Error handling
    error: text('error'),
    retryCount: integer('retry_count').default(0).notNull(),
    maxRetries: integer('max_retries').default(3).notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => [
    // Performance indexes
    index('background_jobs_status_scheduled_idx').on(table.status, table.scheduledAt),
    index('background_jobs_type_idx').on(table.type),
    index('background_jobs_retry_idx').on(table.retryCount),
    index('background_jobs_locked_idx').on(table.lockedAt, table.lockedBy), // Tech Lead Surgical Fix #8

    // Tech Lead Surgical Fix #8 - Idempotent enqueue constraint
    unique('background_jobs_type_payload_hash_unique').on(table.type, table.payloadHash),
  ]
);
```

### Storage CRUD Operations Restructure

#### 1. Asset Status Enum for Two-Phase Deletion

```typescript
// 1. Asset status enum for two-phase deletion
export const asset_status_t = pgEnum('asset_status_t', ['active', 'tombstoned', 'deleted']);

// 2. Add status and legal hold to existing memory_assets table
export const memoryAssets = pgTable('memory_assets', {
  // ... existing fields ...
  // Two-phase deletion fields (MVP)
  status: asset_status_t('status').default('active').notNull(),
  legalHold: boolean('legal_hold').default(false).notNull(),
  // ... rest of existing fields ...
});
```

#### 2. Outbox Pattern for Deletion Jobs

```typescript
// 3. Outbox pattern for deletion jobs (MVP - simple version)
export const assetDeleteJobs = pgTable(
  'asset_delete_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    assetId: uuid('asset_id')
      .notNull()
      .references(() => memoryAssets.id, { onDelete: 'cascade' }),
    backend: storage_backend_t('backend').notNull(),
    backendKey: text('backend_key').notNull(),
    status: text('status', {
      enum: ['pending', 'processing', 'completed', 'failed'],
    })
      .default('pending')
      .notNull(),
    retryCount: integer('retry_count').default(0).notNull(),
    maxRetries: integer('max_retries').default(3).notNull(),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    processedAt: timestamp('processed_at'),
  },
  table => [
    // Performance indexes
    index('asset_delete_jobs_status_idx').on(table.status),
    index('asset_delete_jobs_created_idx').on(table.createdAt),
  ]
);
```

#### 3. Blobs Table for Ref-Counting (Phase 2)

```typescript
// Blobs table for ref-counting and deduplication (Phase 2)
export const blobs = pgTable(
  'blobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contentHash: text('content_hash').notNull().unique(), // SHA-256
    storageBackend: storage_backend_t('storage_backend').notNull(),
    storageKey: text('storage_key').notNull(),
    bucket: text('bucket'),
    bytes: bigint('bytes', { mode: 'number' }).notNull(),
    mimeType: text('mime_type').notNull(),
    refCount: integer('ref_count').default(1).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    lastAccessedAt: timestamp('last_accessed_at').defaultNow().notNull(),
  },
  table => [
    // Performance indexes
    index('blobs_content_hash_idx').on(table.contentHash),
    index('blobs_storage_idx').on(table.storageBackend, table.storageKey),
    index('blobs_ref_count_idx').on(table.refCount),
  ]
);
```

### AWS S3 Implementation

#### 1. S3 Configuration Table

```typescript
// S3 configuration and credentials management
export const s3Configurations = pgTable(
  's3_configurations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(), // User-friendly name
    bucket: text('bucket').notNull(),
    region: text('region').notNull(),
    accessKeyId: text('access_key_id').notNull(), // Encrypted
    secretAccessKey: text('secret_access_key').notNull(), // Encrypted
    isDefault: boolean('is_default').default(false).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    // Constraints
    uniqueIndex('s3_configs_user_default_idx')
      .on(table.userId, table.isDefault)
      .where(sql`is_default = true`),
    index('s3_configs_user_active_idx').on(table.userId, table.isActive),
  ]
);
```

### Upload Hooks Architecture

#### 1. Upload Session Tracking

```typescript
// Upload session tracking for resume functionality
export const uploadSessions = pgTable(
  'upload_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    memoryId: uuid('memory_id').references(() => memories.id, { onDelete: 'cascade' }),
    sessionToken: text('session_token').notNull().unique(),
    status: text('status', {
      enum: ['active', 'completed', 'aborted', 'expired'],
    })
      .default('active')
      .notNull(),
    totalFiles: integer('total_files').notNull(),
    uploadedFiles: integer('uploaded_files').default(0).notNull(),
    failedFiles: integer('failed_files').default(0).notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    // Performance indexes
    index('upload_sessions_token_idx').on(table.sessionToken),
    index('upload_sessions_user_status_idx').on(table.userId, table.status),
    index('upload_sessions_expires_idx').on(table.expiresAt),
  ]
);
```