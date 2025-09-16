/**
 * ARWEAVE STORAGE PROVIDER
 *
 * This provider implements the StorageProvider interface for Arweave.
 * It provides permanent, immutable storage with pay-once pricing.
 */

import type { StorageProvider, UploadOptions, UploadResult, DeleteOptions } from "../types";

export class ArweaveProvider implements StorageProvider {
  readonly name = "arweave";

  /**
   * Check if Arweave is available
   * Requires Arweave wallet and configuration
   */
  isAvailable(): boolean {
    return !!(process.env.ARWEAVE_WALLET_KEY && process.env.ARWEAVE_GATEWAY_URL);
  }

  /**
   * Upload a file to Arweave
   * TODO: Implement with arweave-js
   */
  async upload(_file: File, _options?: UploadOptions): Promise<UploadResult> {
    // Suppress unused parameter warnings for placeholder implementation
    void _file;
    void _options;
    if (!this.isAvailable()) {
      throw new Error("Arweave is not available. Wallet key and gateway URL are required.");
    }

    // TODO: Implement Arweave upload
    throw new Error("Arweave upload not yet implemented");
  }

  /**
   * Delete a file from Arweave
   * Note: Arweave is immutable, so deletion is not possible
   */
  async delete(_options: DeleteOptions): Promise<void> {
    // Suppress unused parameter warnings for placeholder implementation
    void _options;
    throw new Error("Arweave is immutable. Files cannot be deleted.");
  }

  /**
   * Get the public URL for a storage key (transaction ID)
   */
  getUrl(key: string): string {
    const gateway = process.env.ARWEAVE_GATEWAY_URL || "https://arweave.net";
    return `${gateway}/${key}`;
  }
}
