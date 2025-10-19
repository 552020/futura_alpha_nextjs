import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { allUsers, temporaryUsers, users } from '@/db';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';

import { fatLogger } from '@/lib/logger';

/**
 * GET /api/users/[id]
 * GET /api/users/[id]?email=user@example.com
 *
 * Retrieves a user by ID or email.
 * - If [id] is provided in the path, retrieves by ID
 * - If ?email query parameter is provided, retrieves by email (ignores [id])
 *
 * Requires authentication.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const emailParam = searchParams.get('email');

    // If email parameter is provided, search by email instead of ID
    if (emailParam) {
      const user = await db.query.users.findFirst({
        where: eq(users.email, emailParam),
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Find corresponding allUsers entry
      const allUser = await db.query.allUsers.findFirst({
        where: eq(allUsers.userId, user.id),
      });

      return NextResponse.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          username: user.username,
          userType: user.userType,
          role: user.role,
          plan: user.plan,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        allUser: allUser
          ? {
              id: allUser.id,
              type: allUser.type,
              userId: allUser.userId,
              createdAt: allUser.createdAt,
            }
          : null,
      });
    }

    // Otherwise, search by ID from the path parameter
    const { id } = await params;

    const allUser = await db.query.allUsers.findFirst({
      where: eq(allUsers.id, id),
    });

    if (!allUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (allUser.type === 'temporary') {
      const temporaryUser = await db.query.temporaryUsers.findFirst({
        where: eq(temporaryUsers.id, allUser.temporaryUserId!),
      });

      return NextResponse.json({
        user: temporaryUser,
        allUser: {
          id: allUser.id,
          type: allUser.type,
          temporaryUserId: allUser.temporaryUserId,
          createdAt: allUser.createdAt,
        },
      });
    } else {
      const user = await db.query.users.findFirst({
        where: eq(users.id, allUser.userId!),
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      return NextResponse.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          username: user.username,
          userType: user.userType,
          role: user.role,
          plan: user.plan,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        allUser: {
          id: allUser.id,
          type: allUser.type,
          userId: allUser.userId,
          createdAt: allUser.createdAt,
        },
      });
    }
  } catch (error) {
    fatLogger.error('Error retrieving user:', 'be', { data: error instanceof Error ? error : undefined });
    return NextResponse.json({ error: 'Failed to retrieve user' }, { status: 500 });
  }
}

export async function PATCH(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    console.log('🔍 [DEBUG] Starting PATCH /api/users/[id] request for ID:', id);
    const body = await _request.json();
    console.log('📋 [DEBUG] Request body:', JSON.stringify(body, null, 2));
    const { name, email } = body;

    // First, check if this is a temporary user or a permanent user
    console.log('🔄 [DEBUG] Looking up allUser with ID:', id);
    const allUser = await db.query.allUsers.findFirst({
      where: (allUsers, { eq }) => eq(allUsers.id, id),
    });

    if (!allUser) {
      console.log('❌ [DEBUG] AllUser not found for ID:', id);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('✅ [DEBUG] AllUser found:', {
      id: allUser.id,
      type: allUser.type,
      temporaryUserId: allUser.temporaryUserId,
      userId: allUser.userId,
    });

    console.log('🔍 [DEBUG] Full allUser object:', JSON.stringify(allUser, null, 2));

    if (allUser.type === 'temporary') {
      // Handle case where temporaryUserId is missing (old broken records)
      if (!allUser.temporaryUserId) {
        console.log('❌ [DEBUG] temporaryUserId is missing from allUser - this is an old broken record');
        console.log('🔧 [DEBUG] Attempting to find temporary user by userId field...');

        // Try to find the temporary user by the userId field (old structure)
        if (allUser.userId) {
          console.log('🔄 [DEBUG] Looking for temporary user with userId:', allUser.userId);
          const tempUser = await db.query.temporaryUsers.findFirst({
            where: eq(temporaryUsers.id, allUser.userId),
          });

          if (tempUser) {
            console.log('✅ [DEBUG] Found temporary user, updating...');
            const [updatedTemporaryUser] = await db
              .update(temporaryUsers)
              .set({
                name,
                email,
                updatedAt: new Date(),
              })
              .where(eq(temporaryUsers.id, allUser.userId))
              .returning();

            console.log('✅ [DEBUG] Temporary user updated successfully:', {
              id: updatedTemporaryUser.id,
              name: updatedTemporaryUser.name,
              email: updatedTemporaryUser.email,
            });

            return NextResponse.json({
              user: updatedTemporaryUser,
              allUser,
            });
          }
        }

        return NextResponse.json({ error: 'Invalid user data - missing temporaryUserId' }, { status: 400 });
      }

      console.log('🔄 [DEBUG] Updating temporary user with ID:', allUser.temporaryUserId);
      // Update temporary user
      const [updatedTemporaryUser] = await db
        .update(temporaryUsers)
        .set({
          name,
          email,
          updatedAt: new Date(),
        })
        .where(eq(temporaryUsers.id, allUser.temporaryUserId))
        .returning();

      console.log('✅ [DEBUG] Temporary user updated successfully:', {
        id: updatedTemporaryUser.id,
        name: updatedTemporaryUser.name,
        email: updatedTemporaryUser.email,
      });

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
    console.log('❌ [DEBUG] Error updating user:', error);
    fatLogger.error('Error updating user:', 'be', {
      data: error instanceof Error ? error : undefined,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: 'Failed to update user',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
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
    fatLogger.error('Error deleting user:', 'be', { data: error instanceof Error ? error : undefined });
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
