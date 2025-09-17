import { isS3Configured, getPreferredStorageType } from './s3';

export interface StorageProviderStatus {
  name: string;
  configured: boolean;
  available: boolean;
  priority: number;
  description: string;
  requirements?: string[];
}

export interface StorageConfiguration {
  preferred: string;
  available: StorageProviderStatus[];
  fallbacks: string[];
  warnings: string[];
}

/**
 * Check if Vercel Blob is configured
 */
export function isVercelBlobConfigured(): boolean {
  // Vercel Blob typically works out of the box in Vercel deployments
  // or with BLOB_READ_WRITE_TOKEN in development
  return !!(
    process.env.BLOB_READ_WRITE_TOKEN ||
    process.env.VERCEL_ENV
  );
}

/**
 * Check if ICP Canister is configured
 */
export function isICPConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_ICP_CANISTER_ID &&
    process.env.NEXT_PUBLIC_ICP_NETWORK
  );
}

/**
 * Check if Neon DB storage is configured
 */
export function isNeonDBConfigured(): boolean {
  // This would depend on your Neon DB configuration
  // For now, assuming it's available if database is configured
  return !!(process.env.DATABASE_URL || process.env.NEON_DATABASE_URL);
}

/**
 * Get the status of all storage providers
 */
export function getStorageProviderStatuses(): StorageProviderStatus[] {
  return [
    {
      name: 's3',
      configured: isS3Configured(),
      available: isS3Configured(),
      priority: 1,
      description: 'Amazon S3 - Scalable object storage',
      requirements: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_S3_BUCKET']
    },
    {
      name: 'vercel-blob',
      configured: isVercelBlobConfigured(),
      available: isVercelBlobConfigured(),
      priority: 2,
      description: 'Vercel Blob - Managed blob storage',
      requirements: ['BLOB_READ_WRITE_TOKEN or Vercel deployment']
    },
    {
      name: 'icp-canister',
      configured: isICPConfigured(),
      available: isICPConfigured(),
      priority: 3,
      description: 'Internet Computer Protocol - Decentralized storage',
      requirements: ['NEXT_PUBLIC_ICP_CANISTER_ID', 'NEXT_PUBLIC_ICP_NETWORK']
    },
    {
      name: 'neon-db',
      configured: isNeonDBConfigured(),
      available: isNeonDBConfigured(),
      priority: 4,
      description: 'Neon Database - PostgreSQL-based storage',
      requirements: ['DATABASE_URL or NEON_DATABASE_URL']
    }
  ];
}

/**
 * Get comprehensive storage configuration information
 */
export function getStorageConfiguration(): StorageConfiguration {
  const providers = getStorageProviderStatuses();
  const preferred = getPreferredStorageType();
  const availableProviders = providers.filter(p => p.available);
  const warnings: string[] = [];

  // Check if preferred provider is available
  const preferredProvider = providers.find(p => p.name === preferred);
  if (!preferredProvider?.available) {
    warnings.push(`Preferred storage '${preferred}' is not properly configured`);
  }

  // Check if we have at least one working storage provider
  if (availableProviders.length === 0) {
    warnings.push('No storage providers are properly configured');
  }

  // Generate fallback order (exclude preferred, sort by priority)
  const fallbacks = availableProviders
    .filter(p => p.name !== preferred)
    .sort((a, b) => a.priority - b.priority)
    .map(p => p.name);

  return {
    preferred,
    available: providers,
    fallbacks,
    warnings
  };
}

/**
 * Get the best available storage provider
 */
export function getBestAvailableStorage(): string {
  const providers = getStorageProviderStatuses();
  const availableProviders = providers
    .filter(p => p.available)
    .sort((a, b) => a.priority - b.priority);

  return availableProviders[0]?.name || 'vercel-blob'; // fallback to vercel-blob
}

/**
 * Validate storage configuration and provide detailed feedback
 */
export function validateStorageConfiguration(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
} {
  const config = getStorageConfiguration();
  const errors: string[] = [];
  const warnings: string[] = [...config.warnings];
  const recommendations: string[] = [];

  // Critical: No storage providers available
  if (config.available.filter(p => p.available).length === 0) {
    errors.push('No storage providers are configured. Please set up at least one storage option.');
  }

  // Warning: Preferred storage not available
  const preferredProvider = config.available.find(p => p.name === config.preferred);
  if (!preferredProvider?.available) {
    warnings.push(`Preferred storage '${config.preferred}' is not available`);

    const bestAlternative = getBestAvailableStorage();
    recommendations.push(`Consider switching to '${bestAlternative}' or configuring ${config.preferred}`);
  }

  // Recommendations for better setup
  if (config.fallbacks.length === 0) {
    recommendations.push('Configure multiple storage providers for better reliability');
  }

  // S3-specific recommendations
  const s3Provider = config.available.find(p => p.name === 's3');
  if (s3Provider?.configured && !s3Provider.available) {
    recommendations.push('S3 is configured but may have permission issues. Check your AWS IAM policies.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    recommendations
  };
}

/**
 * Log storage configuration status (for debugging)
 */
export function logStorageStatus(): void {
  const config = getStorageConfiguration();
  const validation = validateStorageConfiguration();

  console.log('\n🗂️ Storage Configuration Status:');
  console.log(`   Preferred: ${config.preferred}`);

  console.log('\n📦 Available Providers:');
  config.available.forEach(provider => {
    const status = provider.available ? '✅' : '❌';
    console.log(`   ${status} ${provider.name} - ${provider.description}`);
    if (!provider.available && provider.requirements) {
      console.log(`     Missing: ${provider.requirements.join(', ')}`);
    }
  });

  if (config.fallbacks.length > 0) {
    console.log('\n🔄 Fallback Order:');
    config.fallbacks.forEach((fallback, index) => {
      console.log(`   ${index + 1}. ${fallback}`);
    });
  }

  if (validation.warnings.length > 0) {
    console.log('\n⚠️ Warnings:');
    validation.warnings.forEach(warning => {
      console.log(`   - ${warning}`);
    });
  }

  if (validation.errors.length > 0) {
    console.log('\n❌ Errors:');
    validation.errors.forEach(error => {
      console.log(`   - ${error}`);
    });
  }

  if (validation.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    validation.recommendations.forEach(rec => {
      console.log(`   - ${rec}`);
    });
  }

  console.log(''); // Empty line for spacing
}

/**
 * Environment variable checker utility
 */
export function checkRequiredEnvVars(): {
  missing: string[];
  present: string[];
} {
  const allRequired = [
    // S3 vars
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_S3_BUCKET',
    'AWS_S3_REGION',
    // Vercel vars
    'BLOB_READ_WRITE_TOKEN',
    // ICP vars
    'NEXT_PUBLIC_ICP_CANISTER_ID',
    'NEXT_PUBLIC_ICP_NETWORK',
    // Database vars
    'DATABASE_URL',
    'NEON_DATABASE_URL'
  ];

  const present: string[] = [];
  const missing: string[] = [];

  allRequired.forEach(varName => {
    if (process.env[varName]) {
      present.push(varName);
    } else {
      missing.push(varName);
    }
  });

  return { missing, present };
}
