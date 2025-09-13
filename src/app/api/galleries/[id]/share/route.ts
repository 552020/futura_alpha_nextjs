import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/db";
import { eq, and } from "drizzle-orm";
import { galleries, allUsers, galleryShares } from "@/db/schema";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get the allUserId for the authenticated user
    const allUserRecord = await db.query.allUsers.findFirst({
      where: eq(allUsers.userId, session.user.id),
    });

    if (!allUserRecord) {
      console.error("No allUsers record found for user:", session.user.id);
      return NextResponse.json({ error: "User record not found" }, { status: 404 });
    }

    const galleryId = id;
    const body = await request.json();
    const { sharedWithType, sharedWithId, groupId, sharedRelationshipType, accessLevel = "read" } = body;

    // Validate required fields
    if (!sharedWithType || !["user", "group", "relationship"].includes(sharedWithType)) {
      return NextResponse.json({ error: "Invalid sharedWithType" }, { status: 400 });
    }

    // Check if gallery exists and user owns it
    const existingGallery = await db.query.galleries.findFirst({
      where: and(eq(galleries.id, galleryId), eq(galleries.ownerId, allUserRecord.id)),
    });

    if (!existingGallery) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    }

    // Validate sharing parameters based on type
    if (sharedWithType === "user" && !sharedWithId) {
      return NextResponse.json({ error: "sharedWithId is required for user sharing" }, { status: 400 });
    }
    if (sharedWithType === "group" && !groupId) {
      return NextResponse.json({ error: "groupId is required for group sharing" }, { status: 400 });
    }
    if (sharedWithType === "relationship" && !sharedRelationshipType) {
      return NextResponse.json(
        { error: "sharedRelationshipType is required for relationship sharing" },
        { status: 400 }
      );
    }

    // Generate secure code for access
    const inviteeSecureCode = randomUUID();

    // Create gallery share record
    const newShare = await db
      .insert(galleryShares)
      .values({
        galleryId,
        ownerId: allUserRecord.id,
        sharedWithType,
        sharedWithId: sharedWithType === "user" ? sharedWithId : null,
        groupId: sharedWithType === "group" ? groupId : null,
        sharedRelationshipType: sharedWithType === "relationship" ? sharedRelationshipType : null,
        accessLevel,
        inviteeSecureCode,
      })
      .returning();

    // console.log("Created gallery share:", newShare[0]);

    return NextResponse.json(
      {
        share: newShare[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error sharing gallery:", error);
    return NextResponse.json({ error: "Failed to share gallery" }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get the allUserId for the authenticated user
    const allUserRecord = await db.query.allUsers.findFirst({
      where: eq(allUsers.userId, session.user.id),
    });

    if (!allUserRecord) {
      console.error("No allUsers record found for user:", session.user.id);
      return NextResponse.json({ error: "User record not found" }, { status: 404 });
    }

    const galleryId = id;

    // Check if gallery exists and user owns it
    const existingGallery = await db.query.galleries.findFirst({
      where: and(eq(galleries.id, galleryId), eq(galleries.ownerId, allUserRecord.id)),
    });

    if (!existingGallery) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    }

    // Get all shares for this gallery
    const gallerySharesList = await db.query.galleryShares.findMany({
      where: eq(galleryShares.galleryId, galleryId),
    });

    // console.log("Fetched gallery shares:", gallerySharesList.length);

    return NextResponse.json({
      shares: gallerySharesList,
    });
  } catch (error) {
    console.error("Error fetching gallery shares:", error);
    return NextResponse.json({ error: "Failed to fetch gallery shares" }, { status: 500 });
  }
}
