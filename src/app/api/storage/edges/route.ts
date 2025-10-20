import { NextRequest, NextResponse } from 'next/server';
import { createStorageEdge, getStorageEdges } from '@/services/storage-edges';
import { fatLogger } from '@/lib/logger';
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      memoryId,
      memoryType,
      artifact,
      locationMetadata,
      locationAsset,
      present,
      location,
      contentHash,
      sizeBytes,
      syncState,
      syncError,
    } = body;

    fatLogger.info('📥 Storage edge API request received', 'be', {
      memoryId,
      memoryType,
      artifact,
      locationMetadata,
      locationAsset,
      present,
      location,
      contentHash,
      sizeBytes,
      syncState,
      syncError,
    });

    // Validate required fields
    if (!memoryId || !memoryType || !artifact) {
      return NextResponse.json({ error: 'Missing required fields: memoryId, memoryType, artifact' }, { status: 400 });
    }

    // Validate that at least one location field is provided
    if (!locationMetadata && !locationAsset) {
      return NextResponse.json(
        { error: 'At least one location field must be provided: locationMetadata or locationAsset' },
        { status: 400 }
      );
    }

    // Validate enum values
    const validMemoryTypes = ['image', 'video', 'note', 'document', 'audio'];
    const validArtifacts = ['metadata', 'asset'];
    const validDatabaseHosting = ['neon', 'icp'];
    const validBlobHosting = ['s3', 'vercel_blob', 'icp', 'arweave', 'ipfs', 'neon'];
    const validSyncStates = ['idle', 'migrating', 'failed'];

    if (!validMemoryTypes.includes(memoryType)) {
      return NextResponse.json(
        { error: `Invalid memoryType. Must be one of: ${validMemoryTypes.join(', ')}` },
        { status: 400 }
      );
    }

    if (!validArtifacts.includes(artifact)) {
      return NextResponse.json(
        { error: `Invalid artifact. Must be one of: ${validArtifacts.join(', ')}` },
        { status: 400 }
      );
    }

    if (locationMetadata && !validDatabaseHosting.includes(locationMetadata)) {
      return NextResponse.json(
        { error: `Invalid locationMetadata. Must be one of: ${validDatabaseHosting.join(', ')}` },
        { status: 400 }
      );
    }

    if (locationAsset && !validBlobHosting.includes(locationAsset)) {
      return NextResponse.json(
        { error: `Invalid locationAsset. Must be one of: ${validBlobHosting.join(', ')}` },
        { status: 400 }
      );
    }

    if (syncState && !validSyncStates.includes(syncState)) {
      return NextResponse.json(
        { error: `Invalid syncState. Must be one of: ${validSyncStates.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate UUID format for memoryId (accepts both UUID v4 and custom UUID v7)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(memoryId)) {
      return NextResponse.json({ error: 'Invalid memoryId format. Must be a valid UUID' }, { status: 400 });
    }

    // Use the service layer to create storage edge
    fatLogger.info('🔄 Calling createStorageEdge service', 'be', {
      memoryId,
      memoryType,
      artifact,
    });

    const result = await createStorageEdge({
      memoryId,
      memoryType: memoryType as 'image' | 'video' | 'note' | 'document' | 'audio',
      artifact: artifact as 'metadata' | 'asset',
      locationMetadata: locationMetadata as 'neon' | 'icp' | undefined,
      locationAsset: locationAsset as 's3' | 'vercel_blob' | 'icp' | 'arweave' | 'ipfs' | 'neon' | undefined,
      present: present ?? false,
      location,
      contentHash,
      sizeBytes: sizeBytes ? Number(sizeBytes) : undefined,
      syncState: (syncState as 'idle' | 'migrating' | 'failed') ?? 'idle',
      syncError,
    });

    fatLogger.info('📤 Storage edge service result', 'be', {
      memoryId,
      success: result.success,
      hasData: !!result.data,
      error: result.error,
    });

    if (!result.success) {
      fatLogger.error('❌ Storage edge creation failed', 'be', {
        memoryId,
        error: result.error,
      });
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    fatLogger.info('✅ Storage edge created successfully', 'be', {
      memoryId,
      edgeId: result.data?.id,
    });

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    fatLogger.error('❌ Storage edge API error', 'be', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      operation: 'storage_edge_api_put',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memoryId = searchParams.get('memoryId');
    const memoryType = searchParams.get('memoryType');
    const locationMetadata = searchParams.get('locationMetadata');
    const locationAsset = searchParams.get('locationAsset');
    const artifact = searchParams.get('artifact');
    const syncState = searchParams.get('syncState');

    // Validate enum values if provided
    const validMemoryTypes = ['image', 'video', 'note', 'document', 'audio'];
    const validArtifacts = ['metadata', 'asset'];
    const validDatabaseHosting = ['neon', 'icp'];
    const validBlobHosting = ['s3', 'vercel_blob', 'icp', 'arweave', 'ipfs', 'neon'];
    const validSyncStates = ['idle', 'migrating', 'failed'];

    if (memoryType && !validMemoryTypes.includes(memoryType)) {
      return NextResponse.json(
        { error: `Invalid memoryType. Must be one of: ${validMemoryTypes.join(', ')}` },
        { status: 400 }
      );
    }

    if (artifact && !validArtifacts.includes(artifact)) {
      return NextResponse.json(
        { error: `Invalid artifact. Must be one of: ${validArtifacts.join(', ')}` },
        { status: 400 }
      );
    }

    if (locationMetadata && !validDatabaseHosting.includes(locationMetadata)) {
      return NextResponse.json(
        { error: `Invalid locationMetadata. Must be one of: ${validDatabaseHosting.join(', ')}` },
        { status: 400 }
      );
    }

    if (locationAsset && !validBlobHosting.includes(locationAsset)) {
      return NextResponse.json(
        { error: `Invalid locationAsset. Must be one of: ${validBlobHosting.join(', ')}` },
        { status: 400 }
      );
    }

    if (syncState && !validSyncStates.includes(syncState)) {
      return NextResponse.json(
        { error: `Invalid syncState. Must be one of: ${validSyncStates.join(', ')}` },
        { status: 400 }
      );
    }

    // Use the service layer to get storage edges
    const result = await getStorageEdges({
      memoryId: memoryId || undefined,
      memoryType: memoryType as 'image' | 'video' | 'note' | 'document' | 'audio' | undefined,
      artifact: artifact as 'metadata' | 'asset' | undefined,
      locationMetadata: locationMetadata as 'neon' | 'icp' | undefined,
      locationAsset: locationAsset as 's3' | 'vercel_blob' | 'icp' | 'arweave' | 'ipfs' | 'neon' | undefined,
      syncState: syncState as 'idle' | 'migrating' | 'failed' | undefined,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    fatLogger.error('Error querying storage edges:', 'be', { data: error instanceof Error ? error : undefined });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
