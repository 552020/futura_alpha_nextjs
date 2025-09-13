#!/usr/bin/env tsx

import { db } from "@/db/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

type UserRole = "user" | "moderator" | "admin" | "developer" | "superadmin";

interface UserInfo {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  createdAt: Date;
}

async function findUserByEmail(email: string): Promise<UserInfo | null> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
      columns: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    // Filter out users without email (shouldn't happen in practice)
    if (!user || !user.email) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    };
  } catch (error) {
    console.error("❌ Error finding user:", error);
    return null;
  }
}

async function updateUserRole(userId: string, newRole: UserRole): Promise<boolean> {
  try {
    await db.update(users).set({ role: newRole, updatedAt: new Date() }).where(eq(users.id, userId));

    return true;
  } catch (error) {
    console.error("❌ Error updating user role:", error);
    return false;
  }
}

async function listAllUsers(): Promise<UserInfo[]> {
  try {
    const allUsers = await db.query.users.findMany({
      columns: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: (users, { desc }) => [desc(users.createdAt)],
    });

    // Filter out users without email and map to UserInfo
    return allUsers
      .filter((user): user is typeof user & { email: string } => user.email !== null)
      .map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      }));
  } catch (error) {
    console.error("❌ Error listing users:", error);
    return [];
  }
}

function printUserInfo(user: UserInfo, prefix: string = "") {
  console.log(`${prefix}📧 Email: ${user.email}`);
  console.log(`${prefix}👤 Name: ${user.name || "N/A"}`);
  console.log(`${prefix}🆔 ID: ${user.id}`);
  console.log(`${prefix}🎭 Role: ${user.role}`);
  console.log(`${prefix}📅 Created: ${user.createdAt.toISOString()}`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log("🔧 User Role Management Script");
  console.log("==============================\n");

  switch (command) {
    case "find":
      if (!args[1]) {
        console.log("❌ Usage: npm run manage-user-roles find <email>");
        process.exit(1);
      }
      const email = args[1];
      console.log(`🔍 Finding user with email: ${email}\n`);

      const user = await findUserByEmail(email);
      if (user) {
        console.log("✅ User found:");
        printUserInfo(user, "  ");
      } else {
        console.log("❌ User not found");
      }
      break;

    case "update":
      if (!args[1] || !args[2]) {
        console.log("❌ Usage: npm run manage-user-roles update <email> <role>");
        console.log("   Available roles: user, moderator, admin, developer, superadmin");
        process.exit(1);
      }
      const updateEmail = args[1];
      const newRole = args[2] as UserRole;

      if (!["user", "moderator", "admin", "developer", "superadmin"].includes(newRole)) {
        console.log("❌ Invalid role. Available roles: user, moderator, admin, developer, superadmin");
        process.exit(1);
      }

      console.log(`🔄 Updating user role: ${updateEmail} → ${newRole}\n`);

      const userToUpdate = await findUserByEmail(updateEmail);
      if (!userToUpdate) {
        console.log("❌ User not found");
        process.exit(1);
      }

      console.log("📋 Current user info:");
      printUserInfo(userToUpdate, "  ");
      console.log();

      const success = await updateUserRole(userToUpdate.id, newRole);
      if (success) {
        console.log("✅ Role updated successfully!");

        // Show updated user info
        const updatedUser = await findUserByEmail(updateEmail);
        if (updatedUser) {
          console.log("\n📋 Updated user info:");
          printUserInfo(updatedUser, "  ");
        }
      } else {
        console.log("❌ Failed to update role");
      }
      break;

    case "list":
      console.log("📋 Listing all users:\n");
      const allUsers = await listAllUsers();

      if (allUsers.length === 0) {
        console.log("❌ No users found");
      } else {
        allUsers.forEach((user, index) => {
          console.log(`${index + 1}. ${user.email} (${user.role})`);
        });
        console.log(`\nTotal users: ${allUsers.length}`);
      }
      break;

    case "help":
    default:
      console.log("📖 Available commands:");
      console.log("  find <email>     - Find user by email");
      console.log("  update <email> <role> - Update user role");
      console.log("  list             - List all users");
      console.log("  help             - Show this help");
      console.log("\n🎭 Available roles: user, moderator, admin, developer, superadmin");
      console.log("\n💡 Examples:");
      console.log("  npm run manage-user-roles find user@example.com");
      console.log("  npm run manage-user-roles update user@example.com developer");
      console.log("  npm run manage-user-roles list");
      break;
  }

  process.exit(0);
}

main().catch((error) => {
  console.error("❌ Script error:", error);
  process.exit(1);
});
