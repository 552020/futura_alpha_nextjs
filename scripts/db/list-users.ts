// Script to list all users in the users table
import { db } from '@/db/db';

async function listUsers() {
  try {
    console.log('Fetching all users...');

    const allUsers = await db.query.users.findMany({
      orderBy: (usersTable, { asc }) => [asc(usersTable.createdAt)],
    });

    console.log(`Found ${allUsers.length} users:`);
    allUsers.forEach((user) => {
      console.log('\n--- User ---');
      console.log(`ID: ${user.id}`);
      console.log(`Name: ${user.name}`);
      console.log(`Email: ${user.email}`);
      console.log(`User Type: ${user.userType}`);
      console.log(`Created At: ${user.createdAt}`);
      console.log(`Updated At: ${user.updatedAt}`);
    });
  } catch (error) {
    console.error('Error listing users:', error);
  } finally {
    process.exit(0);
  }
}

listUsers();
