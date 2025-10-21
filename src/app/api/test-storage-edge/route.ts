import { NextRequest, NextResponse } from 'next/server';
import { createStorageEdge } from '@/services/storage-edges';
import { fatLogger } from '@/lib/logger';

export async function POST(_request: NextRequest) {
  try {
    fatLogger.info('🧪 Test storage edge creation', 'be', {
      timestamp: new Date().toISOString(),
    });

    const testData = {
      memoryId: 'e428889a-ebc9-9c6d-e428-000000009c6d',
      memoryType: 'image' as const,
      artifact: 'metadata' as const,
      locationMetadata: 'icp' as const,
      locationAsset: undefined,
      present: true,
      location: 'icp://memory/e428889a-ebc9-9c6d-e428-000000009c6d',
      contentHash: null,
      sizeBytes: null,
      syncState: 'idle' as const,
      syncError: null,
    };

    fatLogger.info('🧪 Test data prepared', 'be', testData);

    const result = await createStorageEdge(testData);

    fatLogger.info('🧪 Test result', 'be', {
      success: result.success,
      hasData: !!result.data,
      error: result.error,
    });

    return NextResponse.json({
      success: true,
      testResult: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    fatLogger.error('❌ Test storage edge failed', 'be', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
