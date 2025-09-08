/**
 * Storage Backend Validation Utilities
 * 
 * Provides application-level validation for storage backend settings
 * using the enum-based approach to avoid CHECK constraints.
 */

export type StoragePreference = "neon" | "icp" | "dual";

export interface StorageSettings {
  storagePreference: StoragePreference;
  storagePrimaryStorage: "neon-db" | "vercel-blob" | "icp-canister";
}

// Legacy interface for backward compatibility during transition
export interface LegacyStorageSettings {
  storageIcpEnabled: boolean;
  storageNeonEnabled: boolean;
  storagePrimaryStorage: "neon-db" | "vercel-blob" | "icp-canister";
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Converts legacy boolean settings to enum-based storage preference
 * 
 * @param settings - Legacy boolean-based settings
 * @returns Storage preference enum value
 */
export function toStoragePreference(settings: LegacyStorageSettings): StoragePreference {
  if (settings.storageIcpEnabled && settings.storageNeonEnabled) {
    return "dual";
  }
  if (settings.storageIcpEnabled) {
    return "icp";
  }
  if (settings.storageNeonEnabled) {
    return "neon";
  }
  throw new Error("At least one storage backend must be enabled");
}

/**
 * Converts enum-based storage preference to legacy boolean settings
 * 
 * @param preference - Storage preference enum value
 * @returns Legacy boolean-based settings
 */
export function fromStoragePreference(preference: StoragePreference): LegacyStorageSettings {
  switch (preference) {
    case "dual":
      return {
        storageIcpEnabled: true,
        storageNeonEnabled: true,
        storagePrimaryStorage: "neon-db",
      };
    case "icp":
      return {
        storageIcpEnabled: true,
        storageNeonEnabled: false,
        storagePrimaryStorage: "icp-canister",
      };
    case "neon":
      return {
        storageIcpEnabled: false,
        storageNeonEnabled: true,
        storagePrimaryStorage: "neon-db",
      };
    default:
      throw new Error(`Invalid storage preference: ${preference}`);
  }
}

/**
 * Validates storage backend settings (enum-based)
 * 
 * @param settings - The storage settings to validate
 * @returns Validation result with errors and warnings
 */
export function validateStorageSettings(settings: StorageSettings): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check that primary storage is compatible with the preference
  if (settings.storagePreference === "icp" && settings.storagePrimaryStorage !== "icp-canister") {
    errors.push("Primary storage must be ICP when using ICP-only preference");
  }

  if (settings.storagePreference === "neon" && settings.storagePrimaryStorage !== "neon-db") {
    errors.push("Primary storage must be Neon when using Neon-only preference");
  }

  // Add warnings for potentially suboptimal configurations
  if (settings.storagePreference === "icp") {
    warnings.push("Using only ICP storage may result in slower uploads and higher costs");
  }

  if (settings.storagePreference === "neon") {
    warnings.push("Consider enabling ICP storage for permanent, decentralized storage");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates legacy storage backend settings (boolean-based)
 * 
 * @param settings - The legacy storage settings to validate
 * @returns Validation result with errors and warnings
 */
export function validateLegacyStorageSettings(settings: LegacyStorageSettings): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check that at least one backend is enabled
  if (!settings.storageIcpEnabled && !settings.storageNeonEnabled) {
    errors.push("At least one storage backend must be enabled");
  }

  // Check that primary storage is among enabled backends
  if (settings.storagePrimaryStorage === "icp-canister" && !settings.storageIcpEnabled) {
    errors.push("ICP storage must be enabled to use it as primary storage");
  }

  if (settings.storagePrimaryStorage === "neon-db" && !settings.storageNeonEnabled) {
    errors.push("Neon storage must be enabled to use it as primary storage");
  }

  // Add warnings for potentially suboptimal configurations
  if (settings.storageIcpEnabled && !settings.storageNeonEnabled) {
    warnings.push("Using only ICP storage may result in slower uploads and higher costs");
  }

  if (!settings.storageIcpEnabled && settings.storageNeonEnabled) {
    warnings.push("Consider enabling ICP storage for permanent, decentralized storage");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Gets a user-friendly error message for storage validation
 *
 * @param result - The validation result
 * @returns Formatted error message or null if valid
 */
export function getStorageValidationMessage(result: ValidationResult): string | null {
  if (result.isValid) {
    return null;
  }

  const errorText = result.errors.join(", ");
  const warningText = result.warnings.length > 0 ? ` (Note: ${result.warnings.join(", ")})` : "";

  return `Storage settings invalid: ${errorText}${warningText}`;
}

/**
 * Validates storage settings and throws an error if invalid
 *
 * @param settings - The storage settings to validate
 * @throws Error if validation fails
 */
export function assertValidStorageSettings(settings: StorageSettings): void {
  const result = validateStorageSettings(settings);

  if (!result.isValid) {
    const message = getStorageValidationMessage(result);
    throw new Error(message || "Invalid storage settings");
  }
}
