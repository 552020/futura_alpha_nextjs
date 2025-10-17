import { seedTenenbaum } from './fixtures/tenenbaum';

import { fatLogger } from '@/lib/logger';
export async function seed() {
  // fatLogger.info("🌱 Starting database seeding...");

  try {
    // Seed Tenenbaum family data
    await seedTenenbaum();

    // fatLogger.info("✅ Database seeding completed successfully");
    process.exit(0);
  } catch (error) {
    fatLogger.error('❌ Error seeding database:', 'be', { data: error instanceof Error ? error : undefined });
    process.exit(1);
  }
}

// Run the seed function
seed();
