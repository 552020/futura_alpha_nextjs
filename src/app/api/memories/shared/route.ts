import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db/db';
import { allUsers, memories, resourceMembership } from '@/db';
import { eq, desc, sql, ne, and } from 'drizzle-orm';

import { fatLogger } from '@/lib/logger';
/**
 * GET /api/memories/shared
 *
 * Retrieves shared memories for the authenticated user or temporary user.
 * Updated to use the new unified memories table.
 *
 * Authentication:
 * - For authenticated users: Uses the session userId to find their allUserId
 * - For temporary users: Requires allUserId in the request body
 *
 * Request body (for temporary users):
 * {
 *   "allUserId": string // The allUserId of the temporary user
 * }
 */
export async function GET(request: NextRequest) {
  // Check authentication
  const session = await auth();
  let allUserId: string;

  if (session?.user?.id) {
    // Handle authenticated user
    const allUserRecord = await db.query.allUsers.findFirst({
      where: eq(allUsers.userId, session.user.id),
    });

    if (!allUserRecord) {
      return NextResponse.json(
        { error: 'User record not found' },
        { status: 404 }
      );
    }

    allUserId = allUserRecord.id;
  } else {
    // Handle temporary user
    const body = await request.json().catch(() => null);

    if (!body?.allUserId) {
      return NextResponse.json(
        {
          error:
            'For temporary users, allUserId must be provided in the request body',
        },
        { status: 401 }
      );
    }

    // Verify the allUserId exists
    const tempUserRecord = await db.query.allUsers.findFirst({
      where: eq(allUsers.id, body.allUserId),
    });

    if (!tempUserRecord) {
      return NextResponse.json(
        { error: 'Invalid temporary user ID' },
        { status: 404 }
      );
    }

    allUserId = body.allUserId;
  }

  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const offset = (page - 1) * limit;
    const orderBy = searchParams.get('orderBy') || 'sharedAt'; // "sharedAt" or "createdAt"

    // Get all memory memberships for this user (excluding their own memories)
    const memberships = await db.query.resourceMembership.findMany({
      where: and(
        eq(resourceMembership.resourceType, 'memory'),
        eq(resourceMembership.allUserId, allUserId),
        // Exclude system-granted memberships (usually ownership)
        ne(resourceMembership.grantSource, 'system')
      ),
      orderBy:
        orderBy === 'sharedAt'
          ? desc(resourceMembership.createdAt)
          : desc(resourceMembership.createdAt),
    });

    // Get memory IDs from memberships (already ordered)
    const memoryIds = memberships.map((membership) => membership.resourceId);

    if (memoryIds.length === 0) {
      return NextResponse.json({
        images: [],
        documents: [],
        notes: [],
        videos: [],
        audio: [],
        hasMore: false,
        success: true,
        data: [],
        total: 0,
      });
    }

    // Fetch the actual memories using unified table
    // Note: We maintain the order from shares by using the memoryIds array order
    const sharedMemories = await db.query.memories.findMany({
      where: sql`${memories.id} = ANY(${memoryIds})`,
      // Don't order here - we'll sort by the original shares order
    });

    // Sort memories by the order they appear in memoryIds (which is ordered by shares)
    const orderedMemories = memoryIds
      .map((id) => sharedMemories.find((memory) => memory.id === id))
      .filter(Boolean) as typeof sharedMemories;

    // Apply pagination to the ordered results
    const paginatedMemories = orderedMemories.slice(offset, offset + limit);

    // Calculate share counts and add sharing info
    const memoriesWithShareInfo = await Promise.all(
      paginatedMemories.map(async (memory) => {
        // Find the membership record for this memory and user
        const membership = memberships.find((m) => m.resourceId === memory.id);

        // Get total membership count for this memory (excluding owner)
        const membershipCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(resourceMembership)
          .where(
            and(
              eq(resourceMembership.resourceType, 'memory'),
              eq(resourceMembership.resourceId, memory.id),
              ne(resourceMembership.grantSource, 'system')
            )
          );

        // Convert membership role to access level
        let accessLevel = 'read';
        if (membership) {
          switch (membership.role) {
            case 'owner':
            case 'superadmin':
            case 'admin':
              accessLevel = 'write';
              break;
            case 'member':
              accessLevel = 'write';
              break;
            case 'guest':
            default:
              accessLevel = 'read';
              break;
          }
        }

        return {
          ...memory,
          sharedBy: {
            id: memory.ownerId,
            name: await getOwnerName(memory.ownerId),
          },
          accessLevel,
          status: 'shared' as const,
          sharedWithCount: membershipCount[0]?.count || 0,
        };
      })
    );

    // Filter memories by type for backward compatibility
    const images = memoriesWithShareInfo.filter((m) => m.type === 'image');
    const documents = memoriesWithShareInfo.filter(
      (m) => m.type === 'document'
    );
    const notes = memoriesWithShareInfo.filter((m) => m.type === 'note');
    const videos = memoriesWithShareInfo.filter((m) => m.type === 'video');
    const audio = memoriesWithShareInfo.filter((m) => m.type === 'audio');

    const hasMore = orderedMemories.length > offset + limit;

    return NextResponse.json({
      // Legacy format for backward compatibility
      images,
      documents,
      notes,
      videos,
      audio,
      hasMore,
      // New unified format (additional)
      success: true,
      data: memoriesWithShareInfo,
      total: memoriesWithShareInfo.length,
    });
  } catch (error) {
    fatLogger.error('Error fetching shared memories:', 'be', {
      data: error instanceof Error ? error : undefined,
    });
    return NextResponse.json(
      { error: 'Failed to fetch shared memories' },
      { status: 500 }
    );
  }
}

// Helper function to get owner name
async function getOwnerName(ownerId: string): Promise<string> {
  try {
    const owner = await db.query.allUsers.findFirst({
      where: eq(allUsers.id, ownerId),
      with: {
        user: true,
        temporaryUser: true,
      },
    });

    if (owner?.user) {
      return (owner.user as { name?: string }).name || 'Unknown User';
    } else if (owner?.temporaryUser) {
      return (
        (owner.temporaryUser as { name?: string }).name || 'Temporary User'
      );
    }

    return 'Unknown';
  } catch (error) {
    fatLogger.error('Error getting owner name:', 'be', {
      data: error instanceof Error ? error : undefined,
    });
    return 'Unknown';
  }
}
