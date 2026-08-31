import {
  users,
  allUsers,
  temporaryUsers,
  accounts,
  sessions,
  memories,
  memoryAssets,
  memoryMetadata,
  folders,
  imageDetails,
  videoDetails,
  documentDetails,
  audioDetails,
  noteDetails,
  peopleInMemories,
  memoryLikes,
  memoryComments,
  group,
  groupMember,
  relationship,
  familyRelationship,
  businessRelationship,
  familyMember,
  galleries,
  galleryItems,
  galleryShares,
  iiNonces,
  storageEdges,
  userHostingPreferences,
  serviceDeployments,
  userSettings,
} from './tables';

// User-related types
export type DBUser = typeof users.$inferSelect;
export type NewDBUser = typeof users.$inferInsert;

export type DBAllUser = typeof allUsers.$inferSelect;
export type NewDBAllUser = typeof allUsers.$inferInsert;

export type DBTemporaryUser = typeof temporaryUsers.$inferSelect;
export type NewDBTemporaryUser = typeof temporaryUsers.$inferInsert;

// Auth-related types
export type DBAccount = typeof accounts.$inferSelect;
export type NewDBAccount = typeof accounts.$inferInsert;

export type DBSession = typeof sessions.$inferSelect;
export type NewDBSession = typeof sessions.$inferInsert;

// Memory-related types
export type DBMemory = typeof memories.$inferSelect;
export type NewDBMemory = typeof memories.$inferInsert;

export type DBMemoryAsset = typeof memoryAssets.$inferSelect;
export type NewDBMemoryAsset = typeof memoryAssets.$inferInsert;

export type DBMemoryMetadata = typeof memoryMetadata.$inferSelect;
export type NewDBMemoryMetadata = typeof memoryMetadata.$inferInsert;

// Memory with assets relationship
export type DBMemoryWithAssets = DBMemory & {
  assets: DBMemoryAsset[];
};

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

// Social features types
export type DBPeopleInMemories = typeof peopleInMemories.$inferSelect;
export type NewDBPeopleInMemories = typeof peopleInMemories.$inferInsert;

export type DBMemoryLikes = typeof memoryLikes.$inferSelect;
export type NewDBMemoryLikes = typeof memoryLikes.$inferInsert;

export type DBMemoryComments = typeof memoryComments.$inferSelect;
export type NewDBMemoryComments = typeof memoryComments.$inferInsert;

// Group types
export type DBGroup = typeof group.$inferSelect;
export type NewDBGroup = typeof group.$inferInsert;

export type DBGroupMember = typeof groupMember.$inferSelect;
export type NewDBGroupMember = typeof groupMember.$inferInsert;

// Relationship types
export type DBRelationship = typeof relationship.$inferSelect;
export type NewDBRelationship = typeof relationship.$inferInsert;

export type DBFamilyRelationship = typeof familyRelationship.$inferSelect;
export type NewDBFamilyRelationship = typeof familyRelationship.$inferInsert;

export type DBBusinessRelationship = typeof businessRelationship.$inferSelect;
export type NewDBBusinessRelationship =
  typeof businessRelationship.$inferInsert;

export type DBFamilyMember = typeof familyMember.$inferSelect;
export type NewDBFamilyMember = typeof familyMember.$inferInsert;

// Gallery types
export type DBGallery = typeof galleries.$inferSelect;
export type NewDBGallery = typeof galleries.$inferInsert;

export type DBGalleryItem = typeof galleryItems.$inferSelect;
export type NewDBGalleryItem = typeof galleryItems.$inferInsert;

export type DBGalleryShare = typeof galleryShares.$inferSelect;
export type NewDBGalleryShare = typeof galleryShares.$inferInsert;

// Authentication and security types
export type DBIINonce = typeof iiNonces.$inferSelect;
export type NewDBIINonce = typeof iiNonces.$inferInsert;

// Storage types
export type DBStorageEdge = typeof storageEdges.$inferSelect;
export type NewDBStorageEdge = typeof storageEdges.$inferInsert;

// Hosting preference types
export type UserHostingPreference = typeof userHostingPreferences.$inferSelect;
export type NewUserHostingPreference =
  typeof userHostingPreferences.$inferInsert;

// Service deployment types
export type ServiceDeployment = typeof serviceDeployments.$inferSelect;
export type NewServiceDeployment = typeof serviceDeployments.$inferInsert;

// User settings types
export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;

// Temporary type exports for backward compatibility
// TODO: Remove these once all files are updated to use the new unified schema
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
