import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { allUsers, temporaryUsers, users } from '@/db/schema';
import { eq, or } from 'drizzle-orm';
import { businessRelationship } from '@/db/schema';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    // Get the allUsers record for the requested ID
    const allUser = await db.query.allUsers.findFirst({
      where: (allUsers, { eq }) => eq(allUsers.id, id),
    });

    if (!allUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if the user has any business relationships
    const relationships = await db
      .select()
      .from(businessRelationship)
      .where(
        or(
          eq(businessRelationship.businessId, id),
          eq(businessRelationship.clientId, id)
        )
      );

    // Check if the user is a business (has clients) or a client (has a business)
    const isBusiness = relationships.some(rel => rel.businessId === id);
    const isClient = relationships.some(rel => rel.clientId === id);

    // Get the business email if the user is a client
    let businessEmail = null;
    if (isClient) {
      const clientRelationship = relationships.find(rel => rel.clientId === id);
      if (clientRelationship) {
        // Query the users table directly to get the business email
        const businessUser = await db.query.users.findFirst({
          where: (users, { eq }) => eq(users.id, clientRelationship.businessId)
        });
        businessEmail = businessUser?.email || null;
      }
    }

    return NextResponse.json({
      hasBusinessRelationship: relationships.length > 0,
      isBusiness,
      isClient,
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
    console.error('Error fetching business relationships:', error);
    return NextResponse.json(
      { error: 'Failed to fetch business relationships' },
      { status: 500 }
    );
  }
}

export async function PATCH(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await _request.json();
    const { name, email } = body;

    // First, check if this is a temporary user or a permanent user
    const allUser = await db.query.allUsers.findFirst({
      where: (allUsers, { eq }) => eq(allUsers.id, id),
    });

    if (!allUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (allUser.type === 'temporary') {
      // Update temporary user
      const [updatedTemporaryUser] = await db
        .update(temporaryUsers)
        .set({
          name,
          email,
          updatedAt: new Date(),
        })
        .where(eq(temporaryUsers.id, allUser.temporaryUserId!))
        .returning();

      return NextResponse.json({
        user: updatedTemporaryUser,
        allUser,
      });
    } else {
      // Update permanent user
      const [updatedUser] = await db
        .update(users)
        .set({
          name,
          email,
          updatedAt: new Date(),
        })
        .where(eq(users.id, allUser.userId!))
        .returning();

      return NextResponse.json({
        user: updatedUser,
        allUser,
      });
    }
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    // First, check if this is a temporary user
    const allUser = await db.query.allUsers.findFirst({
      where: (allUsers, { eq }) => eq(allUsers.id, id),
    });

    if (!allUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (allUser.type === 'temporary') {
      // Delete temporary user
      await db.delete(temporaryUsers).where(eq(temporaryUsers.id, allUser.temporaryUserId!));
    } else {
      // Delete permanent user
      await db.delete(users).where(eq(users.id, allUser.userId!));
    }

    // Delete the allUsers entry
    await db.delete(allUsers).where(eq(allUsers.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
