// Script to sync users from users table to all_users table
import { db } from '@/db/db';
import { users, allUsers } from '@/db/schema';
import { eq } from 'drizzle-orm';

async function syncUsersToAllUsers() {
  try {
    console.log('Fetching all users...');
    
    // Get all users
    const allRegularUsers = await db.query.users.findMany();
    
    console.log(`Found ${allRegularUsers.length} users in the users table`);
    
    let syncedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // Process each user
    for (const user of allRegularUsers) {
      try {
        // Check if user already exists in allUsers
        const existingAllUser = await db.query.allUsers.findFirst({
          where: eq(allUsers.id, user.id)
        });
        
        if (existingAllUser) {
          console.log(`- User ${user.email} (${user.id}) already exists in all_users`);
          skippedCount++;
          continue;
        }
        
        // Insert into allUsers
        console.log(`- Adding user ${user.email} (${user.id}) to all_users`);
        
        // Insert into allUsers with required type field
        await db.insert(allUsers).values({
          id: user.id,
          type: 'user', // Required field, must be 'user' or 'temporary'
          userId: user.id, // Reference to the user in the users table
          createdAt: user.createdAt || new Date()
        });
        
        syncedCount++;
        
      } catch (error) {
        console.error(`Error processing user ${user.email} (${user.id}):`, error);
        errorCount++;
      }
    }
    
    console.log('\nSync completed:');
    console.log(`- Total users processed: ${allRegularUsers.length}`);
    console.log(`- New users added to all_users: ${syncedCount}`);
    console.log(`- Users already in sync: ${skippedCount}`);
    console.log(`- Errors: ${errorCount}`);
    
  } catch (error) {
    console.error('Error syncing users to all_users:', error);
  } finally {
    process.exit(0);
  }
}

syncUsersToAllUsers();
