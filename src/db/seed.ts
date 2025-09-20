import { seedTenenbaum } from './fixtures/tenenbaum';

export async function seed() {
  // console.log("🌱 Starting database seeding...");

  try {
    // Seed Tenenbaum family data
    await seedTenenbaum();

    // console.log("✅ Database seeding completed successfully");
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seed function
seed();
