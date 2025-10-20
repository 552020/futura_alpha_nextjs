# DELETE /api/memories - Branch 397 vs Branch 405 Comparison

**Purpose**: This document compares the memory deletion functionality between two branches to identify improvements and architectural issues. The delete for the single memory functioinality should not be here!

## Overview

This document compares the `delete.ts` file between:

- **Branch 405**: `slombard/icp-405-implement-direct-to-blob-upload-flow` (base)
- **Branch 397**: `lmangallon/icp-397-add-s3-as-a-blob-storage-option` (latest)

## File Size Comparison

**Branch 405**: 196 lines - Basic deletion functionality  
**Branch 397**: 280 lines - **+84 lines** with advanced S3 storage integration

## What Branch 397 Added to Branch 405

### 1. **Single Memory Deletion (NEW in Branch 397)**

**Branch 405**: ❌ **Missing** - Only bulk deletion  
**Branch 397**: ✅ **Added** - Single memory deletion with `?id=` parameter

```typescript
// NEW: Single memory deletion
if (memoryId) {
  console.log(`🗑️ Deleting single memory: ${memoryId}`);

  // 1. FIRST: Get the memory data BEFORE deletion
  const memoryData = await db.query.memories.findFirst({
    where: and(eq(memories.id, memoryId), eq(memories.ownerId, allUserRecord.id)),
    with: {
      assets: true,
      folder: true,
    },
  });

  if (!memoryData) {
    return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
  }

  // 2. THEN: Delete the memory from database
  const [deletedMemoryRow] = await db
    .delete(memories)
    .where(and(eq(memories.id, memoryId), eq(memories.ownerId, allUserRecord.id)))
    .returning();

  // 3. FINALLY: Clean up storage edges with pre-fetched data
  const cleanupResult = await cleanupStorageEdgesForMemory({
    memoryId,
    memoryType: memoryData.type,
    memoryData,
  });

  return NextResponse.json({
    success: true,
    message: 'Memory deleted successfully',
    memoryId,
  });
}
```

### 2. **Advanced Storage Integration (NEW in Branch 397)**

**Branch 405**: ❌ **Missing** - Basic storage cleanup  
**Branch 397**: ✅ **Added** - Advanced S3 storage metadata handling

```typescript
// NEW: Advanced memory data interface for S3 integration
interface MemoryForDeletion {
  id: string;
  type: 'image' | 'video' | 'note' | 'document' | 'audio';
  metadata?: {
    custom?: {
      storageBackend?: string;
      storageKey?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  } | null;
  custom?: {
    storageBackend?: string;
    storageKey?: string;
    [key: string]: unknown;
  };
  storageBackend?: string;
  storageKey?: string;
  storageLocations?: string[] | null;
  [key: string]: unknown; // Index signature to allow additional properties
}
```

### 3. **Enhanced Cleanup Logic (NEW in Branch 397)**

**Branch 405**: ❌ **Missing** - Direct deletion without pre-fetching  
**Branch 397**: ✅ **Added** - Pre-fetch memory data before deletion

```typescript
// NEW: Pre-fetch memory data before deletion for proper cleanup
const memoriesToDelete = await db.query.memories.findMany({
  where: eq(memories.ownerId, allUserRecord.id),
  with: {
    assets: true,
    folder: true,
  },
});

if (memoriesToDelete.length > 0) {
  await cleanupStorageEdgesForMemories(memoriesToDelete);
}

// THEN delete from database
const deletedMemoriesResult = await db.delete(memories).where(eq(memories.ownerId, allUserRecord.id)).returning();
```

### 4. **Enhanced Cleanup Function (NEW in Branch 397)**

**Branch 405**: ❌ **Missing** - Basic cleanup  
**Branch 397**: ✅ **Added** - Advanced cleanup with detailed logging

```typescript
// NEW: Enhanced cleanup function with detailed logging
async function cleanupStorageEdgesForMemories(memoriesToDelete: MemoryForDeletion[]) {
  console.log(`🧹 Starting cleanup for ${memoriesToDelete.length} memories`);

  const cleanupPromises = memoriesToDelete.map(memoryData => {
    if (!memoryData) {
      console.warn('⚠️ Received undefined memory data in cleanup');
      return Promise.resolve({ success: false });
    }

    console.log(`🧹 Cleaning up memory: ${memoryData.id} (${memoryData.type})`);

    return cleanupStorageEdgesForMemory({
      memoryId: memoryData.id,
      memoryType: memoryData.type,
      memoryData, // Pass full memory data for advanced cleanup
    });
  });

  const results = await Promise.allSettled(cleanupPromises);

  let successCount = 0;
  let errorCount = 0;

  results.forEach((result, index) => {
    const memory = memoriesToDelete[index];
    if (result.status === 'fulfilled' && result.value.success) {
      successCount++;
      console.log(`✅ Successfully cleaned up memory: ${memory?.id || 'unknown'}`);
    } else {
      errorCount++;
      console.error(
        `❌ Failed to clean up memory ${memory?.id || 'unknown'}:`,
        result.status === 'rejected' ? result.reason : result.value
      );
    }
  });

  console.log(`🧹 Cleanup complete. Success: ${successCount}, Errors: ${errorCount}`);
  return { successCount, errorCount };
}
```

### 5. **Enhanced Import (NEW in Branch 397)**

**Branch 405**: ❌ **Missing** - Basic import  
**Branch 397**: ✅ **Added** - Direct import from utils

```typescript
// Branch 405: Dynamic import
const { cleanupStorageEdgesForMemory } = await import('./utils');

// Branch 397: Direct import (NEW)
import { cleanupStorageEdgesForMemory } from './utils/memory-database';
```

## Feature Comparison Table

| Feature                    | Branch 405 | Branch 397 | Status        |
| -------------------------- | ---------- | ---------- | ------------- |
| **File Size**              | 196 lines  | 280 lines  | **+84 lines** |
| **Bulk Delete All**        | ✅ Yes     | ✅ Yes     | **Enhanced**  |
| **Delete by Type**         | ✅ Yes     | ✅ Yes     | **Enhanced**  |
| **Delete by Folder**       | ✅ Yes     | ✅ Yes     | **Enhanced**  |
| **Single Memory Delete**   | ❌ No      | ✅ **NEW** | **Added**     |
| **S3 Storage Integration** | ❌ No      | ✅ **NEW** | **Added**     |
| **Pre-fetch Memory Data**  | ❌ No      | ✅ **NEW** | **Added**     |
| **Advanced Cleanup Logic** | ❌ No      | ✅ **NEW** | **Added**     |
| **Detailed Logging**       | ❌ No      | ✅ **NEW** | **Added**     |
| **Memory Data Interface**  | ❌ No      | ✅ **NEW** | **Added**     |

## Usage Examples

### Single Memory Deletion (NEW in Branch 397)

```bash
# Delete a single memory by ID
curl -X DELETE "/api/memories?id=memory-123" \
  -H "Authorization: Bearer <token>"
```

**Response:**

```json
{
  "success": true,
  "message": "Memory deleted successfully",
  "memoryId": "memory-123"
}
```

### Enhanced Bulk Deletion (Enhanced in Branch 397)

```bash
# Delete all user data with enhanced S3 cleanup
curl -X DELETE "/api/memories?all=true" \
  -H "Authorization: Bearer <token>"
```

**Response:**

```json
{
  "success": true,
  "message": "Successfully deleted 42 memories, all folders, and all galleries",
  "deletedCount": 42,
  "all": "true"
}
```

## Key Improvements in Branch 397

### 1. **S3 Storage Integration**

- Advanced metadata handling for S3 storage backends
- Support for multiple storage locations
- Enhanced cleanup for S3-specific storage keys

### 2. **Better Error Handling**

- Pre-fetch memory data before deletion
- Detailed logging for debugging
- Graceful handling of undefined memory data

### 3. **Single Memory Operations**

- Support for deleting individual memories
- Proper cleanup for single memory deletion
- Consistent response format

### 4. **Enhanced Logging**

- Comprehensive console logging with emojis
- Success/failure tracking for cleanup operations
- Detailed error reporting

## Summary

**Branch 397** significantly enhanced the deletion functionality by adding:

1. **Single memory deletion** capability
2. **Advanced S3 storage integration** with metadata handling
3. **Pre-fetching memory data** before deletion for proper cleanup
4. **Enhanced logging and error handling**
5. **Sophisticated cleanup logic** for storage edges

The file grew from 196 lines to 280 lines (+84 lines) with these advanced features, making it a much more robust and feature-complete deletion handler.

## Architectural Issue: Duplication Problem

### Current Problem

**Branch 397** has **duplication** - both endpoints can delete single memories:

1. **`DELETE /api/memories?id=memory-123`** (in delete.ts) ❌
2. **`DELETE /api/memories/[id]`** (in [id]/route.ts) ✅

This violates REST standards where one resource should have one endpoint.

### Recommended Solution

**Distribute S3 deletion logic properly:**

#### Single Memory S3 Deletion

**`DELETE /api/memories/[id]`** should have:

```typescript
// Pre-fetch memory data for S3 cleanup
const memoryData = await db.query.memories.findFirst({
  where: and(eq(memories.id, memoryId), eq(memories.ownerId, allUserRecord.id)),
  with: { assets: true, folder: true },
});

// S3-specific cleanup with full memory data
await cleanupStorageEdgesForMemory({
  memoryId,
  memoryType: memoryData.type,
  memoryData, // ← S3 storage keys, backends, etc.
});
```

#### Bulk Memory S3 Deletion

**`DELETE /api/memories`** should have:

```typescript
// Pre-fetch all memories for S3 cleanup
const memoriesToDelete = await db.query.memories.findMany({
  where: eq(memories.ownerId, allUserRecord.id),
  with: { assets: true, folder: true },
});

// S3 cleanup for all memories
await cleanupStorageEdgesForMemories(memoriesToDelete);
```

### Implementation Plan

1. **Remove** single memory deletion from `delete.ts` (the `?id=` parameter)
2. **Add** S3 deletion logic to `DELETE /api/memories/[id]`
3. **Keep** S3 deletion logic in `DELETE /api/memories` for bulk operations

### Result

- ✅ **Single memory**: `DELETE /api/memories/[id]` (REST standard + S3 cleanup)
- ✅ **Bulk operations**: `DELETE /api/memories?all=true` (S3 cleanup)
- ❌ **No duplication**: Remove `?id=` from bulk endpoint

**This maintains clean REST architecture while preserving the S3 deletion functionality!**

## Code Changes Required

### 1. **Remove from `delete.ts` (Bulk Endpoint)**

The following code should be **REMOVED** from `delete.ts`:

```typescript
// ❌ REMOVE: Single memory deletion parameter
const memoryId = searchParams.get('id');

// ❌ REMOVE: Entire single memory deletion block
if (memoryId) {
  // ... entire single memory deletion logic
}
```

### 2. **Add to `DELETE /api/memories/[id]` (Single Memory Endpoint)**

The following code should be **ADDED** to `src/nextjs/src/app/api/memories/[id]/route.ts`:

```typescript
// ✅ ADD: Import the S3 cleanup function
import { cleanupStorageEdgesForMemory } from '../utils/memory-database';

// ✅ ADD: Enhanced DELETE handler with S3 cleanup
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const memoryId = params.id;

  // Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get the allUserId for the authenticated user
    const allUserRecord = await db.query.allUsers.findFirst({
      where: eq(allUsers.userId, session.user.id),
    });

    if (!allUserRecord) {
      return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    }

    // ✅ ADD: Pre-fetch memory data for S3 cleanup
    const memoryData = await db.query.memories.findFirst({
      where: and(eq(memories.id, memoryId), eq(memories.ownerId, allUserRecord.id)),
      with: {
        assets: true,
        folder: true,
      },
    });

    if (!memoryData) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }

    // Delete the memory from database
    const [deletedMemoryRow] = await db
      .delete(memories)
      .where(and(eq(memories.id, memoryId), eq(memories.ownerId, allUserRecord.id)))
      .returning();

    if (!deletedMemoryRow) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }

    // ✅ ADD: S3-specific cleanup with pre-fetched data
    const cleanupResult = await cleanupStorageEdgesForMemory({
      memoryId,
      memoryType: memoryData.type as 'image' | 'video' | 'document' | 'audio' | 'note',
      memoryData, // ← Pass full memory data for S3 cleanup
    });

    if (!cleanupResult.success) {
      console.error(`❌ Failed to clean up storage for memory ${memoryId}:`, cleanupResult.error);
    } else {
      console.log(`✅ Successfully cleaned up storage for memory: ${memoryId}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Memory deleted successfully',
      memoryId,
    });
  } catch (error) {
    console.error('Error deleting memory:', error);
    return NextResponse.json({ error: 'Failed to delete memory' }, { status: 500 });
  }
}
```

### 3. **Keep in `delete.ts` (Bulk Endpoint)**

The following S3 cleanup logic should be **KEPT** in `delete.ts` for bulk operations:

```typescript
// ✅ KEEP: Enhanced bulk deletion with S3 cleanup
if (all === 'true') {
  // 1. First get all memories that will be deleted for cleanup
  const memoriesToDelete = await db.query.memories.findMany({
    where: eq(memories.ownerId, allUserRecord.id),
    with: {
      assets: true,
      folder: true,
    },
  });

  if (memoriesToDelete.length > 0) {
    await cleanupStorageEdgesForMemories(memoriesToDelete);
  }

  // 2. Delete all memories
  const deletedMemoriesResult = await db.delete(memories).where(eq(memories.ownerId, allUserRecord.id)).returning();

  // ... rest of bulk deletion logic
}
```

```ts
/**
 * MEMORY DELETION HANDLER
 *
 * This module handles memory deletion operations:
 * - Bulk delete all memories for a user
 * - Delete memories by type
 * - Clean up storage edges
 * - Handle cascading deletions
 *
 * USAGE:
 * - DELETE /api/memories?all=true - Delete all memories
 * - DELETE /api/memories?type=image - Delete all images
 * - DELETE /api/memories?type=video - Delete all videos
 * - DELETE /api/memories?folder=<folderName> - Delete all memories in folder
 *
 * SECURITY:
 * - Only deletes memories owned by the authenticated user
 * - Validates user permissions before deletion
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db/db';
import { allUsers, memories, folders, galleries, galleryItems } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { cleanupStorageEdgesForMemory } from './utils/memory-database';

// Type for memory with metadata for deletion operations
interface MemoryForDeletion {
  id: string;
  type: 'image' | 'video' | 'note' | 'document' | 'audio';
  metadata?: {
    custom?: {
      storageBackend?: string;
      storageKey?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  } | null;
  custom?: {
    storageBackend?: string;
    storageKey?: string;
    [key: string]: unknown;
  };
  storageBackend?: string;
  storageKey?: string;
  storageLocations?: string[] | null;
  [key: string]: unknown; // Index signature to allow additional properties
}

// Helper function to clean up storage edges for deleted memories
async function cleanupStorageEdgesForMemories(memoriesToDelete: MemoryForDeletion[]) {
  console.log(`🧹 Starting cleanup for ${memoriesToDelete.length} memories`);

  const cleanupPromises = memoriesToDelete.map(memoryData => {
    if (!memoryData) {
      console.warn('⚠️ Received undefined memory data in cleanup');
      return Promise.resolve({ success: false });
    }

    console.log(`🧹 Cleaning up memory: ${memoryData.id} (${memoryData.type})`);

    return cleanupStorageEdgesForMemory({
      memoryId: memoryData.id,
      memoryType: memoryData.type as 'image' | 'video' | 'note' | 'document' | 'audio',
      memoryData,
    });
  });

  const results = await Promise.allSettled(cleanupPromises);

  let successCount = 0;
  let errorCount = 0;

  results.forEach((result, index) => {
    const memory = memoriesToDelete[index];
    if (result.status === 'fulfilled' && result.value.success) {
      successCount++;
      console.log(`✅ Successfully cleaned up memory: ${memory?.id || 'unknown'}`);
    } else {
      errorCount++;
      console.error(
        `❌ Failed to clean up memory ${memory?.id || 'unknown'}:`,
        result.status === 'rejected' ? result.reason : result.value
      );
    }
  });

  console.log(`🧹 Cleanup complete. Success: ${successCount}, Errors: ${errorCount}`);
  return { successCount, errorCount };
}

/**
 * Main DELETE handler for memory deletion
 * Handles bulk deletion and type-specific deletion
 */
export async function handleApiMemoryDelete(request: NextRequest): Promise<NextResponse> {
  // Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get the allUserId for the authenticated user
    const allUserRecord = await db.query.allUsers.findFirst({
      where: eq(allUsers.userId, session.user.id),
    });

    if (!allUserRecord) {
      console.error('No allUsers record found for user:', session.user.id);
      return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    }

    // Get query parameters for selective deletion
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const folder = searchParams.get('folder'); // folder name to delete
    const all = searchParams.get('all');
    // ❌ REMOVE: Single memory deletion - this should be handled by DELETE /api/memories/[id]
    // const memoryId = searchParams.get('id'); // Single memory ID to delete

    let deletedCount = 0;

    // ❌ REMOVE: Single memory deletion logic - violates REST standards
    // if (memoryId) {
    //   // Single memory deletion
    //   console.log(`🗑️ Deleting single memory: ${memoryId}`);
    //
    //   // 1. FIRST: Get the memory data BEFORE deletion
    //   const memoryData = await db.query.memories.findFirst({
    //     where: and(eq(memories.id, memoryId), eq(memories.ownerId, allUserRecord.id)),
    //     with: {
    //       assets: true,
    //       folder: true,
    //     },
    //   });
    //
    //   if (!memoryData) {
    //     console.error(`❌ Memory not found: ${memoryId}`);
    //     return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    //   }
    //
    //   // 2. THEN: Delete the memory from database
    //   const [deletedMemoryRow] = await db
    //     .delete(memories)
    //     .where(and(eq(memories.id, memoryId), eq(memories.ownerId, allUserRecord.id)))
    //     .returning();
    //
    //   if (!deletedMemoryRow) {
    //     console.error(`❌ Failed to delete memory or memory not found: ${memoryId}`);
    //     return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    //   }
    //
    //   console.log(`✅ Deleted memory from database: ${memoryId}`);
    //
    //   // 3. FINALLY: Clean up storage edges with pre-fetched data
    //   const cleanupResult = await cleanupStorageEdgesForMemory({
    //     memoryId,
    //     memoryType: memoryData.type as 'image' | 'video' | 'document' | 'audio' | 'note',
    //     memoryData,
    //   });
    //
    //   if (!cleanupResult.success) {
    //     console.error(`❌ Failed to clean up storage for memory ${memoryId}:`, cleanupResult.error);
    //   } else {
    //     console.log(`✅ Successfully cleaned up storage for memory: ${memoryId}`);
    //   }
    //
    //   return NextResponse.json({
    //     success: true,
    //     message: 'Memory deleted successfully',
    //     memoryId,
    //   });
    // } else if (all === 'true') {

    if (all === 'true') {
      // Delete all memories, folders, and galleries for the user
      console.log('🗑️ Clearing all data for user:', allUserRecord.id);

      // 1. First get all memories that will be deleted for cleanup
      const memoriesToDelete = await db.query.memories.findMany({
        where: eq(memories.ownerId, allUserRecord.id),
        with: {
          assets: true,
          folder: true,
        },
      });

      if (memoriesToDelete.length > 0) {
        await cleanupStorageEdgesForMemories(memoriesToDelete);
      }

      // 2. Delete all memories
      const deletedMemoriesResult = await db.delete(memories).where(eq(memories.ownerId, allUserRecord.id)).returning();

      // 3. Delete galleries & gallery items
      const userGalleries = await db.query.galleries.findMany({
        where: eq(galleries.ownerId, allUserRecord.id),
        columns: { id: true },
      });
      const galleryIds = userGalleries.map(g => g.id);

      if (galleryIds.length > 0) {
        await db.delete(galleryItems).where(inArray(galleryItems.galleryId, galleryIds)).returning();
      }
      await db.delete(galleries).where(eq(galleries.ownerId, allUserRecord.id)).returning();

      // 4. Delete folders
      await db.delete(folders).where(eq(folders.ownerId, allUserRecord.id)).returning();

      deletedCount = deletedMemoriesResult.length;
    } else if (type) {
      // Delete specific type
      const memoriesToDelete = await db.query.memories.findMany({
        where: and(
          eq(memories.ownerId, allUserRecord.id),
          eq(memories.type, type as 'image' | 'video' | 'document' | 'note' | 'audio')
        ),
        with: {
          assets: true,
          folder: true,
        },
      });

      if (memoriesToDelete.length > 0) {
        await cleanupStorageEdgesForMemories(memoriesToDelete);
      }

      const deletedMemoriesResult = await db
        .delete(memories)
        .where(
          and(
            eq(memories.ownerId, allUserRecord.id),
            eq(memories.type, type as 'image' | 'video' | 'document' | 'note' | 'audio')
          )
        )
        .returning();

      deletedCount = deletedMemoriesResult.length;
    } else if (folder) {
      // Delete memories in specific folder
      const memoriesToDelete = await db.query.memories.findMany({
        where: and(eq(memories.ownerId, allUserRecord.id), eq(memories.parentFolderId, folder)),
        with: {
          assets: true,
          folder: true,
        },
      });

      if (memoriesToDelete.length > 0) {
        await cleanupStorageEdgesForMemories(memoriesToDelete);
      }

      const deletedMemoriesResult = await db
        .delete(memories)
        .where(and(eq(memories.ownerId, allUserRecord.id), eq(memories.parentFolderId, folder)))
        .returning();

      deletedCount = deletedMemoriesResult.length;
    } else {
      return NextResponse.json(
        {
          error: "Missing parameter. Use 'all=true', 'type=<memory_type>', or 'folder=<folder_name>'",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        all === 'true'
          ? `Successfully deleted ${deletedCount} memories, all folders, and all galleries`
          : `Successfully deleted ${deletedCount} memories`,
      deletedCount,
      type,
      folder,
      all,
    });
  } catch (error) {
    console.error('Error in bulk delete:', error);
    return NextResponse.json({ error: 'Failed to delete memories' }, { status: 500 });
  }
}
```
