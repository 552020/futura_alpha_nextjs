/**
 * IPFS STORAGE PROVIDER
 *
 * This provider implements the StorageProvider interface for IPFS.
 * It provides decentralized, content-addressed storage.
 */

import type { StorageProvider, UploadOptions, UploadResult, DeleteOptions } from '../types';

export class IPFSProvider implements StorageProvider {
  readonly name = 'ipfs';

  /**
   * Check if IPFS is available
   * Requires IPFS node configuration
   */
  isAvailable(): boolean {
    return !!(process.env.IPFS_GATEWAY_URL && (process.env.IPFS_API_URL || process.env.IPFS_NODE_URL));
  }

  /**
   * Upload a file to IPFS
   * TODO: Implement with ipfs-http-client
   */
  async upload(_file: File, _options?: UploadOptions): Promise<UploadResult> {
    // Suppress unused parameter warnings for placeholder implementation
    void _file;
    void _options;
    if (!this.isAvailable()) {
      throw new Error('IPFS is not available. Gateway URL and API/Node URL are required.');
    }

    // TODO: Implement IPFS upload
    throw new Error('IPFS upload not yet implemented');
  }

  /**
   * Delete a file from IPFS
   * Note: IPFS is content-addressed, so deletion is not possible
   */
  async delete(_options: DeleteOptions): Promise<void> {
    // Suppress unused parameter warnings for placeholder implementation
    void _options;
    throw new Error('IPFS is content-addressed. Files cannot be deleted.');
  }

  /**
   * Get the public URL for a storage key (content hash)
   */
  getUrl(key: string): string {
    const gateway = process.env.IPFS_GATEWAY_URL || 'https://ipfs.io/ipfs';
    return `${gateway}/${key}`;
  }
}
