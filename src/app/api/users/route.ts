import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { temporaryUsers, relationship, familyRelationship } from '@/db';
import { createTemporaryUserBase } from '../utils';
import { eq } from 'drizzle-orm';

import { fatLogger } from '@/lib/logger';
// POST /api/users
// We use this endpoint to create only temporary users, normal users will be created by the sign-in success callback

export async function POST(request: Request) {
  try {
    console.log('🔍 [DEBUG] Starting POST /api/users request');
    const body = await request.json();
    console.log('📋 [DEBUG] Request body:', JSON.stringify(body, null, 2));

    fatLogger.info('Creating recipient user:', 'be', {
      name: body.name,
      email: body.email,
      invitedByAllUserId: body.invitedByAllUserId,
      relationship: body.relationship,
      metadata: body.metadata,
    });

    const {
      name,
      email,
      invitedByAllUserId, // Optional: ID of the user who is inviting
      relationship: relationshipData, // Optional: relationship information
      metadata, // Optional: additional metadata
    } = body;

    if (!name || !email) {
      console.log('❌ [DEBUG] Missing required fields:', { name, email });
      fatLogger.error('Missing required fields:', 'be', { name, email });
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    console.log('✅ [DEBUG] Validation passed, creating temporary user...');

    // Create temporary user and allUsers entry using the utility function
    console.log('🔄 [DEBUG] Calling createTemporaryUserBase...');
    const { temporaryUser, allUser } = await createTemporaryUserBase('invitee');
    console.log('✅ [DEBUG] Temporary user created:', { temporaryUserId: temporaryUser.id, allUserId: allUser.id });

    // Update the temporary user with additional information
    console.log('🔄 [DEBUG] Updating temporary user with additional info...');
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
    console.log('✅ [DEBUG] Temporary user updated successfully');

    // If we have relationship data and an inviter, create the relationship entries
    if (relationshipData && invitedByAllUserId) {
      console.log('🔄 [DEBUG] Creating relationship entries...', { relationshipData, invitedByAllUserId });

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
      console.log('✅ [DEBUG] Base relationship created:', { relationshipId: newRelationship.id });

      // If it's a family relationship, create the family relationship entry
      if (relationshipData.type === 'family' && relationshipData.familyRole) {
        console.log('🔄 [DEBUG] Creating family relationship...', { familyRole: relationshipData.familyRole });
        await db.insert(familyRelationship).values({
          relationshipId: newRelationship.id,
          familyRole: relationshipData.familyRole,
          relationshipClarity: 'fuzzy', // Default to fuzzy as we don't have this info yet
        });
        console.log('✅ [DEBUG] Family relationship created');
      }
    } else {
      console.log('ℹ️ [DEBUG] No relationship data or invitedByAllUserId, skipping relationship creation');
    }

    fatLogger.info('Successfully created recipient user:', 'be', {
      temporaryUserId: temporaryUser.id,
      allUserId: allUser.id,
    });

    return NextResponse.json({
      user: temporaryUser,
      allUser,
    });
  } catch (error) {
    fatLogger.error('Error creating user:', 'be', {
      data: error instanceof Error ? error : undefined,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: 'Failed to create user',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
