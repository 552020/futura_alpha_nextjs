#!/usr/bin/env tsx

/**
 * List User Memories Script
 *
 * This script lists all memories for a specific user, showing their IDs, titles, and basic info.
 * Useful for finding the memory ID of a specific image or memory.
 *
 * Usage:
 *   npx tsx scripts/db/memories/list-user-memories.ts <email>
 *
 * Example:
 *   npx tsx scripts/db/memories/list-user-memories.ts stefanolombardo@posteo.de
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
  throw new Error("❌ DATABASE_URL_UNPOOLED is missing! Make sure it's set in .env.local");
}

// Create database connection
const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
const db = drizzle(sql, { schema: { users, allUsers, memories, storageEdges } });

interface MemoryWithStorage {
  id: string;
  title: string;
  type: string;
  createdAt: Date;
  storageLocations: string[];
  assetCount: number;
}

async function listUserMemories(email: string) {
  console.log(`🔍 Listing memories for user: ${email}`);

  try {
    // First, find the user
    const user = await db.query.users.findFirst({
      where: and(eq(users.email, email), isNull(users.deletedAt)),
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log(`✅ Found user: ${user.name} (${user.email})`);

    // Find the allUsers record
    const allUser = await db.query.allUsers.findFirst({
      where: and(eq(allUsers.userId, user.id), eq(allUsers.type, 'user')),
    });

    if (!allUser) {
      console.log('❌ AllUsers record not found');
      return;
    }

    console.log(`✅ Found allUsers record: ${allUser.id}`);

    // Get all memories for this user
    const userMemories = await db.query.memories.findMany({
      where: and(eq(memories.ownerId, allUser.id), isNull(memories.deletedAt)),
      orderBy: [desc(memories.createdAt)],
    });

    console.log(`\n📋 FOUND ${userMemories.length} MEMORIES:`);
    console.log('='.repeat(80));

    if (userMemories.length === 0) {
      console.log('No memories found for this user.');
      return;
    }

    // Get storage information for each memory
    const memoriesWithStorage: MemoryWithStorage[] = [];

    for (const memory of userMemories) {
      // Get storage edges for this memory
      const edges = await db.query.storageEdges.findMany({
        where: and(eq(storageEdges.memoryId, memory.id), eq(storageEdges.present, true)),
      });

      // Extract storage locations
      const storageLocations = new Set<string>();
      edges.forEach(edge => {
        if (edge.locationMetadata) {
          storageLocations.add(edge.locationMetadata);
        }
        if (edge.locationAsset) {
          storageLocations.add(edge.locationAsset);
        }
      });

      memoriesWithStorage.push({
        id: memory.id,
        title: memory.title || 'Untitled',
        type: memory.type,
        createdAt: memory.createdAt,
        storageLocations: Array.from(storageLocations),
        assetCount: 0, // We'll get this separately if needed
      });
    }

    // Display memories
    memoriesWithStorage.forEach((memory, index) => {
      console.log(`\n${index + 1}. ${memory.title}`);
      console.log('─'.repeat(60));
      console.log(`   ID: ${memory.id}`);
      console.log(`   Type: ${memory.type}`);
      console.log(`   Created: ${memory.createdAt.toLocaleDateString()} ${memory.createdAt.toLocaleTimeString()}`);
      console.log(`   Assets: ${memory.assetCount}`);
      console.log(`   Storage: ${memory.storageLocations.length > 0 ? memory.storageLocations.join(', ') : 'UNKNOWN'}`);

      // Show first few characters of title for easy identification
      if (memory.title.length > 50) {
        console.log(`   Preview: ${memory.title.substring(0, 50)}...`);
      }
    });

    console.log('\n' + '='.repeat(80));
    console.log(`📊 SUMMARY:`);
    console.log(`   Total memories: ${memoriesWithStorage.length}`);
    console.log(`   With storage info: ${memoriesWithStorage.filter(m => m.storageLocations.length > 0).length}`);
    console.log(`   Unknown storage: ${memoriesWithStorage.filter(m => m.storageLocations.length === 0).length}`);

    // Show storage breakdown
    const storageBreakdown = new Map<string, number>();
    memoriesWithStorage.forEach(memory => {
      if (memory.storageLocations.length === 0) {
        storageBreakdown.set('UNKNOWN', (storageBreakdown.get('UNKNOWN') || 0) + 1);
      } else {
        memory.storageLocations.forEach(location => {
          storageBreakdown.set(location, (storageBreakdown.get(location) || 0) + 1);
        });
      }
    });

    console.log(`\n🏪 STORAGE BREAKDOWN:`);
    Array.from(storageBreakdown.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([location, count]) => {
        console.log(`   ${location}: ${count} memories`);
      });
  } catch (error) {
    console.error('❌ Error listing memories:', error);
    throw error;
  }
}

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.error('❌ Error: Email address is required');
    console.log('\nUsage: npx tsx scripts/db/memories/list-user-memories.ts <email>');
    console.log('Example: npx tsx scripts/db/memories/list-user-memories.ts stefanolombardo@posteo.de');
    process.exit(1);
  }

  try {
    await listUserMemories(email);
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}
