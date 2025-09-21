import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { Session } from 'next-auth';
import { db } from '@/db/db';
import { and, eq, isNull } from 'drizzle-orm';
import { memories } from '@/db/schema';
import { generatePresignedUploadUrl } from '@/lib/s3-service';

type PresignRequest = {
  memoryId: string;
  files: Array<{
    name: string;
    type: string;
    size: number;
  }>;
};

export async function POST(request: Request) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 8);
  console.log(`[${requestId}] [${new Date().toISOString()}] Received presign request for ${request.url}`);

  try {
    const session = await auth() as Session | null;
    if (!session?.user?.id) {
      console.warn(`[${requestId}] Unauthorized access attempt`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await request.json();
    const { memoryId, files }: PresignRequest = body;

    console.log(`[${requestId}] Processing presign request for user ${userId}, memory ${memoryId}, ${files?.length || 0} files`);

    if (!memoryId || !files || !Array.isArray(files) || files.length === 0) {
      console.error(`[${requestId}] Invalid request - memoryId: ${memoryId}, files: ${files?.length}`);
      return NextResponse.json(
        { error: 'Memory ID and files are required' }, 
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
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }

    console.log(`[${requestId}] Generating presigned URLs for ${files.length} files`);
    
    // Generate presigned URLs for each file
    const uploads = await Promise.all(
      files.map(async (file) => {
        // Track time for performance monitoring
        const startFileTime = Date.now();
        try {
          const key = `uploads/${userId}/memories/${memoryId}/${file.name}`;
          console.log(`[${requestId}] Generating URL for file: ${file.name} (${file.type}, ${file.size} bytes)`);
          
          const url = await generatePresignedUploadUrl(key, file.type);
          console.log(`[${requestId}] Generated presigned URL for ${file.name} in ${Date.now() - startFileTime}ms`);
          
          return {
            key,
            url,
            name: file.name,
            type: file.type,
            size: file.size,
          };
        } catch (error) {
          console.error(`[${requestId}] Error generating presigned URL for ${file.name}:`, error);
          throw error;
        }
      })
    );

    console.log(`[${requestId}] Successfully generated ${uploads.length} presigned URLs in ${Date.now() - startTime}ms`);

    return NextResponse.json({ 
      success: true,
      batch: uploads,
      requestId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`[${requestId}] Error in presign endpoint:`, error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate presigned URLs',
        details: process.env.NODE_ENV === 'development' ? (error as Error)?.message : undefined,
        requestId
      },
      { status: 500 }
    );
  }
}
