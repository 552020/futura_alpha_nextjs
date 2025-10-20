import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSharedResources } from '@/services/sharing';
import { getFoldersByIds } from '@/services/folder';
import { getAllUserRecord } from '@/services/user';
import type { allUsers } from '@/db';
import { fatLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user record using service function
    const userResult = await getAllUserRecord(session.user.id);

    if (!userResult.success) {
      fatLogger.error('Failed to get user record', 'be', {
        error: userResult.error,
        userId: session.user.id,
      });
      return NextResponse.json(
        {
          error: 'User record not found',
          details: userResult.error,
        },
        { status: 404 }
      );
    }

    const allUserRecord = userResult.data as typeof allUsers.$inferSelect;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const orderBy = searchParams.get('orderBy') || 'sharedAt';

    fatLogger.info('📁 Getting shared folders:', 'be', {
      userId: allUserRecord.id,
      page,
      limit,
      orderBy,
    });

    // Get folders shared with the user using service function
    const sharedResourcesResult = await getSharedResources(allUserRecord.id, 'folder');

    if (!sharedResourcesResult.success) {
      fatLogger.error('Failed to get shared resources', 'be', {
        error: sharedResourcesResult.error,
        userId: allUserRecord.id,
      });
      return NextResponse.json(
        {
          error: 'Failed to get shared folders',
          details: sharedResourcesResult.error,
        },
        { status: 500 }
      );
    }

    const allSharedFolders = sharedResourcesResult.data || [];

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const sharedFolders = allSharedFolders.slice(startIndex, endIndex);

    fatLogger.info('📁 Found shared folder memberships:', 'be', {
      total: allSharedFolders.length,
      page,
      limit,
      showing: sharedFolders.length,
      userId: allUserRecord.id,
    });

    // Get folder IDs from memberships
    const folderIds = sharedFolders.map(membership => membership.resourceId);

    // Get folder details using service function
    const folders = await getFoldersByIds(folderIds);

    // Create a map for quick lookup
    const folderMap = new Map(folders.map(folder => [folder.id, folder]));

    // Combine membership data with folder details
    const folderDetails = sharedFolders.map(membership => {
      const folder = folderMap.get(membership.resourceId);

      if (!folder) {
        fatLogger.warn('Folder not found for membership:', 'be', {
          membershipId: membership.id,
          resourceId: membership.resourceId,
        });
        return null;
      }

      // Parse permissions from permMask
      const permissions = {
        canView: (membership.permMask & 1) !== 0,
        canEdit: (membership.permMask & 2) !== 0,
        canDelete: (membership.permMask & 4) !== 0,
      };

      return {
        id: folder.id,
        name: folder.name,
        title: folder.title,
        ownerId: folder.ownerId,
        createdAt: folder.createdAt,
        updatedAt: folder.updatedAt,
        shareInfo: {
          shareId: membership.id,
          sharedAt: membership.createdAt,
          permissions,
          grantSource: membership.grantSource,
          invitedBy: membership.invitedByAllUserId,
        },
      };
    });

    // Filter out null results (folders that no longer exist)
    const validFolders = folderDetails.filter((folder): folder is NonNullable<typeof folder> => folder !== null);

    fatLogger.info('✅ Shared folders retrieved successfully:', 'be', {
      totalFound: validFolders.length,
      userId: allUserRecord.id,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: validFolders,
      pagination: {
        page,
        limit,
        hasMore: endIndex < allSharedFolders.length,
        total: allSharedFolders.length,
        showing: validFolders.length,
      },
    });
  } catch (error) {
    fatLogger.error('🔴 Error getting shared folders:', 'be', {
      error: error instanceof Error ? error : undefined,
      stack: error instanceof Error ? error.stack : undefined,
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        error: 'Failed to get shared folders',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
