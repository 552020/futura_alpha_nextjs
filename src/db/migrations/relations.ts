import { relations } from 'drizzle-orm/relations';
import {
  allUser,
  businessRelationship,
  memories,
  audioDetails,
  relationship,
  familyRelationship,
  documentDetails,
  user,
  authenticator,
  gallery,
  galleryItem,
  galleryShare,
  group,
  imageDetails,
  memoryAssets,
  folders,
  memoryShare,
  temporaryUser,
  noteDetails,
  session,
  videoDetails,
  familyMember,
  groupMember,
  account,
} from './schema';

export const businessRelationshipRelations = relations(businessRelationship, ({ one }) => ({
  allUser_businessId: one(allUser, {
    fields: [businessRelationship.businessId],
    references: [allUser.id],
    relationName: 'businessRelationship_businessId_allUser_id',
  }),
  allUser_clientId: one(allUser, {
    fields: [businessRelationship.clientId],
    references: [allUser.id],
    relationName: 'businessRelationship_clientId_allUser_id',
  }),
}));

export const allUserRelations = relations(allUser, ({ many }) => ({
  businessRelationships_businessId: many(businessRelationship, {
    relationName: 'businessRelationship_businessId_allUser_id',
  }),
  businessRelationships_clientId: many(businessRelationship, {
    relationName: 'businessRelationship_clientId_allUser_id',
  }),
  familyRelationships: many(familyRelationship),
  galleryShares_ownerId: many(galleryShare, {
    relationName: 'galleryShare_ownerId_allUser_id',
  }),
  galleryShares_sharedWithId: many(galleryShare, {
    relationName: 'galleryShare_sharedWithId_allUser_id',
  }),
  folders: many(folders),
  memories: many(memories),
  galleries: many(gallery),
  memoryShares_ownerId: many(memoryShare, {
    relationName: 'memoryShare_ownerId_allUser_id',
  }),
  memoryShares_sharedWithId: many(memoryShare, {
    relationName: 'memoryShare_sharedWithId_allUser_id',
  }),
  temporaryUsers: many(temporaryUser),
  relationships_userId: many(relationship, {
    relationName: 'relationship_userId_allUser_id',
  }),
  relationships_relatedUserId: many(relationship, {
    relationName: 'relationship_relatedUserId_allUser_id',
  }),
  users: many(user),
  familyMembers_ownerId: many(familyMember, {
    relationName: 'familyMember_ownerId_allUser_id',
  }),
  familyMembers_userId: many(familyMember, {
    relationName: 'familyMember_userId_allUser_id',
  }),
}));

export const audioDetailsRelations = relations(audioDetails, ({ one }) => ({
  memory: one(memories, {
    fields: [audioDetails.memoryId],
    references: [memories.id],
  }),
}));

export const memoriesRelations = relations(memories, ({ one, many }) => ({
  audioDetails: many(audioDetails),
  documentDetails: many(documentDetails),
  imageDetails: many(imageDetails),
  memoryAssets: many(memoryAssets),
  allUser: one(allUser, {
    fields: [memories.ownerId],
    references: [allUser.id],
  }),
  noteDetails: many(noteDetails),
  videoDetails: many(videoDetails),
}));

export const familyRelationshipRelations = relations(familyRelationship, ({ one }) => ({
  relationship: one(relationship, {
    fields: [familyRelationship.relationshipId],
    references: [relationship.id],
  }),
  allUser: one(allUser, {
    fields: [familyRelationship.sharedAncestorId],
    references: [allUser.id],
  }),
}));

export const relationshipRelations = relations(relationship, ({ one, many }) => ({
  familyRelationships: many(familyRelationship),
  allUser_userId: one(allUser, {
    fields: [relationship.userId],
    references: [allUser.id],
    relationName: 'relationship_userId_allUser_id',
  }),
  allUser_relatedUserId: one(allUser, {
    fields: [relationship.relatedUserId],
    references: [allUser.id],
    relationName: 'relationship_relatedUserId_allUser_id',
  }),
}));

export const documentDetailsRelations = relations(documentDetails, ({ one }) => ({
  memory: one(memories, {
    fields: [documentDetails.memoryId],
    references: [memories.id],
  }),
}));

export const authenticatorRelations = relations(authenticator, ({ one }) => ({
  user: one(user, {
    fields: [authenticator.userId],
    references: [user.id],
  }),
}));

export const userRelations = relations(user, ({ one, many }) => ({
  authenticators: many(authenticator),
  groups: many(group),
  sessions: many(session),
  allUser: one(allUser, {
    fields: [user.invitedByAllUserId],
    references: [allUser.id],
  }),
  user: one(user, {
    fields: [user.parentId],
    references: [user.id],
    relationName: 'user_parentId_user_id',
  }),
  users: many(user, {
    relationName: 'user_parentId_user_id',
  }),
  groupMembers: many(groupMember),
  accounts: many(account),
}));

export const galleryItemRelations = relations(galleryItem, ({ one }) => ({
  gallery: one(gallery, {
    fields: [galleryItem.galleryId],
    references: [gallery.id],
  }),
}));

export const galleryRelations = relations(gallery, ({ one, many }) => ({
  galleryItems: many(galleryItem),
  galleryShares: many(galleryShare),
  allUser: one(allUser, {
    fields: [gallery.ownerId],
    references: [allUser.id],
  }),
}));

export const galleryShareRelations = relations(galleryShare, ({ one }) => ({
  gallery: one(gallery, {
    fields: [galleryShare.galleryId],
    references: [gallery.id],
  }),
  allUser_ownerId: one(allUser, {
    fields: [galleryShare.ownerId],
    references: [allUser.id],
    relationName: 'galleryShare_ownerId_allUser_id',
  }),
  allUser_sharedWithId: one(allUser, {
    fields: [galleryShare.sharedWithId],
    references: [allUser.id],
    relationName: 'galleryShare_sharedWithId_allUser_id',
  }),
  group: one(group, {
    fields: [galleryShare.groupId],
    references: [group.id],
  }),
}));

export const groupRelations = relations(group, ({ one, many }) => ({
  galleryShares: many(galleryShare),
  user: one(user, {
    fields: [group.ownerId],
    references: [user.id],
  }),
  memoryShares: many(memoryShare),
  groupMembers: many(groupMember),
}));

export const imageDetailsRelations = relations(imageDetails, ({ one }) => ({
  memory: one(memories, {
    fields: [imageDetails.memoryId],
    references: [memories.id],
  }),
}));

export const memoryAssetsRelations = relations(memoryAssets, ({ one }) => ({
  memory: one(memories, {
    fields: [memoryAssets.memoryId],
    references: [memories.id],
  }),
}));

export const foldersRelations = relations(folders, ({ one }) => ({
  allUser: one(allUser, {
    fields: [folders.ownerId],
    references: [allUser.id],
  }),
}));

export const memoryShareRelations = relations(memoryShare, ({ one }) => ({
  allUser_ownerId: one(allUser, {
    fields: [memoryShare.ownerId],
    references: [allUser.id],
    relationName: 'memoryShare_ownerId_allUser_id',
  }),
  allUser_sharedWithId: one(allUser, {
    fields: [memoryShare.sharedWithId],
    references: [allUser.id],
    relationName: 'memoryShare_sharedWithId_allUser_id',
  }),
  group: one(group, {
    fields: [memoryShare.groupId],
    references: [group.id],
  }),
}));

export const temporaryUserRelations = relations(temporaryUser, ({ one }) => ({
  allUser: one(allUser, {
    fields: [temporaryUser.invitedByAllUserId],
    references: [allUser.id],
  }),
}));

export const noteDetailsRelations = relations(noteDetails, ({ one }) => ({
  memory: one(memories, {
    fields: [noteDetails.memoryId],
    references: [memories.id],
  }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const videoDetailsRelations = relations(videoDetails, ({ one }) => ({
  memory: one(memories, {
    fields: [videoDetails.memoryId],
    references: [memories.id],
  }),
}));

export const familyMemberRelations = relations(familyMember, ({ one }) => ({
  allUser_ownerId: one(allUser, {
    fields: [familyMember.ownerId],
    references: [allUser.id],
    relationName: 'familyMember_ownerId_allUser_id',
  }),
  allUser_userId: one(allUser, {
    fields: [familyMember.userId],
    references: [allUser.id],
    relationName: 'familyMember_userId_allUser_id',
  }),
}));

export const groupMemberRelations = relations(groupMember, ({ one }) => ({
  group: one(group, {
    fields: [groupMember.groupId],
    references: [group.id],
  }),
  user: one(user, {
    fields: [groupMember.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));
