import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db/db';
import { businessRelationship, users } from '@/db';
import { eq, or } from 'drizzle-orm';
import { fatLogger } from '@/lib/logger';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: userId } = await context.params;
  try {
    // Verify the session to ensure the user is authenticated
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    fatLogger.info('Fetching business relationships for user', 'be', { userId });

    // Get all relationships where the user is either a business or a client
    const relationships = await db
      .select()
      .from(businessRelationship)
      .where(or(eq(businessRelationship.businessId, userId), eq(businessRelationship.clientId, userId)));

    fatLogger.debug('Retrieved business relationships from database', 'be', { relationships });

    // Check if the user is a client (has a business)
    const clientRelationships = relationships.filter(rel => rel.clientId === userId);
    const isClient = clientRelationships.length > 0;

    // Check if the user is a business (has clients)
    const businessRelationships = relationships.filter(rel => rel.businessId === userId);
    const isBusiness = businessRelationships.length > 0;

    // If user is a client, get the business email
    let businessEmail = null;
    if (isClient) {
      fatLogger.debug('Client relationships found', 'be', { clientRelationships });

      // Get all business emails for this client
      const businessEmails = await Promise.all(
        clientRelationships.map(async rel => {
          try {
            fatLogger.debug('Looking up business user', 'be', { businessId: rel.businessId });

            // First, verify the business user exists in the users table
            const businessUser = await db.query.users.findFirst({
              where: eq(users.id, rel.businessId),
            });

            fatLogger.debug('Found business user', 'be', { businessUser });

            if (!businessUser) {
              fatLogger.warn(`Business user not found in users table`, 'be', { businessId: rel.businessId });
              return null;
            }

            if (!businessUser.email) {
              fatLogger.warn('Business user has no email set', 'be', { businessId: rel.businessId });
              return null;
            }

            return businessUser.email;
          } catch (error) {
            fatLogger.error('Error fetching business user', 'be', { businessId: rel.businessId, error });
            return null;
          }
        })
      );

      // Use the first valid business email
      businessEmail = businessEmails.find(email => email) || null;
      fatLogger.debug('Business emails found for client', 'be', { businessEmails, selectedEmail: businessEmail });

      // If we still don't have an email, log all users for debugging
      if (!businessEmail) {
        fatLogger.warn('No business email found, listing all users for debugging', 'be');
        const allUsers = await db.select().from(users);
        fatLogger.debug('All users in database', 'be', { allUsers });
      }
    }

    return NextResponse.json({
      hasBusinessRelationship: relationships.length > 0,
      isClient,
      isBusiness,
      businessEmail,
      relationships: relationships.map(rel => ({
        id: rel.id,
        businessId: rel.businessId,
        clientId: rel.clientId,
        clientName: rel.clientName,
        clientEmail: rel.clientEmail,
        createdAt: rel.createdAt?.toISOString(),
      })),
    });
  } catch (error) {
    fatLogger.error('Error in business-relationship endpoint', 'be', { error });
    return NextResponse.json(
      {
        error: 'Failed to fetch business relationship',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
