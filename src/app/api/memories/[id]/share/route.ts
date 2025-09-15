import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/db";
import { memoryShares, relationship, familyRelationship, allUsers, users, temporaryUsers } from "@/db/schema";
import { findMemory } from "@/app/api/memories/utils/memory";
import { eq, and } from "drizzle-orm";
// import { sendInvitationEmail, sendSharedMemoryEmail } from "@/app/api/memories/utils/email";
import type { RelationshipType, FamilyRelationshipType } from "@/db/schema";
import crypto from "crypto";

// Dummy function for generating secure code
function generateSecureCode(): string {
  return crypto.randomUUID();
}

type ShareTarget = {
  type: "user" | "group";
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
    console.log("📨 Share request body:", body);

    const {
      target,
      relationship: relationshipInfo,
      sendEmail = false,
      isInviteeNew = false,
      isOnboarding = false,
      ownerAllUserId,
    } = body;

    // Find the memory first
    const memory = await findMemory(memoryId);
    console.log("🔍 Found memory:", { exists: !!memory, id: memoryId });
    if (!memory) {
      return NextResponse.json({ error: "Memory not found" }, { status: 404 });
    }

    // Handle authentication differently for onboarding vs regular flow
    let authenticatedUserId: string | undefined;
    if (isOnboarding) {
      console.log("👤 Onboarding flow - checking owner:", ownerAllUserId);
      if (!ownerAllUserId) {
        return NextResponse.json({ error: "Owner ID required for onboarding" }, { status: 400 });
      }
      // For onboarding, verify the owner exists in allUsers
      const owner = await db.query.allUsers.findFirst({
        where: eq(allUsers.id, ownerAllUserId),
      });
      console.log("👤 Found owner:", { exists: !!owner, type: owner?.type });
      if (!owner || owner.type !== "temporary") {
        return NextResponse.json({ error: "Invalid onboarding user" }, { status: 401 });
      }
      authenticatedUserId = ownerAllUserId;
    } else {
      // Regular flow - require authentication
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const owner = await db.query.allUsers.findFirst({
        where: eq(allUsers.userId, session.user.id),
      });
      if (!owner) {
        return NextResponse.json({ error: "Owner not found" }, { status: 404 });
      }
      authenticatedUserId = owner.id;
    }

    if (target.type === "group") {
      // TODO: Implement group sharing
      return NextResponse.json({ error: "Group sharing not implemented" }, { status: 501 });
    }

    // Check if target user exists in allUsers
    const targetUser = await db.query.allUsers.findFirst({
      where: eq(allUsers.id, target.allUserId!),
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }

    // Check ownership
    if (memory.data.ownerId !== authenticatedUserId) {
      return NextResponse.json({ error: "Only the owner can share this memory" }, { status: 403 });
    }

    // Get user's email based on type
    let userEmail: string | undefined;
    if (targetUser.type === "user" && targetUser.userId) {
      const permanentUser = await db.query.users.findFirst({
        where: eq(users.id, targetUser.userId),
      });
      userEmail = permanentUser?.email ?? undefined;
      console.log("📧 Found permanent user email:", { email: userEmail, userId: targetUser.userId });
    } else if (targetUser.type === "temporary" && targetUser.temporaryUserId) {
      const temporaryUser = await db.query.temporaryUsers.findFirst({
        where: eq(temporaryUsers.id, targetUser.temporaryUserId),
      });
      userEmail = temporaryUser?.email ?? undefined;
      console.log("📧 Found temporary user email:", {
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
      console.error("❌ User email not found:", { targetUser });
      return NextResponse.json({ error: "User email not found" }, { status: 404 });
    }
    console.log("📧 Will send email to:", { userEmail, isInviteeNew });

    // Create share record
    const [share] = await db
      .insert(memoryShares)
      .values({
        memoryId: memoryId,
        memoryType: memory.type,
        ownerId: memory.data.ownerId,
        sharedWithType: target.type,
        sharedWithId: target.type === "user" ? target.allUserId! : target.groupId!,
        inviteeSecureCode: generateSecureCode(), // For invitee to access the memory
      })
      .returning();

    // Create relationship if provided
    if (relationshipInfo && target.type === "user") {
      await createRelationship(memory.data.ownerId, target.allUserId!, relationshipInfo);
    }

    // Generate magic links for both owner and invitee
    const ownerMagicLink = `${process.env.NEXT_PUBLIC_APP_URL}/memories/${memoryId}/share-link?code=${memory.data.ownerSecureCode}`;
    const inviteeMagicLink = `${process.env.NEXT_PUBLIC_APP_URL}/memories/${memoryId}/share-link?code=${share.inviteeSecureCode}`;

    // Send email if requested
    // TODO: Implement email functions for new unified schema
    if (sendEmail && target.type === "user") {
      console.log("📧 Email sending not implemented yet for new schema");
      // if (isInviteeNew) {
      //   await sendInvitationEmail(userEmail, memory, memory.data.ownerId, { useTemplate: false });
      // } else {
      //   await sendSharedMemoryEmail(userEmail, memory, memory.data.ownerId, inviteeMagicLink, { useTemplate: false });
      // }
    }

    return NextResponse.json({
      share,
      ownerMagicLink,
      inviteeMagicLink,
    });
  } catch (error) {
    console.error("🔴 Error sharing memory:", {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        error: "Failed to share memory",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

async function createRelationship(
  userId: string,
  relatedUserId: string,
  relationshipInfo: NonNullable<ShareRequest["relationship"]>
) {
  // Check if relationship already exists
  const existingRelationship = await db.query.relationship.findFirst({
    where: and(eq(relationship.userId, userId), eq(relationship.relatedUserId, relatedUserId)),
  });

  if (existingRelationship) {
    return existingRelationship;
  }

  // Create new relationship
  const [newRelationship] = await db
    .insert(relationship)
    .values({
      userId,
      relatedUserId,
      type: relationshipInfo.type,
      note: relationshipInfo.note,
      status: "pending",
      createdAt: new Date(),
    })
    .returning();

  // If it's a family relationship, create the family relationship record
  if (relationshipInfo.type === "family" && relationshipInfo.familyRole) {
    await db.insert(familyRelationship).values({
      relationshipId: newRelationship.id,
      familyRole: relationshipInfo.familyRole,
      relationshipClarity: "fuzzy", // Default to fuzzy as per schema
      createdAt: new Date(),
    });
  }

  return newRelationship;
}
