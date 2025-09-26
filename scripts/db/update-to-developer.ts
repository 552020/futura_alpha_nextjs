//usage
//npx tsx scripts/db/update-to-developer.ts email@gmail.com
//log-in again to update role

import { db } from '@/db/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

async function updateUserToDeveloper(userEmail: string) {
  try {
    // 1. Fetch the user first
    const [user] = await db.select().from(users).where(eq(users.email, userEmail));

    if (!user) {
      console.log(`No user found with email: ${userEmail}`);
      return;
    }

    // 2. Check if user already has role 'developer'
    if (user.role === 'developer') {
      console.log(`User already has role 'developer'`);
      return;
    }

    // 3. Update role
    const [updatedUser] = await db
      .update(users)
      .set({ role: 'developer' })
      .where(eq(users.email, userEmail))
      .returning({ id: users.id, email: users.email, role: users.role });

    console.log('User updated successfully:', updatedUser);
    
    // Verify the update by querying the database directly
    const [verifiedUser] = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      })
      .from(users)
      .where(eq(users.email, userEmail))
      .limit(1);
      
    console.log('\n🔍 Database verification:');
    console.log('Current role in database:', verifiedUser.role);
    console.log('Last updated:', verifiedUser.updatedAt);
    
    if (verifiedUser.role !== 'developer') {
      console.error('❌ Role not updated in database!');
    } else {
      console.log('✅ Role successfully updated to developer');
      console.log('\nNext steps:');
      console.log('1. Sign out and sign back in to refresh your session');
      console.log('2. The developer tools should appear in the sidebar');
    }
  } catch (error) {
    console.error('Error updating user:', error);
  } finally {
    process.exit(0);
  }
}

const userEmail = process.argv[2];
if (!userEmail) {
  console.error('Please provide a user email');
  process.exit(1);
}

updateUserToDeveloper(userEmail);
