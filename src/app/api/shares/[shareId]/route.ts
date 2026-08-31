import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { revokeShare } from '@/services/sharing';
import { getAllUserRecord } from '@/services/user';
import type { allUsers } from '@/db';
import { fatLogger } from '@/lib/logger';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ shareId: string }> }
) {
  const { shareId } = await context.params;

  try {
    fatLogger.info('🗑️ Revoke share request:', 'be', { shareId });

    // Authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user record using service function
    const userResult = await getAllUserRecord(session.user.id);

    if (!userResult.success) {
      fatLogger.error('Failed to get user record', 'be', {
        error: userResult.error,
        userId: session.user.id,
      });
      return NextResponse.json(
        {
          error: 'User record not found',
          details: userResult.error,
        },
        { status: 404 }
      );
    }

    const allUserRecord = userResult.data as typeof allUsers.$inferSelect;

    // Revoke the share using service function
    const revokeResult = await revokeShare(shareId, allUserRecord.id);

    if (!revokeResult.success) {
      fatLogger.error('Failed to revoke share', 'be', {
        error: revokeResult.error,
        shareId,
        userId: allUserRecord.id,
      });
      return NextResponse.json(
        {
          error: 'Failed to revoke share',
          details: revokeResult.error,
        },
        { status: 500 }
      );
    }

    fatLogger.info('✅ Share revoked successfully:', 'be', {
      shareId,
      userId: allUserRecord.id,
    });

    return NextResponse.json({
      success: true,
      data: {
        shareId,
        revoked: true,
        revokedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    fatLogger.error('🔴 Error revoking share:', 'be', {
      error: error instanceof Error ? error : undefined,
      stack: error instanceof Error ? error.stack : undefined,
      message: error instanceof Error ? error.message : String(error),
      shareId,
    });
    return NextResponse.json(
      {
        error: 'Failed to revoke share',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
