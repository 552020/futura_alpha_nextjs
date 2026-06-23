import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db/db';
import { eq, and } from 'drizzle-orm';
import { galleries, allUsers, resourceMembership } from '@/db';
import { randomUUID } from 'crypto';
import { getUserEmailByAllUserId } from '@/services/user';
import { sendEmail as sendMailgunEmail } from '@/utils/mailgun';
import { fatLogger } from '@/lib/logger';
import { renderGallerySharingEmail } from '@/utils/email/gallerySharingTemplate';
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get the allUserId for the authenticated user
    const allUserRecord = await db.query.allUsers.findFirst({
      where: eq(allUsers.userId, session.user.id),
    });

    if (!allUserRecord) {
      fatLogger.error('No allUsers record found for user:', 'be', { userId: session.user.id });
      return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    }

    const galleryId = id;
    const body = await request.json();
    const { sharedWithType, sharedWithId, groupId, sharedRelationshipType, accessLevel = 'read', sendEmail = false, isInviteeNew = false } = body;

    // Validate required fields
    if (!sharedWithType || !['user', 'group', 'relationship'].includes(sharedWithType)) {
      return NextResponse.json({ error: 'Invalid sharedWithType' }, { status: 400 });
    }

    // Check if gallery exists and user owns it
    const existingGallery = await db.query.galleries.findFirst({
      where: and(eq(galleries.id, galleryId), eq(galleries.ownerId, allUserRecord.id)),
    });

    if (!existingGallery) {
      return NextResponse.json({ error: 'Gallery not found' }, { status: 404 });
    }

    // Validate sharing parameters based on type
    if (sharedWithType === 'user' && !sharedWithId) {
      return NextResponse.json({ error: 'sharedWithId is required for user sharing' }, { status: 400 });
    }
    if (sharedWithType === 'group' && !groupId) {
      return NextResponse.json({ error: 'groupId is required for group sharing' }, { status: 400 });
    }
    if (sharedWithType === 'relationship' && !sharedRelationshipType) {
      return NextResponse.json(
        { error: 'sharedRelationshipType is required for relationship sharing' },
        { status: 400 }
      );
    }

    // Generate secure code for access
    const inviteeSecureCode = randomUUID();

    // Create gallery share record using the new universal resource sharing system
    const newShare = await db
      .insert(resourceMembership)
      .values({
        resourceId: galleryId,
        resourceType: 'gallery',
        allUserId: sharedWithType === 'user' ? sharedWithId : null,
        role: accessLevel === 'write' ? 'member' : 'guest',
        grantSource: 'user',
        createdAt: new Date(),
      })
      .returning();

    // Update the gallery's sharedCount
    const shareCount = await db.query.resourceMembership.findMany({
      where: and(eq(resourceMembership.resourceId, galleryId), eq(resourceMembership.resourceType, 'gallery')),
    });

    await db
      .update(galleries)
      .set({
        sharedCount: shareCount.length,
        sharingStatus: shareCount.length > 0 ? 'shared' : 'private',
        updatedAt: new Date(),
      })
      .where(eq(galleries.id, galleryId));

    fatLogger.info('Created gallery share:', JSON.stringify(newShare[0]));

    // Send email notification if requested
    if (sendEmail && sharedWithType === 'user' && sharedWithId) {
      try {
        // Get recipient email using the service function
        const emailResult = await getUserEmailByAllUserId(sharedWithId);
        if (!emailResult.success) {
          fatLogger.error('📧 Failed to get recipient email', 'be', {
            error: emailResult.error,
            targetUserId: sharedWithId,
            galleryId,
          });
          // Continue without email - don't fail the share operation
        } else {
          const recipientEmail = emailResult.data;

          if (!recipientEmail) {
            fatLogger.error('📧 No email address found for user', 'be', {
              targetUserId: sharedWithId,
              galleryId,
            });
            // Continue without email - don't fail the share operation
          } else {
            // Get recipient details to determine user type
            const recipientResult = await db.query.allUsers.findFirst({
              where: eq(allUsers.id, sharedWithId),
            });
            const recipient = recipientResult;

            // Determine if this is a new user invitation
            const isNewUser = isInviteeNew || (recipient && recipient.type === 'temporary');

            // Get sharer name
            const sharerName = await getSharerName(allUserRecord.id);
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            const galleryUrl = `${appUrl}/gallery/${galleryId}`;

            // Generate email content using template
            const { subject, html, text } = renderGallerySharingEmail({
              galleryTitle: existingGallery.title,
              sharerName: sharerName || 'Someone',
              recipientEmail,
              galleryUrl,
              isNewUser: isNewUser || false,
              accessLevel: accessLevel as 'read' | 'write',
            });

            await sendMailgunEmail({
              to: recipientEmail,
              subject,
              text,
              html,
            });

            fatLogger.info('📧 Gallery sharing email sent', 'be', {
              recipientEmail,
              galleryId,
              isNewUser,
              accessLevel,
            });
          }
        }
      } catch (emailError) {
        // Log error but don't fail the share operation
        fatLogger.error('📧 Email sending failed', 'be', {
          error: emailError instanceof Error ? emailError.message : 'Unknown error',
          galleryId,
          targetUserId: sharedWithId,
        });
      }
    }

    return NextResponse.json(
      {
        share: newShare[0],
        inviteeSecureCode,
      },
      { status: 201 }
    );
  } catch (error) {
    fatLogger.error('Error sharing gallery:', 'be', { data: error instanceof Error ? error : undefined });
    return NextResponse.json({ error: 'Failed to share gallery' }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get the allUserId for the authenticated user
    const allUserRecord = await db.query.allUsers.findFirst({
      where: eq(allUsers.userId, session.user.id),
    });

    if (!allUserRecord) {
      fatLogger.error('No allUsers record found for user:', 'be', { userId: session.user.id });
      return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    }

    const galleryId = id;

    // Check if gallery exists and user owns it
    const existingGallery = await db.query.galleries.findFirst({
      where: and(eq(galleries.id, galleryId), eq(galleries.ownerId, allUserRecord.id)),
    });

    if (!existingGallery) {
      return NextResponse.json({ error: 'Gallery not found' }, { status: 404 });
    }

    // Get all shares for this gallery using the new universal resource sharing system
    const gallerySharesList = await db.query.resourceMembership.findMany({
      where: and(eq(resourceMembership.resourceId, galleryId), eq(resourceMembership.resourceType, 'gallery')),
    });

    fatLogger.info('Fetched gallery shares:', gallerySharesList.length.toString());

    return NextResponse.json({
      shares: gallerySharesList,
    });
  } catch (error) {
    fatLogger.error('Error fetching gallery shares:', 'be', { data: error instanceof Error ? error : undefined });
    return NextResponse.json({ error: 'Failed to fetch gallery shares' }, { status: 500 });
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

