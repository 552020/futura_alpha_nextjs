import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { storageEdges } from '@/db/tables';
import { eq, and, isNull } from 'drizzle-orm';
import { fatLogger } from '@/lib/logger';

export async function GET(_request: NextRequest) {
  try {
    const memoryId = 'e428889a-ebc9-9c6d-e428-000000009c6d';

    fatLogger.info('🔍 Debug: Checking for existing storage edges', 'be', {
      memoryId,
    });

    // First, let's see what records exist for this memory
    const allEdges = await db.select().from(storageEdges).where(eq(storageEdges.memoryId, memoryId));

    fatLogger.info('🔍 Debug: Found existing edges', 'be', {
      memoryId,
      count: allEdges.length,
      edges: allEdges,
    });

    // Now let's try the specific query
    const specificQuery = await db
      .select()
      .from(storageEdges)
      .where(
        and(
          eq(storageEdges.memoryId, memoryId),
          eq(storageEdges.memoryType, 'image'),
          eq(storageEdges.artifact, 'metadata'),
          eq(storageEdges.locationMetadata, 'icp'),
          isNull(storageEdges.locationAsset)
        )
      )
      .limit(1);

    fatLogger.info('🔍 Debug: Specific query result', 'be', {
      memoryId,
      found: specificQuery.length > 0,
      result: specificQuery,
    });

    return NextResponse.json({
      success: true,
      memoryId,
      allEdgesCount: allEdges.length,
      allEdges,
      specificQueryCount: specificQuery.length,
      specificQuery,
    });
  } catch (error) {
    fatLogger.error('❌ Debug query failed', 'be', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
