// Usage:
// npx tsx scripts/db/setup-business-relationship.ts <business-email> <client-email>
// Example: npx tsx scripts/db/setup-business-relationship.ts business@example.com client@example.com

import { db } from '@/db/db';
import { allUsers, users, businessRelationship } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

async function setupBusinessRelationship(businessEmail: string, clientEmail: string) {
  try {
    console.log(`Setting up business relationship between ${businessEmail} (business) and ${clientEmail} (client)`);

    // 1. Find business user
    const [businessUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, businessEmail))
      .limit(1);

    if (!businessUser) {
      console.error(`❌ No business user found with email: ${businessEmail}`);
      return;
    }

    // 2. Find client user (could be a new/external client)
    const [clientUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, clientEmail))
      .limit(1);

    if (!clientUser) {
      console.log(`ℹ️ No registered user found with email: ${clientEmail}`);
      console.log('Creating a new client record...');
      
      // For external clients, you might want to create a minimal user record
      // or handle them differently based on your business logic
      console.log('External client handling not implemented yet.');
      return;
    }

    // 3. Get allUsers records
    const [businessAllUser] = await db
      .select()
      .from(allUsers)
      .where(eq(allUsers.userId, businessUser.id))
      .limit(1);

    const [clientAllUser] = await db
      .select()
      .from(allUsers)
      .where(eq(allUsers.userId, clientUser.id))
      .limit(1);

    if (!businessAllUser || !clientAllUser) {
      console.error('❌ Could not find allUsers records for one or both users');
      if (!businessAllUser) console.error(`- Missing allUsers record for business: ${businessEmail}`);
      if (!clientAllUser) console.error(`- Missing allUsers record for client: ${clientEmail}`);
      return;
    }

    // 4. Check if relationship already exists
    const existingRelationship = await db
      .select()
      .from(businessRelationship)
      .where(
        and(
          eq(businessRelationship.businessId, businessAllUser.id),
          eq(businessRelationship.clientId, clientAllUser.id)
        )
      )
      .limit(1);

    if (existingRelationship.length > 0) {
      console.log('ℹ️ Relationship already exists:', existingRelationship[0]);
      return;
    }

    // 5. Create the relationship
    const [newRelationship] = await db
      .insert(businessRelationship)
      .values({
        businessId: businessAllUser.id,
        clientId: clientAllUser.id,
        clientName: clientUser.name || clientEmail.split('@')[0],
        clientEmail: clientEmail,
      })
      .returning();

    console.log('✅ Business relationship created successfully:');
    console.log({
      id: newRelationship.id,
      business: businessEmail,
      client: clientEmail,
      createdAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error setting up business relationship:');
    console.error(error);
  } finally {
    process.exit(0);
  }
}

// Get command line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Please provide both business and client emails');
  console.log('Usage: npx tsx scripts/db/setup-business-relationship.ts <business-email> <client-email>');
  process.exit(1);
}

const businessEmail = args[0];
const clientEmail = args[1];
setupBusinessRelationship(businessEmail, clientEmail);
