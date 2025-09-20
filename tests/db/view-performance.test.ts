import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { eq, sql } from 'drizzle-orm';
import { storageEdges } from '../db/schema';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

describe('View Performance Tests', () => {
  let db: ReturnType<typeof drizzle>;
  let testEdgeIds: string[] = [];

  beforeAll(() => {
    const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
    db = drizzle(sql);
  });

  afterAll(async () => {
    // Clean up test data
    if (testEdgeIds.length > 0) {
      await db.delete(storageEdges).where(eq(storageEdges.memoryId, 'test-performance'));
    }
  });

  it('should create performance test data', async () => {
    // Create a variety of test data to simulate real usage
    const testEdges = [];

    // Create 50 test memories with different sync states
    for (let i = 0; i < 50; i++) {
      const memoryId = `test-performance-${i.toString().padStart(3, '0')}`;
      const syncStates = ['idle', 'migrating', 'failed'] as const;
      const backends = ['neon', 'vercel_blob', 'icp'] as const;
      const artifacts = ['metadata', 'asset'] as const;
      const memoryTypes = ['image', 'video', 'note', 'document', 'audio'] as const;

      // Create 2-4 edges per memory (metadata + asset for different backends)
      for (let j = 0; j < 2 + (i % 3); j++) {
        const backend = backends[j % backends.length];
        const artifact = artifacts[j % artifacts.length];
        const memoryType = memoryTypes[i % memoryTypes.length];
        const syncState = syncStates[i % syncStates.length];

        testEdges.push({
          memoryId,
          memoryType,
          artifact,
          backend,
          present: syncState === 'idle',
          location: `${backend}://test/${memoryId}/${artifact}`,
          syncState,
          syncError: syncState === 'failed' ? 'Test error' : null,
          lastSyncedAt: syncState === 'idle' ? new Date() : null,
        });
      }
    }

    const inserted = await db.insert(storageEdges).values(testEdges).returning();
    testEdgeIds = inserted.map(edge => edge.id);

    expect(inserted).toHaveLength(testEdges.length);
    console.log(`✅ Created ${testEdges.length} test storage edges`);
  });

  it('should test sync_status view performance', async () => {
    const startTime = Date.now();

    // Test basic query performance
    const result = await db.execute(sql`SELECT COUNT(*) FROM sync_status`);
    const basicQueryTime = Date.now() - startTime;

    expect(basicQueryTime).toBeLessThan(1000); // Should complete in under 1 second
    console.log(`✅ Basic sync_status query: ${basicQueryTime}ms`);
  });

  it('should test sync_status filtering performance', async () => {
    const startTime = Date.now();

    // Test filtering by sync state
    const migratingResult = await db.execute(sql`SELECT COUNT(*) FROM sync_status WHERE sync_state = 'migrating'`);
    const filteringTime = Date.now() - startTime;

    expect(filteringTime).toBeLessThan(1000); // Should complete in under 1 second
    console.log(`✅ sync_status filtering query: ${filteringTime}ms`);
  });

  it('should test sync_status stuck detection performance', async () => {
    const startTime = Date.now();

    // Test stuck sync detection
    const stuckResult = await db.execute(sql`SELECT COUNT(*) FROM sync_status WHERE is_stuck = true`);
    const stuckQueryTime = Date.now() - startTime;

    expect(stuckQueryTime).toBeLessThan(1000); // Should complete in under 1 second
    console.log(`✅ sync_status stuck detection query: ${stuckQueryTime}ms`);
  });

  it('should test sync_status ordering performance', async () => {
    const startTime = Date.now();

    // Test ordered query (most expensive operation)
    const orderedResult = await db.execute(sql`SELECT * FROM sync_status ORDER BY sync_duration_seconds DESC LIMIT 10`);
    const orderingTime = Date.now() - startTime;

    expect(orderingTime).toBeLessThan(1000); // Should complete in under 1 second
    console.log(`✅ sync_status ordering query: ${orderingTime}ms`);
  });

  it('should test concurrent sync_status queries', async () => {
    const startTime = Date.now();

    // Test multiple concurrent queries
    const promises = [
      db.execute(sql`SELECT COUNT(*) FROM sync_status WHERE sync_state = 'migrating'`),
      db.execute(sql`SELECT COUNT(*) FROM sync_status WHERE sync_state = 'failed'`),
      db.execute(sql`SELECT COUNT(*) FROM sync_status WHERE is_stuck = true`),
      db.execute(sql`SELECT COUNT(*) FROM sync_status WHERE backend = 'icp'`),
    ];

    const results = await Promise.all(promises);
    const concurrentTime = Date.now() - startTime;

    expect(concurrentTime).toBeLessThan(2000); // Should complete in under 2 seconds
    expect(results).toHaveLength(4);
    console.log(`✅ Concurrent sync_status queries: ${concurrentTime}ms`);
  });

  it('should verify view data integrity', async () => {
    // Verify that the view only shows migrating and failed syncs
    const allResult = await db.execute(sql`SELECT COUNT(*) FROM sync_status`);
    const migratingResult = await db.execute(sql`SELECT COUNT(*) FROM sync_status WHERE sync_state = 'migrating'`);
    const failedResult = await db.execute(sql`SELECT COUNT(*) FROM sync_status WHERE sync_state = 'failed'`);

    // The view should only show migrating and failed syncs
    const totalInView = parseInt(allResult[0]?.count || '0');
    const migratingInView = parseInt(migratingResult[0]?.count || '0');
    const failedInView = parseInt(failedResult[0]?.count || '0');

    expect(totalInView).toBe(migratingInView + failedInView);
    console.log(
      `✅ View data integrity verified: ${totalInView} total, ${migratingInView} migrating, ${failedInView} failed`
    );
  });
});
