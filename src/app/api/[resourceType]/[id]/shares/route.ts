import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getResourceShares } from '@/services/sharing';
import { getAllUserRecord } from '@/services/user';
import { getMemoryWithRelations } from '@/services/memory';
import { getFolderByIdForOwner } from '@/services/folder';
import type { allUsers } from '@/db';
import { fatLogger } from '@/lib/logger';

export async function GET(request: NextRequest, context: { params: Promise<{ resourceType: string; id: string }> }) {
  const { resourceType, id: resourceId } = await context.params;

  try {
    fatLogger.info('📊 Get resource shares request:', 'be', { resourceType, resourceId });

    // Validate resource type
    if (!['memory', 'folder', 'gallery'].includes(resourceType)) {
      return NextResponse.json({ error: 'Invalid resource type. Must be memory, folder, or gallery' }, { status: 400 });
    }

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

    // Verify resource ownership using appropriate service function
    let resourceExists = false;
    if (resourceType === 'memory') {
      const memoryResult = await getMemoryWithRelations(resourceId, allUserRecord.id);
      resourceExists = memoryResult.success;
    } else if (resourceType === 'folder') {
      const folder = await getFolderByIdForOwner(resourceId, allUserRecord.id);
      resourceExists = !!folder;
    } else if (resourceType === 'gallery') {
      // TODO: Implement gallery ownership check when gallery service is available
      // For now, we'll assume the user has access
      resourceExists = true;
    }

    if (!resourceExists) {
      fatLogger.error('Resource not found or not owned by user', 'be', {
        resourceType,
        resourceId,
        ownerId: allUserRecord.id,
      });
      return NextResponse.json({ error: 'Resource not found or access denied' }, { status: 404 });
    }

    fatLogger.info('✅ Resource found and owned by user:', 'be', {
      resourceType,
      resourceId,
      ownerId: allUserRecord.id,
    });

    // Get all shares for the resource using service function
    const sharesResult = await getResourceShares({
      resourceType: resourceType as 'memory' | 'folder' | 'gallery',
      resourceId,
      includeInactive: false,
    });

    if (!sharesResult.success) {
      fatLogger.error('Failed to get resource shares', 'be', {
        error: sharesResult.error,
        resourceType,
        resourceId,
      });
      return NextResponse.json(
        {
          error: 'Failed to get resource shares',
          details: sharesResult.error,
        },
        { status: 500 }
      );
    }

    const shares = sharesResult.data;

    if (!shares) {
      fatLogger.error('Shares data is undefined', 'be', {
        resourceType,
        resourceId,
      });
      return NextResponse.json(
        {
          error: 'Failed to get resource shares',
          details: 'Shares data is undefined',
        },
        { status: 500 }
      );
    }

    fatLogger.info('✅ Resource shares retrieved successfully:', 'be', {
      resourceType,
      resourceId,
      shareCount: shares.totalShares,
    });

    return NextResponse.json({
      success: true,
      data: {
        resourceType,
        resourceId,
        shares,
        totalCount: shares.totalShares,
      },
    });
  } catch (error) {
    fatLogger.error('🔴 Error getting resource shares:', 'be', {
      error: error instanceof Error ? error : undefined,
      stack: error instanceof Error ? error.stack : undefined,
      message: error instanceof Error ? error.message : String(error),
      resourceType,
      resourceId,
    });
    return NextResponse.json(
      {
        error: 'Failed to get resource shares',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
