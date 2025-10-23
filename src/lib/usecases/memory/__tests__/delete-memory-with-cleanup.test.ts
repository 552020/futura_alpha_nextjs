import { describe, it, expect, vi, beforeEach } from 'vitest';

import { deleteMemoryWithCleanup } from '../delete-memory-with-cleanup';
import * as memorySvc from '@/services/memory';
import * as cleanupMod from '@/lib/usecases/memory/cleanup-memory-and-storage';

// Mocks
vi.mock('@/services/memory', () => ({
  getMemoryWithRelations: vi.fn(),
}));

vi.mock('@/lib/usecases/memory/cleanup-memory-and-storage', () => ({
  cleanupMemoryAndStorage: vi.fn(),
}));

// Mock db delete chain used by the usecase
vi.mock('@/db/db', () => ({
  db: {
    delete: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn(() => [{ id: 'm1' }]),
      })),
    })),
  },
}));

describe('deleteMemoryWithCleanup usecase', () => {
  const ownerId = 'owner-1';
  const memoryId = 'm1';

  beforeEach(() => {
    vi.resetAllMocks();

    vi.mocked(memorySvc).getMemoryWithRelations.mockResolvedValue({
      success: true,
      data: { id: memoryId, type: 'image', assets: [], metadata: null },
    });

    vi.mocked(cleanupMod).cleanupMemoryAndStorage.mockResolvedValue({
      success: true,
      deletedS3Count: 1,
      deletedCount: 2,
      deletedS3Objects: [],
      deletedEdges: [],
    });
  });

  it('deletes memory and runs storage cleanup', async () => {
    const result = await deleteMemoryWithCleanup(memoryId, ownerId);

    expect(result.success).toBe(true);
    expect(result.cleanup?.success).toBe(true);
    expect(result.cleanup?.deletedS3Objects).toBe(1);
    expect(result.cleanup?.deletedEdges).toBe(2);
  });
});
