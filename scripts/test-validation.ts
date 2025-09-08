#!/usr/bin/env tsx

/**
 * Test script for storage validation utilities
 */

import { validateStorageSettings, getStorageValidationMessage } from "../src/lib/storage-validation";

function testValidation() {
  console.log("🧪 Testing storage validation...");
  console.log("=================================");

  // Test 1: Valid settings (dual)
  const validSettings = {
    storagePreference: "dual" as const,
    storagePrimaryStorage: "neon-db" as const,
  };

  const result1 = validateStorageSettings(validSettings);
  console.log("✅ Valid settings (dual):", result1.isValid);
  if (!result1.isValid) console.log("Errors:", result1.errors);

  // Test 2: Valid settings (neon only)
  const neonSettings = {
    storagePreference: "neon" as const,
    storagePrimaryStorage: "neon-db" as const,
  };

  const result2 = validateStorageSettings(neonSettings);
  console.log("✅ Valid settings (neon only):", result2.isValid);
  if (!result2.isValid) console.log("Errors:", result2.errors);

  // Test 3: Valid settings (icp only)
  const icpSettings = {
    storagePreference: "icp" as const,
    storagePrimaryStorage: "icp-canister" as const,
  };

  const result3 = validateStorageSettings(icpSettings);
  console.log("✅ Valid settings (icp only):", result3.isValid);
  if (!result3.isValid) console.log("Errors:", result3.errors);

  // Test 4: Invalid primary storage mismatch
  const invalidPrimary = {
    storagePreference: "icp" as const,
    storagePrimaryStorage: "neon-db" as const,
  };

  const result4 = validateStorageSettings(invalidPrimary);
  console.log("❌ Invalid primary storage mismatch:", result4.isValid);
  if (!result4.isValid) {
    console.log("Errors:", result4.errors);
    console.log("Message:", getStorageValidationMessage(result4));
  }

  // Test 5: Warning case (icp only)
  const warningSettings = {
    storagePreference: "icp" as const,
    storagePrimaryStorage: "icp-canister" as const,
  };

  const result5 = validateStorageSettings(warningSettings);
  console.log("⚠️  Warning case (icp only):", result5.isValid);
  console.log("Warnings:", result5.warnings);
}

// Run the test
if (require.main === module) {
  testValidation();
}

export { testValidation };
