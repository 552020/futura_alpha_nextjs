import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/db";
import { allUsers, galleries, galleryShares, users, temporaryUsers } from "@/db/schema";
import { addStorageStatusToGallery } from "../utils";
import { eq, desc, sql } from "drizzle-orm";

/**
 * GET /api/galleries/shared
 *
 * Retrieves galleries shared with the authenticated user.
 *
 * Authentication:
 * - For authenticated users: Uses the session userId to find their allUserId
 * - For temporary users: Requires allUserId in the request body
 *
 * Request body (for temporary users):
 * {
 *   "allUserId": string // The allUserId of the temporary user
 * }
 */
export async function GET(request: NextRequest) {
  // Check authentication
  const session = await auth();
  let allUserId: string;

  if (session?.user?.id) {
    // Handle authenticated user
    const allUserRecord = await db.query.allUsers.findFirst({
      where: eq(allUsers.userId, session.user.id),
    });

    if (!allUserRecord) {
      return NextResponse.json({ error: "User record not found" }, { status: 404 });
    }

    allUserId = allUserRecord.id;
  } else {
    // Handle temporary user - get allUserId from request body
    const body = await request.json();
    if (!body?.allUserId) {
      return NextResponse.json(
        { error: "For temporary users, allUserId must be provided in the request body" },
        { status: 401 }
      );
    }

    // Verify the allUserId exists
    const tempUserRecord = await db.query.allUsers.findFirst({
      where: eq(allUsers.id, body.allUserId),
    });

    if (!tempUserRecord) {
      return NextResponse.json({ error: "Invalid temporary user ID" }, { status: 404 });
    }

    allUserId = body.allUserId;
  }

  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");
    const offset = (page - 1) * limit;

    // Get all gallery shares for this user
    const shares = await db.query.galleryShares.findMany({
      where: eq(galleryShares.sharedWithId, allUserId),
      orderBy: desc(galleryShares.createdAt),
    });

    // Fetch the actual galleries
    const sharedGalleries = await Promise.all(
      shares.map(async (share) => {
        const gallery = await db.query.galleries.findFirst({
          where: eq(galleries.id, share.galleryId),
        });
        if (!gallery) return null;

        // Get total share count for this gallery
        const shareCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(galleryShares)
          .where(eq(galleryShares.galleryId, share.galleryId));

        // Get owner name
        const owner = await db.query.allUsers.findFirst({
          where: eq(allUsers.id, share.ownerId),
        });

        // Add storage status to the gallery
        const galleryWithStorageStatus = await addStorageStatusToGallery(gallery);

        return {
          ...galleryWithStorageStatus,
          sharedBy: {
            id: share.ownerId,
            name: owner?.userId ? await getOwnerName(share.ownerId) : "Unknown",
          },
          accessLevel: share.accessLevel,
          status: "shared" as const,
          sharedWithCount: shareCount[0].count,
        };
      })
    );

    // Filter out null values and apply pagination
    const validGalleries = sharedGalleries.filter(Boolean);
    const paginatedGalleries = validGalleries.slice(offset, offset + limit);

    // console.log("Fetched shared galleries:", {
    //   page,
    //   limit,
    //   offset,
    //   totalCount: validGalleries.length,
    //   returnedCount: paginatedGalleries.length,
    // });

    return NextResponse.json({
      galleries: paginatedGalleries,
      total: validGalleries.length,
      hasMore: offset + limit < validGalleries.length,
    });
  } catch (error) {
    console.error("Error listing shared galleries:", error);
    return NextResponse.json({ error: "Failed to list shared galleries" }, { status: 500 });
  }
}

// Helper function to get owner name
async function getOwnerName(ownerId: string): Promise<string> {
  try {
    const owner = await db.query.allUsers.findFirst({
      where: eq(allUsers.id, ownerId),
    });

    if (!owner) return "Unknown";

    // If it's a regular user, get their name from the users table
    if (owner.userId) {
      const user = await db.query.users.findFirst({
        where: eq(users.id, owner.userId),
      });
      return user?.name || "Unknown";
    }

    // If it's a temporary user, get their name from the temporary_users table
    if (owner.temporaryUserId) {
      const tempUser = await db.query.temporaryUsers.findFirst({
        where: eq(temporaryUsers.id, owner.temporaryUserId),
      });
      return tempUser?.name || "Unknown";
    }

    return "Unknown";
  } catch (error) {
    console.error("Error getting owner name:", error);
    return "Unknown";
  }
}
