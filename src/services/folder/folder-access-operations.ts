import { fatLogger } from '@/lib/logger';
import type { FolderOperationResult } from './folder-operations';
import { getFoldersByOwner, getSharedFolders } from './folder-operations';

/**
 * Get all folders accessible by a user (owned + shared)
 */
export const getAllAccessibleFolders = async (
  allUserId: string
): Promise<FolderOperationResult> => {
  try {
    // Get owned folders
    const ownedResult = await getFoldersByOwner(allUserId);
    if (!ownedResult.success) {
      return { success: false, error: ownedResult.error };
    }

    // Get shared folders
    const sharedResult = await getSharedFolders(allUserId);
    if (!sharedResult.success) {
      return { success: false, error: sharedResult.error };
    }

    // Combine and sort
    const allFolders = [
      ...(Array.isArray(ownedResult.data) ? ownedResult.data : []),
      ...(Array.isArray(sharedResult.data) ? sharedResult.data : []),
    ];
    allFolders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Add access level metadata
    const foldersWithAccess = allFolders.map((folder) => ({
      ...folder,
      accessLevel: folder.ownerId === allUserId ? 'owner' : 'shared',
    }));

    return { success: true, data: foldersWithAccess };
  } catch (error) {
    fatLogger.error('Failed to get all accessible folders', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'get_all_accessible_folders',
      allUserId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
