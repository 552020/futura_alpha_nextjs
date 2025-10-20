import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { deactivatePublicLink } from '@/services/sharing';
import { getAllUserRecord } from '@/services/user';
import type { allUsers } from '@/db';
import { fatLogger } from '@/lib/logger';

export async function DELETE(request: NextRequest, context: { params: Promise<{ tokenId: string }> }) {
  const { tokenId } = await context.params;

  try {
    fatLogger.info('🗑️ Deactivate public link request:', 'be', { tokenId });

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

    // Deactivate the public link using service function
    const deactivateResult = await deactivatePublicLink(tokenId, allUserRecord.id);

    if (!deactivateResult.success) {
      fatLogger.error('Failed to deactivate public link', 'be', {
        error: deactivateResult.error,
        tokenId,
        userId: allUserRecord.id,
      });
      return NextResponse.json(
        {
          error: 'Failed to deactivate public link',
          details: deactivateResult.error,
        },
        { status: 500 }
      );
    }

    fatLogger.info('✅ Public link deactivated successfully:', 'be', {
      tokenId,
      userId: allUserRecord.id,
    });

    return NextResponse.json({
      success: true,
      data: {
        tokenId,
        deactivated: true,
        deactivatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    fatLogger.error('🔴 Error deactivating public link:', 'be', {
      error: error instanceof Error ? error : undefined,
      stack: error instanceof Error ? error.stack : undefined,
      message: error instanceof Error ? error.message : String(error),
      tokenId,
    });
    return NextResponse.json(
      {
        error: 'Failed to deactivate public link',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
