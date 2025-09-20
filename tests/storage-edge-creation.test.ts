import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the database module
vi.mock('@/db/db', () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock the schema module
vi.mock('@/db/schema', () => ({
  storageEdges: {
    id: 'id',
    memoryId: 'memory_id',
    memoryType: 'memory_type',
    artifact: 'artifact',
    backend: 'backend',
    present: 'present',
    location: 'location',
    contentHash: 'content_hash',
    sizeBytes: 'size_bytes',
    syncState: 'sync_state',
    syncError: 'sync_error',
    lastSyncedAt: 'last_synced_at',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  images: { id: 'id' },
  videos: { id: 'id' },
  documents: { id: 'id' },
}));

// Mock drizzle-orm
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}));

describe('Storage Edge Creation Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should create correct storage edge data structure for image memory', async () => {
    // Import the function after mocking
    const { createStorageEdgesForMemory } = await import('@/app/api/memories/utils/memory-database');
    const { db } = await import('@/db/db');

    // Mock the database insert to return success
    const mockInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          { id: 'edge-1', memoryId: 'test-memory', artifact: 'metadata', backend: 'neon-db' },
          { id: 'edge-2', memoryId: 'test-memory', artifact: 'asset', backend: 'vercel-blob' },
        ]),
      }),
    });
    db.insert = mockInsert;

    const result = await createStorageEdgesForMemory({
      memoryId: 'test-memory',
      memoryType: 'image',
      url: 'https://test-url.com/image.jpg',
      size: 1024,
    });

    expect(result.success).toBe(true);
    expect(result.metadataEdge).toBeDefined();
    expect(result.assetEdge).toBeDefined();

    // Verify the function was called with correct parameters
    expect(mockInsert).toHaveBeenCalledTimes(2);
  });

  it('should handle different memory types correctly', async () => {
    const { createStorageEdgesForMemory } = await import('@/app/api/memories/utils/memory-database');
    const { db } = await import('@/db/db');

    const mockInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'edge-1' }]),
      }),
    });
    db.insert = mockInsert;

    const memoryTypes = ['image', 'video', 'document'] as const;

    for (const memoryType of memoryTypes) {
      const result = await createStorageEdgesForMemory({
        memoryId: `test-${memoryType}`,
        memoryType,
        url: 'https://test-url.com/file',
        size: 1024,
      });

      expect(result.success).toBe(true);
    }
  });

  it('should handle database errors gracefully', async () => {
    const { createStorageEdgesForMemory } = await import('@/app/api/memories/utils/memory-database');
    const { db } = await import('@/db/db');

    // Mock database to throw an error
    const mockInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockRejectedValue(new Error('Database error')),
      }),
    });
    db.insert = mockInsert;

    const result = await createStorageEdgesForMemory({
      memoryId: 'test-memory',
      memoryType: 'image',
      url: 'https://test-url.com/image.jpg',
      size: 1024,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Database error');
  });
});
