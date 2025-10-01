import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db/db';
import { businessRelationship, users } from '@/db/schema';
import { eq, or } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: userId } = await context.params;
  try {
    // Verify the session to ensure the user is authenticated
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    console.log('Fetching business relationships for user ID:', userId);
    
    // Get all relationships where the user is either a business or a client
    const relationships = await db
      .select()
      .from(businessRelationship)
      .where(
        or(
          eq(businessRelationship.businessId, userId),
          eq(businessRelationship.clientId, userId)
        )
      );

    console.log('Raw relationships from database:', relationships);

    // Check if the user is a client (has a business)
    const clientRelationships = relationships.filter(rel => rel.clientId === userId);
    const isClient = clientRelationships.length > 0;
    
    // Check if the user is a business (has clients)
    const businessRelationships = relationships.filter(rel => rel.businessId === userId);
    const isBusiness = businessRelationships.length > 0;

    // If user is a client, get the business email
    let businessEmail = null;
    if (isClient) {
      console.log('Client relationships found:', clientRelationships);
      
      // Get all business emails for this client
      const businessEmails = await Promise.all(
        clientRelationships.map(async (rel) => {
          try {
            console.log(`Looking up business user with ID: ${rel.businessId}`);
            
            // First, verify the business user exists in the users table
            const businessUser = await db.query.users.findFirst({
              where: eq(users.id, rel.businessId)
            });
            
            console.log('Found business user:', businessUser);
            
            if (!businessUser) {
              console.error(`Business user ${rel.businessId} not found in users table`);
              return null;
            }
            
            if (!businessUser.email) {
              console.error(`Business user ${rel.businessId} has no email set`);
              return null;
            }
            
            return businessUser.email;
          } catch (error) {
            console.error(`Error fetching business user ${rel.businessId}:`, error);
            return null;
          }
        })
      );
      
      // Use the first valid business email
      businessEmail = businessEmails.find(email => email) || null;
      console.log('Business emails found for client:', businessEmails, 'Using:', businessEmail);
      
      // If we still don't have an email, log all users for debugging
      if (!businessEmail) {
        console.log('No business email found, listing all users for debugging:');
        const allUsers = await db.select().from(users);
        console.log('All users in database:', allUsers);
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
        createdAt: rel.createdAt?.toISOString()
      }))
    });

  } catch (error) {
    console.error('Error in business-relationship endpoint:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch business relationship',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
