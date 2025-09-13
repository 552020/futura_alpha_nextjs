import { db } from "@/db/db";
import { users, allUsers } from "@/db/schema";

async function createTestUsers() {
  try {
    // Create test users
    const [testUser1] = await db
      .insert(users)
      .values({
        email: "test1@example.com",
        name: "Test User 1",
        username: "testuser1",
        password: "test-password-1", // In production, this should be hashed
      })
      .returning();

    const [testUser2] = await db
      .insert(users)
      .values({
        email: "test2@example.com",
        name: "Test User 2",
        username: "testuser2",
        password: "test-password-2", // In production, this should be hashed
      })
      .returning();

    // Create allUsers records
    await Promise.all([
      db.insert(allUsers).values({
        type: "user",
        userId: testUser1.id,
      }),
      db.insert(allUsers).values({
        type: "user",
        userId: testUser2.id,
      }),
    ]);

    // console.log("✅ Test users created successfully");
  } catch (error) {
    console.error("❌ Error creating test users:", error);
  }
}

// Run the function
createTestUsers();
