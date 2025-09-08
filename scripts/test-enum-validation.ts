#!/usr/bin/env tsx

/**
 * Test script for enum-based storage validation
 */

import {
  validateStorageSettings,
  validateLegacyStorageSettings,
  toStoragePreference,
  fromStoragePreference,
  getStorageValidationMessage,
} from "../src/lib/storage-validation";

function testEnumValidation() {
  console.log("🧪 Testing enum-based validation...");
  console.log("===================================");

  // Test 1: Valid enum settings
  const validEnumSettings = {
    storagePreference: "neon" as const,
    storagePrimaryStorage: "neon-db" as const,
  };

  const result1 = validateStorageSettings(validEnumSettings);
  console.log("✅ Valid enum settings (neon):", result1.isValid);
  if (!result1.isValid) console.log("Errors:", result1.errors);

  // Test 2: Valid dual settings
  const validDualSettings = {
    storagePreference: "dual" as const,
    storagePrimaryStorage: "neon-db" as const,
  };

  const result2 = validateStorageSettings(validDualSettings);
  console.log("✅ Valid dual settings:", result2.isValid);
  if (!result2.isValid) console.log("Errors:", result2.errors);

  // Test 3: Invalid primary storage mismatch
  const invalidSettings = {
    storagePreference: "icp" as const,
    storagePrimaryStorage: "neon-db" as const,
  };

  const result3 = validateStorageSettings(invalidSettings);
  console.log("❌ Invalid primary storage mismatch:", result3.isValid);
  if (!result3.isValid) {
    console.log("Errors:", result3.errors);
    console.log("Message:", getStorageValidationMessage(result3));
  }

  // Test 4: Conversion functions
  console.log("\n🔄 Testing conversion functions...");
  const legacySettings = {
    storageIcpEnabled: true,
    storageNeonEnabled: true,
    storagePrimaryStorage: "neon-db" as const,
  };

  const converted = toStoragePreference(legacySettings);
  console.log("Legacy to enum:", converted);

  const backToLegacy = fromStoragePreference(converted);
  console.log("Enum back to legacy:", backToLegacy);

  // Test 5: All enum values
  console.log("\n📋 Testing all enum values...");
  const enumValues = ["neon", "icp", "dual"] as const;

  for (const pref of enumValues) {
    const settings = {
      storagePreference: pref,
      storagePrimaryStorage: (pref === "icp" ? "icp-canister" : "neon-db") as
        | "neon-db"
        | "vercel-blob"
        | "icp-canister",
    };

    const result = validateStorageSettings(settings);
    console.log(`${pref}: ${result.isValid ? "✅" : "❌"}`);
    if (!result.isValid) console.log(`  Errors: ${result.errors.join(", ")}`);
  }
}

// Run the test
if (require.main === module) {
  testEnumValidation();
}

export { testEnumValidation };
