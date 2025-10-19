#!/usr/bin/env tsx

// CLI script to set up business relationships with command line arguments
import { db } from '@/db/db';
import { businessRelationship, users, allUsers } from '@/db';
import { eq } from 'drizzle-orm';

interface SetupOptions {
  businessEmail: string;
  clientEmail: string;
  clearExisting?: boolean;
  verbose?: boolean;
}

async function setupBusinessRelationshipCLI(options: SetupOptions) {
  const { businessEmail, clientEmail, clearExisting = false, verbose = false } = options;

  try {
    if (verbose) {
      console.log('🏢 Business Relationship Setup (CLI Mode)');
      console.log('=====================================');
      console.log(`📸 Photographer: ${businessEmail}`);
      console.log(`👤 Client: ${clientEmail}`);
      console.log(`🗑️  Clear existing: ${clearExisting ? 'Yes' : 'No'}`);
      console.log('');
    }

    // Get the business user ID
    const [businessUser] = await db.select().from(users).where(eq(users.email, businessEmail)).limit(1);
    if (!businessUser) {
      throw new Error(`❌ Photographer with email ${businessEmail} not found. Please make sure they have an account.`);
    }

    // Get the client user ID
    const [clientUser] = await db.select().from(users).where(eq(users.email, clientEmail)).limit(1);
    if (!clientUser) {
      throw new Error(`❌ Client with email ${clientEmail} not found. Please make sure they have an account.`);
    }

    // Get the all_user IDs for both users
    const [businessAllUser] = await db.select().from(allUsers).where(eq(allUsers.userId, businessUser.id)).limit(1);
    if (!businessAllUser) {
      throw new Error(`❌ AllUser record not found for photographer ${businessEmail}`);
    }

    const [clientAllUser] = await db.select().from(allUsers).where(eq(allUsers.userId, clientUser.id)).limit(1);
    if (!clientAllUser) {
      throw new Error(`❌ AllUser record not found for client ${clientEmail}`);
    }

    if (verbose) {
      console.log('✅ Found users:');
      console.log(`   📸 Photographer: ${businessUser.name || 'No name'} (${businessUser.email})`);
      console.log(`   👤 Client: ${clientUser.name || 'No name'} (${clientUser.email})`);
      console.log('');
    }

    // Clear existing relationships if requested
    if (clearExisting) {
      if (verbose) {
        console.log('🗑️  Clearing existing business relationships...');
      }
      await db.delete(businessRelationship);
    }

    // Create the business relationship
    if (verbose) {
      console.log('🔗 Creating business relationship...');
    }

    const [newRelationship] = await db
      .insert(businessRelationship)
      .values({
        businessId: businessAllUser.id,
        clientId: clientAllUser.id,
        clientName: clientUser.name || 'Client',
        clientEmail: clientUser.email,
        createdAt: new Date(),
      })
      .returning();

    console.log('✅ Business relationship created successfully!');
    if (verbose) {
      console.log('📋 Relationship Details:');
      console.log(`   ID: ${newRelationship.id}`);
      console.log(`   Photographer: ${businessUser.email}`);
      console.log(`   Client: ${clientUser.email}`);
      console.log(`   Created: ${newRelationship.createdAt}`);
    }
  } catch (error) {
    console.error('❌ Error setting up business relationship:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Parse command line arguments
function parseArgs(): SetupOptions {
  const args = process.argv.slice(2);
  const options: SetupOptions = {
    businessEmail: '',
    clientEmail: '',
    clearExisting: false,
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--business-email':
      case '-b':
        options.businessEmail = args[++i];
        break;
      case '--client-email':
      case '-c':
        options.clientEmail = args[++i];
        break;
      case '--clear-existing':
        options.clearExisting = true;
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--help':
      case '-h':
        console.log(`
Usage: tsx setup-business-relationship-cli.ts [options]

Options:
  -b, --business-email <email>    Photographer email (required)
  -c, --client-email <email>      Client email (required)
  --clear-existing                Clear all existing relationships first
  -v, --verbose                   Show detailed output
  -h, --help                      Show this help message

Examples:
  tsx setup-business-relationship-cli.ts -b photographer@example.com -c client@example.com
  tsx setup-business-relationship-cli.ts -b photographer@example.com -c client@example.com --clear-existing --verbose
        `);
        process.exit(0);
        break;
      default:
        console.error(`Unknown argument: ${arg}`);
        process.exit(1);
    }
  }

  if (!options.businessEmail || !options.clientEmail) {
    console.error('❌ Both --business-email and --client-email are required');
    console.log('Use --help for usage information');
    process.exit(1);
  }

  return options;
}

// Main execution
async function main() {
  const options = parseArgs();
  await setupBusinessRelationshipCLI(options);
}

main();
