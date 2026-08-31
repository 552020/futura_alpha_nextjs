import { db } from '@/db/db';
import { folders, resourceMembership } from '@/db';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { fatLogger } from '@/lib/logger';
import type { DBFolder } from '@/db/types';

export interface FolderOperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CreateFolderParams {
  ownerId: string;
  name: string;
  title: string;
  parentFolderId?: string | null;
}

export interface UpdateFolderParams {
  name?: string;
  title?: string;
  parentFolderId?: string | null;
}

export interface ShareFolderParams {
  folderId: string;
  allUserId: string;
  grantSource: 'user' | 'group' | 'magic_link' | 'public_mode' | 'system';
  role: 'owner' | 'superadmin' | 'admin' | 'member' | 'guest';
  invitedByAllUserId?: string;
}

export interface FolderAccessCheckParams {
  folderId: string;
  userId: string;
}

/**
 * Create a new folder record in the database
 */
export const createFolderRecord = async (
  params: CreateFolderParams
): Promise<FolderOperationResult> => {
  try {
    const [createdFolder] = await db
      .insert(folders)
      .values({
        ownerId: params.ownerId,
        name: params.name,
        title: params.title,
        parentFolderId: params.parentFolderId || null,
      })
      .returning();

    fatLogger.info('Created folder', 'be', {
      operation: 'create_folder',
      folderId: createdFolder.id,
      ownerId: params.ownerId,
      name: params.name,
    });

    return { success: true, data: createdFolder };
  } catch (error) {
    fatLogger.error('Failed to create folder', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'create_folder',
      ownerId: params.ownerId,
      name: params.name,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Get a single folder record by ID for owner (with ownership check)
 */
export const getFolderByIdForOwner = async (
  folderId: string,
  ownerAllUserId: string
): Promise<FolderOperationResult<DBFolder>> => {
  try {
    const folder = await db.query.folders.findFirst({
      where: and(eq(folders.id, folderId), eq(folders.ownerId, ownerAllUserId)),
    });

    if (!folder) {
      return { success: false, error: 'Folder not found or access denied' };
    }

    return { success: true, data: folder };
  } catch (error) {
    fatLogger.error('Failed to get folder by ID for owner', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'get_folder_by_id_for_owner',
      folderId,
      ownerAllUserId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Get a single folder record by ID
 */
export const getFolderRecord = async (
  folderId: string
): Promise<FolderOperationResult> => {
  try {
    const folder = await db.query.folders.findFirst({
      where: eq(folders.id, folderId),
    });

    if (!folder) {
      return { success: false, error: 'Folder not found' };
    }

    return { success: true, data: folder };
  } catch (error) {
    fatLogger.error('Failed to get folder', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'get_folder',
      folderId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Get folders by multiple IDs
 */
export const getFoldersByIds = async (
  folderIds: string[]
): Promise<FolderOperationResult<DBFolder[]>> => {
  try {
    if (folderIds.length === 0) {
      return { success: true, data: [] };
    }

    const folderRecords = await db.query.folders.findMany({
      where: inArray(folders.id, folderIds),
    });

    return { success: true, data: folderRecords };
  } catch (error) {
    fatLogger.error('Failed to get folders by IDs', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'get_folders_by_ids',
      folderIds,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Get folders by owner
 */
export const getFoldersByOwner = async (
  ownerId: string
): Promise<FolderOperationResult> => {
  try {
    const foldersList = await db.query.folders.findMany({
      where: eq(folders.ownerId, ownerId),
      orderBy: desc(folders.createdAt),
    });

    return { success: true, data: foldersList };
  } catch (error) {
    fatLogger.error('Failed to get folders by owner', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'get_folders_by_owner',
      ownerId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Get folders shared with a user
 */
export const getSharedFolders = async (
  allUserId: string
): Promise<FolderOperationResult> => {
  try {
    // Get folder memberships for this user
    const memberships = await db.query.resourceMembership.findMany({
      where: and(
        eq(resourceMembership.allUserId, allUserId),
        eq(resourceMembership.resourceType, 'folder')
      ),
    });

    if (memberships.length === 0) {
      return { success: true, data: [] };
    }

    // Get the actual folder data
    const folderIds = memberships.map((m) => m.resourceId);
    const sharedFolders = await db.query.folders.findMany({
      where: eq(folders.id, folderIds[0]), // This needs to be fixed with proper inArray
      orderBy: desc(folders.createdAt),
    });

    return { success: true, data: sharedFolders };
  } catch (error) {
    fatLogger.error('Failed to get shared folders', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'get_shared_folders',
      allUserId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Update folder record
 */
export const updateFolderRecord = async (
  folderId: string,
  params: UpdateFolderParams
): Promise<FolderOperationResult<DBFolder>> => {
  try {
    const [updatedFolder] = await db
      .update(folders)
      .set({
        ...params,
        updatedAt: new Date(),
      })
      .where(eq(folders.id, folderId))
      .returning();

    fatLogger.info('Updated folder', 'be', {
      operation: 'update_folder',
      folderId,
      params,
    });

    return { success: true, data: updatedFolder };
  } catch (error) {
    fatLogger.error('Failed to update folder', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'update_folder',
      folderId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Delete folder record
 */
export const deleteFolderRecord = async (
  folderId: string
): Promise<FolderOperationResult> => {
  try {
    await db.delete(folders).where(eq(folders.id, folderId));

    fatLogger.info('Deleted folder', 'be', {
      operation: 'delete_folder',
      folderId,
    });

    return { success: true };
  } catch (error) {
    fatLogger.error('Failed to delete folder', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'delete_folder',
      folderId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// ============================================================================
// FOLDER SHARING FUNCTIONS
// ============================================================================

/**
 * Share a folder with a user
 */
export const shareFolderWithUser = async (
  params: ShareFolderParams
): Promise<FolderOperationResult> => {
  try {
    const [share] = await db
      .insert(resourceMembership)
      .values({
        resourceType: 'folder',
        resourceId: params.folderId,
        allUserId: params.allUserId,
        grantSource: params.grantSource,
        role: params.role,
        invitedByAllUserId: params.invitedByAllUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    fatLogger.info('Shared folder', 'be', {
      operation: 'share_folder',
      folderId: params.folderId,
      allUserId: params.allUserId,
      role: params.role,
    });

    return { success: true, data: share };
  } catch (error) {
    fatLogger.error('Failed to share folder', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'share_folder',
      folderId: params.folderId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Get folder shares
 */
export const getFolderShares = async (
  folderId: string
): Promise<FolderOperationResult> => {
  try {
    const shares = await db.query.resourceMembership.findMany({
      where: and(
        eq(resourceMembership.resourceId, folderId),
        eq(resourceMembership.resourceType, 'folder')
      ),
    });

    return { success: true, data: shares };
  } catch (error) {
    fatLogger.error('Failed to get folder shares', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'get_folder_shares',
      folderId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Check if user has access to a folder
 * Returns access level: 'owner', 'shared', or null
 */
export const checkFolderAccess = async (
  params: FolderAccessCheckParams
): Promise<FolderOperationResult<'owner' | 'shared' | null>> => {
  try {
    const folder = await db.query.folders.findFirst({
      where: eq(folders.id, params.folderId),
    });

    if (!folder) {
      return { success: true, data: null };
    }

    // Check if user owns the folder
    if (folder.ownerId === params.userId) {
      return { success: true, data: 'owner' };
    }

    // Check if folder is shared with user
    const share = await db.query.resourceMembership.findFirst({
      where: and(
        eq(resourceMembership.resourceId, params.folderId),
        eq(resourceMembership.resourceType, 'folder'),
        eq(resourceMembership.allUserId, params.userId)
      ),
    });

    if (share) {
      return { success: true, data: 'shared' };
    }

    return { success: true, data: null };
  } catch (error) {
    fatLogger.error('Failed to check folder access', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'check_folder_access',
      folderId: params.folderId,
      userId: params.userId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
