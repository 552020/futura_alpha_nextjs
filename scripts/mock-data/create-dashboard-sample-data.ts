import { Memory } from '../../../types/memory';

// Extended Memory interface for dashboard with status information
interface DashboardMemory extends Memory {
  status: 'private' | 'shared' | 'public';
  sharedWithCount?: number;
  sharedBy?: string;
  metadata?: {
    originalPath?: string;
    folderName?: string;
  };
}

// Configuration constants - easily change these to modify the mock data
const CONFIG = {
  INDIVIDUAL_MEMORIES: {
    image: 2,
    video: 2,
    note: 2,
    audio: 2,
    document: 2,
  }, // Memories not in any folder

  // Configure individual memory characteristics
  INDIVIDUAL_CHARACTERISTICS: {
    longTitle: 2, // Number of memories with very long titles
    longDescription: 1, // Number of memories with very long descriptions
    noDescription: 1, // Number of memories with no description
  },

  // Configure memory types and counts for each folder
  FOLDER_1: {
    image: 6, // 6 images
    video: 0, // 2 videos
    note: 0, // 2 notes
  },

  FOLDER_2: {
    image: 3, // 3 images
    video: 3, // 3 videos
    document: 2, // 2 documents
    note: 1, // 1 note
    audio: 1, // 1 audio
  },
};

// Helper function to generate random dates within the last 6 months
const getRandomDate = (): string => {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);
  const randomTime = sixMonthsAgo.getTime() + Math.random() * (now.getTime() - sixMonthsAgo.getTime());
  return new Date(randomTime).toISOString();
};

// Helper function to generate random status
const getRandomStatus = (): 'private' | 'shared' | 'public' => {
  const statuses: ('private' | 'shared' | 'public')[] = ['private', 'shared', 'public'];
  return statuses[Math.floor(Math.random() * statuses.length)];
};

// Generate individual memories (not in folders) - configurable types and counts
const generateIndividualMemories = (): DashboardMemory[] => {
  const individualMemories: DashboardMemory[] = [];
  let memoryIndex = 1;
  let longTitleCount = 0;
  let longDescriptionCount = 0;
  let noDescriptionCount = 0;

  // Helper function to get title based on characteristics
  const getTitle = (baseTitle: string, index: number): string => {
    if (longTitleCount < CONFIG.INDIVIDUAL_CHARACTERISTICS.longTitle) {
      longTitleCount++;
      return `This is an extremely long memory title that should test how the card handles very long titles and whether they get truncated properly in the UI - ${baseTitle} ${index}`;
    }
    return `${baseTitle} ${index}`;
  };

  // Helper function to get description based on characteristics
  const getDescription = (baseDescription: string, index: number): string => {
    if (noDescriptionCount < CONFIG.INDIVIDUAL_CHARACTERISTICS.noDescription) {
      noDescriptionCount++;
      return '';
    }
    if (longDescriptionCount < CONFIG.INDIVIDUAL_CHARACTERISTICS.longDescription) {
      longDescriptionCount++;
      return `This is a very long description that should test how the memory card handles lengthy descriptions. It contains multiple sentences and should demonstrate whether the footer stays properly aligned at the bottom regardless of the description length. The description should wrap to multiple lines and we want to see if the layout remains consistent across all cards in the grid. ${baseDescription} ${index}`;
    }
    return `${baseDescription} ${index}`;
  };

  // Generate images
  for (let i = 1; i <= CONFIG.INDIVIDUAL_MEMORIES.image; i++) {
    individualMemories.push({
      id: `ind-${memoryIndex}`,
      title: getTitle('Individual Image', i),
      description: getDescription('Standalone image', i),
      type: 'image',
      url: `/mock/dashboard/images/test_image_${memoryIndex}.webp`,
      thumbnail: `/mock/dashboard/images/test_image_${memoryIndex}.webp`,
      createdAt: getRandomDate(),
      status: getRandomStatus(),
    });
    memoryIndex++;
  }

  // Generate videos
  for (let i = 1; i <= CONFIG.INDIVIDUAL_MEMORIES.video; i++) {
    individualMemories.push({
      id: `ind-${memoryIndex}`,
      title: getTitle('Individual Video', i),
      description: getDescription('Standalone video', i),
      type: 'video',
      url: `/mock/dashboard/video/test_video_${memoryIndex}.mp4`,
      createdAt: getRandomDate(),
      status: getRandomStatus(),
    });
    memoryIndex++;
  }

  // Generate notes
  for (let i = 1; i <= CONFIG.INDIVIDUAL_MEMORIES.note; i++) {
    individualMemories.push({
      id: `ind-${memoryIndex}`,
      title: getTitle('Individual Note', i),
      description: getDescription('Standalone note', i),
      type: 'note',
      url: `/mock/dashboard/notes/test_note_${memoryIndex}.txt`,
      createdAt: getRandomDate(),
      status: getRandomStatus(),
    });
    memoryIndex++;
  }

  // Generate audio
  for (let i = 1; i <= CONFIG.INDIVIDUAL_MEMORIES.audio; i++) {
    individualMemories.push({
      id: `ind-${memoryIndex}`,
      title: getTitle('Individual Audio', i),
      description: getDescription('Standalone audio recording', i),
      type: 'audio',
      url: `/mock/dashboard/audio/test_audio_${memoryIndex}.mp3`,
      createdAt: getRandomDate(),
      status: getRandomStatus(),
    });
    memoryIndex++;
  }

  // Generate documents
  for (let i = 1; i <= CONFIG.INDIVIDUAL_MEMORIES.document; i++) {
    individualMemories.push({
      id: `ind-${memoryIndex}`,
      title: getTitle('Individual Document', i),
      description: getDescription('Standalone document', i),
      type: 'document',
      url: `/mock/dashboard/documents/test_document_${memoryIndex}.md`,
      createdAt: getRandomDate(),
      status: getRandomStatus(),
    });
    memoryIndex++;
  }

  return individualMemories;
};

// Generate Folder 1 memories (Family Album - configurable types and counts)
const generateFolder1Memories = (): DashboardMemory[] => {
  const familyAlbumMemories: DashboardMemory[] = [];
  let memoryIndex = 1;

  // Generate images
  for (let i = 1; i <= CONFIG.FOLDER_1.image; i++) {
    familyAlbumMemories.push({
      id: `family-${memoryIndex}`,
      title: `Family Photo ${i}`,
      description: `Beautiful family moment captured on camera ${i}`,
      type: 'image',
      url: `/mock/dashboard/images/test_image_${memoryIndex}.webp`,
      thumbnail: `/mock/dashboard/images/test_image_${memoryIndex}.webp`,
      createdAt: getRandomDate(),
      status: getRandomStatus(),
      metadata: {
        originalPath: `Family Album/family_photo_${i}.jpg`,
        folderName: 'Family-Album',
      },
    });
    memoryIndex++;
  }

  // Generate videos
  for (let i = 1; i <= CONFIG.FOLDER_1.video; i++) {
    familyAlbumMemories.push({
      id: `family-${memoryIndex}`,
      title: `Family Video ${i}`,
      description: `Precious family video moment ${i}`,
      type: 'video',
      url: `/mock/dashboard/video/test_video_${memoryIndex}.mp4`,
      createdAt: getRandomDate(),
      status: getRandomStatus(),
      metadata: {
        originalPath: `Family Album/family_video_${i}.mp4`,
        folderName: 'Family-Album',
      },
    });
    memoryIndex++;
  }

  // Generate notes
  for (let i = 1; i <= CONFIG.FOLDER_1.note; i++) {
    familyAlbumMemories.push({
      id: `family-${memoryIndex}`,
      title: `Family Note ${i}`,
      description: `Important family note ${i}`,
      type: 'note',
      url: `/mock/dashboard/notes/test_note_${memoryIndex}.txt`,
      createdAt: getRandomDate(),
      status: getRandomStatus(),
      metadata: {
        originalPath: `Family Album/family_note_${i}.txt`,
        folderName: 'Family-Album',
      },
    });
    memoryIndex++;
  }

  return familyAlbumMemories;
};

// Generate Folder 2 memories (Project Files - configurable types and counts)
const generateFolder2Memories = (): DashboardMemory[] => {
  const projectFilesMemories: DashboardMemory[] = [];
  let memoryIndex = 1;

  // Generate images
  for (let i = 1; i <= CONFIG.FOLDER_2.image; i++) {
    projectFilesMemories.push({
      id: `project-${memoryIndex}`,
      title: `Project Image ${i}`,
      description: `Project screenshot ${i}`,
      type: 'image',
      url: `/mock/dashboard/images/test_image_${memoryIndex}.webp`,
      thumbnail: `/mock/dashboard/images/test_image_${memoryIndex}.webp`,
      createdAt: getRandomDate(),
      status: getRandomStatus(),
      metadata: {
        originalPath: `Project Files/project_image_${i}.jpg`,
        folderName: 'Project-Files',
      },
    });
    memoryIndex++;
  }

  // Generate videos
  for (let i = 1; i <= CONFIG.FOLDER_2.video; i++) {
    projectFilesMemories.push({
      id: `project-${memoryIndex}`,
      title: `Project Video ${i}`,
      description: `Project demo video ${i}`,
      type: 'video',
      url: `/mock/dashboard/video/test_video_${memoryIndex}.mp4`,
      createdAt: getRandomDate(),
      status: getRandomStatus(),
      metadata: {
        originalPath: `Project Files/project_video_${i}.mp4`,
        folderName: 'Project-Files',
      },
    });
    memoryIndex++;
  }

  // Generate documents
  for (let i = 1; i <= CONFIG.FOLDER_2.document; i++) {
    projectFilesMemories.push({
      id: `project-${memoryIndex}`,
      title: `Project Document ${i}`,
      description: `Project documentation ${i}`,
      type: 'document',
      url: `/mock/dashboard/documents/test_document_${memoryIndex}.md`,
      createdAt: getRandomDate(),
      status: getRandomStatus(),
      metadata: {
        originalPath: `Project Files/project_document_${i}.md`,
        folderName: 'Project-Files',
      },
    });
    memoryIndex++;
  }

  // Generate notes
  for (let i = 1; i <= CONFIG.FOLDER_2.note; i++) {
    projectFilesMemories.push({
      id: `project-${memoryIndex}`,
      title: `Project Note ${i}`,
      description: `Project meeting notes ${i}`,
      type: 'note',
      url: `/mock/dashboard/notes/test_note_${memoryIndex}.txt`,
      createdAt: getRandomDate(),
      status: getRandomStatus(),
      metadata: {
        originalPath: `Project Files/project_note_${i}.txt`,
        folderName: 'Project-Files',
      },
    });
    memoryIndex++;
  }

  // Generate audio
  for (let i = 1; i <= CONFIG.FOLDER_2.audio; i++) {
    projectFilesMemories.push({
      id: `project-${memoryIndex}`,
      title: `Project Audio ${i}`,
      description: `Project audio recording ${i}`,
      type: 'audio',
      url: `/mock/dashboard/audio/test_audio_${memoryIndex}.mp3`,
      createdAt: getRandomDate(),
      status: getRandomStatus(),
      metadata: {
        originalPath: `Project Files/project_audio_${i}.mp3`,
        folderName: 'Project-Files',
      },
    });
    memoryIndex++;
  }

  return projectFilesMemories;
};

// Generate all mock data
export const sampleDashboardMemories: DashboardMemory[] = [
  ...generateIndividualMemories(),
  ...generateFolder1Memories(),
  ...generateFolder2Memories(),
];
