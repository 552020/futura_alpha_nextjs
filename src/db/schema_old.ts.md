```ts
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
  //   IndexBuilder,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// import type { AdapterAccount } from "@auth/core/adapters";
import type { AdapterAccount } from "next-auth/adapters";

// Storage Edge Enums
export const artifact_t = pgEnum("artifact_t", ["metadata", "asset"]);
export const backend_t = pgEnum("backend_t", ["neon-db", "vercel-blob", "icp-canister"]); // add more later
export const memory_type_t = pgEnum("memory_type_t", ["image", "video", "note", "document", "audio"]);
export const sync_t = pgEnum("sync_t", ["idle", "migrating", "failed"]);

// Storage Preference Enum - replaces boolean fields to avoid CHECK constraints
export const storage_pref_t = pgEnum("storage_pref_t", ["neon", "icp", "dual"]);
// Users table - Core user data - required for auth.js
export const users = pgTable(
  "user",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()), // required for auth.js
    name: text("name"), // required for auth.js
    email: text("email").unique(), // required for auth.js
    emailVerified: timestamp("emailVerified", { mode: "date" }), // required for auth.js
    image: text("image"), // required for auth.js
    // Our additional fields
    password: text("password"),
    username: text("username").unique(),
    parentId: text("parent_id"), // This links a child to their parent (can be NULL for root nodes)

    // New invitation-related fields:
    invitedByAllUserId: text("invited_by_all_user_id"), // No `.references()` here!
    invitedAt: timestamp("invited_at"), // When the invitation was sent
    registrationStatus: text("registration_status", {
      enum: ["pending", "visited", "initiated", "completed", "declined", "expired"],
    })
      .default("pending")
      .notNull(), // Tracks signup progress

    // Access control
    role: text("role", {
      enum: ["user", "moderator", "admin", "developer", "superadmin"],
    })
      .default("user")
      .notNull(),

    // Payment-related
    plan: text("plan", {
      enum: ["free", "premium"],
    })
      .default("free")
      .notNull(),

    premiumExpiresAt: timestamp("premium_expires_at", { mode: "date" }),

    // Storage preferences
    // Using enum instead of booleans to avoid CHECK constraints and keep everything in Drizzle
    storagePreference: storage_pref_t("storage_preference").default("neon").notNull(),
    storagePrimaryStorage: backend_t("storage_primary_storage").default("neon-db").notNull(),

    // Timestamp fields
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    metadata: json("metadata")
      .$type<{
        bio?: string;
        location?: string;
        website?: string;
      }>()
      .default({}),
  },
  (table) => [
    // Define the foreign key to allUsers
    foreignKey({
      columns: [table.invitedByAllUserId],
      foreignColumns: [allUsers.id],
      name: "user_invited_by_fk",
    }),
    // Self-referencing Foreign Key
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: "user_parent_fk",
    }),
  ]
);

export const allUsers = pgTable(
  "all_user",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    type: text("type", { enum: ["user", "temporary"] }).notNull(),

    userId: text("user_id"), // FK defined below
    temporaryUserId: text("temporary_user_id"), // FK defined below

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    // Ensure exactly one of userId or temporaryUserId is set
    uniqueIndex("all_users_one_ref_guard").on(table.id) // dummy index anchor
      .where(sql`(CASE WHEN ${table.userId} IS NOT NULL THEN 1 ELSE 0 END +
                   CASE WHEN ${table.temporaryUserId} IS NOT NULL THEN 1 ELSE 0 END) = 1`),
  ]
);

export const temporaryUsers = pgTable(
  "temporary_user",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    name: text("name"),
    email: text("email"),
    secureCode: text("secure_code").notNull(),
    secureCodeExpiresAt: timestamp("secure_code_expires_at", { mode: "date" }).notNull(),

    role: text("role", { enum: ["inviter", "invitee"] }).notNull(),

    invitedByAllUserId: text("invited_by_all_user_id"), // FK declared later

    registrationStatus: text("registration_status", {
      enum: ["pending", "visited", "initiated", "completed", "declined", "expired"],
    })
      .default("pending")
      .notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),

    metadata: json("metadata")
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
      name: "temporary_user_invited_by_fk",
    }),
  ]
);

// Auth.js required tables
export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccount["type"]>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    // ✅ EXISTING: Composite primary key already enforces uniqueness
    // This prevents the same II principal from being linked to multiple users
    primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),

    // 🚀 PERFORMANCE: Index for common lookups
    // Find all accounts for a user by provider (e.g., "does user have II linked?")
    index("accounts_user_provider_idx").on(account.userId, account.provider),

    // 🚀 PERFORMANCE: Index for finding all accounts for a user
    // Useful for "show me all linked accounts" queries
    index("accounts_user_idx").on(account.userId),
  ]
);

// Auth.js required tables
export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verificationToken) => ({
    compositePk: primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  })
);

// required for webauthn by auth.js
export const authenticators = pgTable(
  "authenticator",
  {
    credentialID: text("credentialID").notNull().unique(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerAccountId: text("providerAccountId").notNull(),
    credentialPublicKey: text("credentialPublicKey").notNull(),
    counter: integer("counter").notNull(),
    credentialDeviceType: text("credentialDeviceType").notNull(),
    credentialBackedUp: boolean("credentialBackedUp").notNull(),
    transports: text("transports"),
  },
  (authenticator) => [
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
  peopleInMemory?: string[];
  format?: string; // File format (e.g., "JPEG", "PNG", "PDF")
};

export type ImageMetadata = CommonFileMetadata & {
  dimensions?: { width: number; height: number };
};

// Type for flexible user-defined metadata
export type CustomMetadata = {
  [key: string]: string | number | boolean | null;
};

// Application tables
export const images = pgTable("image", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  ownerId: text("owner_id")
    .notNull()
    .references(() => allUsers.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  caption: text("caption"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isPublic: boolean("is_public").default(false).notNull(),
  title: text("title"),
  description: text("description"),
  ownerSecureCode: text("owner_secure_code").notNull(), // For owner to manage the memory
  // Tiny seam for future folder implementation
  parentFolderId: text("parent_folder_id"), // Will reference folders.id when implemented
  metadata: json("metadata")
    .$type<
      ImageMetadata & {
        custom?: CustomMetadata; // For flexible user-defined annotations
        originalPath?: string; // For folder uploads
        folderName?: string; // For folder grouping
      }
    >()
    .default({
      size: 0,
      mimeType: "",
      originalName: "",
      uploadedAt: new Date().toISOString(),
    }),
});

export const videos = pgTable("video", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  ownerId: text("owner_id")
    .notNull()
    .references(() => allUsers.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  duration: integer("duration"), // Duration in seconds
  mimeType: text("mime_type").notNull(),
  size: text("size").notNull(), // File size in bytes
  ownerSecureCode: text("owner_secure_code").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  isPublic: boolean("is_public").default(false).notNull(),
  parentFolderId: text("parent_folder_id"), // Tiny seam for future folder implementation
  metadata: json("metadata")
    .$type<{
      width?: number;
      height?: number;
      format?: string;
      thumbnail?: string;
      originalPath?: string; // For folder uploads
      folderName?: string; // For folder grouping
    }>()
    .default({}),
});

export const notes = pgTable("note", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  ownerId: text("owner_id")
    .notNull()
    .references(() => allUsers.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  isPublic: boolean("is_public").default(false).notNull(),
  ownerSecureCode: text("owner_secure_code").notNull(), // For owner to manage the memory
  parentFolderId: text("parent_folder_id"), // Tiny seam for future folder implementation
  metadata: json("metadata")
    .$type<{
      tags?: string[];
      mood?: string;
      location?: string;
      dateOfMemory?: string;
      recipients?: string[];
      unlockDate?: string;
      custom?: CustomMetadata; // For flexible user-defined annotations
      originalPath?: string; // For folder uploads
      folderName?: string; // For folder grouping
    }>()
    .default({}),
});

export const documents = pgTable("document", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  ownerId: text("owner_id")
    .notNull()
    .references(() => allUsers.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  title: text("title"),
  description: text("description"),
  mimeType: text("mime_type").notNull(),
  size: text("size").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isPublic: boolean("is_public").default(false).notNull(),
  ownerSecureCode: text("owner_secure_code").notNull(), // For owner to manage the memory
  parentFolderId: text("parent_folder_id"), // Tiny seam for future folder implementation
  metadata: json("metadata")
    .$type<
      CommonFileMetadata & {
        custom?: CustomMetadata; // For flexible user-defined annotations
        originalPath?: string; // For folder uploads
        folderName?: string; // For folder grouping
      }
    >()
    .default({
      size: 0,
      mimeType: "",
      originalName: "",
      uploadedAt: new Date().toISOString(),
    }),
});

export const audio = pgTable("audio", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  ownerId: text("owner_id")
    .notNull()
    .references(() => allUsers.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  duration: integer("duration"), // Duration in seconds
  mimeType: text("mime_type").notNull(),
  size: text("size").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  isPublic: boolean("is_public").default(false).notNull(),
  ownerSecureCode: text("owner_secure_code").notNull(),
  parentFolderId: text("parent_folder_id"), // Tiny seam for future folder implementation
  metadata: json("metadata")
    .$type<{
      format?: string;
      bitrate?: number;
      sampleRate?: number;
      channels?: number;
      custom?: CustomMetadata;
      originalPath?: string; // For folder uploads
      folderName?: string; // For folder grouping
    }>()
    .default({}),
});

export const MEMORY_TYPES = ["image", "document", "note", "video", "audio"] as const;
export const ACCESS_LEVELS = ["read", "write"] as const;
export const MEMBER_ROLES = ["admin", "member"] as const;

// Types of relationships between users (e.g., brother, aunt, friend)
export const RELATIONSHIP_TYPES = ["friend", "colleague", "acquaintance", "family", "other"] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

// Types of sharing relationships (based on trust/proximity)
export const SHARING_RELATIONSHIP_TYPES = [
  "close_family", // e.g., parents, siblings
  "family", // extended family
  "partner", // romantic partner
  "close_friend", // trusted friends
  "friend", // regular friends
  "colleague", // work relationships
  "acquaintance", // casual relationships
] as const;
export type SharingRelationshipType = (typeof SHARING_RELATIONSHIP_TYPES)[number];

export const RELATIONSHIP_STATUS = ["pending", "accepted", "declined"] as const;
export type RelationshipStatus = (typeof RELATIONSHIP_STATUS)[number];

export const FAMILY_RELATIONSHIP_TYPES = [
  "parent",
  "child",
  "sibling",
  "cousin",
  "spouse",
  "grandparent",
  "grandchild",
  "aunt_uncle",
  "niece_nephew",
  "extended_family",
  "other",
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
export const memoryShares = pgTable("memory_share", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  memoryId: text("memory_id").notNull(), // The ID of the memory (e.g., image, note, document)
  memoryType: text("memory_type", { enum: MEMORY_TYPES }).notNull(), // Type of memory (e.g., "image", "note", "document", "video")
  ownerId: text("owner_id") // The user who originally created (or owns) the memory
    .notNull()
    .references(() => allUsers.id, { onDelete: "cascade" }),

  sharedWithType: text("shared_with_type", {
    enum: ["user", "group", "relationship"],
  }).notNull(),

  sharedWithId: text("shared_with_id") // For direct user sharing
    .references(() => allUsers.id, { onDelete: "cascade" }),
  groupId: text("group_id") // For group sharing
    .references(() => group.id, { onDelete: "cascade" }),
  sharedRelationshipType: text("shared_relationship_type", {
    // For relationship-based sharing
    enum: SHARING_RELATIONSHIP_TYPES,
  }),

  accessLevel: text("access_level", { enum: ACCESS_LEVELS }).default("read").notNull(),
  inviteeSecureCode: text("invitee_secure_code").notNull(), // For invitee to access the memory
  inviteeSecureCodeCreatedAt: timestamp("secure_code_created_at", { mode: "date" }).notNull().defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// This table is for shared groups where all members see the same group composition
// (e.g., book clubs, work teams, shared family groups).
// For personal 'groups' like friend lists, use the relationship table instead,
// querying with type='friend' and status='accepted' to get a user's friends.
export const group = pgTable("group", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  metadata: json("metadata")
    .$type<{
      description?: string;
    }>()
    .default({}),
});

export const groupMember = pgTable(
  "group_member",
  {
    groupId: text("group_id")
      .notNull()
      .references(() => group.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: MEMBER_ROLES }).default("member").notNull(),
  },
  (groupMember) => [
    primaryKey({
      columns: [groupMember.groupId, groupMember.userId],
    }),
  ]
);

export const relationship = pgTable(
  "relationship",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => allUsers.id, { onDelete: "cascade" }),
    relatedUserId: text("related_user_id")
      .notNull()
      .references(() => allUsers.id, { onDelete: "cascade" }),
    type: text("type", { enum: RELATIONSHIP_TYPES }).notNull(),
    status: text("status", { enum: RELATIONSHIP_STATUS }).default("pending").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("unique_relation_idx").on(t.userId, t.relatedUserId)]
);

export const familyRelationship = pgTable("family_relationship", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  relationshipId: text("relationship_id")
    .notNull()
    .references(() => relationship.id, { onDelete: "cascade" }),
  familyRole: text("family_role", { enum: FAMILY_RELATIONSHIP_TYPES }).notNull(),
  // New: Fuzziness Indicator
  relationshipClarity: text("relationship_clarity", {
    enum: ["resolved", "fuzzy"],
  })
    .default("fuzzy")
    .notNull(),
  // New: Store the common ancestor if known
  sharedAncestorId: text("shared_ancestor_id").references(() => allUsers.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Enum for primary relationships
export const PRIMARY_RELATIONSHIP_ROLES = ["son", "daughter", "father", "mother", "sibling", "spouse"] as const;
export type PrimaryRelationshipRole = (typeof PRIMARY_RELATIONSHIP_ROLES)[number];

export const familyMember = pgTable(
  "family_member",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    // The owner of the family tree (the user who created the record)
    ownerId: text("owner_id")
      .notNull()
      .references(() => allUsers.id, { onDelete: "cascade" }),

    // If this family member is a registered user, link them here (optional)
    userId: text("user_id").references(() => allUsers.id, { onDelete: "set null" }),

    // Basic information
    fullName: text("full_name").notNull(),

    // Primary (resolved) relationship: e.g. "son", "father", etc.
    primaryRelationship: text("primary_relationship", { enum: PRIMARY_RELATIONSHIP_ROLES }).notNull(),

    // Fuzzy relationships: an array of strings (e.g. ["grandfather"])
    // Requires Postgres array support via pgArray.
    fuzzyRelationships: text("fuzzy_relationships", { enum: FAMILY_RELATIONSHIP_TYPES }).array().notNull().default([]),

    // Additional details for the family member
    birthDate: timestamp("birth_date", { mode: "date" }),
    deathDate: timestamp("death_date", { mode: "date" }),
    birthplace: text("birthplace"),

    // Optional metadata field for extra details
    metadata: json("metadata").$type<{ notes?: string }>().default({}),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    // Optional foreign key constraints (if needed) for userId can be defined here.
    foreignKey({
      columns: [table.userId],
      foreignColumns: [allUsers.id],
      name: "family_member_user_fk",
    }),
  ]
);

// Gallery tables for gallery functionality
export const galleries = pgTable("gallery", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  ownerId: text("owner_id")
    .notNull()
    .references(() => allUsers.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  isPublic: boolean("is_public").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const galleryItems = pgTable(
  "gallery_item",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    galleryId: text("gallery_id")
      .notNull()
      .references(() => galleries.id, { onDelete: "cascade" }),
    memoryId: text("memory_id").notNull(),
    memoryType: text("memory_type", { enum: MEMORY_TYPES }).notNull(), // 'image' | 'video' | 'document' | 'note' | 'audio'
    position: integer("position").notNull(),
    caption: text("caption"),
    isFeatured: boolean("is_featured").default(false).notNull(),
    metadata: json("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    // Fast ordering inside a gallery
    index("gallery_items_gallery_position_idx").on(t.galleryId, t.position),
    // Prevent duplicates of same memory in the same gallery
    uniqueIndex("gallery_items_gallery_memory_uq").on(t.galleryId, t.memoryId, t.memoryType),
    // Quickly find all galleries for a memory
    index("gallery_items_by_memory_idx").on(t.memoryId, t.memoryType),
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

export type DBImage = typeof images.$inferSelect;
export type NewDBImage = typeof images.$inferInsert;

export type DBDocument = typeof documents.$inferSelect;
export type NewDBDocument = typeof documents.$inferInsert;

export type DBNote = typeof notes.$inferSelect;
export type NewDBNote = typeof notes.$inferInsert;

export type DBMemoryShare = typeof memoryShares.$inferSelect;
export type NewDBMemoryShare = typeof memoryShares.$inferInsert;

export type DBGroup = typeof group.$inferSelect;
export type NewDBGroup = typeof group.$inferInsert;

export type DBGroupMember = typeof groupMember.$inferSelect;
export type NewDBGroupMember = typeof groupMember.$inferInsert;

export type DBVideo = typeof videos.$inferSelect;
export type NewDBVideo = typeof videos.$inferInsert;

export type DBGallery = typeof galleries.$inferSelect;
export type NewDBGallery = typeof galleries.$inferInsert;

// Gallery sharing table - similar to memoryShares but for galleries
export const galleryShares = pgTable("gallery_share", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  galleryId: text("gallery_id")
    .notNull()
    .references(() => galleries.id, { onDelete: "cascade" }),
  ownerId: text("owner_id") // The user who owns the gallery
    .notNull()
    .references(() => allUsers.id, { onDelete: "cascade" }),

  sharedWithType: text("shared_with_type", {
    enum: ["user", "group", "relationship"],
  }).notNull(),

  sharedWithId: text("shared_with_id") // For direct user sharing
    .references(() => allUsers.id, { onDelete: "cascade" }),
  groupId: text("group_id") // For group sharing
    .references(() => group.id, { onDelete: "cascade" }),
  sharedRelationshipType: text("shared_relationship_type", {
    // For relationship-based sharing
    enum: SHARING_RELATIONSHIP_TYPES,
  }),

  accessLevel: text("access_level", { enum: ACCESS_LEVELS }).default("read").notNull(),
  inviteeSecureCode: text("invitee_secure_code").notNull(), // For invitee to access the gallery
  inviteeSecureCodeCreatedAt: timestamp("secure_code_created_at", { mode: "date" }).notNull().defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type DBGalleryItem = typeof galleryItems.$inferSelect;
export type NewDBGalleryItem = typeof galleryItems.$inferInsert;

export type DBGalleryShare = typeof galleryShares.$inferSelect;
export type NewDBGalleryShare = typeof galleryShares.$inferInsert;

// Internet Identity nonce table for canister-first signup
export const iiNonces = pgTable(
  "ii_nonce",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    nonceHash: text("nonce_hash").notNull(), // SHA-256 hash of the actual nonce
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
    usedAt: timestamp("used_at", { mode: "date" }), // null = unused, timestamp = used
    context: json("context")
      .$type<{
        callbackUrl?: string;
        userAgent?: string;
        ipAddress?: string;
        sessionId?: string;
      }>()
      .default({}),
  },
  (table) => [
    // Index for fast lookup by hash
    index("ii_nonces_hash_idx").on(table.nonceHash),
    // Index for cleanup of expired nonces
    index("ii_nonces_expires_idx").on(table.expiresAt),
    // Index for stats queries on usedAt
    index("ii_nonces_used_idx").on(table.usedAt),
    // Composite index for active nonce lookups (usedAt IS NULL AND expiresAt > now)
    index("ii_nonces_active_idx").on(table.usedAt, table.expiresAt),
    // Index for rate limiting queries on createdAt
    index("ii_nonces_created_idx").on(table.createdAt),
  ]
);

export type DBIINonce = typeof iiNonces.$inferSelect;
export type NewDBIINonce = typeof iiNonces.$inferInsert;

// Storage Edges Table - Track storage presence per memory artifact and backend
export const storageEdges = pgTable(
  "storage_edges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memoryId: uuid("memory_id").notNull(), // References images.id, videos.id, etc.
    memoryType: memory_type_t("memory_type").notNull(), // 'image' | 'video' | 'note' | 'document' | 'audio'
    artifact: artifact_t("artifact").notNull(), // 'metadata' | 'asset'
    backend: backend_t("backend").notNull(), // 'neon-db' | 'vercel-blob' | 'icp-canister'
    present: boolean("present").notNull().default(false),
    location: text("location"), // blob key / icp path / etc.
    contentHash: text("content_hash"), // SHA-256 for assets
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    syncState: sync_t("sync_state").notNull().default("idle"), // 'idle' | 'migrating' | 'failed'
    lastSyncedAt: timestamp("last_synced_at", { mode: "date" }),
    syncError: text("sync_error"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
  },
  (t) => [
    uniqueIndex("uq_edge").on(t.memoryId, t.memoryType, t.artifact, t.backend),
    index("ix_edges_memory").on(t.memoryId, t.memoryType),
    index("ix_edges_backend_present").on(t.backend, t.artifact, t.present),
    index("ix_edges_sync_state").on(t.syncState),
  ]
);

export type DBStorageEdge = typeof storageEdges.$inferSelect;
export type NewDBStorageEdge = typeof storageEdges.$inferInsert;

// NOTE: Views are created/updated ONLY via SQL migrations.
// These helpers are read-only projections for typing & autocompletion.

// Memory Presence View Types
export type DBMemoryPresence = {
  memory_id: string;
  memory_type: "image" | "video" | "note" | "document" | "audio";
  meta_neon: boolean;
  asset_blob: boolean;
  meta_icp: boolean;
  asset_icp: boolean;
};

export type DBGalleryPresence = {
  gallery_id: string;
  total_memories: number;
  icp_complete_memories: number;
  icp_complete: boolean;
  icp_any: boolean;
};

export type DBSyncStatus = {
  memory_id: string;
  memory_type: "image" | "video" | "note" | "document" | "audio";
  artifact: "metadata" | "asset";
  backend: "neon-db" | "vercel-blob" | "icp-canister";
  sync_state: "idle" | "migrating" | "failed";
  sync_error: string | null;
  last_synced_at: Date | null;
  created_at: Date;
  updated_at: Date;
  sync_duration_seconds: number | null;
  is_stuck: boolean;
};

// Read-only bindings for views (defined in migrations):
// These are NOT DDL; just typed selectors for application code.
export const memoryPresence = sql<DBMemoryPresence>`SELECT * FROM memory_presence`.as("memory_presence");

export const galleryPresence = sql<DBGalleryPresence>`SELECT * FROM gallery_presence`.as("gallery_presence");

export const syncStatus = sql<DBSyncStatus>`SELECT * FROM sync_status`.as("sync_status");

// Helper functions for common queries
export const getMemoryPresenceById = (memoryId: string, memoryType: string) =>
  sql<DBMemoryPresence>`SELECT * FROM memory_presence WHERE memory_id = ${memoryId} AND memory_type = ${memoryType}`;

export const getGalleryPresenceById = (galleryId: string) =>
  sql<DBGalleryPresence>`SELECT * FROM gallery_presence WHERE gallery_id = ${galleryId}`;

export const getSyncStatusByState = (syncState: "migrating" | "failed") =>
  sql<DBSyncStatus>`SELECT * FROM sync_status WHERE sync_state = ${syncState}`;

export const getStuckSyncs = () => sql<DBSyncStatus>`SELECT * FROM sync_status WHERE is_stuck = true`;

export const getSyncStatusByBackend = (backend: "neon-db" | "vercel-blob" | "icp-canister") =>
  sql<DBSyncStatus>`SELECT * FROM sync_status WHERE backend = ${backend}`;

export const refreshGalleryPresence = () => sql`SELECT refresh_gallery_presence()`;

// Type helpers for the enums
export type MemoryType = (typeof MEMORY_TYPES)[number];
export type AccessLevel = (typeof ACCESS_LEVELS)[number];
export type MemberRole = (typeof MEMBER_ROLES)[number];

export type DBRelationship = typeof relationship.$inferSelect;
export type DBFamilyRelationship = typeof familyRelationship.$inferSelect;
```
