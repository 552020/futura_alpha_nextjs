// Script to clear business relationships and set up a new one
import { db } from '@/db/db';
import { businessRelationship, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

async function setupBusinessRelationship() {
  try {
    // Emails of the users
    const businessEmail = 'contact@arakicycles.com';
    const clientEmail = 'l.mangallon@gmail.com';

    console.log('Fetching user IDs...');

    // Get the business user ID
    const [businessUser] = await db.select().from(users).where(eq(users.email, businessEmail)).limit(1);

    if (!businessUser) {
      throw new Error(`Business user with email ${businessEmail} not found`);
    }

    // Get the client user ID
    const [clientUser] = await db.select().from(users).where(eq(users.email, clientEmail)).limit(1);

    if (!clientUser) {
      throw new Error(`Client user with email ${clientEmail} not found`);
    }

    console.log('Found users:', {
      business: { id: businessUser.id, email: businessUser.email },
      client: { id: clientUser.id, email: clientUser.email },
    });

    // Delete all existing business relationships
    console.log('Deleting all existing business relationships...');
    await db.delete(businessRelationship);

    // Create a new business relationship
    console.log('Creating new business relationship...');
    const [newRelationship] = await db
      .insert(businessRelationship)
      .values({
        businessId: businessUser.id,
        clientId: clientUser.id,
        clientName: clientUser.name || 'Client',
        clientEmail: clientUser.email,
        createdAt: new Date(),
      })
      .returning();

    console.log('New business relationship created:', {
      id: newRelationship.id,
      businessId: newRelationship.businessId,
      clientId: newRelationship.clientId,
      clientEmail: newRelationship.clientEmail,
      createdAt: newRelationship.createdAt,
    });

    console.log('✅ Business relationship setup completed successfully');
  } catch (error) {
    console.error('❌ Error setting up business relationship:', error);
  } finally {
    process.exit(0);
  }
}

setupBusinessRelationship();
