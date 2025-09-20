import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { syncStatus, getSyncStatusByState, getStuckSyncs, getSyncStatusByBackend } from '@/db/schema';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const syncState = searchParams.get('syncState');
    const backend = searchParams.get('backend');
    const memoryType = searchParams.get('memoryType');
    const stuck = searchParams.get('stuck');

    let result;

    // Handle different query types
    if (stuck === 'true') {
      // Get stuck syncs (migrating for more than 30 minutes)
      result = await db.execute(getStuckSyncs());
    } else if (syncState) {
      // Get syncs by state (migrating, failed)
      const validStates = ['migrating', 'failed'];
      if (!validStates.includes(syncState)) {
        return NextResponse.json(
          { error: `Invalid syncState. Must be one of: ${validStates.join(', ')}` },
          { status: 400 }
        );
      }
      result = await db.execute(getSyncStatusByState(syncState as 'migrating' | 'failed'));
    } else if (backend) {
      // Get syncs by backend
      const validBackends = ['neon-db', 'vercel-blob', 'icp-canister'];
      if (!validBackends.includes(backend)) {
        return NextResponse.json(
          { error: `Invalid backend. Must be one of: ${validBackends.join(', ')}` },
          { status: 400 }
        );
      }
      result = await db.execute(getSyncStatusByBackend(backend as 'neon-db' | 'vercel-blob' | 'icp-canister'));
    } else {
      // Get all active syncs (migrating + failed)
      result = await db.execute(syncStatus);
    }

    // Convert result to array and handle raw database result format
    let resultArray: unknown[] = [];
    if (Array.isArray(result)) {
      resultArray = result;
    } else if (result && typeof result === 'object' && 'rows' in result) {
      resultArray = (result as { rows: unknown[] }).rows || [];
    } else if (result) {
      resultArray = [result];
    }

    // Apply memory type filter if provided
    if (memoryType && resultArray.length > 0) {
      const validMemoryTypes = ['image', 'video', 'note', 'document', 'audio'];
      if (!validMemoryTypes.includes(memoryType)) {
        return NextResponse.json(
          { error: `Invalid memoryType. Must be one of: ${validMemoryTypes.join(', ')}` },
          { status: 400 }
        );
      }
      resultArray = resultArray.filter(item => (item as Record<string, unknown>).memory_type === memoryType);
    }

    // Calculate summary statistics
    const summary = {
      total: resultArray.length,
      migrating: resultArray.filter(item => (item as Record<string, unknown>).sync_state === 'migrating').length,
      failed: resultArray.filter(item => (item as Record<string, unknown>).sync_state === 'failed').length,
      stuck: resultArray.filter(item => (item as Record<string, unknown>).is_stuck).length,
      byBackend: {
        'neon-db': resultArray.filter(item => (item as Record<string, unknown>).backend === 'neon-db').length,
        'vercel-blob': resultArray.filter(item => (item as Record<string, unknown>).backend === 'vercel-blob').length,
        'icp-canister': resultArray.filter(item => (item as Record<string, unknown>).backend === 'icp-canister').length,
      },
      byMemoryType: {
        image: resultArray.filter(item => (item as Record<string, unknown>).memory_type === 'image').length,
        video: resultArray.filter(item => (item as Record<string, unknown>).memory_type === 'video').length,
        note: resultArray.filter(item => (item as Record<string, unknown>).memory_type === 'note').length,
        document: resultArray.filter(item => (item as Record<string, unknown>).memory_type === 'document').length,
        audio: resultArray.filter(item => (item as Record<string, unknown>).memory_type === 'audio').length,
      },
    };

    return NextResponse.json({
      success: true,
      data: resultArray,
      summary,
      query: {
        syncState,
        backend,
        memoryType,
        stuck,
      },
    });
  } catch (error) {
    console.error('Error querying sync status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
