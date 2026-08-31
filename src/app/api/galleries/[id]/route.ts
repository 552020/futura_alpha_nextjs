import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db/db';
import { eq, and, inArray } from 'drizzle-orm';
import {
  galleries,
  allUsers,
  galleryItems,
  memories,
  resourceMembership,
} from '@/db';
import { addStorageStatusToGallery } from '../utils';
import { generateBestAssetUrl } from '@/lib/presigned-url-utils';

import { fatLogger } from '@/lib/logger';
// Helper function to check if user has access to a memory, considering gallery override
async function checkMemoryAccess(
  memoryId: string,
  memoryType: string,
  allUserId: string,
  galleryId?: string
): Promise<boolean> {
  // If gallery is provided, check gallery access first
  if (galleryId) {
    const gallery = await db.query.galleries.findFirst({
      where: eq(galleries.id, galleryId),
    });

    if (gallery) {
      // Gallery override: if gallery is public, all memories are accessible
      if (gallery.sharingStatus === 'public') {
        return true;
      }

      // If user owns the gallery, they have access to all memories
      if (gallery.ownerId === allUserId) {
        return true;
      }

      // Check if gallery is shared with user using the new universal resource sharing system
      const galleryShare = await db.query.resourceMembership.findFirst({
        where: and(
          eq(resourceMembership.resourceId, galleryId),
          eq(resourceMembership.resourceType, 'gallery'),
          eq(resourceMembership.allUserId, allUserId)
        ),
      });

      if (galleryShare) {
        return true;
      }

      return false;
    }
  }

  // Check individual memory access (fallback) - using unified memories table
  const memory = await db.query.memories.findFirst({
    where: and(
      eq(memories.id, memoryId),
      eq(
        memories.type,
        memoryType as 'image' | 'video' | 'note' | 'document' | 'audio'
      )
    ),
  });

  if (!memory) {
    return false;
  }

  // Check if user owns the memory
  if (memory.ownerId === allUserId) {
    return true;
  }

  // Check if memory is public
  if (memory.sharingStatus === 'public') {
    return true;
  }

  // TODO: Check if memory is shared with user (when memory sharing is implemented)
  // const memoryShare = await db.query.memoryShares.findFirst({
  //   where: and(
  //     eq(memoryShares.memoryId, memoryId),
  //     eq(memoryShares.sharedWithType, "user"),
  //     eq(memoryShares.sharedWithId, allUserId)
  //   ),
  // });

  return false;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
      fatLogger.error('No allUsers record found for user', 'be', {
        userId: session.user.id,
      });
      return NextResponse.json(
        { error: 'User record not found' },
        { status: 404 }
      );
    }

    const galleryId = id;

    // Check if user has access to this gallery
    // User can access if:
    // 1. They own the gallery
    // 2. The gallery is public (gallery override - all memories accessible)
    // 3. The gallery is shared with them directly
    // 4. The gallery is shared with a group they're in
    // 5. The gallery is shared with their relationship type

    // First check if user owns the gallery
    const ownedGallery = await db.query.galleries.findFirst({
      where: and(
        eq(galleries.id, galleryId),
        eq(galleries.ownerId, allUserRecord.id)
      ),
    });

    let accessibleGallery = null;

    if (ownedGallery) {
      // fatLogger.info("User owns gallery:", ownedGallery);
      accessibleGallery = ownedGallery;
    } else {
      // Check if gallery exists and is public (gallery override)
      const publicGallery = await db.query.galleries.findFirst({
        where: and(
          eq(galleries.id, galleryId),
          eq(galleries.sharingStatus, 'public')
        ),
      });

      if (publicGallery) {
        // fatLogger.info("User accessing public gallery:", publicGallery);
        accessibleGallery = publicGallery;
      } else {
        // Check if gallery is shared with this user
        const sharedGallery = await db.query.galleries.findFirst({
          where: eq(galleries.id, galleryId),
        });

        if (sharedGallery) {
          // Check if gallery is shared with this user using the new universal resource sharing system
          const shareRecord = await db.query.resourceMembership.findFirst({
            where: and(
              eq(resourceMembership.resourceId, galleryId),
              eq(resourceMembership.resourceType, 'gallery'),
              eq(resourceMembership.allUserId, allUserRecord.id)
            ),
          });

          if (shareRecord) {
            // fatLogger.info("User has shared access to gallery:", sharedGallery);
            accessibleGallery = sharedGallery;
          }
        }
      }
    }

    if (!accessibleGallery) {
      return NextResponse.json({ error: 'Gallery not found' }, { status: 404 });
    }

    // Get gallery items with access control
    const galleryItemsList = await db.query.galleryItems.findMany({
      where: eq(galleryItems.galleryId, galleryId),
      orderBy: [galleryItems.position],
    });

    // Filter items based on memory access
    const accessibleItems = [];
    for (const item of galleryItemsList) {
      const hasAccess = await checkMemoryAccess(
        item.memoryId,
        item.memoryType,
        allUserRecord.id,
        galleryId
      );
      if (hasAccess) {
        accessibleItems.push(item);
      }
    }

    // fatLogger.info("Gallery access result:", undefined, {
    //   galleryId,
    //   totalItems: galleryItemsList.length,
    //   accessibleItems: accessibleItems.length,
    // });

    // Get the actual memory data for each item
    const itemsWithMemories = [];
    // fatLogger.info("Processing accessible items:", accessibleItems.length);

    for (const item of accessibleItems) {
      try {
        // fatLogger.info(`Processing item: ${item.memoryId} (type: ${item.memoryType})`);

        // Fetch memory from unified memories table with assets
        const memory = await db.query.memories.findFirst({
          where: and(
            eq(memories.id, item.memoryId),
            eq(
              memories.type,
              item.memoryType as
                | 'image'
                | 'video'
                | 'note'
                | 'document'
                | 'audio'
            )
          ),
          with: {
            assets: true,
          },
        });

        if (memory) {
          fatLogger.info(`Found memory for item ${item.memoryId}`, 'be', {
            memoryId: memory.id,
            title: memory.title,
            type: memory.type,
            assetsCount: memory.assets?.length || 0,
            assets: memory.assets?.map((asset) => ({
              id: asset.id,
              assetType: asset.assetType,
              url: asset.url,
              mimeType: asset.mimeType,
              processingStatus: asset.processingStatus,
            })),
          });

          // Extract best asset URL (prefer thumb for gallery grid, then display, then original)
          const getBestAssetUrl = async (
            assets: GalleryAsset[] | undefined
          ): Promise<string | undefined> => {
            if (!assets || assets.length === 0) {
              fatLogger.info(
                `No assets found for memory ${item.memoryId}`,
                'be'
              );
              return undefined;
            }

            // Prefer thumb for gallery grid, then display, then original
            const preferredOrder = ['thumb', 'display', 'original'];
            for (const assetType of preferredOrder) {
              const asset = assets.find((a) => a.assetType === assetType);
              if (asset) {
                fatLogger.info(
                  `Found ${assetType} asset for memory ${item.memoryId}`,
                  'be'
                );
                return await generateBestAssetUrl(asset);
              }
            }

            // Fallback to first available asset
            fatLogger.info(
              `No preferred asset found for memory ${item.memoryId}, using first asset`,
              'be'
            );
            return await generateBestAssetUrl(assets[0]);
          };
          // Define asset type
          interface GalleryAsset {
            assetType: string;
            url: string;
            mimeType?: string;
          }

          // Extract MIME type from assets
          const getAssetMimeType = (
            assets: GalleryAsset[] | undefined
          ): string | undefined => {
            if (!assets || assets.length === 0) return undefined;

            // Try to find display asset first, then original
            const displayAsset = assets.find(
              (asset) => asset.assetType === 'display'
            );
            if (displayAsset) return displayAsset.mimeType;

            const originalAsset = assets.find(
              (asset) => asset.assetType === 'original'
            );
            if (originalAsset) return originalAsset.mimeType;

            return assets[0]?.mimeType;
          };

          // Transform memory to include url and mimeType from assets
          const finalUrl = await getBestAssetUrl(memory.assets);

          const memoryWithUrl = {
            ...memory,
            url: finalUrl || '',
            mimeType: getAssetMimeType(memory.assets),
          };

          fatLogger.info(`Generated URL for memory ${item.memoryId}`, 'be', {
            finalUrl: finalUrl,
            hasUrl: !!finalUrl,
            urlLength: finalUrl?.length || 0,
          });

          itemsWithMemories.push({
            ...item,
            memory: memoryWithUrl,
          });
        } else {
          fatLogger.warn(
            `Memory not found for item: ${item.memoryId} (type: ${item.memoryType})`,
            'be'
          );
        }
      } catch (itemError) {
        fatLogger.error(
          `Error fetching memory for item ${item.memoryId}`,
          'be',
          {
            error: itemError instanceof Error ? itemError : undefined,
          }
        );
      }
    }

    // Add storage status to the gallery
    const galleryWithStorageStatus =
      await addStorageStatusToGallery(accessibleGallery);

    // Create the gallery with items in the expected format
    const galleryWithItems = {
      ...galleryWithStorageStatus,
      items: itemsWithMemories,
      imageCount: itemsWithMemories.length,
      isOwner: accessibleGallery.ownerId === allUserRecord.id,
    };

    // fatLogger.info("Returning gallery with items:", undefined, {
    //   galleryId,
    //   itemsCount: itemsWithMemories.length,
    //   isOwner: galleryWithItems.isOwner,
    // });

    return NextResponse.json({
      gallery: galleryWithItems,
    });
  } catch (error) {
    fatLogger.error('Error fetching gallery', 'be', {
      error: error instanceof Error ? error : undefined,
    });
    fatLogger.error('Error details', 'be', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: 'Failed to fetch gallery' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
      fatLogger.error('No allUsers record found for user', 'be', {
        userId: session.user.id,
      });
      return NextResponse.json(
        { error: 'User record not found' },
        { status: 404 }
      );
    }

    const galleryId = id;
    const body = await request.json();
    const { title, description, isPublic, items } = body;

    // Check if gallery exists and user owns it
    const existingGallery = await db.query.galleries.findFirst({
      where: and(
        eq(galleries.id, galleryId),
        eq(galleries.ownerId, allUserRecord.id)
      ),
    });

    if (!existingGallery) {
      return NextResponse.json({ error: 'Gallery not found' }, { status: 404 });
    }

    // Update gallery metadata
    const updatedGallery = await db
      .update(galleries)
      .set({
        title: title !== undefined ? title : existingGallery.title,
        description:
          description !== undefined ? description : existingGallery.description,
        sharingStatus:
          isPublic !== undefined
            ? isPublic
              ? 'public'
              : 'private'
            : existingGallery.sharingStatus,
        updatedAt: new Date(),
      })
      .where(eq(galleries.id, galleryId))
      .returning();

    // Handle items management if provided
    let itemsResult = null;
    if (items && items.action && items.memories) {
      if (items.action === 'add') {
        // Get current max position
        const currentItems = await db.query.galleryItems.findMany({
          where: eq(galleryItems.galleryId, galleryId),
          orderBy: [galleryItems.position],
          limit: 1,
        });
        const startPosition =
          currentItems.length > 0 ? currentItems[0].position + 1 : 0;

        // Add new items
        const newItems = items.memories.map(
          (memory: { id: string; type: string }, index: number) => ({
            galleryId,
            memoryId: memory.id,
            memoryType: memory.type as
              | 'image'
              | 'video'
              | 'document'
              | 'note'
              | 'audio',
            position: startPosition + index,
            caption: null,
            isFeatured: false,
            metadata: {},
          })
        );

        await db.insert(galleryItems).values(newItems);
        itemsResult = { action: 'add', count: newItems.length };
      } else if (items.action === 'remove') {
        // Remove items by memory IDs
        const memoryIds = items.memories.map(
          (memory: { id: string }) => memory.id
        );
        const deletedItems = await db
          .delete(galleryItems)
          .where(
            and(
              eq(galleryItems.galleryId, galleryId),
              inArray(galleryItems.memoryId, memoryIds)
            )
          )
          .returning();

        itemsResult = { action: 'remove', count: deletedItems.length };
      } else if (items.action === 'reorder') {
        // Reorder items
        for (const item of items.memories) {
          await db
            .update(galleryItems)
            .set({ position: item.position })
            .where(
              and(
                eq(galleryItems.galleryId, galleryId),
                eq(galleryItems.memoryId, item.id)
              )
            );
        }
        itemsResult = { action: 'reorder', count: items.memories.length };
      }
    }

    // fatLogger.info("Updated gallery:", undefined, {
    //   gallery: updatedGallery[0],
    //   items: itemsResult,
    // });

    return NextResponse.json({
      success: true,
      data: updatedGallery[0],
      items: itemsResult,
    });
  } catch (error) {
    fatLogger.error('Error updating gallery', 'be', {
      error: error instanceof Error ? error : undefined,
    });
    return NextResponse.json(
      { error: 'Failed to update gallery' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
      fatLogger.error('No allUsers record found for user', 'be', {
        userId: session.user.id,
      });
      return NextResponse.json(
        { error: 'User record not found' },
        { status: 404 }
      );
    }

    const galleryId = id;

    // Check if gallery exists and user owns it
    const existingGallery = await db.query.galleries.findFirst({
      where: and(
        eq(galleries.id, galleryId),
        eq(galleries.ownerId, allUserRecord.id)
      ),
    });

    if (!existingGallery) {
      return NextResponse.json({ error: 'Gallery not found' }, { status: 404 });
    }

    // Delete gallery shares first (resourceMembership doesn't have FK cascade)
    await db
      .delete(resourceMembership)
      .where(
        and(
          eq(resourceMembership.resourceType, 'gallery'),
          eq(resourceMembership.resourceId, galleryId)
        )
      );

    // Delete gallery (cascade will handle gallery_items)
    await db.delete(galleries).where(eq(galleries.id, galleryId));

    // fatLogger.info("Deleted gallery:", galleryId);

    return NextResponse.json({
      message: 'Gallery deleted successfully',
    });
  } catch (error) {
    fatLogger.error('Error deleting gallery', 'be', {
      error: error instanceof Error ? error : undefined,
    });
    return NextResponse.json(
      { error: 'Failed to delete gallery' },
      { status: 500 }
    );
  }
}
