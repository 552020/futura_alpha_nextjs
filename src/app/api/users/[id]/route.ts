import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { fatLogger } from '@/lib/logger';
import { updateUser, getUserByIdOrEmail } from '@/services/user';
import { db } from '@/db/db';
import { allUsers, temporaryUsers, users } from '@/db';
import { eq } from 'drizzle-orm';

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
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const emailParam = searchParams.get('email');
    const { id } = await params;

    // Use service function to get user
    const result = await getUserByIdOrEmail({
      id: emailParam ? undefined : id,
      email: emailParam || undefined,
    });

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error || 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    fatLogger.error('Error retrieving user:', 'be', {
      data: error instanceof Error ? error : undefined,
    });
    return NextResponse.json(
      { error: 'Failed to retrieve user' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    fatLogger.info('Starting PATCH /api/users/[id] request for ID:', 'be', {
      id,
    });
    const body = await _request.json();
    fatLogger.info('Request body:', 'be', { body });
    const { name, email } = body;

    // Use service function to update user
    const result = await updateUser({
      allUserId: id,
      name,
      email,
    });

    if (!result.success || !result.data) {
      fatLogger.error('Failed to update user:', 'be', { error: result.error });
      return NextResponse.json(
        { error: result.error || 'Failed to update user' },
        { status: 500 }
      );
    }

    fatLogger.info('User updated successfully', 'be');
    return NextResponse.json(result.data);
  } catch (error) {
    fatLogger.error('Error updating user:', 'be', { error });
    fatLogger.error('Error updating user:', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'update_user',
      userId: id,
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
      await db
        .delete(temporaryUsers)
        .where(eq(temporaryUsers.id, allUser.temporaryUserId!));
    } else {
      // Delete permanent user
      await db.delete(users).where(eq(users.id, allUser.userId!));
    }

    // Delete the allUsers entry
    await db.delete(allUsers).where(eq(allUsers.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    fatLogger.error('Error deleting user:', 'be', {
      data: error instanceof Error ? error : undefined,
    });
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
