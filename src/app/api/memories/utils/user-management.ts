/**
 * USER MANAGEMENT UTILITIES
 *
 * This module handles user creation and management operations.
 * These functions are schema-agnostic and work with the user system.
 *
 * USAGE:
 * - Create temporary users for uploads
 * - Handle user creation errors gracefully
 * - Manage user-related operations
 * - Handle user authentication for uploads
 */

import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { allUsers, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";

/**
 * Get user ID for uploads (authenticated or temporary)
 * This function handles the complex logic of determining which user to use for uploads
 */
export async function getUserIdForUpload(params: {
  providedUserId?: string;
}): Promise<{ allUserId: string; error: NextResponse | null }> {
  const { providedUserId } = params;

  try {
    const session = await auth();

    if (session?.user?.id) {
      console.log("👤 Looking up authenticated user in users table...");
      // First get the user from users table
      const [permanentUser] = await db.select().from(users).where(eq(users.id, session.user.id));
      console.log("Found permanent user:", { userId: permanentUser?.id });

      if (!permanentUser) {
        console.error("❌ Permanent user not found");
        return {
          allUserId: "",
          error: NextResponse.json({ error: "User not found" }, { status: 404 }),
        };
      }

      // Then get their allUserId
      const [allUserRecord] = await db.select().from(allUsers).where(eq(allUsers.userId, permanentUser.id));
      console.log("Found all_users record:", { allUserId: allUserRecord?.id });

      if (!allUserRecord) {
        console.error("❌ No all_users record found for permanent user");
        return {
          allUserId: "",
          error: NextResponse.json({ error: "User record not found" }, { status: 404 }),
        };
      }

      return { allUserId: allUserRecord.id, error: null };
    } else if (providedUserId) {
      console.log("👤 Using provided allUserId for temporary user...");
      // For temporary users, directly check the allUsers table
      const [tempUser] = await db.select().from(allUsers).where(eq(allUsers.id, providedUserId));
      console.log("Found temporary user:", { allUserId: tempUser?.id, type: tempUser?.type });

      if (!tempUser || tempUser.type !== "temporary") {
        console.error("❌ Valid temporary user not found");
        return {
          allUserId: "",
          error: NextResponse.json({ error: "Invalid temporary user" }, { status: 404 }),
        };
      }

      return { allUserId: tempUser.id, error: null };
    } else {
      console.error("❌ No valid user identification provided");
      return {
        allUserId: "",
        error: NextResponse.json({ error: "User identification required" }, { status: 401 }),
      };
    }
  } catch (error) {
    console.error("❌ Error getting user ID for upload:", error);
    return {
      allUserId: "",
      error: NextResponse.json(
        { error: "Failed to get user ID", details: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      ),
    };
  }
}

/**
 * Create temporary user with error handling
 * Returns user or error response
 */
export async function createTemporaryUserWithErrorHandling(
  createTemporaryUserBase: (role: "inviter" | "invitee") => Promise<{ allUser: { id: string } }>
): Promise<{ allUser: { id: string }; error: string | null }> {
  try {
    // console.log("👤 Creating temporary user...");
    const { allUser } = await createTemporaryUserBase("inviter");
    // console.log("✅ Temporary user created:", { userId: allUser.id });
    return { allUser, error: null };
  } catch (userError) {
    console.error("❌ User creation error:", userError);
    return {
      allUser: { id: "" },
      error: userError instanceof Error ? userError.message : String(userError),
    };
  }
}
