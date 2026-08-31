#!/usr/bin/env tsx

/**
 * Check All Memories Script
 *
 * This script checks if there are any memories in the database at all.
 *
 * Usage:
 *   npx tsx scripts/db/memories/check-all-memories.ts
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { eq, desc } from 'drizzle-orm';
import { memories, storageEdges } from '../../../src/db/index';

// Load environment variables
config({ path: '.env.local' });

// Ensure DATABASE_URL is set
if (!process.env.DATABASE_URL_UNPOOLED) {
  throw new Error(
    "❌ DATABASE_URL_UNPOOLED is missing! Make sure it's set in .env.local"
  );
}

// Create database connection
const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
const db = drizzle(sql, { schema: { memories, storageEdges } });

async function checkAllMemories() {
  console.log('🔍 Checking all memories in database...');

  try {
    // Get all memories
    const allMemories = await db.query.memories.findMany({
      orderBy: [desc(memories.createdAt)],
      limit: 10,
    });

    console.log(`\n📋 FOUND ${allMemories.length} MEMORIES:`);
    console.log('='.repeat(80));

    if (allMemories.length === 0) {
      console.log('No memories found in the database.');
      return;
    }

    let memoriesWithStorageEdges = 0;
    let memoriesWithoutStorageEdges = 0;

    for (const memory of allMemories) {
      console.log(`\n🔍 Memory: ${memory.title || 'Untitled'}`);
      console.log('─'.repeat(60));
      console.log(`ID: ${memory.id}`);
      console.log(`Owner: ${memory.ownerId}`);
      console.log(`Type: ${memory.type}`);
      console.log(`Created: ${memory.createdAt.toLocaleString()}`);

      // Check storage edges for this memory
      const edges = await db.query.storageEdges.findMany({
        where: eq(storageEdges.memoryId, memory.id),
      });

      console.log(`Storage Edges: ${edges.length}`);

      if (edges.length === 0) {
        console.log('❌ NO STORAGE EDGES');
        memoriesWithoutStorageEdges++;
      } else {
        console.log('✅ HAS STORAGE EDGES');
        memoriesWithStorageEdges++;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY:');
    console.log(`   Total memories: ${allMemories.length}`);
    console.log(`   With storage edges: ${memoriesWithStorageEdges}`);
    console.log(`   Without storage edges: ${memoriesWithoutStorageEdges}`);

    console.log('\n' + '='.repeat(80));
  } catch (error) {
    console.error('❌ Error checking memories:', error);
    throw error;
  }
}

async function main() {
  try {
    await checkAllMemories();
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
