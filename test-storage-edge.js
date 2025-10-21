#!/usr/bin/env node

/**
 * Test script to debug storage edge creation
 */

const testData = {
  memoryId: 'e428889a-ebc9-9c6d-e428-000000009c6d',
  memoryType: 'image',
  artifact: 'metadata',
  locationMetadata: 'icp',
  locationAsset: null,
  present: true,
  location: 'icp://memory/e428889a-ebc9-9c6d-e428-000000009c6d',
  contentHash: null,
  sizeBytes: null,
  syncState: 'idle',
  syncError: null,
};

console.log('🧪 Testing storage edge creation with data:');
console.log(JSON.stringify(testData, null, 2));
console.log('');

console.log('🔍 Potential issues to check:');
console.log('1. Database connection');
console.log('2. isNull() function import');
console.log('3. Query syntax');
console.log('4. Database schema mismatch');
console.log('5. Transaction conflicts');
console.log('');

console.log('📝 To debug:');
console.log('1. Check server logs for specific error');
console.log('2. Verify database connection');
console.log('3. Test the query manually');
console.log('4. Check if the storage_edges table exists');
console.log('5. Verify the unique constraint is correct');
