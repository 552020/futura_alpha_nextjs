import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { deleteAccount } from '@/services/user/user-operations';
import { fatLogger } from '@/lib/logger';

/**
 * DELETE /api/user/account
 * 
 * Delete the current user's account (soft delete)
 * This endpoint requires authentication and deletes the current user's account
 */
export async function DELETE(_request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    fatLogger.info('Delete account request received', 'be', {
      operation: 'delete_account_api',
      userId: session.user.id,
    });

    // Call the service to delete the account
    const result = await deleteAccount(session.user.id);

    if (!result.success) {
      fatLogger.error('Delete account failed', 'be', {
        operation: 'delete_account_api',
        userId: session.user.id,
        error: result.error,
      });
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    fatLogger.info('Account deleted successfully', 'be', {
      operation: 'delete_account_api',
      userId: session.user.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    fatLogger.error('Delete account API error', 'be', {
      error: error instanceof Error ? error : undefined,
      operation: 'delete_account_api',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
