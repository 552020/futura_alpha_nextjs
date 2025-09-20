const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

async function debugMemories() {
  const client = neon(process.env.DATABASE_URL_UNPOOLED);

  try {
    console.log('🔍 Checking database connection...');

    // Check if memories table exists and has data
    const memoriesCount = await client`SELECT COUNT(*) as count FROM memories`;
    console.log('📊 Total memories in database:', memoriesCount[0].count);

    // Check memories for the specific user
    const userMemories = await client`
      SELECT id, owner_id, type, parent_folder_id, created_at 
      FROM memories 
      WHERE owner_id = 'addcfcef-1cf4-45ad-b0e1-15daa49d8c15'
      ORDER BY created_at DESC
    `;
    console.log('👤 Memories for user addcfcef-1cf4-45ad-b0e1-15daa49d8c15:', userMemories.length);
    console.log('📋 Sample memories:', userMemories.slice(0, 3));

    // Check if the folder exists
    const folder = await client`
      SELECT id, name, owner_id, created_at 
      FROM folders 
      WHERE id = '45e5bff0-064a-4352-8e20-6eb5ad3d6472'
    `;
    console.log('📁 Folder check:', folder.length > 0 ? folder[0] : 'NOT FOUND');

    // Check memories linked to the folder
    const folderMemories = await client`
      SELECT id, owner_id, type, parent_folder_id, created_at 
      FROM memories 
      WHERE parent_folder_id = '45e5bff0-064a-4352-8e20-6eb5ad3d6472'
    `;
    console.log('📁 Memories in folder:', folderMemories.length);
    console.log('📋 Folder memories:', folderMemories);
  } catch (error) {
    console.error('❌ Database error:', error);
  }
}

debugMemories();
