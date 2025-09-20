import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import * as schema from './schema'; // Import the SAME schema

// Load environment variables
config({ path: '.env.local' });

// Test database connection - no client-side restriction
// This is specifically for testing purposes

// Use test database URL if available, fallback to unpooled connection
const testConnectionString = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL_UNPOOLED;

if (!testConnectionString) {
  throw new Error("❌ TEST_DATABASE_URL or DATABASE_URL_UNPOOLED is missing! Make sure it's set in .env.local");
}

// Create test database connection
const testSql = neon(testConnectionString);
export const testDb = drizzle(testSql, { schema });

// Export schema for convenience in tests
export { schema };

// Helper function to clean up test data
export async function cleanupTestData() {
  try {
    // Clean up test users (you can add more cleanup logic here)
    console.log('🧹 Cleaning up test data...');
    // Add specific cleanup logic as needed
  } catch (error) {
    console.error('❌ Error cleaning up test data:', error);
  }
}

// Helper function to check if we're in test environment
export function isTestEnvironment(): boolean {
  return process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
}
