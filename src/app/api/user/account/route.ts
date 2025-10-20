import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { deleteAccount, softDeleteAccount } from '@/services/user/user-operations';
import { fatLogger } from '@/lib/logger';

/**
 * GET /api/user/account
 *
 * Get current user's account information
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Implement actual account info retrieval
    return NextResponse.json({
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      image: session.user.image,
      // Add more fields as needed
    });
  } catch (error) {
    fatLogger.error('Get account info error', 'be', {
      error: error instanceof Error ? error : undefined,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/user/account
 *
 * Update current user's account information
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // TODO: Implement actual account update logic
    fatLogger.info('Account update request', 'be', {
      userId: session.user.id,
      updates: body,
    });

    return NextResponse.json({
      success: true,
      message: 'Account updated successfully',
      // Return updated user data
    });
  } catch (error) {
    fatLogger.error('Update account error', 'be', {
      error: error instanceof Error ? error : undefined,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/user/account
 *
 * Delete the current user's account
 * Supports both hard delete (default) and soft delete via query parameter
 *
 * Query parameters:
 * - ?type=soft - Soft delete (keeps audit trail)
 * - ?type=hard - Hard delete (removes all data) - DEFAULT
 *
 * This endpoint requires authentication and deletes the current user's account
 */
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get delete type from query parameters
    const { searchParams } = new URL(request.url);
    const deleteType = searchParams.get('type') || 'hard'; // Default to hard delete

    fatLogger.info('Delete account request received', 'be', {
      operation: 'delete_account_api',
      userId: session.user.id,
      deleteType,
    });

    let result;

    if (deleteType === 'soft') {
      // Soft delete - keeps audit trail
      result = await softDeleteAccount(session.user.id);
    } else {
      // Hard delete - removes all data (default)
      result = await deleteAccount(session.user.id);
    }

    if (!result.success) {
      fatLogger.error('Delete account failed', 'be', {
        operation: 'delete_account_api',
        userId: session.user.id,
        deleteType,
        error: result.error,
      });
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    fatLogger.info('Account deleted successfully', 'be', {
      operation: 'delete_account_api',
      userId: session.user.id,
      deleteType,
    });

    return NextResponse.json({
      success: true,
      deleteType,
      message:
        deleteType === 'soft'
          ? 'Account soft deleted (audit trail preserved)'
          : 'Account and all data deleted permanently',
    });
  } catch (error) {
    fatLogger.error('Delete account API error', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'delete_account_api',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
