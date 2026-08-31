#!/usr/bin/env tsx

/**
 * Test Storage Edges Fix Script
 *
 * This script tests whether the storage edges fix is working properly.
 * It creates a test memory and checks if storage edges are created.
 *
 * Usage:
 *   npx tsx scripts/db/memories/test-storage-edges-fix.ts <email>
 *
 * Example:
 *   npx tsx scripts/db/memories/test-storage-edges-fix.ts user@example.com
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { users, allUsers, memories, storageEdges } from '../../../src/db/index';

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
const db = drizzle(sql, {
  schema: { users, allUsers, memories, storageEdges },
});

async function testStorageEdgesFix(email: string) {
  console.log(`🧪 Testing storage edges fix for user: ${email}`);

  try {
    // Find the user
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log(`✅ Found user: ${user.name} (${user.email})`);

    // Find the corresponding allUsers entry
    const allUser = await db.query.allUsers.findFirst({
      where: eq(allUsers.userId, user.id),
    });

    if (!allUser) {
      console.log('❌ No allUsers record found for this user.');
      return;
    }

    console.log(`✅ Found allUsers record: ${allUser.id}`);

    // Get recent memories (last 5)
    const recentMemories = await db.query.memories.findMany({
      where: and(eq(memories.ownerId, allUser.id), isNull(memories.deletedAt)),
      orderBy: [desc(memories.createdAt)],
      limit: 5,
    });

    console.log(`\n📋 TESTING ${recentMemories.length} RECENT MEMORIES:`);
    console.log('='.repeat(80));

    if (recentMemories.length === 0) {
      console.log('No memories found for this user.');
      return;
    }

    let memoriesWithStorageEdges = 0;
    let memoriesWithoutStorageEdges = 0;

    for (const memory of recentMemories) {
      console.log(`\n🔍 Testing Memory: ${memory.title || 'Untitled'}`);
      console.log('─'.repeat(60));
      console.log(`ID: ${memory.id}`);
      console.log(`Type: ${memory.type}`);
      console.log(`Created: ${memory.createdAt.toLocaleString()}`);

      // Check storage edges for this memory
      const edges = await db.query.storageEdges.findMany({
        where: eq(storageEdges.memoryId, memory.id),
      });

      console.log(`Storage Edges Found: ${edges.length}`);

      if (edges.length === 0) {
        console.log(
          '❌ NO STORAGE EDGES - This memory will show "Storage: UNKNOWN"'
        );
        memoriesWithoutStorageEdges++;
      } else {
        console.log('✅ HAS STORAGE EDGES:');
        edges.forEach((edge, index) => {
          console.log(`  Edge ${index + 1}:`);
          console.log(`    Artifact: ${edge.artifact}`);
          console.log(
            `    Location Metadata: ${edge.locationMetadata || 'N/A'}`
          );
          console.log(`    Location Asset: ${edge.locationAsset || 'N/A'}`);
          console.log(`    Present: ${edge.present}`);
          console.log(`    URL: ${edge.locationUrl || 'N/A'}`);
          console.log(`    Size: ${edge.sizeBytes || 'N/A'} bytes`);
        });
        memoriesWithStorageEdges++;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST RESULTS:');
    console.log(`   Total memories tested: ${recentMemories.length}`);
    console.log(`   With storage edges: ${memoriesWithStorageEdges}`);
    console.log(`   Without storage edges: ${memoriesWithoutStorageEdges}`);

    if (memoriesWithoutStorageEdges > 0) {
      console.log('\n❌ ISSUE FOUND: Some memories are missing storage edges');
      console.log('   This means the fix may not be working for all cases');
      console.log('   or these are older memories created before the fix');
    } else {
      console.log('\n✅ ALL GOOD: All tested memories have storage edges');
      console.log('   The fix appears to be working correctly');
    }

    console.log('\n💡 NEXT STEPS:');
    if (memoriesWithoutStorageEdges > 0) {
      console.log(
        '   1. Create a new memory to test if the fix works for new uploads'
      );
      console.log(
        '   2. Run the fix script to add storage edges to existing memories'
      );
    } else {
      console.log(
        '   1. Create a new memory to verify the fix works for new uploads'
      );
      console.log('   2. Test adding assets to existing memories');
    }

    console.log('\n' + '='.repeat(80));
  } catch (error) {
    console.error('❌ Error testing storage edges:', error);
    throw error;
  }
}

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.error('❌ Error: Email address is required');
    console.log(
      '\nUsage: npx tsx scripts/db/memories/test-storage-edges-fix.ts <email>'
    );
    console.log(
      'Example: npx tsx scripts/db/memories/test-storage-edges-fix.ts user@example.com'
    );
    process.exit(1);
  }

  try {
    await testStorageEdgesFix(email);
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
