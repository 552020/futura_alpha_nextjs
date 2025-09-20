/**
 * STORAGE MANAGER
 *
 * This class manages multiple storage providers and provides a unified interface
 * for uploading files to different storage backends. It supports:
 * - Single provider uploads
 * - Multiple provider uploads (redundancy)
 * - Automatic fallback on failures
 * - Retry logic with exponential backoff
 */

import type {
  StorageProvider,
  StorageBackend,
  StorageManagerConfig,
  UploadOptions,
  UploadResult,
  DeleteOptions,
} from './types';
import { VercelBlobGrantProvider } from './providers/vercel-blob-grant';
// import { AWSS3Provider } from "./providers/aws-s3";
// import { ArweaveProvider } from "./providers/arweave";
// import { IPFSProvider } from "./providers/ipfs";
// import { CloudinaryProvider } from "./providers/cloudinary";
// import { ICPProvider } from "./providers/icp";
import { UploadError } from './types';

export class StorageManager {
  private providers: Map<StorageBackend, StorageProvider> = new Map();
  private config: Required<StorageManagerConfig>;

  constructor(config: StorageManagerConfig = {}) {
    this.config = {
      defaultBackend: config.defaultBackend || 's3',
      fallbackBackends: config.fallbackBackends || [], // No fallbacks for now - only use working providers
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
    };

    this.initializeProviders();
  }

  /**
   * Initialize all available storage providers
   */
  private initializeProviders(): void {
    console.log('🔧 Initializing storage providers...');

    // Register grant-based provider for client-side uploads (secure)
    const vercelBlobGrantProvider = new VercelBlobGrantProvider();
    this.providers.set('vercel_blob', vercelBlobGrantProvider);

    console.log('🔍 Checking Vercel Blob Grant provider availability...');
    console.log('🔍 Vercel Blob Grant isAvailable:', vercelBlobGrantProvider.isAvailable());

    // Note: S3, Arweave, IPFS, Cloudinary, ICP are not fully implemented yet
    // Only register them if they have proper implementations

    // Log available providers
    const availableProviders = Array.from(this.providers.entries())
      .filter(([, provider]) => provider.isAvailable())
      .map(([backend]) => backend);

    console.log(`📦 Storage Manager initialized with providers: ${availableProviders.join(', ')}`);
    console.log(`📦 Total registered providers: ${this.providers.size}`);

    if (availableProviders.length === 0) {
      console.error('❌ No storage providers are available! Check your environment variables.');
      console.error('❌ Environment check:');
      console.error('   - NODE_ENV:', process.env.NODE_ENV);
      console.error('   - BLOB_READ_WRITE_TOKEN:', process.env.BLOB_READ_WRITE_TOKEN ? 'SET' : 'NOT SET');
    }
  }

  /**
   * Upload a file to one or more storage providers
   */
  async upload(
    file: File,
    storageBackend: StorageBackend | StorageBackend[],
    options?: UploadOptions
  ): Promise<UploadResult | UploadResult[]> {
    if (Array.isArray(storageBackend)) {
      return this.uploadToMultipleProviders(file, storageBackend, options);
    } else {
      return this.uploadToSingleProvider(file, storageBackend, options);
    }
  }

  /**
   * Upload to a single provider with fallback support
   */
  private async uploadToSingleProvider(
    file: File,
    backend: StorageBackend,
    options?: UploadOptions
  ): Promise<UploadResult> {
    const provider = this.providers.get(backend);
    if (!provider) {
      throw new Error(`Storage provider ${backend} not found`);
    }

    if (!provider.isAvailable()) {
      console.warn(`⚠️ Provider ${backend} is not available, trying fallback...`);
      return this.uploadWithFallback(file, options);
    }

    try {
      return await this.uploadWithRetry(file, provider, options);
    } catch (error) {
      console.error(`❌ Provider ${backend} failed:`, error);
      console.warn(`🔄 Trying fallback providers...`);
      return this.uploadWithFallback(file, options);
    }
  }

  /**
   * Upload to multiple providers in parallel
   */
  private async uploadToMultipleProviders(
    file: File,
    backends: StorageBackend[],
    options?: UploadOptions
  ): Promise<UploadResult[]> {
    const availableBackends = backends.filter(backend => {
      const provider = this.providers.get(backend);
      return provider?.isAvailable() ?? false;
    });

    if (availableBackends.length === 0) {
      throw new Error('No available storage providers found');
    }

    console.log(`📤 Uploading to ${availableBackends.length} providers: ${availableBackends.join(', ')}`);

    const uploads = availableBackends.map(backend => this.uploadToSingleProvider(file, backend, options));

    const results = await Promise.allSettled(uploads);

    const successful = results
      .filter((result): result is PromiseFulfilledResult<UploadResult> => result.status === 'fulfilled')
      .map(result => result.value);

    if (successful.length === 0) {
      const errors = results
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .map(result => result.reason);

      throw new Error(`All uploads failed: ${errors.map(e => e.message).join(', ')}`);
    }

    console.log(`✅ Successfully uploaded to ${successful.length}/${availableBackends.length} providers`);
    return successful;
  }

  /**
   * Upload with automatic fallback to other providers
   */
  private async uploadWithFallback(file: File, options?: UploadOptions): Promise<UploadResult> {
    const fallbackBackends = this.config.fallbackBackends;
    const availableProviders = this.getAvailableProviders();

    console.log(`🔄 Available providers for fallback: ${availableProviders.join(', ')}`);
    console.log(`🔄 Configured fallback backends: ${fallbackBackends.join(', ')}`);

    // Try fallback backends that are actually available
    for (const backend of fallbackBackends) {
      if (availableProviders.includes(backend)) {
        const provider = this.providers.get(backend);
        if (provider) {
          console.log(`🔄 Trying fallback provider: ${backend}`);
          try {
            return await this.uploadWithRetry(file, provider, options);
          } catch (error) {
            console.warn(`⚠️ Fallback provider ${backend} failed:`, error);
            continue;
          }
        }
      } else {
        console.log(`⚠️ Fallback provider ${backend} is not available, skipping`);
      }
    }

    // If no fallback providers worked, try any available provider
    for (const backend of availableProviders) {
      if (!fallbackBackends.includes(backend)) {
        const provider = this.providers.get(backend);
        if (provider) {
          console.log(`🔄 Trying any available provider: ${backend}`);
          try {
            return await this.uploadWithRetry(file, provider, options);
          } catch (error) {
            console.warn(`⚠️ Provider ${backend} failed:`, error);
            continue;
          }
        }
      }
    }

    const availableCount = availableProviders.length;
    const triedCount = fallbackBackends.length;
    throw new Error(
      `All storage providers failed. Available: ${availableCount}, Tried: ${triedCount}. Available providers: ${availableProviders.join(
        ', '
      )}`
    );
  }

  /**
   * Upload with retry logic and exponential backoff
   */
  private async uploadWithRetry(file: File, provider: StorageProvider, options?: UploadOptions): Promise<UploadResult> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        console.log(`📤 Uploading to ${provider.name} (attempt ${attempt}/${this.config.maxRetries})`);
        return await provider.upload(file, options);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`⚠️ Upload attempt ${attempt} failed:`, lastError.message);

        if (attempt < this.config.maxRetries) {
          const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
          console.log(`⏳ Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    throw new UploadError(
      `Upload failed after ${this.config.maxRetries} attempts`,
      provider.name,
      file,
      'MAX_RETRIES_EXCEEDED',
      lastError || undefined
    );
  }

  /**
   * Delete a file from a storage provider
   */
  async delete(backend: StorageBackend, options: DeleteOptions): Promise<void> {
    const provider = this.providers.get(backend);
    if (!provider) {
      throw new Error(`Storage provider ${backend} not found`);
    }

    if (!provider.isAvailable()) {
      throw new Error(`Storage provider ${backend} is not available`);
    }

    await provider.delete(options);
  }

  /**
   * Get the public URL for a storage key
   */
  getUrl(backend: StorageBackend, key: string): string {
    const provider = this.providers.get(backend);
    if (!provider) {
      throw new Error(`Storage provider ${backend} not found`);
    }

    return provider.getUrl(key);
  }

  /**
   * Get all available storage providers
   */
  getAvailableProviders(): StorageBackend[] {
    return Array.from(this.providers.entries())
      .filter(([, provider]) => provider.isAvailable())
      .map(([backend]) => backend);
  }

  /**
   * Check if a specific provider is available
   */
  isProviderAvailable(backend: StorageBackend): boolean {
    const provider = this.providers.get(backend);
    return provider?.isAvailable() ?? false;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
