import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createShare, createPublicLink, generateShareableUrl } from '@/services/sharing';
import { getAllUserRecord, getAllUserRecordById } from '@/services/user';
import { getMemoryWithRelations } from '@/services/memory';
import type { RelationshipType, FamilyRelationshipType, allUsers, memories } from '@/db';
import { sendInvitationEmail, sendSharedMemoryEmail } from '@/app/api/memories/utils/email';
// import crypto from 'crypto';

// function _generateSecureCode(): string {
//   return crypto.randomBytes(12).toString('hex');
// }

import { fatLogger } from '@/lib/logger';

type ShareTarget = {
  type: 'user' | 'group';
  allUserId?: string; // For user type
  groupId?: string; // For group type
};

type RelationshipInfo = {
  type: RelationshipType;
  familyRole?: FamilyRelationshipType; // Only if type is "family"
  note?: string;
};

type ShareRequest = {
  shareType: 'user' | 'public';
  target?: ShareTarget; // Required for user sharing
  targetUserId?: string; // Alternative to target for user sharing
  permissions?: {
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
  };
  expiresAt?: string; // ISO string for public links
  relationship?: RelationshipInfo;
  sendEmail?: boolean;
  isInviteeNew?: boolean;
  isOnboarding?: boolean;
  ownerAllUserId?: string;
};

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: memoryId } = await context.params;

  try {
    const body = (await request.json()) as ShareRequest;
    fatLogger.info('📨 Share request body:', 'be', body);

    const {
      shareType,
      target,
      targetUserId,
      permissions,
      expiresAt,
      relationship: _relationshipInfo,
      sendEmail: sendEmail = false,
      isInviteeNew: _isInviteeNew = false,
      isOnboarding = false,
      ownerAllUserId,
    } = body;

    // We'll find the memory after authentication to check ownership

    // Handle authentication differently for onboarding vs regular flow
    let authenticatedUserId: string | undefined;
    if (isOnboarding) {
      fatLogger.info('👤 Onboarding flow - checking owner:', 'be', { ownerAllUserId });
      if (!ownerAllUserId) {
        return NextResponse.json({ error: 'Owner ID required for onboarding' }, { status: 400 });
      }
      // For onboarding, verify the owner exists in allUsers using service function
      const ownerResult = await getAllUserRecordById(ownerAllUserId);

      if (!ownerResult.success) {
        fatLogger.error('Invalid onboarding user', 'be', {
          ownerAllUserId,
          error: ownerResult.error,
        });
        return NextResponse.json(
          {
            error: 'Invalid onboarding user',
            details: ownerResult.error,
          },
          { status: 401 }
        );
      }

      const owner = ownerResult.data as typeof allUsers.$inferSelect;
      fatLogger.info('👤 Found owner:', 'be', { exists: !!owner, type: owner?.type });

      if (owner.type !== 'temporary') {
        return NextResponse.json({ error: 'Invalid onboarding user type' }, { status: 401 });
      }
      authenticatedUserId = ownerAllUserId;
    } else {
      // Regular flow - require authentication
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

      const owner = userResult.data as typeof allUsers.$inferSelect;
      authenticatedUserId = owner.id;
    }

    // Find the memory and check ownership using service function
    const memoryResult = await getMemoryWithRelations(memoryId, authenticatedUserId);

    if (!memoryResult.success) {
      fatLogger.error('Memory not found or not owned by user', 'be', {
        memoryId,
        ownerId: authenticatedUserId,
        error: memoryResult.error,
      });
      return NextResponse.json(
        {
          error: 'Memory not found or access denied',
          details: memoryResult.error,
        },
        { status: 404 }
      );
    }

    const memory = memoryResult.data as typeof memories.$inferSelect;

    fatLogger.info('✅ Memory found and owned by user:', 'be', {
      memoryId,
      memoryTitle: memory.title,
      ownerId: authenticatedUserId,
    });

    // Handle different sharing types
    if (shareType === 'user') {
      // User-to-user sharing
      const finalTargetUserId = targetUserId || target?.allUserId;
      if (!finalTargetUserId) {
        return NextResponse.json({ error: 'Target user ID is required for user sharing' }, { status: 400 });
      }

      // Check if target user exists using service function
      const targetUserResult = await getAllUserRecordById(finalTargetUserId);

      if (!targetUserResult.success) {
        fatLogger.error('Target user not found', 'be', {
          targetUserId: finalTargetUserId,
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
        resourceType: 'memory',
        resourceId: memoryId,
        targetUserId: finalTargetUserId,
        permissions: permissions || { canView: true, canEdit: false, canDelete: false },
        invitedBy: authenticatedUserId,
      });

      if (!shareResult.success) {
        return NextResponse.json(
          {
            error: 'Failed to create share',
            details: shareResult.error,
          },
          { status: 500 }
        );
      }

      fatLogger.info('✅ User share created successfully', 'be', {
        shareId: shareResult.data?.id,
        memoryId,
        targetUserId: finalTargetUserId,
      });

      // Send email notification if requested
      if (sendEmail && finalTargetUserId) {
        try {
          // Get memory details for email
          const memoryResult = await getMemoryWithRelations(memoryId, authenticatedUserId);
          if (memoryResult.success) {
            const memory = memoryResult.data;

            // Get recipient details
            const recipientResult = await getAllUserRecordById(finalTargetUserId);
            if (recipientResult.success) {
              const recipient = recipientResult.data as typeof allUsers.$inferSelect;

              // Get email from temporary user if it's a temporary user
              let recipientEmail = 'recipient@example.com';
              if (recipient.type === 'temporary' && recipient.temporaryUserId) {
                // For temporary users, we need to get the email from the temporary user record
                // For now, we'll use a placeholder - in production, you'd fetch from temporaryUsers table
                recipientEmail = 'temporary-user@example.com';
              } else if (recipient.type === 'user' && recipient.userId) {
                // For regular users, we'd get email from users table
                // For now, we'll use a placeholder
                recipientEmail = 'user@example.com';
              }

              // Determine if this is a new user invitation
              const isNewUser = _isInviteeNew || recipient.type === 'temporary';

              if (isNewUser) {
                // Send invitation email for new users
                await sendInvitationEmail(
                  recipientEmail,
                  memory as any, // TODO: Fix type casting
                  authenticatedUserId,
                  { useHTML: true }
                );

                fatLogger.info('📧 Invitation email sent', 'be', {
                  recipientEmail,
                  memoryId,
                  isNewUser: true,
                });
              } else {
                // Send notification email for existing users
                const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/memories/${memoryId}`;
                await sendSharedMemoryEmail(
                  recipientEmail,
                  memory as any, // TODO: Fix type casting
                  authenticatedUserId,
                  shareUrl,
                  { useHTML: true }
                );

                fatLogger.info('📧 Shared memory email sent', 'be', {
                  recipientEmail,
                  memoryId,
                  shareUrl,
                });
              }
            }
          }
        } catch (emailError) {
          // Log error but don't fail the share operation
          fatLogger.error('📧 Email sending failed', 'be', {
            error: emailError instanceof Error ? emailError.message : 'Unknown error',
            memoryId,
            targetUserId: finalTargetUserId,
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
        resourceType: 'memory',
        resourceId: memoryId,
        createdBy: authenticatedUserId,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      });

      if (!publicLinkResult.success) {
        return NextResponse.json(
          {
            error: 'Failed to create public link',
            details: publicLinkResult.error,
          },
          { status: 500 }
        );
      }

      const shareUrl = generateShareableUrl(publicLinkResult.data!.token);

      fatLogger.info('✅ Public link created successfully', 'be', {
        tokenId: publicLinkResult.data?.id,
        memoryId,
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
    fatLogger.error('🔴 Error sharing memory:', 'be', {
      error: error instanceof Error ? error : undefined,
      stack: error instanceof Error ? error.stack : undefined,
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        error: 'Failed to share memory',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// async function createRelationship(
//   userId: string,
//   relatedUserId: string,
//   relationshipInfo: NonNullable<ShareRequest['relationship']>
// ) {
//   // Check if relationship already exists
//   const existingRelationship = await db.query.relationship.findFirst({
//     where: and(eq(relationship.userId, userId), eq(relationship.relatedUserId, relatedUserId)),
//   });

//   if (existingRelationship) {
//     return existingRelationship;
//   }

//   // Create new relationship
//   const [newRelationship] = await db
//     .insert(relationship)
//     .values({
//       userId,
//       relatedUserId,
//       type: relationshipInfo.type,
//       note: relationshipInfo.note,
//       status: 'pending',
//       createdAt: new Date(),
//     })
//     .returning();

//   // If it's a family relationship, create the family relationship record
//   if (relationshipInfo.type === 'family' && relationshipInfo.familyRole) {
//     await db.insert(familyRelationship).values({
//       relationshipId: newRelationship.id,
//       familyRole: relationshipInfo.familyRole,
//       relationshipClarity: 'fuzzy', // Default to fuzzy as per schema
//       createdAt: new Date(),
//     });
//   }

//   return newRelationship;
// }
