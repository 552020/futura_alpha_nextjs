import { db } from '@/db/db';
import { users, allUsers } from '@/db/schema';

import { fatLogger } from '@/lib/logger';
async function createTestUsers() {
  try {
    // Create test users
    const [testUser1] = await db
      .insert(users)
      .values({
        email: 'test1@example.com',
        name: 'Test User 1',
        username: 'testuser1',
        password: 'test-password-1', // In production, this should be hashed
      })
      .returning();

    const [testUser2] = await db
      .insert(users)
      .values({
        email: 'test2@example.com',
        name: 'Test User 2',
        username: 'testuser2',
        password: 'test-password-2', // In production, this should be hashed
      })
      .returning();

    // Create allUsers records
    await Promise.all([
      db.insert(allUsers).values({
        type: 'user',
        userId: testUser1.id,
      }),
      db.insert(allUsers).values({
        type: 'user',
        userId: testUser2.id,
      }),
    ]);

    // fatLogger.info("✅ Test users created successfully");
  } catch (error) {
    fatLogger.error('❌ Error creating test users:', 'be', { data: error instanceof Error ? error : undefined });
  }
}

// Run the function
createTestUsers();
