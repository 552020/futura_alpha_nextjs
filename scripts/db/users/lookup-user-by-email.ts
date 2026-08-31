#!/usr/bin/env tsx

/**
 * User Lookup Script
 *
 * This script finds user information by email address in both the `users` and `allUsers` tables.
 * It provides comprehensive information about a user's account status and relationships.
 *
 * Usage:
 *   npx tsx scripts/db/users/lookup-user-by-email.ts <email>
 *
 * Example:
 *   npx tsx scripts/db/users/lookup-user-by-email.ts user@example.com
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { eq, and, isNull } from 'drizzle-orm';
import { users, allUsers, temporaryUsers } from '../../../src/db/index';

// Load environment variables
config({ path: '.env.local' });

// Ensure DATABASE_URL is set
if (!process.env.DATABASE_URL_UNPOOLED) {
  throw new Error(
    "❌ DATABASE_URL_UNPOOLED is missing! Make sure it's set in .env.local"
  );
}

// Create database connection
const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
const db = drizzle(sql, { schema: { users, allUsers, temporaryUsers } });

interface UserLookupResult {
  email: string;
  found: boolean;
  userType: 'permanent' | 'temporary' | 'not_found';
  userData?: typeof users.$inferSelect;
  allUserData?: typeof allUsers.$inferSelect;
  temporaryUserData?: typeof temporaryUsers.$inferSelect;
  relationships?: {
    invitedBy?: string;
    children?: Array<{ id: string; email: string; name: string }>;
    parent?: { id: string; email: string; name: string };
  };
}

async function lookupUserByEmail(email: string): Promise<UserLookupResult> {
  console.log(`🔍 Looking up user with email: ${email}`);

  try {
    // First, try to find the user in the main users table
    const userData = await db.query.users.findFirst({
      where: and(
        eq(users.email, email),
        isNull(users.deletedAt) // Exclude soft-deleted users
      ),
    });

    if (userData) {
      console.log('✅ Found user in main users table');

      // Find the corresponding allUsers entry
      const allUserData = await db.query.allUsers.findFirst({
        where: and(eq(allUsers.userId, userData.id), eq(allUsers.type, 'user')),
      });

      // Find relationships
      const relationships = await findUserRelationships(
        userData.id,
        allUserData?.id
      );

      return {
        email,
        found: true,
        userType: 'permanent',
        userData,
        allUserData,
        relationships,
      };
    }

    // If not found in users table, check temporary users
    const temporaryUserData = await db.query.temporaryUsers.findFirst({
      where: eq(temporaryUsers.email, email),
    });

    if (temporaryUserData) {
      console.log('✅ Found user in temporary users table');

      // Find the corresponding allUsers entry
      const allUserData = await db.query.allUsers.findFirst({
        where: and(
          eq(allUsers.temporaryUserId, temporaryUserData.id),
          eq(allUsers.type, 'temporary')
        ),
      });

      return {
        email,
        found: true,
        userType: 'temporary',
        temporaryUserData,
        allUserData,
      };
    }

    console.log('❌ User not found in any table');
    return {
      email,
      found: false,
      userType: 'not_found',
    };
  } catch (error) {
    console.error('❌ Error looking up user:', error);
    throw error;
  }
}

async function findUserRelationships(userId: string, allUserId?: string) {
  const relationships: {
    invitedBy?: string;
    children?: Array<{ id: string; email: string; name: string }>;
    parent?: { id: string; email: string; name: string };
  } = {};

  try {
    // Find who invited this user
    if (allUserId) {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (user?.invitedByAllUserId) {
        const inviter = await db.query.allUsers.findFirst({
          where: eq(allUsers.id, user.invitedByAllUserId),
        });
        if (inviter) {
          relationships.invitedBy = inviter.id;
        }
      }
    }

    // Find children (users invited by this user)
    const children = allUserId
      ? await db.query.users.findMany({
          where: eq(users.invitedByAllUserId, allUserId),
          columns: { id: true, email: true, name: true },
        })
      : [];
    relationships.children = children.map((child) => ({
      id: child.id,
      email: child.email || '',
      name: child.name || '',
    }));

    // Find parent (who invited this user)
    if (allUserId) {
      const allUser = await db.query.allUsers.findFirst({
        where: eq(allUsers.id, allUserId),
      });

      if (allUser?.userId) {
        const user = await db.query.users.findFirst({
          where: eq(users.id, allUser.userId),
        });

        if (user?.invitedByAllUserId) {
          const parentUser = await db.query.users.findFirst({
            where: eq(users.id, user.invitedByAllUserId),
            columns: { id: true, email: true, name: true },
          });
          if (parentUser) {
            relationships.parent = {
              id: parentUser.id,
              email: parentUser.email || '',
              name: parentUser.name || '',
            };
          }
        }
      }
    }
  } catch (error) {
    console.warn('⚠️  Warning: Could not fetch relationships:', error);
  }

  return relationships;
}

function formatUserData(result: UserLookupResult) {
  console.log('\n' + '='.repeat(80));
  console.log(`📧 USER LOOKUP RESULTS FOR: ${result.email}`);
  console.log('='.repeat(80));

  if (!result.found) {
    console.log('❌ User not found in any table');
    return;
  }

  console.log(`\n🔍 User Type: ${result.userType.toUpperCase()}`);
  console.log(`📊 Found: ${result.found ? 'Yes' : 'No'}`);

  if (result.userData) {
    console.log('\n📋 MAIN USER DATA:');
    console.log('─'.repeat(40));
    console.log(`ID: ${result.userData.id}`);
    console.log(`Name: ${result.userData.name || 'N/A'}`);
    console.log(`Email: ${result.userData.email}`);
    console.log(`Username: ${result.userData.username || 'N/A'}`);
    console.log(`Role: ${result.userData.role}`);
    console.log(`Plan: ${result.userData.plan}`);
    console.log(`User Type: ${result.userData.userType}`);
    console.log(`Registration Status: ${result.userData.registrationStatus}`);
    console.log(
      `Email Verified: ${result.userData.emailVerified || 'Not verified'}`
    );
    console.log(
      `Premium Expires: ${result.userData.premiumExpiresAt || 'N/A'}`
    );
    console.log(`Created: ${result.userData.createdAt}`);
    console.log(`Updated: ${result.userData.updatedAt}`);
    console.log(`Deleted: ${result.userData.deletedAt || 'Not deleted'}`);

    if (result.userData.metadata) {
      console.log(`Bio: ${result.userData.metadata.bio || 'N/A'}`);
      console.log(`Location: ${result.userData.metadata.location || 'N/A'}`);
      console.log(`Website: ${result.userData.metadata.website || 'N/A'}`);
    }
  }

  if (result.temporaryUserData) {
    console.log('\n📋 TEMPORARY USER DATA:');
    console.log('─'.repeat(40));
    console.log(`ID: ${result.temporaryUserData.id}`);
    console.log(`Name: ${result.temporaryUserData.name || 'N/A'}`);
    console.log(`Email: ${result.temporaryUserData.email}`);
    console.log(`Role: ${result.temporaryUserData.role}`);
    console.log(
      `Registration Status: ${result.temporaryUserData.registrationStatus}`
    );
    console.log(`Created: ${result.temporaryUserData.createdAt}`);
  }

  if (result.allUserData) {
    console.log('\n📋 ALL USERS DATA:');
    console.log('─'.repeat(40));
    console.log(`All User ID: ${result.allUserData.id}`);
    console.log(`Type: ${result.allUserData.type}`);
    console.log(`User ID: ${result.allUserData.userId || 'N/A'}`);
    console.log(
      `Temporary User ID: ${result.allUserData.temporaryUserId || 'N/A'}`
    );
    console.log(`Created: ${result.allUserData.createdAt}`);
    console.log(`Deleted: ${result.allUserData.deletedAt || 'Not deleted'}`);
  }

  if (result.relationships) {
    console.log('\n🔗 RELATIONSHIPS:');
    console.log('─'.repeat(40));

    if (result.relationships.invitedBy) {
      console.log(`Invited By: ${result.relationships.invitedBy}`);
    }

    if (result.relationships.parent) {
      console.log(
        `Parent User: ${result.relationships.parent.name} (${result.relationships.parent.email})`
      );
    }

    if (
      result.relationships.children &&
      result.relationships.children.length > 0
    ) {
      console.log(`Children (${result.relationships.children.length}):`);
      result.relationships.children.forEach((child, index: number) => {
        console.log(`  ${index + 1}. ${child.name} (${child.email})`);
      });
    } else {
      console.log('Children: None');
    }
  }

  console.log('\n' + '='.repeat(80));
}

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.error('❌ Error: Email address is required');
    console.log(
      '\nUsage: npx tsx scripts/db/users/lookup-user-by-email.ts <email>'
    );
    console.log(
      'Example: npx tsx scripts/db/users/lookup-user-by-email.ts user@example.com'
    );
    process.exit(1);
  }

  try {
    const result = await lookupUserByEmail(email);
    formatUserData(result);
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}
