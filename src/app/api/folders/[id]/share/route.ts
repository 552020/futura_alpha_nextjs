import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createShare, createPublicLink, generateShareableUrl } from '@/services/sharing';
import { getFolderByIdForOwner } from '@/services/folder';
import { getAllUserRecord, getAllUserRecordById, getUserEmailByAllUserId } from '@/services/user';
import { allUsers } from '@/db';
import { fatLogger } from '@/lib/logger';
import { db } from '@/db/db';
import { eq } from 'drizzle-orm';
import { sendEmail as sendMailgunEmail } from '@/utils/mailgun';
import { renderFolderSharingEmail } from '@/utils/email/folderSharingTemplate';

type FolderShareRequest = {
  shareType: 'user' | 'public';
  targetUserId?: string; // Required for user sharing
  permissions?: {
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
  };
  expiresAt?: string; // ISO string for public links
  sendEmail?: boolean; // Whether to send email notification
  isInviteeNew?: boolean; // Whether the invitee is a new user
};

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: folderId } = await context.params;

  try {
    const body = (await request.json()) as FolderShareRequest;
    fatLogger.info('📁 Folder share request:', 'be', { folderId, body });

    const { shareType, targetUserId, permissions, expiresAt, sendEmail = false, isInviteeNew = false } = body;

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

    const folder = folderResult.data;

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

      // Send email notification if requested
      if (sendEmail && targetUserId) {
        try {
          // Get recipient email using the service function
          const emailResult = await getUserEmailByAllUserId(targetUserId);
          if (!emailResult.success) {
            fatLogger.error('📧 Failed to get recipient email', 'be', {
              error: emailResult.error,
              targetUserId,
              folderId,
            });
            // Continue without email - don't fail the share operation
          } else {
            const recipientEmail = emailResult.data;

            if (!recipientEmail) {
              fatLogger.error('📧 No email address found for user', 'be', {
                targetUserId,
                folderId,
              });
              // Continue without email - don't fail the share operation
            } else {
              // Get recipient details to determine user type
              const recipientResult = await db.query.allUsers.findFirst({
                where: eq(allUsers.id, targetUserId),
              });
              const recipient = recipientResult;

              // Determine if this is a new user invitation
              const isNewUser = isInviteeNew || (recipient && recipient.type === 'temporary');

              // Get sharer name
              const sharerName = await getSharerName(allUserRecord.id);
              const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
              const folderUrl = `${appUrl}/folders/${folderId}`;

              // Generate email content using template
              const { subject, html, text } = renderFolderSharingEmail({
                folderName: folder.name,
                sharerName: sharerName || 'Someone',
                recipientEmail,
                folderUrl,
                isNewUser: isNewUser || false,
              });

              await sendMailgunEmail({
                to: recipientEmail,
                subject,
                text,
                html,
              });

              fatLogger.info('📧 Folder sharing email sent', 'be', {
                recipientEmail,
                folderId,
                isNewUser,
              });
            }
          }
        } catch (emailError) {
          // Log error but don't fail the share operation
          fatLogger.error('📧 Email sending failed', 'be', {
            error: emailError instanceof Error ? emailError.message : 'Unknown error',
            folderId,
            targetUserId,
          });
        }
      }

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

// Helper function to get sharer name
async function getSharerName(allUserId: string): Promise<string | undefined> {
  const allUserRecord = await db.query.allUsers.findFirst({
    where: eq(allUsers.id, allUserId),
  });

  if (allUserRecord?.userId) {
    const { users } = await import('@/db');
    const userRecord = await db.query.users.findFirst({
      where: eq(users.id, allUserRecord.userId),
    });
    return userRecord?.name || undefined;
  }

  return undefined;
}

