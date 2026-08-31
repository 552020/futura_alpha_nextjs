import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { validatePublicToken, grantAccessViaToken } from '@/services/sharing';
import { getAllUserRecord } from '@/services/user';
import type { allUsers } from '@/db';
import { fatLogger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;

  try {
    fatLogger.info('🔗 Validate public token request:', 'be', {
      token: token.substring(0, 8) + '...',
    });

    // Check if user is authenticated
    let userId: string | undefined;
    try {
      const session = await auth();
      if (session?.user?.id) {
        const userResult = await getAllUserRecord(session.user.id);
        if (userResult.success) {
          const allUserRecord = userResult.data as typeof allUsers.$inferSelect;
          userId = allUserRecord.id;
        }
      }
    } catch (_authError) {
      // User might not be authenticated, that's okay for public links
      fatLogger.info('ℹ️ No authenticated user for token validation:', 'be', {
        token: token.substring(0, 8) + '...',
      });
    }

    // Validate the public token using service function with user context
    const validation = await validatePublicToken(token, userId);

    if (!validation.success || !validation.data?.isValid) {
      fatLogger.warn('❌ Invalid or expired token:', 'be', {
        token: token.substring(0, 8) + '...',
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

    fatLogger.info('✅ Token validation successful:', 'be', {
      token: token.substring(0, 8) + '...',
      resourceType: validation.data.record?.resourceType,
      resourceId: validation.data.record?.resourceId,
    });

    // Check if user is authenticated and grant access if possible
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
          const accessResult = await grantAccessViaToken(
            token,
            allUserRecord.id
          );
          if (accessResult.success) {
            accessGranted = true;
            fatLogger.info('✅ Access granted via token:', 'be', {
              token: token.substring(0, 8) + '...',
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
      fatLogger.info(
        'ℹ️ No authenticated user, providing public access:',
        'be',
        {
          token: token.substring(0, 8) + '...',
        }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        token,
        resourceType: validation.data.record?.resourceType,
        resourceId: validation.data.record?.resourceId,
        accessGranted,
        permissions: userPermissions,
        accessControl: {
          requiresAuth: validation.data.requiresAuth,
          userAllowed: validation.data.userAllowed,
          roleAllowed: validation.data.roleAllowed,
          accessGranted: validation.data.accessGranted,
        },
        shareInfo: {
          tokenId: validation.data.record?.id,
          expiresAt: validation.data.record?.expiresAt,
          isActive: validation.data.record?.isActive,
          createdAt: validation.data.record?.createdAt,
        },
      },
    });
  } catch (error) {
    fatLogger.error('🔴 Error validating public token:', 'be', {
      error: error instanceof Error ? error : undefined,
      stack: error instanceof Error ? error.stack : undefined,
      message: error instanceof Error ? error.message : String(error),
      token: token.substring(0, 8) + '...',
    });
    return NextResponse.json(
      {
        error: 'Failed to validate token',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
