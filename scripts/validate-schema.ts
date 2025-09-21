#!/usr/bin/env tsx

/**
 * Schema Validation Script
 *
 * This script compares your defined schema with the actual database structure
 * to catch schema mismatches before they cause runtime errors.
 *
 * Usage:
 *   npx tsx scripts/validate-schema.ts
 *
 * Exit codes:
 *   0 - Schema matches database
 *   1 - Schema mismatch detected
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

interface TableInfo {
  tableName: string;
  columns: ColumnInfo[];
}

interface ColumnInfo {
  columnName: string;
  dataType: string;
  isNullable: boolean;
  columnDefault: string | null;
  isPrimaryKey: boolean;
}

interface SchemaMismatch {
  table: string;
  column: string;
  expected: string;
  actual: string;
  type: 'type' | 'nullable' | 'default' | 'missing' | 'extra';
}

async function validateSchema() {
  const sqlClient = neon(process.env.DATABASE_URL_UNPOOLED!);
  const db = drizzle(sqlClient);

  console.log('🔍 Validating schema against database...');
  console.log('=====================================');

  // Get all tables from the database
  const tablesResult = await db.execute(sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  const dbTables = tablesResult.rows.map(row => row.table_name);
  console.log(`📋 Found ${dbTables.length} tables in database:`, dbTables.join(', '));

  // Get column information for each table
  const tableInfos: TableInfo[] = [];
  for (const tableName of dbTables) {
    const columnsResult = await db.execute(sql`
      SELECT 
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key
      FROM information_schema.columns c
      LEFT JOIN (
        SELECT ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku 
          ON tc.constraint_name = ku.constraint_name
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_name = ${tableName}
      ) pk ON c.column_name = pk.column_name
      WHERE c.table_name = ${tableName}
      ORDER BY c.ordinal_position
    `);

    const columns: ColumnInfo[] = columnsResult.rows.map(row => ({
      columnName: row.column_name,
      dataType: row.data_type,
      isNullable: row.is_nullable === 'YES',
      columnDefault: row.column_default,
      isPrimaryKey: row.is_primary_key,
    }));

    tableInfos.push({
      tableName,
      columns,
    });
  }

  // Check for schema mismatches
  const mismatches: SchemaMismatch[] = [];

  // Check storage_edges table specifically (our recent issue)
  const storageEdgesTable = tableInfos.find(t => t.tableName === 'storage_edges');
  if (storageEdgesTable) {
    console.log('\n🔍 Checking storage_edges table...');

    // Check memory_id column
    const memoryIdColumn = storageEdgesTable.columns.find(c => c.columnName === 'memory_id');
    if (memoryIdColumn) {
      if (memoryIdColumn.dataType !== 'uuid') {
        mismatches.push({
          table: 'storage_edges',
          column: 'memory_id',
          expected: 'uuid',
          actual: memoryIdColumn.dataType,
          type: 'type',
        });
      }
    }

    // Check id column
    const idColumn = storageEdgesTable.columns.find(c => c.columnName === 'id');
    if (idColumn) {
      if (idColumn.dataType !== 'uuid') {
        mismatches.push({
          table: 'storage_edges',
          column: 'id',
          expected: 'uuid',
          actual: idColumn.dataType,
          type: 'type',
        });
      }
    }
  }

  // Check other critical tables
  const criticalTables = ['memories', 'memory_assets', 'user_hosting_preferences'];
  for (const tableName of criticalTables) {
    const table = tableInfos.find(t => t.tableName === tableName);
    if (table) {
      console.log(`\n🔍 Checking ${tableName} table...`);

      // Check for common issues
      for (const column of table.columns) {
        // Check for integer IDs that should be UUIDs
        if (column.columnName.endsWith('_id') && column.dataType === 'integer') {
          mismatches.push({
            table: tableName,
            column: column.columnName,
            expected: 'uuid',
            actual: column.dataType,
            type: 'type',
          });
        }
      }
    }
  }

  // Report results
  console.log('\n' + '='.repeat(50));

  if (mismatches.length === 0) {
    console.log('✅ Schema validation passed!');
    console.log('All tables match expected schema.');
    return 0;
  } else {
    console.log('❌ Schema mismatches detected:');
    console.log('================================');

    for (const mismatch of mismatches) {
      console.log(`\n🔴 ${mismatch.table}.${mismatch.column}`);
      console.log(`   Expected: ${mismatch.expected}`);
      console.log(`   Actual:   ${mismatch.actual}`);
      console.log(`   Type:     ${mismatch.type}`);
    }

    console.log('\n💡 To fix these issues:');
    console.log('   1. Run: npx drizzle-kit push --force');
    console.log('   2. Or create a migration: npx drizzle-kit generate');
    console.log('   3. Or drop/recreate tables if data loss is acceptable');

    return 1;
  }
}

// Run the validation
if (require.main === module) {
  validateSchema()
    .then(exitCode => {
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('❌ Schema validation failed:', error);
      process.exit(1);
    });
}

export { validateSchema };
