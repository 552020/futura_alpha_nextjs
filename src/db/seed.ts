import { seedTenenbaum } from './fixtures/tenenbaum';

import { logger } from '@/lib/logger';
export async function seed() {
  // logger.info("🌱 Starting database seeding...");

  try {
    // Seed Tenenbaum family data
    await seedTenenbaum();

    // logger.info("✅ Database seeding completed successfully");
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error seeding database:', undefined, { data: error instanceof Error ? error : undefined });
    process.exit(1);
  }
}

// Run the seed function
seed();
