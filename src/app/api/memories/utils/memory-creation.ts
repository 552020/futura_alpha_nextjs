/**
 * MEMORY CREATION UTILITIES
 *
 * This module handles memory creation operations for both JSON and file-based memories.
 * It provides standardized functions for creating memories in the unified schema.
 *
 * USAGE:
 * - Create memories from JSON requests
 * - Create memories from file uploads
 * - Handle memory creation errors gracefully
 * - Standardize response formats
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db/db';
import { allUsers, memories, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import type { NewDBMemory } from '@/db/schema';

/**
 * Helper function to get allUserId for both authenticated and temporary users
 * This centralizes the user lookup logic used across multiple endpoints
 */
export async function getAllUserId(request: NextRequest): Promise<{ allUserId: string; error?: NextResponse }> {
  const session = await auth();

  if (session?.user?.id) {
    // Handle authenticated user
    console.log('👤 Looking up authenticated user in users table...');

    // First get the user from users table
    const [permanentUser] = await db.select().from(users).where(eq(users.id, session.user.id));
    console.log('Found permanent user:', { userId: permanentUser?.id });

    if (!permanentUser) {
      console.error('❌ Permanent user not found');
      return { allUserId: '', error: NextResponse.json({ error: 'User not found' }, { status: 404 }) };
    }

    // Then get their allUserId
    const [allUserRecord] = await db.select().from(allUsers).where(eq(allUsers.userId, permanentUser.id));
    console.log('Found all_users record:', { allUserId: allUserRecord?.id });

    if (!allUserRecord) {
      console.error('❌ No all_users record found for permanent user');
      return { allUserId: '', error: NextResponse.json({ error: 'User record not found' }, { status: 404 }) };
    }

    return { allUserId: allUserRecord.id };
  } else {
    // Handle temporary user - check for provided allUserId in form data
    try {
      const formData = await request.formData();
      const providedAllUserId = formData.get('userId') as string;

      if (providedAllUserId) {
        console.log('👤 Using provided allUserId for temporary user...');
        // For temporary users, directly check the allUsers table
        const [tempUser] = await db.select().from(allUsers).where(eq(allUsers.id, providedAllUserId));
        console.log('Found temporary user:', { allUserId: tempUser?.id, type: tempUser?.type });

        if (!tempUser || tempUser.type !== 'temporary') {
          console.error('❌ Valid temporary user not found');
          return { allUserId: '', error: NextResponse.json({ error: 'Invalid temporary user' }, { status: 404 }) };
        }

        return { allUserId: tempUser.id };
      } else {
        console.error('❌ No valid user identification provided');
        return { allUserId: '', error: NextResponse.json({ error: 'User identification required' }, { status: 401 }) };
      }
    } catch {
      // If form parsing fails, it might be a JSON request - return auth error
      console.error('❌ No valid user identification provided');
      return { allUserId: '', error: NextResponse.json({ error: 'User identification required' }, { status: 401 }) };
    }
  }
}

/**
 * Create a memory from JSON request data
 * Handles validation and database insertion for memory creation without files
 */
export async function createMemoryFromJson(
  body: {
    type?: string;
    title?: string;
    description?: string;
    fileCreatedAt?: string;
    isPublic?: boolean;
    parentFolderId?: string | null;
    tags?: string[];
    recipients?: string[];
    unlockDate?: string | null;
    metadata?: Record<string, unknown>;
    isOnboarding?: boolean;
    mode?: string;
    assets?: unknown[];
  },
  ownerId: string
): Promise<NextResponse> {
  const {
    type,
    title,
    description,
    fileCreatedAt,
    isPublic,
    parentFolderId,
    tags,
    recipients,
    unlockDate,
    metadata,
    isOnboarding,
    mode,
    assets,
  } = body;

  // Validate required fields
  if (!type || !title) {
    return NextResponse.json(
      {
        error: 'Missing required fields: type and title are required',
      },
      { status: 400 }
    );
  }

  // Validate memory type
  if (!['image', 'video', 'document', 'note', 'audio'].includes(type)) {
    return NextResponse.json(
      {
        error: 'Invalid memory type. Must be one of: image, video, document, note, audio',
      },
      { status: 400 }
    );
  }

  // Handle onboarding logic
  let finalOwnerId = ownerId;
  if (isOnboarding || !ownerId) {
    console.log('🎯 Onboarding upload detected - creating temporary user');

    try {
      // Import the temporary user creation function
      const { createTemporaryUserBase } = await import('@/app/api/utils');
      const result = await createTemporaryUserBase('inviter');
      finalOwnerId = result.allUser.id;
      console.log('✅ Temporary user created for onboarding:', { userId: finalOwnerId });
    } catch (error) {
      console.error('❌ Failed to create temporary user for onboarding:', error);
      return NextResponse.json({ error: 'Failed to create temporary user for onboarding' }, { status: 500 });
    }
  }

  // Handle mode logic
  if (mode === 'folder') {
    console.log('📁 Folder upload mode detected');
    // Note: Current folder upload just processes multiple files without creating a folder
    // TODO: In the future, we could create a folder here and set parentFolderId
  }

  // Create memory
  const newMemory: NewDBMemory = {
    ownerId: finalOwnerId, // Use the final owner ID (temporary user if onboarding)
    type: type as 'image' | 'video' | 'document' | 'note' | 'audio',
    title,
    description: description || '',
    fileCreatedAt: fileCreatedAt ? new Date(fileCreatedAt) : new Date(),
    isPublic: isPublic || false,
    ownerSecureCode: randomUUID(),
    parentFolderId: parentFolderId || null,
    tags: tags || [],
    recipients: recipients || [],
    unlockDate: unlockDate ? new Date(unlockDate) : null,
    metadata: metadata || {},
    // Storage status fields - default to web2 storage for new memories
    storageLocations: ['neon-db', 'vercel-blob'] as ('neon-db' | 'vercel-blob' | 'icp-canister' | 'aws-s3')[],
    storageDuration: null, // null means permanent storage
    storageCount: 2, // neon-db + vercel-blob
  };

  const [createdMemory] = await db.insert(memories).values(newMemory).returning();
  console.log('✅ Memory created:', { id: createdMemory.id, ownerId: finalOwnerId });

  // Create assets if provided (from blob-first upload)
  let createdAssets: unknown[] = [];
  if (assets && assets.length > 0) {
    console.log(`📦 Creating ${assets.length} assets for memory ${createdMemory.id}`);

    const { memoryAssets } = await import('@/db/schema');
    const assetData = assets.map((asset: unknown) => {
      const a = asset as Record<string, unknown>;
      return {
        memoryId: createdMemory.id,
        assetType:
          (a.assetType as 'original' | 'display' | 'thumb' | 'placeholder' | 'poster' | 'waveform') || 'original',
        variant: (a.variant as string) || null,
        url: (a.url as string) || '',
        storageBackend:
          (a.storageBackend as 'neon' | 'icp' | 's3' | 'vercel_blob' | 'arweave' | 'ipfs') || 'vercel_blob',
        storageKey: (a.storageKey as string) || (a.url as string)?.split('/').pop() || '',
        bytes: (a.bytes as number) || 0,
        width: (a.width as number) || null,
        height: (a.height as number) || null,
        mimeType: (a.mimeType as string) || 'application/octet-stream',
        sha256: (a.sha256 as string) || null,
        processingStatus: (a.processingStatus as 'failed' | 'pending' | 'processing' | 'completed') || 'completed',
        processingError: (a.processingError as string) || null,
      };
    });

    createdAssets = await db.insert(memoryAssets).values(assetData).returning();
    console.log(`✅ Created ${createdAssets.length} assets`);
  }

  return NextResponse.json({
    success: true,
    data: {
      id: createdMemory.id,
      type: createdMemory.type,
      title: createdMemory.title,
      description: createdMemory.description,
      fileCreatedAt: createdMemory.fileCreatedAt,
      isPublic: createdMemory.isPublic,
      parentFolderId: createdMemory.parentFolderId,
      tags: createdMemory.tags,
      recipients: createdMemory.recipients,
      unlockDate: createdMemory.unlockDate,
      metadata: createdMemory.metadata,
      createdAt: createdMemory.createdAt,
      assets: createdAssets, // Include created assets
    },
  });
}

/**
 * Standardize upload response format
 * Creates consistent response structure for file uploads
 */
export function createUploadResponse(
  successfulUploads: Array<{
    success: true;
    fileName: string;
    url?: string;
    memory: unknown;
  }>,
  failedUploads: Array<{
    success: false;
    fileName: string;
    error: unknown;
  }>,
  totalFiles: number,
  duration: number
): NextResponse {
  return NextResponse.json({
    success: true,
    data: successfulUploads.map(upload => upload.memory),
    summary: {
      totalFiles,
      successfulUploads: successfulUploads.length,
      failedUploads: failedUploads.length,
      duration: `${duration}ms`,
    },
    errors: failedUploads.length > 0 ? failedUploads : undefined,
  });
}

/**
 * Create a memory from blob upload data
 * This function is called from the grant route's onUploadCompleted callback
 * to persist memory records after successful blob uploads
 */
export async function createMemoryFromBlob(
  blob: {
    url: string;
    pathname: string;
    size: number;
    contentType: string;
    storageBackend?: 'vercel_blob' | 's3';
    storageKey?: string;
  },
  meta: {
    allUserId: string;
    isOnboarding?: boolean;
    mode?: string;
  }
): Promise<{ success: boolean; memoryId?: string; error?: string }> {
  try {
    console.log('📦 Creating memory from blob:', { url: blob.url, size: blob.size, contentType: blob.contentType });

    // Determine memory type from content type
    const memoryType = blob.contentType.startsWith('image/')
      ? 'image'
      : blob.contentType.startsWith('video/')
        ? 'video'
        : blob.contentType.startsWith('audio/')
          ? 'audio'
          : 'document';

    // Extract title from pathname
    const title = blob.pathname.split('/').pop()?.split('.')[0] || 'Untitled';

    // Handle onboarding logic
    const finalOwnerId = meta.allUserId;
    if (meta.isOnboarding) {
      console.log('🎯 Onboarding upload detected - using provided allUserId');
      // For onboarding, we trust the provided allUserId (should be from temporary user creation)
    }

    // Create memory record
    const newMemory: NewDBMemory = {
      ownerId: finalOwnerId,
      type: memoryType as 'image' | 'video' | 'document' | 'note' | 'audio',
      title,
      description: '',
      fileCreatedAt: new Date(),
      isPublic: false,
      ownerSecureCode: randomUUID(),
      parentFolderId: null,
      tags: [],
      recipients: [],
      unlockDate: null,
      metadata: {},
    };

    const [createdMemory] = await db.insert(memories).values(newMemory).returning();
    console.log('✅ Memory created from blob:', { id: createdMemory.id, ownerId: finalOwnerId });

    // Create asset record
    const { memoryAssets } = await import('@/db/schema');
    const storageBackend = blob.storageBackend || 'vercel_blob';
    const storageKey = blob.storageKey || blob.pathname;
    
    const assetData = {
      memoryId: createdMemory.id,
      assetType: 'original' as const,
      variant: null,
      url: blob.url,
      storageBackend,
      storageKey,
      bytes: blob.size,
      width: null,
      height: null,
      mimeType: blob.contentType,
      sha256: null,
      processingStatus: 'completed' as const,
      processingError: null,
    };
    
    console.log('📦 Creating asset with storage:', { storageBackend, storageKey });

    const [createdAsset] = await db.insert(memoryAssets).values(assetData).returning();
    console.log('✅ Asset created from blob:', { id: createdAsset.id, url: blob.url });

    return {
      success: true,
      memoryId: createdMemory.id,
    };
  } catch (error) {
    console.error('❌ Failed to create memory from blob:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
