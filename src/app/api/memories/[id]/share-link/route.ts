import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { validatePublicToken, grantAccessViaToken } from '@/services/sharing';
import { getAllUserRecord } from '@/services/user';
import { getMemoryRecord } from '@/services/memory';
import type { allUsers, memories } from '@/db';
import { fatLogger } from '@/lib/logger';
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: memoryId } = await context.params;
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }

  try {
    fatLogger.info('🔗 Accessing shared memory via token:', 'be', { memoryId, token: token.substring(0, 8) + '...' });

    // First try to find the memory using service function
    const memoryResult = await getMemoryRecord(memoryId);
    if (!memoryResult.success) {
      fatLogger.error('Memory not found', 'be', {
        memoryId,
        error: memoryResult.error,
      });
      return NextResponse.json(
        {
          error: 'Memory not found',
          details: memoryResult.error,
        },
        { status: 404 }
      );
    }

    const memory = memoryResult.data as typeof memories.$inferSelect;

    // Validate the public token
    const validation = await validatePublicToken(token);

    if (!validation.success || !validation.data?.isValid) {
      fatLogger.warn('❌ Invalid or expired token:', 'be', {
        memoryId,
        error: validation.data?.error,
        isExpired: validation.data?.isExpired,
      });
      return NextResponse.json(
        {
          error: 'Invalid or expired token',
          details: validation.data?.error,
        },
        { status: 403 }
      );
    }

    // Check if the token is for this specific memory
    if (validation.data.record?.resourceId !== memoryId) {
      return NextResponse.json(
        {
          error: 'Token is not valid for this memory',
        },
        { status: 403 }
      );
    }

    // If user is authenticated, grant them access
    let accessGranted = false;
    const userPermissions = { canView: true, canEdit: false, canDelete: false };

    try {
      const session = await auth();
      if (session?.user?.id) {
        // Get user record using service function
        const userResult = await getAllUserRecord(session.user.id);

        if (userResult.success) {
          const allUserRecord = userResult.data as typeof allUsers.$inferSelect;

          // Grant access via token
          const accessResult = await grantAccessViaToken(token, allUserRecord.id);
          if (accessResult.success) {
            accessGranted = true;
            fatLogger.info('✅ Access granted via token:', 'be', {
              memoryId,
              userId: allUserRecord.id,
            });
          }
        } else {
          fatLogger.warn('Failed to get user record for token access', 'be', {
            userId: session.user.id,
            error: userResult.error,
          });
        }
      }
    } catch (_authError) {
      // User might not be authenticated, that's okay for public links
      fatLogger.info('ℹ️ No authenticated user, providing public access:', 'be', { memoryId });
    }

    fatLogger.info('✅ Public link access successful:', 'be', {
      memoryId,
      accessGranted,
      tokenId: validation.data.record?.id,
    });

    return NextResponse.json({
      success: true,
      data: {
        memoryId,
        memory: {
          id: memory.id,
          type: memory.type,
          title: memory.title,
          description: memory.description,
          createdAt: memory.createdAt,
        },
        accessGranted,
        permissions: userPermissions,
        shareInfo: {
          tokenId: validation.data.record?.id,
          expiresAt: validation.data.record?.expiresAt,
          isActive: validation.data.record?.isActive,
        },
      },
    });
  } catch (error) {
    fatLogger.error('🔴 Error accessing shared memory:', 'be', {
      error: error instanceof Error ? error : undefined,
      stack: error instanceof Error ? error.stack : undefined,
      message: error instanceof Error ? error.message : String(error),
      memoryId,
    });
    return NextResponse.json(
      {
        error: 'Failed to access memory',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
