#!/usr/bin/env tsx

/**
 * Storage Edges Debug Script
 *
 * This script checks the storage edges table for a specific memory to debug
 * why storage status shows as "UNKNOWN".
 *
 * Usage:
 *   npx tsx scripts/db/memories/check-storage-edges.ts <memoryId>
 *
 * Example:
 *   npx tsx scripts/db/memories/check-storage-edges.ts 123e4567-e89b-12d3-a456-426614174000
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { eq } from 'drizzle-orm';
import { storageEdges, memories, allUsers } from '../../../src/db/index';

// Load environment variables
config({ path: '.env.local' });

// Ensure DATABASE_URL is set
if (!process.env.DATABASE_URL_UNPOOLED) {
  throw new Error("❌ DATABASE_URL_UNPOOLED is missing! Make sure it's set in .env.local");
}

// Create database connection
const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
const db = drizzle(sql, { schema: { storageEdges, memories, allUsers } });

async function checkStorageEdges(memoryId: string) {
  console.log(`🔍 Checking storage edges for memory: ${memoryId}`);

  try {
    // First, check if the memory exists
    const memory = await db.query.memories.findFirst({
      where: eq(memories.id, memoryId),
    });

    if (!memory) {
      console.log('❌ Memory not found');
      return;
    }

    console.log('\n📋 MEMORY INFO:');
    console.log('─'.repeat(40));
    console.log(`ID: ${memory.id}`);
    console.log(`Title: ${memory.title || 'Untitled'}`);
    console.log(`Type: ${memory.type}`);
    console.log(`Owner ID: ${memory.ownerId}`);
    console.log(`Created: ${memory.createdAt}`);
    console.log(`Assets: 0`); // We'll get this separately if needed

    // Check storage edges
    const edges = await db.query.storageEdges.findMany({
      where: eq(storageEdges.memoryId, memoryId),
    });

    console.log('\n📊 STORAGE EDGES:');
    console.log('─'.repeat(40));
    console.log(`Found ${edges.length} storage edges`);

    if (edges.length === 0) {
      console.log('❌ No storage edges found - this explains "UNKNOWN" status');
      console.log('\n💡 This means:');
      console.log('   - No storage location has been recorded for this memory');
      console.log('   - The memory may not have been properly uploaded to any storage');
      console.log('   - Storage edges should be created during upload process');
    } else {
      edges.forEach((edge, index) => {
        console.log(`\n${index + 1}. Edge ID: ${edge.id}`);
        console.log(`   Memory ID: ${edge.memoryId}`);
        console.log(`   Memory Type: ${edge.memoryType}`);
        console.log(`   Artifact: ${edge.artifact}`);
        console.log(`   Location Metadata: ${edge.locationMetadata || 'NULL'}`);
        console.log(`   Location Asset: ${edge.locationAsset || 'NULL'}`);
        console.log(`   Present: ${edge.present}`);
        console.log(`   Location URL: ${edge.locationUrl || 'NULL'}`);
        console.log(`   Content Hash: ${edge.contentHash || 'NULL'}`);
        console.log(`   Size Bytes: ${edge.sizeBytes || 'NULL'}`);
        console.log(`   Sync State: ${edge.syncState}`);
        console.log(`   Last Synced: ${edge.lastSyncedAt || 'NULL'}`);
        console.log(`   Sync Error: ${edge.syncError || 'NULL'}`);
        console.log(`   Created: ${edge.createdAt}`);
        console.log(`   Updated: ${edge.updatedAt}`);
      });

      // Analyze the storage locations
      const storageLocations = new Set<string>();
      edges.forEach(edge => {
        if (edge.locationMetadata) {
          storageLocations.add(edge.locationMetadata);
        }
        if (edge.locationAsset) {
          storageLocations.add(edge.locationAsset);
        }
      });

      console.log('\n🏪 STORAGE LOCATIONS:');
      console.log('─'.repeat(40));
      if (storageLocations.size === 0) {
        console.log('❌ No storage locations found');
      } else {
        Array.from(storageLocations).forEach(location => {
          console.log(`✅ ${location}`);
        });
      }
    }

    // Check what the API would return
    console.log('\n🔧 API SIMULATION:');
    console.log('─'.repeat(40));

    const presentEdges = edges.filter(edge => edge.present);
    const storageLocations = new Set<string>();

    presentEdges.forEach(edge => {
      if (edge.locationMetadata) {
        storageLocations.add(edge.locationMetadata);
      }
      if (edge.locationAsset) {
        storageLocations.add(edge.locationAsset);
      }
    });

    const finalLocations = Array.from(storageLocations);
    console.log(`Present edges: ${presentEdges.length}`);
    console.log(`Storage locations: [${finalLocations.join(', ')}]`);

    if (finalLocations.length === 0) {
      console.log('❌ This would result in "UNKNOWN" storage status');
    } else {
      console.log(`✅ This would show storage as: ${finalLocations.join(', ')}`);
    }
  } catch (error) {
    console.error('❌ Error checking storage edges:', error);
    throw error;
  }
}

async function main() {
  const memoryId = process.argv[2];

  if (!memoryId) {
    console.error('❌ Error: Memory ID is required');
    console.log('\nUsage: npx tsx scripts/db/memories/check-storage-edges.ts <memoryId>');
    console.log('Example: npx tsx scripts/db/memories/check-storage-edges.ts 123e4567-e89b-12d3-a456-426614174000');
    process.exit(1);
  }

  try {
    await checkStorageEdges(memoryId);
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}
