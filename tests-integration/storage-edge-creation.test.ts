// @vitest-environment node
/**
 * createMemoryStorageEdges against a real local Postgres.
 *
 * The previous version mocked db.insert() and drifted from the service's
 * real query chain (lookup + insert/update on the uq_edge index), so it
 * could never pass. Running it against the database checks the actual SQL.
 */
import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { hasLocalDb } from './local-db';

describe.skipIf(!hasLocalDb)(
  'createMemoryStorageEdges (local Postgres)',
  () => {
    const createdMemoryIds: string[] = [];

    afterAll(async () => {
      if (!createdMemoryIds.length) return;
      const { db, storageEdges } = await import('@/db/db');
      await db
        .delete(storageEdges)
        .where(inArray(storageEdges.memoryId, createdMemoryIds));
    });

    async function edgesFor(memoryId: string) {
      const { db, storageEdges } = await import('@/db/db');
      return db
        .select()
        .from(storageEdges)
        .where(eq(storageEdges.memoryId, memoryId));
    }

    it('creates a metadata edge and an asset edge for a new image', async () => {
      const { createMemoryStorageEdges } = await import(
        '@/lib/usecases/memory/create-memory-storage-edges'
      );
      const memoryId = randomUUID();
      createdMemoryIds.push(memoryId);

      const result = await createMemoryStorageEdges({
        memoryId,
        memoryType: 'image',
        url: 'https://blob.example.test/image.jpg',
        size: 1024,
        contentHash: 'sha256-abc',
      });

      expect(result.success).toBe(true);
      const edges = await edgesFor(memoryId);
      expect(edges).toHaveLength(2);

      const metadata = edges.find((e) => e.artifact === 'metadata');
      const asset = edges.find((e) => e.artifact === 'asset');
      expect(metadata).toMatchObject({
        memoryType: 'image',
        locationMetadata: 'neon',
        present: true,
        syncState: 'idle',
      });
      expect(asset).toMatchObject({
        memoryType: 'image',
        locationAsset: 'vercel_blob',
        locationUrl: 'https://blob.example.test/image.jpg',
        sizeBytes: 1024,
        contentHash: 'sha256-abc',
        present: true,
      });
    });

    it('is idempotent: calling twice does not duplicate edges', async () => {
      const { createMemoryStorageEdges } = await import(
        '@/lib/usecases/memory/create-memory-storage-edges'
      );
      const memoryId = randomUUID();
      createdMemoryIds.push(memoryId);
      const params = {
        memoryId,
        memoryType: 'video' as const,
        url: 'https://blob.example.test/clip.mp4',
        size: 2048,
      };

      expect((await createMemoryStorageEdges(params)).success).toBe(true);
      expect(
        (await createMemoryStorageEdges({ ...params, size: 4096 })).success
      ).toBe(true);

      const edges = await edgesFor(memoryId);
      expect(edges).toHaveLength(2);
      expect(edges.find((e) => e.artifact === 'asset')?.sizeBytes).toBe(4096);
    });

    it('reports failure instead of throwing for an invalid memory id', async () => {
      const { createMemoryStorageEdges } = await import(
        '@/lib/usecases/memory/create-memory-storage-edges'
      );
      const result = await createMemoryStorageEdges({
        memoryId: 'not-a-uuid',
        memoryType: 'note',
        url: 'https://blob.example.test/n.txt',
        size: 1,
      });
      expect(result.success).toBe(false);
    });
  }
);
