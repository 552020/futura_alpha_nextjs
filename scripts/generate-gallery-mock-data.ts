import fs from 'fs';
import path from 'path';

// Configuration
const GALLERIES_DIR = path.join(process.cwd(), 'public/mock/galleries');
const OUTPUT_FILE = path.join(process.cwd(), 'src/app/[lang]/gallery/generated-gallery-data.ts');

// Gallery configurations
const GALLERY_CONFIGS = [
  {
    id: 'portrait-gallery',
    title: 'Portrait Collection',
    description: 'Beautiful portrait photography showcasing people and emotions',
    isPublic: true,
  },
  {
    id: 'landscape-gallery',
    title: 'Landscape Photography',
    description: 'Stunning landscapes from around the world',
    isPublic: true,
  },
  {
    id: 'mixed-gallery',
    title: 'Mixed Media Gallery',
    description: 'A diverse collection of different photography styles',
    isPublic: false,
  },
  {
    id: 'wild-gallery',
    title: 'Wild & Free',
    description: 'Adventure and nature photography',
    isPublic: true,
  },
  {
    id: 'small-gallery',
    title: 'Small Moments',
    description: 'Intimate moments captured in time',
    isPublic: false,
  },
  {
    id: 'large-gallery',
    title: 'Large Collection',
    description: 'An extensive collection of memories',
    isPublic: true,
  },
  {
    id: 'broken-gallery',
    title: 'Broken Links Gallery',
    description: 'Testing fallback behavior with broken image links',
    isPublic: true,
  },
];

// Helper function to generate random dates within the last 6 months
const getRandomDate = (): string => {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);
  const randomTime = sixMonthsAgo.getTime() + Math.random() * (now.getTime() - sixMonthsAgo.getTime());
  return new Date(randomTime).toISOString();
};

// Read files from a gallery directory
const getGalleryFiles = (galleryId: string): string[] => {
  const galleryDir = path.join(GALLERIES_DIR, galleryId);

  if (!fs.existsSync(galleryDir)) {
    console.warn(`Gallery directory not found: ${galleryDir}`);
    return [];
  }

  try {
    const files = fs
      .readdirSync(galleryDir)
      .filter(file => file.endsWith('.webp'))
      .sort();

    return files;
  } catch (error) {
    console.error(`Error reading gallery directory ${galleryId}:`, error);
    return [];
  }
};

// Generate broken links for testing fallback behavior
const generateBrokenLinks = (): string[] => {
  return [
    'broken_image_1.webp',
    'missing_photo_2.webp',
    'error_image_3.webp',
    'not_found_4.webp',
    'invalid_link_5.webp',
  ];
};

// Generate mock data
const generateMockData = () => {
  const galleries = GALLERY_CONFIGS.map(config => {
    let files: string[];
    let imageCount: number;

    if (config.id === 'broken-gallery') {
      // Use broken links for testing fallback
      files = generateBrokenLinks();
      imageCount = files.length;
    } else {
      // Use actual files from directory
      files = getGalleryFiles(config.id);
      imageCount = files.length;

      if (imageCount === 0) {
        console.warn(`No images found for gallery: ${config.id}`);
      }
    }

    const createdAt = getRandomDate();
    const memories = files.map((file, index) => ({
      id: `memory-${config.id}-${index + 1}`,
      title: `Photo ${index + 1}`,
      description: `Beautiful photo ${index + 1} from ${config.title}`,
      type: 'image' as const,
      url: `/mock/galleries/${config.id}/${file}`,
      createdAt: getRandomDate(),
      metadata: {},
    }));

    return {
      id: config.id,
      title: config.title,
      description: config.description,
      isPublic: config.isPublic,
      createdAt: createdAt,
      updatedAt: createdAt,
      ownerId: 'mock-user-1',
      items: memories.map((memory, index) => ({
        id: `item-${config.id}-${index}`,
        galleryId: config.id,
        memoryId: memory.id,
        memoryType: 'image' as const,
        position: index,
        caption: `Photo ${index + 1}`,
        isFeatured: false,
        metadata: {},
        createdAt: createdAt,
        updatedAt: createdAt,
        memory,
      })),
      imageCount,
      isOwner: true,
    };
  });

  return galleries;
};

// Generate the TypeScript file
const generateTypeScriptFile = (galleries: any[]) => {
  const tsContent = `// Auto-generated file - do not edit manually
// Generated at: ${new Date().toISOString()}

import { GalleryWithItems } from "@/types/gallery";

export const generatedGalleries: GalleryWithItems[] = ${JSON.stringify(galleries, null, 2)
    .replace(/\n    "createdAt": "([^"]+)"/g, '\n    "createdAt": new Date("$1")')
    .replace(/\n    "updatedAt": "([^"]+)"/g, '\n    "updatedAt": new Date("$1")')
    .replace(/\n        "createdAt": "([^"]+)"/g, '\n        "createdAt": new Date("$1")')
    .replace(/\n        "updatedAt": "([^"]+)"/g, '\n        "updatedAt": new Date("$1")')};

export const getGeneratedGallery = (id: string): GalleryWithItems | undefined => {
  return generatedGalleries.find(gallery => gallery.id === id);
};

export const getAllGeneratedGalleries = (): GalleryWithItems[] => {
  return generatedGalleries;
};
`;

  return tsContent;
};

// Main execution
const main = () => {
  console.log('🔍 Scanning gallery directories...');

  const galleries = generateMockData();
  const tsContent = generateTypeScriptFile(galleries);

  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write the generated file
  fs.writeFileSync(OUTPUT_FILE, tsContent);

  console.log(`✅ Generated mock data for ${galleries.length} galleries`);
  console.log(`📁 Output file: ${OUTPUT_FILE}`);

  // Log summary
  galleries.forEach(gallery => {
    console.log(`  - ${gallery.title}: ${gallery.imageCount} images`);
  });
};

// Run if called directly
if (require.main === module) {
  main();
}

export { main as generateGalleryMockData };
