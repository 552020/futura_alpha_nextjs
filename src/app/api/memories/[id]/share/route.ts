import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db/db';
import { allUsers, users, temporaryUsers, resourceMembership } from '@/db';
import { findMemory } from '@/app/api/memories/utils/memory';
import { eq } from 'drizzle-orm';
// import { sendInvitationEmail, sendSharedMemoryEmail } from "@/app/api/memories/utils/email";
import type { RelationshipType, FamilyRelationshipType } from '@/db';
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
  target: ShareTarget;
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
      target,
      relationship: _relationshipInfo,
      sendEmail: _sendEmail = false,
      isInviteeNew = false,
      isOnboarding = false,
      ownerAllUserId,
    } = body;

    // Find the memory first
    const memory = await findMemory(memoryId);
    fatLogger.info('🔍 Found memory:', 'be', { exists: !!memory, id: memoryId });
    if (!memory) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }

    // Handle authentication differently for onboarding vs regular flow
    let authenticatedUserId: string | undefined;
    if (isOnboarding) {
      fatLogger.info('👤 Onboarding flow - checking owner:', 'be', { ownerAllUserId });
      if (!ownerAllUserId) {
        return NextResponse.json({ error: 'Owner ID required for onboarding' }, { status: 400 });
      }
      // For onboarding, verify the owner exists in allUsers
      const owner = await db.query.allUsers.findFirst({
        where: eq(allUsers.id, ownerAllUserId),
      });
      fatLogger.info('👤 Found owner:', 'be', { exists: !!owner, type: owner?.type });
      if (!owner || owner.type !== 'temporary') {
        return NextResponse.json({ error: 'Invalid onboarding user' }, { status: 401 });
      }
      authenticatedUserId = ownerAllUserId;
    } else {
      // Regular flow - require authentication
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const owner = await db.query.allUsers.findFirst({
        where: eq(allUsers.userId, session.user.id),
      });
      if (!owner) {
        return NextResponse.json({ error: 'Owner not found' }, { status: 404 });
      }
      authenticatedUserId = owner.id;
    }

    if (target.type === 'group') {
      // TODO: Implement group sharing
      return NextResponse.json({ error: 'Group sharing not implemented' }, { status: 501 });
    }

    // Check if target user exists in allUsers
    const targetUser = await db.query.allUsers.findFirst({
      where: eq(allUsers.id, target.allUserId!),
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    // Check ownership
    if (memory.ownerId !== authenticatedUserId) {
      return NextResponse.json({ error: 'Only the owner can share this memory' }, { status: 403 });
    }

    // Get user's email based on type
    let userEmail: string | undefined;
    if (targetUser.type === 'user' && targetUser.userId) {
      const permanentUser = await db.query.users.findFirst({
        where: eq(users.id, targetUser.userId),
      });
      userEmail = permanentUser?.email ?? undefined;
      fatLogger.info('📧 Found permanent user email:', 'be', { email: userEmail, userId: targetUser.userId });
    } else if (targetUser.type === 'temporary' && targetUser.temporaryUserId) {
      const temporaryUser = await db.query.temporaryUsers.findFirst({
        where: eq(temporaryUsers.id, targetUser.temporaryUserId),
      });
      userEmail = temporaryUser?.email ?? undefined;
      fatLogger.info('📧 Found temporary user email:', 'be', {
        email: userEmail,
        temporaryUserId: targetUser.temporaryUserId,
        temporaryUser: {
          id: temporaryUser?.id,
          email: temporaryUser?.email,
          name: temporaryUser?.name,
        },
      });
    }

    if (!userEmail) {
      fatLogger.error('❌ User email not found:', 'be', { data: { targetUser } });
      return NextResponse.json({ error: 'User email not found' }, { status: 404 });
    }
    fatLogger.info('📧 Will send email to:', 'be', { userEmail, isInviteeNew });

    // Create share record using the universal resource sharing system
    const [share] = await db
      .insert(resourceMembership)
      .values({
        resourceId: memoryId,
        resourceType: 'memory',
        allUserId: target.type === 'user' ? target.allUserId! : target.groupId!,
        grantSource: 'user',
        role: 'member',
        permMask: 1, // Read permission
        invitedByAllUserId: authenticatedUserId,
      })
      .returning();

    fatLogger.info('✅ Memory shared successfully', 'be', {
      shareId: share.id,
      memoryId,
      targetUserId: target.allUserId,
      userEmail,
    });

    return NextResponse.json({
      success: true,
      message: 'Memory shared successfully',
      shareId: share.id,
      targetUser: {
        id: target.allUserId,
        email: userEmail,
      },
    });
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
