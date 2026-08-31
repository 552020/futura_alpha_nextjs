import { relations } from 'drizzle-orm';
import {
  // Import all tables
  users,
  allUsers,
  memories,
  memoryAssets,
  resourceShareTokens,
  folders,
  imageDetails,
  videoDetails,
  documentDetails,
  audioDetails,
  noteDetails,
  peopleInMemories,
  memoryLikes,
  memoryComments,
  businessRelationship,
  accounts,
  sessions,
  userSettings,
  userHostingPreferences,
} from './tables';

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
  shareTokens: many(resourceShareTokens),
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

// Resource share tokens relations
export const resourceShareTokensRelations = relations(
  resourceShareTokens,
  ({ one }) => ({
    creator: one(allUsers, {
      fields: [resourceShareTokens.createdBy],
      references: [allUsers.id],
    }),
  })
);

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

export const documentDetailsRelations = relations(
  documentDetails,
  ({ one }) => ({
    memory: one(memories, {
      fields: [documentDetails.memoryId],
      references: [memories.id],
    }),
  })
);

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
export const peopleInMemoriesRelations = relations(
  peopleInMemories,
  ({ one }) => ({
    memory: one(memories, {
      fields: [peopleInMemories.memoryId],
      references: [memories.id],
    }),
    person: one(allUsers, {
      fields: [peopleInMemories.allUserId],
      references: [allUsers.id],
    }),
  })
);

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
export const memoryCommentsRelations = relations(
  memoryComments,
  ({ one, many }) => ({
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
  })
);

// Business relationship relations
export const businessRelationshipRelations = relations(
  businessRelationship,
  ({ one }) => ({
    business: one(allUsers, {
      fields: [businessRelationship.businessId],
      references: [allUsers.id],
    }),
    client: one(allUsers, {
      fields: [businessRelationship.clientId],
      references: [allUsers.id],
    }),
  })
);

// User settings relations
export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, {
    fields: [userSettings.userId],
    references: [users.id],
  }),
}));

// User hosting preferences relations
export const userHostingPreferencesRelations = relations(
  userHostingPreferences,
  ({ one }) => ({
    user: one(users, {
      fields: [userHostingPreferences.userId],
      references: [users.id],
    }),
  })
);

/**
 * USER TABLE RELATIONS - Drizzle ORM query helpers for the users table
 *
 * This defines how the users table relates to other tables for clean queries.
 * This is NOT the same as the 'relationship' table which stores actual user relationships.
 *
 * Purpose: Enables object-like queries like user.settings, user.accounts, etc.
 * Usage: db.query.users.findFirst({ with: { settings: true, accounts: true } })
 */
export const userTableRelations = relations(users, ({ one, many }) => ({
  settings: one(userSettings, {
    fields: [users.id],
    references: [userSettings.userId],
  }),
  hostingPreferences: one(userHostingPreferences, {
    fields: [users.id],
    references: [userHostingPreferences.userId],
  }),
  accounts: many(accounts),
  sessions: many(sessions),
}));
