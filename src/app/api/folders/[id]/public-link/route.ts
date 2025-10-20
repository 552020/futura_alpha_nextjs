import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createPublicLink, generateShareableUrl } from '@/services/sharing';
import { getAllUserRecord } from '@/services/user';
import { getFolderByIdForOwner } from '@/services/folder';
import type { allUsers, DBFolder } from '@/db';
import { fatLogger } from '@/lib/logger';

type CreateFolderPublicLinkRequest = {
  expiresAt?: string; // ISO string
  isActive?: boolean;
};

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: folderId } = await context.params;

  try {
    const body = (await request.json()) as CreateFolderPublicLinkRequest;
    fatLogger.info('📁 Create folder public link request:', 'be', { folderId, body });

    const { expiresAt, isActive = true } = body;

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
    const folderResult = await getFolderByIdForOwner(folderId, allUserRecord.id);

    if (!folderResult.success || !folderResult.data) {
      fatLogger.error('Folder not found or not owned by user', 'be', {
        folderId,
        ownerId: allUserRecord.id,
      });
      return NextResponse.json({ error: 'Folder not found or access denied' }, { status: 404 });
    }

    const folder = folderResult.data as DBFolder;

    fatLogger.info('✅ Folder found and owned by user:', 'be', {
      folderId,
      folderName: folder.name,
      folderTitle: folder.title,
      ownerId: allUserRecord.id,
    });

    // Create public link
    const publicLinkResult = await createPublicLink({
      resourceType: 'folder',
      resourceId: folderId,
      createdBy: allUserRecord.id,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      isActive,
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

    // Generate shareable URL
    const shareUrl = generateShareableUrl(publicLinkResult.data!.token);

    fatLogger.info('✅ Folder public link created successfully', 'be', {
      tokenId: publicLinkResult.data?.id,
      folderId,
      shareUrl,
      expiresAt: publicLinkResult.data?.expiresAt,
    });

    return NextResponse.json({
      success: true,
      data: {
        shareId: publicLinkResult.data?.id,
        token: publicLinkResult.data?.token,
        shareUrl,
        expiresAt: publicLinkResult.data?.expiresAt,
        isActive: publicLinkResult.data?.isActive,
        createdAt: publicLinkResult.data?.createdAt,
      },
    });
  } catch (error) {
    fatLogger.error('🔴 Error creating folder public link:', 'be', {
      error: error instanceof Error ? error : undefined,
      stack: error instanceof Error ? error.stack : undefined,
      message: error instanceof Error ? error.message : String(error),
      folderId,
    });
    return NextResponse.json(
      {
        error: 'Failed to create folder public link',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
