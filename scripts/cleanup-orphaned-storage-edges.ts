#!/usr/bin/env tsx

/**
 * CLEANUP ORPHANED STORAGE EDGES
 *
 * This script finds and removes storage_edges records that reference
 * non-existent memories, which can cause foreign key constraint violations.
 */

import { db } from '../src/db/db';
import { storageEdges, memories } from '../src/db/tables';
import { notInArray } from 'drizzle-orm';

async function cleanupOrphanedStorageEdges() {
  console.log('🔍 Starting cleanup of orphaned storage_edges records...\n');

  try {
    // Get all existing memory IDs
    const existingMemories = await db.select({ id: memories.id }).from(memories);
    const existingMemoryIds = existingMemories.map(m => m.id);

    console.log(`📊 Found ${existingMemoryIds.length} existing memories`);

    if (existingMemoryIds.length === 0) {
      console.log('⚠️  No memories found, deleting all storage_edges...');
      await db.delete(storageEdges);
      console.log(`✅ Deleted all storage_edges records`);
      return;
    }

    // Find storage_edges that reference non-existent memories
    const orphanedEdges = await db
      .select({ id: storageEdges.id, memoryId: storageEdges.memoryId })
      .from(storageEdges)
      .where(notInArray(storageEdges.memoryId, existingMemoryIds));

    console.log(`🔍 Found ${orphanedEdges.length} orphaned storage_edges records`);

    if (orphanedEdges.length === 0) {
      console.log('✅ No orphaned storage_edges found - database is clean!');
      return;
    }

    // Log some examples of orphaned records
    console.log('\n📋 Examples of orphaned records:');
    orphanedEdges.slice(0, 5).forEach((edge, index) => {
      console.log(`  ${index + 1}. Edge ID: ${edge.id}, Memory ID: ${edge.memoryId}`);
    });

    if (orphanedEdges.length > 5) {
      console.log(`  ... and ${orphanedEdges.length - 5} more`);
    }

    // Delete orphaned storage_edges
    await db.delete(storageEdges).where(notInArray(storageEdges.memoryId, existingMemoryIds));

    console.log(`\n✅ Successfully deleted ${orphanedEdges.length} orphaned storage_edges records`);

    // Verify cleanup
    const remainingOrphaned = await db
      .select({ id: storageEdges.id, memoryId: storageEdges.memoryId })
      .from(storageEdges)
      .where(notInArray(storageEdges.memoryId, existingMemoryIds));

    if (remainingOrphaned.length === 0) {
      console.log('🎉 Database is now clean - no orphaned storage_edges remain!');
    } else {
      console.log(`⚠️  Warning: ${remainingOrphaned.length} orphaned records still exist`);
    }
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
}

// Run the cleanup
cleanupOrphanedStorageEdges()
  .then(() => {
    console.log('\n🎉 Cleanup completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Cleanup failed:', error);
    process.exit(1);
  });
