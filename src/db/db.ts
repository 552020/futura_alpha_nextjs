import { config } from 'dotenv';
import { createDb } from './pg-pool';

config({ path: '.env.local' });

if (typeof window !== 'undefined') {
  throw new Error('❌ db.ts should NEVER be imported in a client component!');
}

// DATABASE_URL is the runtime connection (Neon pooler or PgBouncer).
// DATABASE_URL_UNPOOLED is accepted as a fallback for older env setups.
const connectionString =
  process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED;

if (!connectionString) {
  throw new Error(
    "❌ DATABASE_URL is missing! Make sure it's set in .env.local"
  );
}

export const db = createDb(connectionString);

// Export everything from new schema structure
export * from './index';
