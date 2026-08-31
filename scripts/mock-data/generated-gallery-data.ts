import type { Memory } from '@/types/memory';

// Generate a memory object
function generateMemory(
  id: string,
  title: string,
  description: string
): Memory {
  return {
    id,
    title,
    description,
    type: 'image',
    createdAt: '2025-06-03T17:13:04.316Z',
    updatedAt: '2025-06-03T17:13:04.316Z',
    ownerId: 'mock-user-1',
    isPublic: false,
    tags: [],
    metadata: {
      custom: {
        width: 1920,
        height: 1080,
        fileSize: 2048000,
        mimeType: 'image/jpeg',
      },
    },
  };
}

// Generate a gallery item
function generateGalleryItem(
  galleryId: string,
  index: number,
  title: string,
  description: string
) {
  const memoryId = `memory-${galleryId}-${index + 1}`;
  return {
    id: `item-${galleryId}-${index}`,
    galleryId,
    memoryId,
    memoryType: 'image' as const,
    position: index,
    caption: title,
    isFeatured: index === 0, // First item is featured
    metadata: {},
    memory: generateMemory(memoryId, title, description),
  };
}

// Generate a gallery with items
function generateGallery(
  id: string,
  title: string,
  description: string,
  itemCount: number = 15
) {
  const items = Array.from({ length: itemCount }, (_, i) =>
    generateGalleryItem(
      id,
      i,
      `Photo ${i + 1}`,
      `Beautiful ${title.toLowerCase()} photo ${i + 1}`
    )
  );

  return {
    id,
    title,
    description,
    name: title.toLowerCase().replace(/\s+/g, '-'), // Convert title to URL-safe name
    createdAt: new Date('2025-06-03T17:13:04.316Z'),
    updatedAt: new Date('2025-06-03T17:13:04.316Z'),
    ownerId: 'mock-user-1',
    totalMemories: itemCount,
    sharingStatus: 'private',
    sharedCount: 0,
    storageLocation: ['s3'] as any,
    items,
    imageCount: itemCount,
    isOwner: true,
  };
}

// Generate all galleries
export const generatedGalleries = [
  generateGallery(
    'portrait-gallery',
    'Portrait Collection',
    'Beautiful portrait photography showcasing people and emotions',
    15
  ),
  generateGallery(
    'landscape-gallery',
    'Landscape Photography',
    'Stunning landscape photography featuring nature and scenery',
    15
  ),
  generateGallery(
    'mixed-gallery',
    'Mixed Media Gallery',
    'A diverse collection of different photography styles',
    20
  ),
  generateGallery(
    'wild-gallery',
    'Wild & Free',
    'Capturing the untamed beauty of nature and wildlife',
    25
  ),
  generateGallery(
    'small-gallery',
    'Small Moments',
    'Intimate moments and close-up photography',
    5
  ),
  generateGallery(
    'large-gallery',
    'Large Collection',
    'An extensive collection showcasing various photography styles',
    30
  ),
  generateGallery(
    'broken-links-gallery',
    'Broken Links Gallery',
    'Gallery with some broken memory links for testing',
    5
  ),
];

// Export function to get a specific gallery by ID
export function getGeneratedGallery(id: string) {
  return generatedGalleries.find((gallery) => gallery.id === id);
}
