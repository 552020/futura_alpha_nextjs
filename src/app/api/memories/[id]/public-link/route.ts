import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createPublicLink, generateShareableUrl } from '@/services/sharing';
import { getAllUserRecord } from '@/services/user';
import { getMemoryWithRelations } from '@/services/memory';
import type { allUsers, memories } from '@/db';
import { fatLogger } from '@/lib/logger';

type CreatePublicLinkRequest = {
  expiresAt?: string; // ISO string
  isActive?: boolean;
};

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: memoryId } = await context.params;

  try {
    const body = (await request.json()) as CreatePublicLinkRequest;
    fatLogger.info('📨 Create public link request:', 'be', { memoryId, body });

    const { expiresAt, isActive = true } = body;

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

    // Find the memory and check ownership using service function
    const memoryResult = await getMemoryWithRelations(memoryId, allUserRecord.id);

    if (!memoryResult.success) {
      fatLogger.error('Memory not found or not owned by user', 'be', {
        memoryId,
        ownerId: allUserRecord.id,
        error: memoryResult.error,
      });
      return NextResponse.json(
        {
          error: 'Memory not found or access denied',
          details: memoryResult.error,
        },
        { status: 404 }
      );
    }

    const memory = memoryResult.data as typeof memories.$inferSelect;

    fatLogger.info('✅ Memory found and owned by user:', 'be', {
      memoryId,
      memoryTitle: memory.title,
      ownerId: allUserRecord.id,
    });

    // Create public link
    const publicLinkResult = await createPublicLink({
      resourceType: 'memory',
      resourceId: memoryId,
      createdBy: allUserRecord.id,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      isActive,
    });

    if (!publicLinkResult.success) {
      fatLogger.error('Failed to create public link', 'be', {
        error: publicLinkResult.error,
        memoryId,
        createdBy: allUserRecord.id,
      });
      return NextResponse.json(
        {
          error: 'Failed to create public link',
          details: publicLinkResult.error,
        },
        { status: 500 }
      );
    }

    // Generate shareable URL
    const shareUrl = generateShareableUrl(publicLinkResult.data!.token);

    fatLogger.info('✅ Public link created successfully', 'be', {
      tokenId: publicLinkResult.data?.id,
      memoryId,
      shareUrl,
      expiresAt: publicLinkResult.data?.expiresAt,
    });

    return NextResponse.json({
      success: true,
      data: {
        shareId: publicLinkResult.data?.id,
        token: publicLinkResult.data?.token,
        shareUrl,
        expiresAt: publicLinkResult.data?.expiresAt,
        isActive: publicLinkResult.data?.isActive,
        createdAt: publicLinkResult.data?.createdAt,
      },
    });
  } catch (error) {
    fatLogger.error('🔴 Error creating public link:', 'be', {
      error: error instanceof Error ? error : undefined,
      stack: error instanceof Error ? error.stack : undefined,
      message: error instanceof Error ? error.message : String(error),
      memoryId,
    });
    return NextResponse.json(
      {
        error: 'Failed to create public link',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
