import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createShare, createPublicLink, generateShareableUrl } from '@/services/sharing';
import { getFolderByIdForOwner } from '@/services/folder';
import { getAllUserRecord, getAllUserRecordById } from '@/services/user';
import type { allUsers } from '@/db';
import { fatLogger } from '@/lib/logger';

type FolderShareRequest = {
  shareType: 'user' | 'public';
  targetUserId?: string; // Required for user sharing
  permissions?: {
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
  };
  expiresAt?: string; // ISO string for public links
};

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: folderId } = await context.params;

  try {
    const body = (await request.json()) as FolderShareRequest;
    fatLogger.info('📁 Folder share request:', 'be', { folderId, body });

    const { shareType, targetUserId, permissions, expiresAt } = body;

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

    // Find the folder and check ownership using service function
    const folder = await getFolderByIdForOwner(folderId, allUserRecord.id);

    if (!folder) {
      fatLogger.error('Folder not found or not owned by user', 'be', {
        folderId,
        ownerId: allUserRecord.id,
      });
      return NextResponse.json({ error: 'Folder not found or access denied' }, { status: 404 });
    }

    fatLogger.info('✅ Folder found and owned by user:', 'be', {
      folderId,
      folderName: folder.name,
      ownerId: allUserRecord.id,
    });

    // Handle different sharing types
    if (shareType === 'user') {
      // User-to-user sharing
      if (!targetUserId) {
        return NextResponse.json({ error: 'Target user ID is required for user sharing' }, { status: 400 });
      }

      // Check if target user exists using service function
      const targetUserResult = await getAllUserRecordById(targetUserId);

      if (!targetUserResult.success) {
        fatLogger.error('Target user not found', 'be', {
          targetUserId,
          error: targetUserResult.error,
        });
        return NextResponse.json(
          {
            error: 'Target user not found',
            details: targetUserResult.error,
          },
          { status: 404 }
        );
      }

      // Create user share
      const shareResult = await createShare({
        resourceType: 'folder',
        resourceId: folderId,
        targetUserId,
        permissions: permissions || { canView: true, canEdit: false, canDelete: false },
        invitedBy: allUserRecord.id,
      });

      if (!shareResult.success) {
        fatLogger.error('Failed to create folder share', 'be', {
          error: shareResult.error,
          folderId,
          targetUserId,
        });
        return NextResponse.json(
          {
            error: 'Failed to create share',
            details: shareResult.error,
          },
          { status: 500 }
        );
      }

      fatLogger.info('✅ Folder user share created successfully', 'be', {
        shareId: shareResult.data?.id,
        folderId,
        targetUserId,
      });

      return NextResponse.json({
        success: true,
        data: {
          shareId: shareResult.data?.id,
          shareType: 'user',
          permissions: permissions || { canView: true, canEdit: false, canDelete: false },
        },
      });
    } else if (shareType === 'public') {
      // Public link sharing
      const publicLinkResult = await createPublicLink({
        resourceType: 'folder',
        resourceId: folderId,
        createdBy: allUserRecord.id,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      });

      if (!publicLinkResult.success) {
        fatLogger.error('Failed to create folder public link', 'be', {
          error: publicLinkResult.error,
          folderId,
          createdBy: allUserRecord.id,
        });
        return NextResponse.json(
          {
            error: 'Failed to create public link',
            details: publicLinkResult.error,
          },
          { status: 500 }
        );
      }

      const shareUrl = generateShareableUrl(publicLinkResult.data!.token);

      fatLogger.info('✅ Folder public link created successfully', 'be', {
        tokenId: publicLinkResult.data?.id,
        folderId,
        shareUrl,
      });

      return NextResponse.json({
        success: true,
        data: {
          shareId: publicLinkResult.data?.id,
          shareType: 'public',
          token: publicLinkResult.data?.token,
          shareUrl,
          expiresAt: publicLinkResult.data?.expiresAt,
        },
      });
    } else {
      return NextResponse.json({ error: 'Invalid share type' }, { status: 400 });
    }
  } catch (error) {
    fatLogger.error('🔴 Error sharing folder:', 'be', {
      error: error instanceof Error ? error : undefined,
      stack: error instanceof Error ? error.stack : undefined,
      message: error instanceof Error ? error.message : String(error),
      folderId,
    });
    return NextResponse.json(
      {
        error: 'Failed to share folder',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
