import { pgTable, foreignKey, text, timestamp, unique, integer, boolean, json, uniqueIndex, index, uuid, bigint, primaryKey, pgView, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const artifactT = pgEnum("artifact_t", ['metadata', 'asset'])
export const backendT = pgEnum("backend_t", ['neon-db', 'vercel-blob', 'icp-canister'])
export const memoryTypeT = pgEnum("memory_type_t", ['image', 'video', 'note', 'document', 'audio'])
export const syncT = pgEnum("sync_t", ['idle', 'migrating', 'failed'])


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

export const audio = pgTable("audio", {
	id: text().primaryKey().notNull(),
	ownerId: text("owner_id").notNull(),
	url: text().notNull(),
	title: text().notNull(),
	description: text(),
	duration: integer(),
	mimeType: text("mime_type").notNull(),
	size: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	isPublic: boolean("is_public").default(false).notNull(),
	ownerSecureCode: text("owner_secure_code").notNull(),
	metadata: json().default({}),
	parentFolderId: text("parent_folder_id"),
}, (table) => [
	foreignKey({
			columns: [table.ownerId],
			foreignColumns: [allUser.id],
			name: "audio_owner_id_all_user_id_fk"
		}).onDelete("cascade"),
]);

export const memoryShare = pgTable("memory_share", {
	id: text().primaryKey().notNull(),
	memoryId: text("memory_id").notNull(),
	memoryType: text("memory_type").notNull(),
	ownerId: text("owner_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	accessLevel: text("access_level").default('read').notNull(),
	sharedWithType: text("shared_with_type").notNull(),
	sharedWithId: text("shared_with_id"),
	inviteeSecureCode: text("invitee_secure_code").notNull(),
	secureCodeCreatedAt: timestamp("secure_code_created_at", { mode: 'string' }).defaultNow().notNull(),
	groupId: text("group_id"),
	sharedRelationshipType: text("shared_relationship_type"),
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

export const document = pgTable("document", {
	id: text().primaryKey().notNull(),
	ownerId: text("owner_id").notNull(),
	url: text().notNull(),
	title: text(),
	mimeType: text("mime_type").notNull(),
	size: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	isPublic: boolean("is_public").default(false).notNull(),
	metadata: json().default({"size":0,"mimeType":"","originalName":"","uploadedAt":"2025-08-31T14:03:56.995Z"}),
	description: text(),
	ownerSecureCode: text("owner_secure_code").notNull(),
	parentFolderId: text("parent_folder_id"),
}, (table) => [
	foreignKey({
			columns: [table.ownerId],
			foreignColumns: [allUser.id],
			name: "document_owner_id_all_user_id_fk"
		}).onDelete("cascade"),
]);

export const image = pgTable("image", {
	id: text().primaryKey().notNull(),
	ownerId: text("owner_id").notNull(),
	url: text().notNull(),
	caption: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	isPublic: boolean("is_public").default(false).notNull(),
	metadata: json().default({"size":0,"mimeType":"","originalName":"","uploadedAt":"2025-08-31T14:03:56.994Z"}),
	title: text(),
	description: text(),
	ownerSecureCode: text("owner_secure_code").notNull(),
	parentFolderId: text("parent_folder_id"),
}, (table) => [
	foreignKey({
			columns: [table.ownerId],
			foreignColumns: [allUser.id],
			name: "image_owner_id_all_user_id_fk"
		}).onDelete("cascade"),
]);

export const note = pgTable("note", {
	id: text().primaryKey().notNull(),
	ownerId: text("owner_id").notNull(),
	title: text().notNull(),
	content: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	isPublic: boolean("is_public").default(false).notNull(),
	metadata: json().default({}),
	ownerSecureCode: text("owner_secure_code").notNull(),
	parentFolderId: text("parent_folder_id"),
}, (table) => [
	foreignKey({
			columns: [table.ownerId],
			foreignColumns: [allUser.id],
			name: "note_owner_id_all_user_id_fk"
		}).onDelete("cascade"),
]);

export const user = pgTable("user", {
	id: text().primaryKey().notNull(),
	name: text(),
	email: text(),
	emailVerified: timestamp({ mode: 'string' }),
	image: text(),
	username: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	metadata: json().default({}),
	password: text(),
	parentId: text("parent_id"),
	invitedByAllUserId: text("invited_by_all_user_id"),
	invitedAt: timestamp("invited_at", { mode: 'string' }),
	registrationStatus: text("registration_status").default('pending').notNull(),
	role: text().default('user').notNull(),
	plan: text().default('free').notNull(),
	premiumExpiresAt: timestamp("premium_expires_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "user_parent_fk"
		}),
	foreignKey({
			columns: [table.invitedByAllUserId],
			foreignColumns: [allUser.id],
			name: "user_invited_by_fk"
		}),
	unique("user_email_unique").on(table.email),
	unique("user_username_unique").on(table.username),
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

export const galleryItem = pgTable("gallery_item", {
	id: text().primaryKey().notNull(),
	galleryId: text("gallery_id").notNull(),
	memoryId: text("memory_id").notNull(),
	memoryType: text("memory_type").notNull(),
	position: integer().notNull(),
	caption: text(),
	isFeatured: boolean("is_featured").default(false).notNull(),
	metadata: json().default({}).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("gallery_items_by_memory_idx").using("btree", table.memoryId.asc().nullsLast().op("text_ops"), table.memoryType.asc().nullsLast().op("text_ops")),
	uniqueIndex("gallery_items_gallery_memory_uq").using("btree", table.galleryId.asc().nullsLast().op("text_ops"), table.memoryId.asc().nullsLast().op("text_ops"), table.memoryType.asc().nullsLast().op("text_ops")),
	index("gallery_items_gallery_position_idx").using("btree", table.galleryId.asc().nullsLast().op("text_ops"), table.position.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.galleryId],
			foreignColumns: [gallery.id],
			name: "gallery_item_gallery_id_gallery_id_fk"
		}).onDelete("cascade"),
]);

export const video = pgTable("video", {
	id: text().primaryKey().notNull(),
	ownerId: text("owner_id").notNull(),
	url: text().notNull(),
	title: text().notNull(),
	description: text(),
	duration: integer(),
	mimeType: text("mime_type").notNull(),
	size: text().notNull(),
	ownerSecureCode: text("owner_secure_code").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	metadata: json().default({}),
	isPublic: boolean("is_public").default(false).notNull(),
	parentFolderId: text("parent_folder_id"),
}, (table) => [
	foreignKey({
			columns: [table.ownerId],
			foreignColumns: [allUser.id],
			name: "video_owner_id_all_user_id_fk"
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
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "account_userId_user_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.provider, table.providerAccountId], name: "account_provider_providerAccountId_pk"}),
]);
export const memoryPresence = pgView("memory_presence", {	memoryId: uuid("memory_id"),
	memoryType: memoryTypeT("memory_type"),
	metaNeon: boolean("meta_neon"),
	assetBlob: boolean("asset_blob"),
	metaIcp: boolean("meta_icp"),
	assetIcp: boolean("asset_icp"),
}).as(sql`SELECT e.memory_id, e.memory_type, bool_or(e.backend = 'neon-db'::backend_t AND e.artifact = 'metadata'::artifact_t AND e.present) AS meta_neon, bool_or(e.backend = 'vercel-blob'::backend_t AND e.artifact = 'asset'::artifact_t AND e.present) AS asset_blob, bool_or(e.backend = 'icp-canister'::backend_t AND e.artifact = 'metadata'::artifact_t AND e.present) AS meta_icp, bool_or(e.backend = 'icp-canister'::backend_t AND e.artifact = 'asset'::artifact_t AND e.present) AS asset_icp FROM storage_edges e GROUP BY e.memory_id, e.memory_type`);