#!/usr/bin/env tsx

// Interactive script to set up business relationships
import { db } from '@/db/db';
import { businessRelationship, users, allUsers } from '@/db';
import { eq } from 'drizzle-orm';
import * as readline from 'readline';

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Helper function to ask questions
function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

// Helper function to ask yes/no questions
function askYesNo(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    rl.question(`${question} (y/n): `, (answer) => {
      const normalized = answer.toLowerCase().trim();
      resolve(normalized === 'y' || normalized === 'yes');
    });
  });
}

async function setupBusinessRelationshipInteractive() {
  try {
    console.log('🏢 Business Relationship Setup');
    console.log('================================');
    console.log(
      'This script will help you set up a business relationship between a photographer and a client.'
    );
    console.log('');

    // Ask for business email (photographer)
    const businessEmail = await askQuestion('📸 Enter photographer email: ');
    if (!businessEmail) {
      throw new Error('Photographer email is required');
    }

    // Ask for client email
    const clientEmail = await askQuestion('👤 Enter client email: ');
    if (!clientEmail) {
      throw new Error('Client email is required');
    }

    console.log('');
    console.log('🔍 Looking up users...');

    // Get the business user ID
    const [businessUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, businessEmail))
      .limit(1);
    if (!businessUser) {
      throw new Error(
        `❌ Photographer with email ${businessEmail} not found. Please make sure they have an account.`
      );
    }

    // Get the client user ID
    const [clientUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, clientEmail))
      .limit(1);
    if (!clientUser) {
      throw new Error(
        `❌ Client with email ${clientEmail} not found. Please make sure they have an account.`
      );
    }

    // Get the all_user IDs for both users
    const [businessAllUser] = await db
      .select()
      .from(allUsers)
      .where(eq(allUsers.userId, businessUser.id))
      .limit(1);
    if (!businessAllUser) {
      throw new Error(
        `❌ AllUser record not found for photographer ${businessEmail}`
      );
    }

    const [clientAllUser] = await db
      .select()
      .from(allUsers)
      .where(eq(allUsers.userId, clientUser.id))
      .limit(1);
    if (!clientAllUser) {
      throw new Error(`❌ AllUser record not found for client ${clientEmail}`);
    }

    console.log('✅ Found users:');
    console.log(
      `   📸 Photographer: ${businessUser.name || 'No name'} (${businessUser.email})`
    );
    console.log(
      `   👤 Client: ${clientUser.name || 'No name'} (${clientUser.email})`
    );
    console.log('');

    // Check for existing relationships
    const existingRelationships = await db
      .select()
      .from(businessRelationship)
      .where(eq(businessRelationship.clientId, clientUser.id));

    if (existingRelationships.length > 0) {
      console.log(
        '⚠️  Warning: This client already has business relationships:'
      );
      existingRelationships.forEach((rel, index) => {
        console.log(`   ${index + 1}. Relationship ID: ${rel.id}`);
      });
      console.log('');

      const shouldContinue = await askYesNo(
        'Do you want to continue and add another relationship?'
      );
      if (!shouldContinue) {
        console.log('❌ Operation cancelled');
        return;
      }
    }

    // Confirm the relationship
    const shouldCreate = await askYesNo(
      `Create relationship: ${clientUser.email} → ${businessUser.email}?`
    );
    if (!shouldCreate) {
      console.log('❌ Operation cancelled');
      return;
    }

    // Create the business relationship
    console.log('🔗 Creating business relationship...');
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

    console.log('');
    console.log('✅ Business relationship created successfully!');
    console.log('📋 Relationship Details:');
    console.log(`   ID: ${newRelationship.id}`);
    console.log(`   Photographer: ${businessUser.email}`);
    console.log(`   Client: ${clientUser.email}`);
    console.log(`   Created: ${newRelationship.createdAt}`);
    console.log('');

    // Ask if they want to create another relationship
    const createAnother = await askYesNo(
      'Do you want to create another business relationship?'
    );
    if (createAnother) {
      console.log('');
      await setupBusinessRelationshipInteractive();
    } else {
      console.log(
        '🎉 All done! The client can now send photos to their photographer.'
      );
    }
  } catch (error) {
    console.error(
      '❌ Error setting up business relationship:',
      error instanceof Error ? error.message : error
    );
  } finally {
    rl.close();
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n❌ Operation cancelled by user');
  rl.close();
  process.exit(0);
});

// Start the interactive setup
console.log('Starting interactive business relationship setup...\n');
setupBusinessRelationshipInteractive();
