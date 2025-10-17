#!/usr/bin/env tsx

// Script to check business relationships for a specific email
import { db } from '@/db/db';
import { businessRelationship, users, allUsers } from '@/db';
import { eq, or } from 'drizzle-orm';

interface CheckOptions {
  email: string;
  verbose?: boolean;
  showClients?: boolean;
  showPhotographers?: boolean;
}

async function checkBusinessRelationships(options: CheckOptions) {
  const { email, verbose = false, showClients = false, showPhotographers = false } = options;

  try {
    if (verbose) {
      console.log('🔍 Business Relationship Checker');
      console.log('================================');
      console.log(`📧 Checking relationships for: ${email}`);
      console.log('');
    }

    // First, check if the user exists
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      console.log(`❌ User with email ${email} not found in the system.`);
      process.exit(0);
    }

    if (verbose) {
      console.log('✅ User found:');
      console.log(`   Name: ${user.name || 'No name'}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   User Type: ${user.userType}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log('');
    }

    // Get the all_user record
    const [allUser] = await db.select().from(allUsers).where(eq(allUsers.userId, user.id)).limit(1);
    if (!allUser) {
      console.log(`❌ AllUser record not found for ${email}`);
      process.exit(0);
    }

    if (verbose) {
      console.log(`📋 AllUser ID: ${allUser.id}`);
      console.log(`📋 AllUser Type: ${allUser.type}`);
      console.log('');
    }

    // Check relationships where this user is the business (photographer)
    const businessRelationships = await db
      .select()
      .from(businessRelationship)
      .where(eq(businessRelationship.businessId, allUser.id));

    // Check relationships where this user is the client
    const clientRelationships = await db
      .select()
      .from(businessRelationship)
      .where(eq(businessRelationship.clientId, allUser.id));

    console.log('📊 Business Relationship Summary:');
    console.log(`   As Photographer: ${businessRelationships.length} relationship(s)`);
    console.log(`   As Client: ${clientRelationships.length} relationship(s)`);
    console.log('');

    // Show photographer relationships
    if (businessRelationships.length > 0) {
      console.log('📸 As Photographer (Business):');
      for (const [index, rel] of businessRelationships.entries()) {
        console.log(`   ${index + 1}. Client: ${rel.clientEmail || 'Unknown'}`);
        console.log(`      Client Name: ${rel.clientName || 'Unknown'}`);
        console.log(`      Relationship ID: ${rel.id}`);
        console.log(`      Created: ${rel.createdAt}`);
        console.log('');
      }
    }

    // Show client relationships
    if (clientRelationships.length > 0) {
      console.log('👤 As Client:');
      for (const [index, rel] of clientRelationships.entries()) {
        // Get the photographer's email
        const [photographerAllUser] = await db.select().from(allUsers).where(eq(allUsers.id, rel.businessId)).limit(1);

        let photographerEmail = 'Unknown';
        if (photographerAllUser) {
          const [photographerUser] = await db
            .select()
            .from(users)
            .where(eq(users.id, photographerAllUser.userId!))
            .limit(1);
          photographerEmail = photographerUser?.email || 'Unknown';
        }

        console.log(`   ${index + 1}. Photographer: ${photographerEmail}`);
        console.log(`      Relationship ID: ${rel.id}`);
        console.log(`      Created: ${rel.createdAt}`);
        console.log('');
      }
    }

    // Summary
    const totalRelationships = businessRelationships.length + clientRelationships.length;
    if (totalRelationships === 0) {
      console.log('⚠️  No business relationships found for this user.');
      console.log('   This means:');
      console.log('   - If this user is a client, they cannot send photos to a photographer');
      console.log('   - If this user is a photographer, they have no clients');
      console.log('');
      console.log('💡 To create relationships, use:');
      console.log('   npm run setup-business-relationship');
    } else {
      console.log(`✅ Found ${totalRelationships} business relationship(s) for ${email}`);
    }
  } catch (error) {
    console.error('❌ Error checking business relationships:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Parse command line arguments
function parseArgs(): CheckOptions {
  const args = process.argv.slice(2);
  const options: CheckOptions = {
    email: '',
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--email':
      case '-e':
        options.email = args[++i];
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--show-clients':
      case '-c':
        options.showClients = true;
        break;
      case '--show-photographers':
      case '-p':
        options.showPhotographers = true;
        break;
      case '--help':
      case '-h':
        console.log(`
Usage: tsx check-business-relationships.ts [options]

Options:
  -e, --email <email>        Email to check (required)
  -v, --verbose              Show detailed output
  -c, --show-clients         Show only clients (for photographers)
  -p, --show-photographers  Show only photographers (for clients)
  -h, --help                 Show this help message

Examples:
  tsx check-business-relationships.ts -e client@example.com
  tsx check-business-relationships.ts -e photographer@example.com --verbose
  tsx check-business-relationships.ts -e photographer@example.com --show-clients
  tsx check-business-relationships.ts -e client@example.com --show-photographers
        `);
        process.exit(0);
        break;
      default:
        console.error(`Unknown argument: ${arg}`);
        process.exit(1);
    }
  }

  if (!options.email) {
    console.error('❌ --email is required');
    console.log('Use --help for usage information');
    process.exit(1);
  }

  return options;
}

// Main execution
async function main() {
  const options = parseArgs();
  await checkBusinessRelationships(options);
}

main();
