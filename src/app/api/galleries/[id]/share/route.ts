import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db/db';
import { eq, and } from 'drizzle-orm';
import { galleries, allUsers, resourceMembership } from '@/db';
import { randomUUID } from 'crypto';

import { fatLogger } from '@/lib/logger';
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
    const { sharedWithType, sharedWithId, groupId, sharedRelationshipType, accessLevel = 'read' } = body;

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
