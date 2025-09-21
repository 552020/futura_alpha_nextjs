import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { memories, allUsers } from '@/db/schema';
import { v4 as uuidv4 } from 'uuid';

type LegacyFileUploadResponse = {
  success: boolean;
  memoryId: string;
  status: string;
  message?: string;
  files?: Array<{
    name: string;
    size: number;
    type: string;
    status: string;
  }>;
};

export async function handleLegacyFileUpload(
  request: NextRequest,
  userId: string
): Promise<NextResponse<LegacyFileUploadResponse>> {
  const requestId = Math.random().toString(36).substring(2, 8);
  console.log(`[${requestId}] [${new Date().toISOString()}] Processing legacy file upload for user ${userId}`);
  
  try {
    const formData = await request.formData();
    const files = formData.getAll('file') as File[];

    console.log(`📄 Processing legacy file upload with ${files.length} files`);

    // First, ensure the user exists in the all_user table
    // Check if user exists in all_user table using the correct field (id)
    const userExists = await db.query.allUsers.findFirst({
      where: (allUsers, { eq }) => eq(allUsers.id, userId)
    });

    // If user doesn't exist in all_user table, create an entry
    if (!userExists) {
      console.log(`[${requestId}] Creating entry in all_user table for user: ${userId}`);
      try {
        await db.insert(allUsers).values({
          id: userId,  // Use the same ID as the user ID
          type: 'user',
          userId: userId,
          createdAt: new Date(),
        });
        console.log(`[${requestId}] Successfully created user in all_user table`);
      } catch (error) {
        // Handle race condition where another request might have created the user
        if (!(error instanceof Error) || !error.message.includes('duplicate key value')) {
          console.error(`[${requestId}] Error creating user in all_user table:`, error);
          throw error; // Re-throw if it's not a duplicate key error
        }
        console.log(`[${requestId}] User already exists in all_user table (race condition handled)`);
      }
    } else {
      console.log(`[${requestId}] User already exists in all_user table`);
    }

    // Prepare memory data
    const memoryData = {
      ownerId: userId,
      type: 'document' as const, // Must be one of: 'image', 'video', 'note', 'document', 'audio'
      title: files.length > 1 
        ? `Uploaded ${files.length} files` 
        : files[0]?.name || 'Untitled Memory',
      description: '',
      isPublic: false,
      ownerSecureCode: uuidv4(), // Generate a secure code for the owner
      metadata: {
        custom: {
          uploadMethod: 'legacy',
          fileCount: files.length,
        },
        originalPath: files[0]?.name || 'legacy-upload',
      },
      // Initialize with empty arrays for required array fields
      tags: [],
      recipients: [],
      storageLocations: [],
      // Set file creation time to now
      fileCreatedAt: new Date(),
      // Let the database handle default timestamps
    };

    console.log('Creating legacy memory with data:', JSON.stringify(memoryData, null, 2));

    // Create memory in database
    const memory = await db.insert(memories)
      .values(memoryData)
      .returning()
      .then(res => res[0]);

    // Process files (in a real implementation, you'd upload them to S3 here)
    const processedFiles = files.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'pending_legacy_upload'
    }));

    return NextResponse.json({
      success: true,
      memoryId: memory.id,
      status: 'pending',
      message: 'Legacy upload in progress',
      files: processedFiles,
    });
  } catch (error) {
    console.error('Error in legacy file upload:', error);
    return NextResponse.json(
      { 
        success: false,
        memoryId: '',
        status: 'error',
        message: 'Failed to process legacy file upload',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
