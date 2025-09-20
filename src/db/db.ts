import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import * as schema from './schema'; // Import your schema

config({ path: '.env.local' }); // or .env.local

if (typeof window !== 'undefined') {
  throw new Error('❌ db.ts should NEVER be imported in a client component!');
}

// Ensure DATABASE_URL is set
if (!process.env.DATABASE_URL && !process.env.DATABASE_URL_UNPOOLED) {
  throw new Error("❌ DATABASE_URL or DATABASE_URL_UNPOOLED is missing! Make sure it's set in .env.local");
}

// Use unpooled connection for non-browser environments (like seeding)
const connectionString = typeof window === 'undefined' ? process.env.DATABASE_URL_UNPOOLED : process.env.DATABASE_URL;

const sql = neon(connectionString!);
export const db = drizzle(sql, { schema }); // Pass schema as second parameter
