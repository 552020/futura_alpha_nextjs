import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

async function debugView() {
  const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
  const db = drizzle(sql);

  console.log('🔍 Debugging memory_presence view...');

  try {
    // Check what's in storage_edges
    console.log('\n1. Storage edges data:');
    const edges = await db.execute(`SELECT * FROM storage_edges LIMIT 5`);
    console.log(JSON.stringify(edges, null, 2));

    // Check memory_presence view
    console.log('\n2. Memory presence view:');
    const presence = await db.execute(`SELECT * FROM memory_presence`);
    console.log(JSON.stringify(presence, null, 2));

    // Check specific memory
    console.log('\n3. Specific memory presence:');
    const specific = await db.execute(`
      SELECT * FROM memory_presence 
      WHERE memory_id = '550e8400-e29b-41d4-a716-446655440000' 
      AND memory_type = 'image'
    `);
    console.log(JSON.stringify(specific, null, 2));
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugView();
