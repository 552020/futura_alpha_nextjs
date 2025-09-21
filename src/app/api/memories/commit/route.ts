import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { Session } from 'next-auth';
import { db } from '@/db/db';
import { and, eq, isNull } from 'drizzle-orm';
import { memories, memoryAssets } from '@/db/schema';
import { v4 as uuidv4 } from 'uuid';

type CommitRequest = {
  memoryId: string;
  assets: Array<{
    key: string;
    name: string;
    type: string;
    size: number;
  }>;
};

export async function POST(request: Request) {
  const requestId = Math.random().toString(36).substring(2, 8);
  const startTime = Date.now();
  console.log(`[${requestId}] [${new Date().toISOString()}] Received commit request for ${request.url}`);

  try {
    const session = await auth() as Session | null;
    if (!session?.user?.id) {
      console.warn(`[${requestId}] Unauthorized access attempt`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await request.json();
    const { memoryId, assets }: CommitRequest = body;

    console.log(`[${requestId}] Processing commit request for user ${userId}, memory ${memoryId}, ${assets?.length || 0} assets`);

    if (!memoryId || !assets || !Array.isArray(assets) || assets.length === 0) {
      console.error(`[${requestId}] Invalid commit request - memoryId: ${memoryId}, hasAssets: ${!!assets}, assetCount: ${assets?.length || 0}`);
      return NextResponse.json(
        { 
          error: 'Memory ID and assets are required',
          requestId 
        }, 
        { status: 400 }
      );
    }

    // Verify the memory exists, belongs to the user, and is not deleted
    const memory = await db.query.memories.findFirst({
      where: and(
        eq(memories.id, memoryId),
        eq(memories.ownerId, userId),
        isNull(memories.deletedAt) // Only include non-deleted memories
      ),
    });

    if (!memory) {
      console.error(`[${requestId}] Memory not found or access denied - memoryId: ${memoryId}, userId: ${userId}`);
      return NextResponse.json({ 
        error: 'Memory not found',
        requestId 
      }, { status: 404 });
    }

    console.log(`[${requestId}] Starting database transaction for memory ${memoryId} with ${assets.length} assets`);

    // Create memory assets in the database
    const createdAssets = await db.transaction(async (tx) => {
      // Update memory status to 'active'
      console.log(`[${requestId}] Updating memory ${memoryId} status to 'active'`);
      
      // Update the memory to mark it as active by setting deletedAt to null
      await tx
        .update(memories)
        .set({ 
          deletedAt: null, // Mark as not deleted
          updatedAt: new Date()
        })
        .where(eq(memories.id, memoryId));

      // Create memory assets
      const created = [];
      console.log(`[${requestId}] Creating ${assets.length} memory assets`);
      
      for (const [index, asset] of assets.entries()) {
        const assetStartTime = Date.now();
        try {
          const assetUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${asset.key}`;
          
          console.log(`[${requestId}] Creating asset ${index + 1}/${assets.length}: ${asset.name} (${asset.type}, ${asset.size} bytes)`);
          
          const memoryAsset = await tx.insert(memoryAssets).values({
            id: uuidv4(),
            memoryId,
            assetType: 'original',
            url: assetUrl,
            storageBackend: 's3',
            bucket: process.env.AWS_S3_BUCKET, // Add the bucket field
            storageKey: asset.key,
            bytes: asset.size,
            mimeType: asset.type,
            processingStatus: 'completed', // Mark as completed since we're committing after upload
            createdAt: new Date(),
            updatedAt: new Date(),
          }).returning();
          
          created.push(memoryAsset[0]);
          
          console.log(`[${requestId}] Created asset ${index + 1}/${assets.length} in ${Date.now() - assetStartTime}ms: ${memoryAsset[0]?.id}`);
        } catch (error) {
          console.error(`[${requestId}] Error creating asset ${index + 1}/${assets.length} (${asset.key}):`, error);
          throw error; // This will trigger transaction rollback
        }
      }
      
      return created;
    });

    console.log(`[${requestId}] Successfully committed ${createdAssets.length} assets to memory ${memoryId} in ${Date.now() - startTime}ms`);

    return NextResponse.json({ 
      success: true,
      status: 'active', 
      memoryId,
      assetCount: createdAssets.length,
      requestId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`[${requestId}] Error in commit endpoint:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        error: 'Failed to commit memory',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        requestId
      },
      { status: 500 }
    );
  }
}
