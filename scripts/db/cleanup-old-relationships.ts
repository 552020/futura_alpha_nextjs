// Script to clean up old business relationships
import { db } from '@/db/db';
import { businessRelationship } from '@/db/schema';
import { eq } from 'drizzle-orm';

async function cleanupOldRelationships() {
  try {
    console.log('Cleaning up old business relationships...');

    // Delete relationships that reference the old user ID
    const oldUserId = '23234fd8-8e56-48fa-8a93-b3f71903b38e';

    const result = await db
      .delete(businessRelationship)
      .where(eq(businessRelationship.clientId, oldUserId))
      .returning();

    console.log(`✅ Deleted ${result.length} old business relationship(s)`);
  } catch (error) {
    console.error('Error cleaning up old relationships:', error);
  } finally {
    process.exit(0);
  }
}

cleanupOldRelationships();
