#!/usr/bin/env tsx

/**
 * Script to verify that all constraints in the database match the schema definition
 * 
 * This script checks:
 * 1. All CHECK constraints in DB are defined in schema
 * 2. All CHECK constraints in schema exist in DB
 * 3. No orphaned constraints exist
 * 
 * Usage:
 *   npx tsx scripts/verify-schema-constraints.ts
 */

import { db } from '../src/db/db';
import { sql } from 'drizzle-orm';

interface ConstraintInfo {
  tableName: string;
  constraintName: string;
  checkClause: string;
}

// Define the CHECK constraints that should exist based on our schema
const SCHEMA_CONSTRAINTS: ConstraintInfo[] = [
  {
    tableName: 'memory_assets',
    constraintName: 'memory_assets_bytes_positive',
    checkClause: '((bytes > 0))'
  },
  {
    tableName: 'memory_assets', 
    constraintName: 'memory_assets_dimensions_positive',
    checkClause: '((((width IS NULL) OR (width > 0)) AND ((height IS NULL) OR (height > 0))))'
  }
];

async function getDatabaseConstraints(): Promise<ConstraintInfo[]> {
  const result = await db.execute(sql`
    SELECT 
      tc.table_name,
      tc.constraint_name,
      cc.check_clause
    FROM information_schema.table_constraints tc
    JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
    WHERE tc.table_schema = 'public'
    AND tc.constraint_type = 'CHECK'
    AND tc.constraint_name NOT LIKE '2200_%'  -- Exclude auto-generated NOT NULL constraints
    ORDER BY tc.table_name, tc.constraint_name
  `);

  return result.rows.map(row => ({
    tableName: row.table_name,
    constraintName: row.constraint_name,
    checkClause: row.check_clause
  }));
}

function normalizeCheckClause(clause: string): string {
  // Normalize whitespace and parentheses for comparison
  return clause.replace(/\s+/g, ' ').trim();
}

async function verifyConstraints() {
  console.log('🔍 Verifying schema constraints...');
  console.log('=====================================');

  try {
    const dbConstraints = await getDatabaseConstraints();
    
    console.log(`📋 Schema defines ${SCHEMA_CONSTRAINTS.length} CHECK constraints:`);
    SCHEMA_CONSTRAINTS.forEach(constraint => {
      console.log(`  ✅ ${constraint.tableName}.${constraint.constraintName}`);
    });

    console.log(`\n🗄️  Database has ${dbConstraints.length} CHECK constraints:`);
    dbConstraints.forEach(constraint => {
      console.log(`  ✅ ${constraint.tableName}.${constraint.constraintName}`);
    });

    // Check for missing constraints in database
    console.log('\n🔍 Checking for missing constraints in database...');
    let missingInDb = 0;
    for (const schemaConstraint of SCHEMA_CONSTRAINTS) {
      const found = dbConstraints.find(db => 
        db.tableName === schemaConstraint.tableName && 
        db.constraintName === schemaConstraint.constraintName
      );
      
      if (!found) {
        console.log(`  ❌ MISSING: ${schemaConstraint.tableName}.${schemaConstraint.constraintName}`);
        missingInDb++;
      } else {
        // Verify the check clause matches
        const normalizedSchema = normalizeCheckClause(schemaConstraint.checkClause);
        const normalizedDb = normalizeCheckClause(found.checkClause);
        
        if (normalizedSchema !== normalizedDb) {
          console.log(`  ⚠️  MISMATCH: ${schemaConstraint.tableName}.${schemaConstraint.constraintName}`);
          console.log(`     Schema: ${normalizedSchema}`);
          console.log(`     Database: ${normalizedDb}`);
        } else {
          console.log(`  ✅ MATCH: ${schemaConstraint.tableName}.${schemaConstraint.constraintName}`);
        }
      }
    }

    // Check for orphaned constraints in database
    console.log('\n🔍 Checking for orphaned constraints in database...');
    let orphanedInDb = 0;
    for (const dbConstraint of dbConstraints) {
      const found = SCHEMA_CONSTRAINTS.find(schema => 
        schema.tableName === dbConstraint.tableName && 
        schema.constraintName === dbConstraint.constraintName
      );
      
      if (!found) {
        console.log(`  ❌ ORPHANED: ${dbConstraint.tableName}.${dbConstraint.constraintName}`);
        console.log(`     Clause: ${dbConstraint.checkClause}`);
        orphanedInDb++;
      }
    }

    console.log('\n' + '='.repeat(40));
    
    if (missingInDb === 0 && orphanedInDb === 0) {
      console.log('✅ All constraints are perfectly aligned!');
      console.log('   - All schema constraints exist in database');
      console.log('   - No orphaned constraints in database');
      console.log('   - All check clauses match');
      return 0;
    } else {
      console.log('❌ Constraint mismatches found!');
      if (missingInDb > 0) {
        console.log(`   - ${missingInDb} constraints missing in database`);
      }
      if (orphanedInDb > 0) {
        console.log(`   - ${orphanedInDb} orphaned constraints in database`);
      }
      return 1;
    }

  } catch (error: any) {
    console.error('❌ Error verifying constraints:', error.message);
    return 1;
  }
}

// Run the verification
if (require.main === module) {
  verifyConstraints()
    .then(exitCode => {
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('❌ Constraint verification failed:', error);
      process.exit(1);
    });
}

export { verifyConstraints, SCHEMA_CONSTRAINTS };
