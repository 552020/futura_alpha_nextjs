import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { allUsers, temporaryUsers, users } from '@/db';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { fatLogger } from '@/lib/logger';
import { getUserByEmail, getAllUserRecordById, getUserRecord, getAllUserRecord } from '@/services/user/user-operations';

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
      const userResult = await getUserByEmail(emailParam);

      if (!userResult.success || !userResult.data) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const user = userResult.data as Record<string, unknown>;
      const allUserResult = await getAllUserRecord(user.id as string);

      // Filter out sensitive fields
      const { password: _password, emailVerified: _emailVerified, parentId: _parentId, invitedByAllUserId: _invitedByAllUserId, invitedAt: _invitedAt,
        registrationStatus: _registrationStatus, premiumExpiresAt: _premiumExpiresAt, deletedAt: _deletedAt, metadata: _metadata, ...safeUserData } = user;

      return NextResponse.json({
        user: safeUserData,
        allUser: allUserResult.success ? allUserResult.data : null,
      });
    }

    // Otherwise, search by ID from the path parameter
    const { id } = await params;

    const allUserResult = await getAllUserRecordById(id);

    if (!allUserResult.success || !allUserResult.data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const allUser = allUserResult.data as { type: string; userId?: string; temporaryUserId?: string };

    if (allUser.type === 'temporary') {
      const temporaryUser = await db.query.temporaryUsers.findFirst({
        where: eq(temporaryUsers.id, allUser.temporaryUserId!),
      });

      return NextResponse.json({
        user: temporaryUser,
        allUser: allUserResult.data,
      });
    } else {
      const userResult = await getUserRecord(allUser.userId!);

      if (!userResult.success || !userResult.data) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const user = userResult.data as Record<string, unknown>;

      // Filter out sensitive fields
      const { password: _password, emailVerified: _emailVerified, parentId: _parentId, invitedByAllUserId: _invitedByAllUserId, invitedAt: _invitedAt,
        registrationStatus: _registrationStatus, premiumExpiresAt: _premiumExpiresAt, deletedAt: _deletedAt, metadata: _metadata, ...safeUserData } = user;

      return NextResponse.json({
        user: safeUserData,
        allUser: allUserResult.data,
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
    fatLogger.error('Error updating user:', 'be', { data: error instanceof Error ? error : undefined });
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
    fatLogger.error('Error deleting user:', 'be', { data: error instanceof Error ? error : undefined });
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
