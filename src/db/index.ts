/**
 * Database Schema Index
 *
 * This file serves as the main export point for the database schema.
 * It re-exports everything from the split schema files for backwards compatibility
 * and clean imports throughout the application.
 *
 * File organization:
 * - enums.ts: PostgreSQL enums and TypeScript type definitions
 * - tables.ts: All database table definitions
 * - relations.ts: Drizzle ORM relations for query building
 * - types.ts: All inferred TypeScript types from tables
 * - index.ts: This file - re-exports everything
 */

// Re-export everything from enums
export * from './enums';

// Re-export everything from tables
export * from './tables';

// Re-export everything from relations
export * from './relations';

// Re-export everything from types
export * from './types';
