import { GalleryWithItems } from "@/types/gallery";
import { Memory } from "@/types/memory";

// Gallery configurations based on actual folders
const GALLERY_CONFIGS = [
  {
    id: "portrait-gallery",
    title: "Portrait Collection",
    description: "Beautiful portrait photography showcasing people and emotions",
    isPublic: true,
    imageCount: 15,
  },
  {
    id: "landscape-gallery",
    title: "Landscape Photography",
    description: "Stunning landscapes from around the world",
    isPublic: true,
    imageCount: 15,
  },
  {
    id: "mixed-gallery",
    title: "Mixed Media Gallery",
    description: "A diverse collection of different photography styles",
    isPublic: false,
    imageCount: 20,
  },
  {
    id: "wild-gallery",
    title: "Wild & Free",
    description: "Adventure and nature photography",
    isPublic: true,
    imageCount: 25,
  },
  {
    id: "small-gallery",
    title: "Small Moments",
    description: "Intimate moments captured in time",
    isPublic: false,
    imageCount: 5,
  },
  {
    id: "large-gallery",
    title: "Large Collection",
    description: "An extensive collection of memories",
    isPublic: true,
    imageCount: 50,
  },
];

// Helper function to generate random dates within the last 6 months
const getRandomDate = (): string => {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);
  const randomTime = sixMonthsAgo.getTime() + Math.random() * (now.getTime() - sixMonthsAgo.getTime());
  return new Date(randomTime).toISOString();
};

// Generate mock memories for a gallery
const generateGalleryMemories = (galleryId: string, imageCount: number): Memory[] => {
  const memories: Memory[] = [];

  // Define file name patterns for each gallery
  const filePatterns = {
    "portrait-gallery": [
      "photo_01",
      "photo_06",
      "photo_08",
      "photo_12",
      "photo_13",
      "photo_15",
      "picture_03",
      "picture_07",
      "picture_10",
      "picture_14",
      "shot_02",
      "shot_04",
      "shot_09",
      "image_05",
      "image_11",
    ],
    "landscape-gallery": [
      "photo_13",
      "photo_15",
      "picture_04",
      "picture_05",
      "picture_06",
      "picture_10",
      "shot_01",
      "shot_02",
      "shot_07",
      "shot_08",
      "shot_09",
      "shot_14",
      "image_03",
      "image_11",
      "image_12",
    ],
    "mixed-gallery": [
      "photo_20",
      "picture_02",
      "picture_06",
      "picture_15",
      "picture_16",
      "picture_17",
      "shot_03",
      "shot_07",
      "shot_09",
      "shot_11",
      "shot_12",
      "shot_14",
      "image_01",
      "image_04",
      "image_05",
      "image_08",
      "image_10",
      "image_13",
      "image_18",
      "image_19",
    ],
    "wild-gallery": [
      "photo_01",
      "photo_13",
      "photo_17",
      "photo_18",
      "picture_07",
      "picture_08",
      "picture_10",
      "picture_11",
      "picture_12",
      "picture_14",
      "picture_15",
      "picture_20",
      "picture_22",
      "picture_23",
      "shot_02",
      "shot_05",
      "shot_19",
      "shot_25",
      "image_03",
      "image_04",
      "image_06",
      "image_09",
      "image_16",
      "image_21",
      "image_24",
    ],
    "small-gallery": ["shot_01", "photo_02", "photo_03", "photo_04", "picture_05"],
    "large-gallery": [
      "photo_01",
      "photo_04",
      "photo_07",
      "photo_08",
      "photo_10",
      "photo_18",
      "photo_24",
      "photo_25",
      "photo_26",
      "photo_30",
      "photo_33",
      "photo_34",
      "photo_36",
      "photo_44",
      "photo_46",
      "picture_03",
      "picture_09",
      "picture_12",
      "picture_14",
      "picture_15",
      "picture_19",
      "picture_21",
      "picture_22",
      "picture_27",
      "picture_29",
      "picture_39",
      "picture_42",
      "picture_43",
      "picture_47",
      "picture_48",
      "picture_50",
      "shot_02",
      "shot_06",
      "shot_11",
      "shot_17",
      "shot_23",
      "shot_31",
      "shot_35",
      "shot_37",
      "shot_40",
      "image_05",
      "image_13",
      "image_16",
      "image_20",
      "image_28",
      "image_32",
      "image_38",
      "image_41",
      "image_45",
      "image_49",
    ],
  };

  const patterns = filePatterns[galleryId as keyof typeof filePatterns] || [];

  for (let i = 0; i < imageCount && i < patterns.length; i++) {
    memories.push({
      id: `memory-${galleryId}-${i + 1}`,
      title: `Photo ${i + 1}`,
      description: `Beautiful photo ${i + 1} from ${galleryId}`,
      type: "image",
      url: `/mock/galleries/${galleryId}/${patterns[i]}.webp`,
      createdAt: getRandomDate(),
      metadata: {},
    });
  }

  return memories;
};

// Generate all sample galleries
export const generateSampleGalleries = (): GalleryWithItems[] => {
  return GALLERY_CONFIGS.map((config) => {
    const memories = generateGalleryMemories(config.id, config.imageCount);
    const createdAt = getRandomDate();

    return {
      id: config.id,
      title: config.title,
      description: config.description,
      isPublic: config.isPublic,
      createdAt: new Date(createdAt),
      updatedAt: new Date(createdAt),
      ownerId: "mock-user-1",
      items: memories.map((memory, index) => ({
        id: `item-${config.id}-${index}`,
        galleryId: config.id,
        memoryId: memory.id,
        memoryType: "image" as const,
        position: index,
        caption: `Photo ${index + 1}`,
        isFeatured: false,
        metadata: {},
        createdAt: new Date(createdAt),
        updatedAt: new Date(createdAt),
        memory,
      })),
      imageCount: config.imageCount,
      isOwner: true,
    };
  });
};

// Get a specific gallery by ID
export const getSampleGallery = (id: string): GalleryWithItems | undefined => {
  return generateSampleGalleries().find((gallery) => gallery.id === id);
};

// Export the sample galleries
export const sampleGalleries = generateSampleGalleries();
