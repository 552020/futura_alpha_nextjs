import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { memories } from '@/db/tables';
import { eq } from 'drizzle-orm';
import { fatLogger } from '@/lib/logger';

export async function GET(_request: NextRequest) {
  try {
    const memoryId = 'e428889a-ebc9-9c6d-e428-000000009c6d';

    fatLogger.info('🔍 Debug: Checking if memory exists', 'be', {
      memoryId,
    });

    // Check if the memory exists
    const memory = await db
      .select()
      .from(memories)
      .where(eq(memories.id, memoryId))
      .limit(1);

    fatLogger.info('🔍 Debug: Memory query result', 'be', {
      memoryId,
      found: memory.length > 0,
      memory: memory.length > 0 ? memory[0] : null,
    });

    return NextResponse.json({
      success: true,
      memoryId,
      memoryExists: memory.length > 0,
      memory: memory.length > 0 ? memory[0] : null,
    });
  } catch (error) {
    fatLogger.error('❌ Debug memory query failed', 'be', {
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
