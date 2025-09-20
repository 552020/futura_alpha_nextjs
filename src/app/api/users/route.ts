import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { temporaryUsers, relationship, familyRelationship } from '@/db/schema';
import { createTemporaryUserBase } from '../utils';
import { eq } from 'drizzle-orm';

// POST /api/users
// We use this endpoint to create only temporary users, normal users will be created by the sign-in success callback

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      invitedByAllUserId, // Optional: ID of the user who is inviting
      relationship: relationshipData, // Optional: relationship information
      metadata, // Optional: additional metadata
    } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    // Create temporary user and allUsers entry using the utility function
    const { temporaryUser, allUser } = await createTemporaryUserBase('invitee');

    // Update the temporary user with additional information
    await db
      .update(temporaryUsers)
      .set({
        name,
        email,
        invitedByAllUserId,
        metadata: {
          ...metadata,
        },
      })
      .where(eq(temporaryUsers.id, temporaryUser.id));

    // If we have relationship data and an inviter, create the relationship entries
    if (relationshipData && invitedByAllUserId) {
      // Create the base relationship
      const [newRelationship] = await db
        .insert(relationship)
        .values({
          userId: invitedByAllUserId,
          relatedUserId: allUser.id,
          type: relationshipData.type,
          status: 'pending',
          note: relationshipData.note,
        })
        .returning();

      // If it's a family relationship, create the family relationship entry
      if (relationshipData.type === 'family' && relationshipData.familyRole) {
        await db.insert(familyRelationship).values({
          relationshipId: newRelationship.id,
          familyRole: relationshipData.familyRole,
          relationshipClarity: 'fuzzy', // Default to fuzzy as we don't have this info yet
        });
      }
    }

    return NextResponse.json({
      user: temporaryUser,
      allUser,
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
