import { pgTable, index, foreignKey, text, timestamp, uuid, integer, uniqueIndex, unique, boolean, json, check, bigint, primaryKey, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const artifactT = pgEnum("artifact_t", ['metadata', 'asset'])
export const assetTypeT = pgEnum("asset_type_t", ['original', 'display', 'thumb', 'placeholder', 'poster', 'waveform'])
export const backendT = pgEnum("backend_t", ['neon-db', 'vercel-blob', 'icp-canister'])
export const memoryTypeT = pgEnum("memory_type_t", ['image', 'video', 'note', 'document', 'audio'])
export const processingStatusT = pgEnum("processing_status_t", ['pending', 'processing', 'completed', 'failed'])
export const storageBackendT = pgEnum("storage_backend_t", ['s3', 'vercel_blob', 'icp', 'arweave', 'ipfs', 'neon'])
export const storagePrefT = pgEnum("storage_pref_t", ['neon', 'icp', 'dual'])
export const syncT = pgEnum("sync_t", ['idle', 'migrating', 'failed'])


export const businessRelationship = pgTable("business_relationship", {
	id: text().primaryKey().notNull(),
	businessId: text("business_id").notNull(),
	clientId: text("client_id"),
	clientName: text("client_name"),
	clientEmail: text("client_email"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("business_relationship_business_idx").using("btree", table.businessId.asc().nullsLast().op("text_ops")),
	index("business_relationship_client_idx").using("btree", table.clientId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.businessId],
			foreignColumns: [allUser.id],
			name: "business_relationship_business_id_all_user_id_fk"
		}),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [allUser.id],
			name: "business_relationship_client_id_all_user_id_fk"
		}),
]);

export const audioDetails = pgTable("audio_details", {
	memoryId: uuid("memory_id").primaryKey().notNull(),
	durationMs: integer("duration_ms"),
	bitrate: integer(),
	sampleRate: integer("sample_rate"),
	channels: integer(),
}, (table) => [
	foreignKey({
			columns: [table.memoryId],
			foreignColumns: [memories.id],
			name: "audio_details_memory_id_memories_id_fk"
		}).onDelete("cascade"),
]);

export const familyRelationship = pgTable("family_relationship", {
	id: text().primaryKey().notNull(),
	relationshipId: text("relationship_id").notNull(),
	familyRole: text("family_role").notNull(),
	relationshipClarity: text("relationship_clarity").default('fuzzy').notNull(),
	sharedAncestorId: text("shared_ancestor_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.relationshipId],
			foreignColumns: [relationship.id],
			name: "family_relationship_relationship_id_relationship_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.sharedAncestorId],
			foreignColumns: [allUser.id],
			name: "family_relationship_shared_ancestor_id_all_user_id_fk"
		}).onDelete("set null"),
]);

export const documentDetails = pgTable("document_details", {
	memoryId: uuid("memory_id").primaryKey().notNull(),
	pages: integer(),
	mimeType: text("mime_type"),
}, (table) => [
	foreignKey({
			columns: [table.memoryId],
			foreignColumns: [memories.id],
			name: "document_details_memory_id_memories_id_fk"
		}).onDelete("cascade"),
]);

export const allUser = pgTable("all_user", {
	id: text().primaryKey().notNull(),
	type: text().notNull(),
	userId: text("user_id"),
	temporaryUserId: text("temporary_user_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("all_users_one_ref_guard").using("btree", table.id.asc().nullsLast().op("text_ops")).where(sql`((
CASE
    WHEN (user_id IS NOT NULL) THEN 1
    ELSE 0
END +
CASE
    WHEN (temporary_user_id IS NOT NULL) THEN 1
    ELSE 0
END) = 1)`),
]);

export const authenticator = pgTable("authenticator", {
	credentialId: text().notNull(),
	userId: text().notNull(),
	providerAccountId: text().notNull(),
	credentialPublicKey: text().notNull(),
	counter: integer().notNull(),
	credentialDeviceType: text().notNull(),
	credentialBackedUp: boolean().notNull(),
	transports: text(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "authenticator_userId_user_id_fk"
		}).onDelete("cascade"),
	unique("authenticator_credentialID_unique").on(table.credentialId),
]);

export const galleryItem = pgTable("gallery_item", {
	id: text().primaryKey().notNull(),
	galleryId: text("gallery_id").notNull(),
	memoryId: uuid("memory_id").notNull(),
	memoryType: text("memory_type").notNull(),
	position: integer().notNull(),
	caption: text(),
	isFeatured: boolean("is_featured").default(false).notNull(),
	metadata: json().default({}).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("gallery_items_by_memory_idx").using("btree", table.memoryId.asc().nullsLast().op("text_ops"), table.memoryType.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("gallery_items_gallery_memory_uq").using("btree", table.galleryId.asc().nullsLast().op("text_ops"), table.memoryId.asc().nullsLast().op("uuid_ops"), table.memoryType.asc().nullsLast().op("uuid_ops")),
	index("gallery_items_gallery_position_idx").using("btree", table.galleryId.asc().nullsLast().op("text_ops"), table.position.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.galleryId],
			foreignColumns: [gallery.id],
			name: "gallery_item_gallery_id_gallery_id_fk"
		}).onDelete("cascade"),
]);

export const galleryShare = pgTable("gallery_share", {
	id: text().primaryKey().notNull(),
	galleryId: text("gallery_id").notNull(),
	ownerId: text("owner_id").notNull(),
	sharedWithType: text("shared_with_type").notNull(),
	sharedWithId: text("shared_with_id"),
	groupId: text("group_id"),
	sharedRelationshipType: text("shared_relationship_type"),
	accessLevel: text("access_level").default('read').notNull(),
	inviteeSecureCode: text("invitee_secure_code").notNull(),
	secureCodeCreatedAt: timestamp("secure_code_created_at", { mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.galleryId],
			foreignColumns: [gallery.id],
			name: "gallery_share_gallery_id_gallery_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.ownerId],
			foreignColumns: [allUser.id],
			name: "gallery_share_owner_id_all_user_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.sharedWithId],
			foreignColumns: [allUser.id],
			name: "gallery_share_shared_with_id_all_user_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.groupId],
			foreignColumns: [group.id],
			name: "gallery_share_group_id_group_id_fk"
		}).onDelete("cascade"),
]);

export const group = pgTable("group", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	ownerId: text("owner_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	metadata: json().default({}),
}, (table) => [
	foreignKey({
			columns: [table.ownerId],
			foreignColumns: [user.id],
			name: "group_owner_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const imageDetails = pgTable("image_details", {
	memoryId: uuid("memory_id").primaryKey().notNull(),
	width: integer(),
	height: integer(),
	exif: json(),
}, (table) => [
	foreignKey({
			columns: [table.memoryId],
			foreignColumns: [memories.id],
			name: "image_details_memory_id_memories_id_fk"
		}).onDelete("cascade"),
]);

export const iiNonce = pgTable("ii_nonce", {
	id: text().primaryKey().notNull(),
	nonceHash: text("nonce_hash").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	usedAt: timestamp("used_at", { mode: 'string' }),
	context: json().default({}),
}, (table) => [
	index("ii_nonces_active_idx").using("btree", table.usedAt.asc().nullsLast().op("timestamp_ops"), table.expiresAt.asc().nullsLast().op("timestamp_ops")),
	index("ii_nonces_created_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("ii_nonces_expires_idx").using("btree", table.expiresAt.asc().nullsLast().op("timestamp_ops")),
	index("ii_nonces_hash_idx").using("btree", table.nonceHash.asc().nullsLast().op("text_ops")),
	index("ii_nonces_used_idx").using("btree", table.usedAt.asc().nullsLast().op("timestamp_ops")),
]);

export const memoryAssets = pgTable("memory_assets", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	memoryId: uuid("memory_id").notNull(),
	assetType: assetTypeT("asset_type").notNull(),
	variant: text(),
	url: text().notNull(),
	storageBackend: storageBackendT("storage_backend").notNull(),
	bucket: text(),
	storageKey: text("storage_key").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	bytes: bigint({ mode: "number" }).notNull(),
	width: integer(),
	height: integer(),
	mimeType: text("mime_type").notNull(),
	sha256: text(),
	processingStatus: processingStatusT("processing_status").default('pending').notNull(),
	processingError: text("processing_error"),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("memory_assets_memory_idx").using("btree", table.memoryId.asc().nullsLast().op("uuid_ops")),
	index("memory_assets_storage_idx").using("btree", table.storageBackend.asc().nullsLast().op("enum_ops"), table.storageKey.asc().nullsLast().op("enum_ops")),
	index("memory_assets_type_idx").using("btree", table.assetType.asc().nullsLast().op("enum_ops")),
	uniqueIndex("memory_assets_unique").using("btree", table.memoryId.asc().nullsLast().op("enum_ops"), table.assetType.asc().nullsLast().op("uuid_ops")),
	index("memory_assets_url_idx").using("btree", table.url.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.memoryId],
			foreignColumns: [memories.id],
			name: "memory_assets_memory_id_memories_id_fk"
		}).onDelete("cascade"),
	check("memory_assets_bytes_positive", sql`bytes > 0`),
	check("memory_assets_dimensions_positive", sql`((width IS NULL) OR (width > 0)) AND ((height IS NULL) OR (height > 0))`),
]);

export const folders = pgTable("folders", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	ownerId: text("owner_id").notNull(),
	name: text().notNull(),
	parentFolderId: text("parent_folder_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("folders_owner_idx").using("btree", table.ownerId.asc().nullsLast().op("text_ops")),
	index("folders_parent_idx").using("btree", table.parentFolderId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.ownerId],
			foreignColumns: [allUser.id],
			name: "folders_owner_id_all_user_id_fk"
		}).onDelete("cascade"),
]);

export const memoryMetadata = pgTable("memory_metadata", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	memoryId: uuid("memory_id").notNull(),
	memoryType: memoryTypeT("memory_type").notNull(),
	exifData: json("exif_data"),
	processingStatus: processingStatusT("processing_status").default('pending').notNull(),
	processingError: text("processing_error"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("memory_metadata_memory_idx").using("btree", table.memoryId.asc().nullsLast().op("uuid_ops"), table.memoryType.asc().nullsLast().op("enum_ops")),
	index("memory_metadata_status_idx").using("btree", table.processingStatus.asc().nullsLast().op("enum_ops")),
	uniqueIndex("memory_metadata_unique").using("btree", table.memoryId.asc().nullsLast().op("enum_ops"), table.memoryType.asc().nullsLast().op("enum_ops")),
]);

export const memories = pgTable("memories", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	ownerId: text("owner_id").notNull(),
	type: memoryTypeT().notNull(),
	title: text(),
	description: text(),
	takenAt: timestamp("taken_at", { mode: 'string' }),
	isPublic: boolean("is_public").default(false).notNull(),
	ownerSecureCode: text("owner_secure_code").notNull(),
	parentFolderId: text("parent_folder_id"),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("memories_owner_created_idx").using("btree", table.ownerId.asc().nullsLast().op("timestamp_ops"), table.createdAt.desc().nullsLast().op("text_ops")),
	index("memories_public_idx").using("btree", table.isPublic.asc().nullsLast().op("bool_ops")),
	index("memories_type_idx").using("btree", table.type.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.ownerId],
			foreignColumns: [allUser.id],
			name: "memories_owner_id_all_user_id_fk"
		}).onDelete("cascade"),
]);

export const gallery = pgTable("gallery", {
	id: text().primaryKey().notNull(),
	ownerId: text("owner_id").notNull(),
	title: text().notNull(),
	description: text(),
	isPublic: boolean("is_public").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.ownerId],
			foreignColumns: [allUser.id],
			name: "gallery_owner_id_all_user_id_fk"
		}).onDelete("cascade"),
]);

export const memoryShare = pgTable("memory_share", {
	id: text().primaryKey().notNull(),
	memoryId: uuid("memory_id").notNull(),
	memoryType: text("memory_type").notNull(),
	ownerId: text("owner_id").notNull(),
	sharedWithType: text("shared_with_type").notNull(),
	sharedWithId: text("shared_with_id"),
	groupId: text("group_id"),
	sharedRelationshipType: text("shared_relationship_type"),
	accessLevel: text("access_level").default('read').notNull(),
	inviteeSecureCode: text("invitee_secure_code").notNull(),
	secureCodeCreatedAt: timestamp("secure_code_created_at", { mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.ownerId],
			foreignColumns: [allUser.id],
			name: "memory_share_owner_id_all_user_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.sharedWithId],
			foreignColumns: [allUser.id],
			name: "memory_share_shared_with_id_all_user_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.groupId],
			foreignColumns: [group.id],
			name: "memory_share_group_id_group_id_fk"
		}).onDelete("cascade"),
]);

export const temporaryUser = pgTable("temporary_user", {
	id: text().primaryKey().notNull(),
	name: text(),
	email: text(),
	secureCode: text("secure_code").notNull(),
	secureCodeExpiresAt: timestamp("secure_code_expires_at", { mode: 'string' }).notNull(),
	role: text().notNull(),
	invitedByAllUserId: text("invited_by_all_user_id"),
	registrationStatus: text("registration_status").default('pending').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	metadata: json().default({}),
}, (table) => [
	foreignKey({
			columns: [table.invitedByAllUserId],
			foreignColumns: [allUser.id],
			name: "temporary_user_invited_by_fk"
		}),
]);

export const noteDetails = pgTable("note_details", {
	memoryId: uuid("memory_id").primaryKey().notNull(),
	content: text().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.memoryId],
			foreignColumns: [memories.id],
			name: "note_details_memory_id_memories_id_fk"
		}).onDelete("cascade"),
]);

export const session = pgTable("session", {
	sessionToken: text().primaryKey().notNull(),
	userId: text().notNull(),
	expires: timestamp({ mode: 'string' }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "session_userId_user_id_fk"
		}).onDelete("cascade"),
]);

export const storageEdges = pgTable("storage_edges", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	memoryId: uuid("memory_id").notNull(),
	memoryType: memoryTypeT("memory_type").notNull(),
	artifact: artifactT().notNull(),
	backend: backendT().notNull(),
	present: boolean().default(false).notNull(),
	location: text(),
	contentHash: text("content_hash"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	sizeBytes: bigint("size_bytes", { mode: "number" }),
	syncState: syncT("sync_state").default('idle').notNull(),
	lastSyncedAt: timestamp("last_synced_at", { mode: 'string' }),
	syncError: text("sync_error"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("ix_edges_backend_present").using("btree", table.backend.asc().nullsLast().op("bool_ops"), table.artifact.asc().nullsLast().op("enum_ops"), table.present.asc().nullsLast().op("enum_ops")),
	index("ix_edges_memory").using("btree", table.memoryId.asc().nullsLast().op("uuid_ops"), table.memoryType.asc().nullsLast().op("uuid_ops")),
	index("ix_edges_sync_state").using("btree", table.syncState.asc().nullsLast().op("enum_ops")),
	uniqueIndex("uq_edge").using("btree", table.memoryId.asc().nullsLast().op("enum_ops"), table.memoryType.asc().nullsLast().op("uuid_ops"), table.artifact.asc().nullsLast().op("enum_ops"), table.backend.asc().nullsLast().op("uuid_ops")),
]);

export const videoDetails = pgTable("video_details", {
	memoryId: uuid("memory_id").primaryKey().notNull(),
	durationMs: integer("duration_ms").notNull(),
	width: integer(),
	height: integer(),
	codec: text(),
	fps: text(),
}, (table) => [
	foreignKey({
			columns: [table.memoryId],
			foreignColumns: [memories.id],
			name: "video_details_memory_id_memories_id_fk"
		}).onDelete("cascade"),
]);

export const relationship = pgTable("relationship", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	relatedUserId: text("related_user_id").notNull(),
	type: text().notNull(),
	status: text().default('pending').notNull(),
	note: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("unique_relation_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.relatedUserId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [allUser.id],
			name: "relationship_user_id_all_user_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.relatedUserId],
			foreignColumns: [allUser.id],
			name: "relationship_related_user_id_all_user_id_fk"
		}).onDelete("cascade"),
]);

export const user = pgTable("user", {
	id: text().primaryKey().notNull(),
	name: text(),
	email: text(),
	emailVerified: timestamp({ mode: 'string' }),
	image: text(),
	password: text(),
	username: text(),
	parentId: text("parent_id"),
	invitedByAllUserId: text("invited_by_all_user_id"),
	invitedAt: timestamp("invited_at", { mode: 'string' }),
	registrationStatus: text("registration_status").default('pending').notNull(),
	role: text().default('user').notNull(),
	plan: text().default('free').notNull(),
	premiumExpiresAt: timestamp("premium_expires_at", { mode: 'string' }),
	storagePreference: storagePrefT("storage_preference").default('neon').notNull(),
	storagePrimaryStorage: backendT("storage_primary_storage").default('neon-db').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	metadata: json().default({}),
}, (table) => [
	foreignKey({
			columns: [table.invitedByAllUserId],
			foreignColumns: [allUser.id],
			name: "user_invited_by_fk"
		}),
	foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "user_parent_fk"
		}),
	unique("user_email_unique").on(table.email),
	unique("user_username_unique").on(table.username),
]);

export const familyMember = pgTable("family_member", {
	id: text().primaryKey().notNull(),
	ownerId: text("owner_id").notNull(),
	userId: text("user_id"),
	fullName: text("full_name").notNull(),
	primaryRelationship: text("primary_relationship").notNull(),
	fuzzyRelationships: text("fuzzy_relationships").array().default([""]).notNull(),
	birthDate: timestamp("birth_date", { mode: 'string' }),
	deathDate: timestamp("death_date", { mode: 'string' }),
	birthplace: text(),
	metadata: json().default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.ownerId],
			foreignColumns: [allUser.id],
			name: "family_member_owner_id_all_user_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [allUser.id],
			name: "family_member_user_id_all_user_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [allUser.id],
			name: "family_member_user_fk"
		}),
]);

export const groupMember = pgTable("group_member", {
	groupId: text("group_id").notNull(),
	userId: text("user_id").notNull(),
	role: text().default('member').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.groupId],
			foreignColumns: [group.id],
			name: "group_member_group_id_group_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "group_member_user_id_user_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.groupId, table.userId], name: "group_member_group_id_user_id_pk"}),
]);

export const verificationToken = pgTable("verificationToken", {
	identifier: text().notNull(),
	token: text().notNull(),
	expires: timestamp({ mode: 'string' }).notNull(),
}, (table) => [
	primaryKey({ columns: [table.identifier, table.token], name: "verificationToken_identifier_token_pk"}),
]);

export const account = pgTable("account", {
	userId: text().notNull(),
	type: text().notNull(),
	provider: text().notNull(),
	providerAccountId: text().notNull(),
	refreshToken: text("refresh_token"),
	accessToken: text("access_token"),
	expiresAt: integer("expires_at"),
	tokenType: text("token_type"),
	scope: text(),
	idToken: text("id_token"),
	sessionState: text("session_state"),
}, (table) => [
	index("accounts_user_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	index("accounts_user_provider_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.provider.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "account_userId_user_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.provider, table.providerAccountId], name: "account_provider_providerAccountId_pk"}),
]);
