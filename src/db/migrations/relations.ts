import { relations } from "drizzle-orm/relations";
import {
  relationship,
  familyRelationship,
  allUser,
  user,
  authenticator,
  familyMember,
  gallery,
  galleryShare,
  group,
  audio,
  memoryShare,
  session,
  document,
  image,
  note,
  temporaryUser,
  galleryItem,
  video,
  groupMember,
  account,
} from "./schema";

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
    relationName: "relationship_userId_allUser_id",
  }),
  allUser_relatedUserId: one(allUser, {
    fields: [relationship.relatedUserId],
    references: [allUser.id],
    relationName: "relationship_relatedUserId_allUser_id",
  }),
}));

export const allUserRelations = relations(allUser, ({ many }) => ({
  familyRelationships: many(familyRelationship),
  familyMembers_ownerId: many(familyMember, {
    relationName: "familyMember_ownerId_allUser_id",
  }),
  familyMembers_userId: many(familyMember, {
    relationName: "familyMember_userId_allUser_id",
  }),
  galleryShares_ownerId: many(galleryShare, {
    relationName: "galleryShare_ownerId_allUser_id",
  }),
  galleryShares_sharedWithId: many(galleryShare, {
    relationName: "galleryShare_sharedWithId_allUser_id",
  }),
  relationships_userId: many(relationship, {
    relationName: "relationship_userId_allUser_id",
  }),
  relationships_relatedUserId: many(relationship, {
    relationName: "relationship_relatedUserId_allUser_id",
  }),
  audio: many(audio),
  memoryShares_ownerId: many(memoryShare, {
    relationName: "memoryShare_ownerId_allUser_id",
  }),
  memoryShares_sharedWithId: many(memoryShare, {
    relationName: "memoryShare_sharedWithId_allUser_id",
  }),
  documents: many(document),
  images: many(image),
  notes: many(note),
  users: many(user),
  temporaryUsers: many(temporaryUser),
  galleries: many(gallery),
  videos: many(video),
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
  user: one(user, {
    fields: [user.parentId],
    references: [user.id],
    relationName: "user_parentId_user_id",
  }),
  users: many(user, {
    relationName: "user_parentId_user_id",
  }),
  allUser: one(allUser, {
    fields: [user.invitedByAllUserId],
    references: [allUser.id],
  }),
  groupMembers: many(groupMember),
  accounts: many(account),
}));

export const familyMemberRelations = relations(familyMember, ({ one }) => ({
  allUser_ownerId: one(allUser, {
    fields: [familyMember.ownerId],
    references: [allUser.id],
    relationName: "familyMember_ownerId_allUser_id",
  }),
  allUser_userId: one(allUser, {
    fields: [familyMember.userId],
    references: [allUser.id],
    relationName: "familyMember_userId_allUser_id",
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
    relationName: "galleryShare_ownerId_allUser_id",
  }),
  allUser_sharedWithId: one(allUser, {
    fields: [galleryShare.sharedWithId],
    references: [allUser.id],
    relationName: "galleryShare_sharedWithId_allUser_id",
  }),
  group: one(group, {
    fields: [galleryShare.groupId],
    references: [group.id],
  }),
}));

export const galleryRelations = relations(gallery, ({ one, many }) => ({
  galleryShares: many(galleryShare),
  allUser: one(allUser, {
    fields: [gallery.ownerId],
    references: [allUser.id],
  }),
  galleryItems: many(galleryItem),
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

export const audioRelations = relations(audio, ({ one }) => ({
  allUser: one(allUser, {
    fields: [audio.ownerId],
    references: [allUser.id],
  }),
}));

export const memoryShareRelations = relations(memoryShare, ({ one }) => ({
  allUser_ownerId: one(allUser, {
    fields: [memoryShare.ownerId],
    references: [allUser.id],
    relationName: "memoryShare_ownerId_allUser_id",
  }),
  allUser_sharedWithId: one(allUser, {
    fields: [memoryShare.sharedWithId],
    references: [allUser.id],
    relationName: "memoryShare_sharedWithId_allUser_id",
  }),
  group: one(group, {
    fields: [memoryShare.groupId],
    references: [group.id],
  }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const documentRelations = relations(document, ({ one }) => ({
  allUser: one(allUser, {
    fields: [document.ownerId],
    references: [allUser.id],
  }),
}));

export const imageRelations = relations(image, ({ one }) => ({
  allUser: one(allUser, {
    fields: [image.ownerId],
    references: [allUser.id],
  }),
}));

export const noteRelations = relations(note, ({ one }) => ({
  allUser: one(allUser, {
    fields: [note.ownerId],
    references: [allUser.id],
  }),
}));

export const temporaryUserRelations = relations(temporaryUser, ({ one }) => ({
  allUser: one(allUser, {
    fields: [temporaryUser.invitedByAllUserId],
    references: [allUser.id],
  }),
}));

export const galleryItemRelations = relations(galleryItem, ({ one }) => ({
  gallery: one(gallery, {
    fields: [galleryItem.galleryId],
    references: [gallery.id],
  }),
}));

export const videoRelations = relations(video, ({ one }) => ({
  allUser: one(allUser, {
    fields: [video.ownerId],
    references: [allUser.id],
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
