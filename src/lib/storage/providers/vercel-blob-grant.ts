/**
 * VERCEL BLOB STORAGE PROVIDER WITH SERVER-ISSUED TOKENS
 *
 * This provider implements the StorageProvider interface for Vercel Blob Storage
 * using server-issued tokens instead of client-side environment variables.
 */

import type { StorageProvider, UploadOptions, UploadResult } from '../types';

interface GrantResponse {
  success: boolean;
  uploadUrl: string;
  token: string;
  expiresAt: string;
  maxSize: number;
  allowedMimeTypes: string[];
}

export class VercelBlobGrantProvider implements StorageProvider {
  readonly name = 'vercel_blob_grant';

  /**
   * Check if Vercel Blob Grant is available
   * This provider is always available as it uses server-issued tokens
   */
  isAvailable(): boolean {
    return true; // Always available since we use server-issued tokens
  }

  /**
   * Upload a file to Vercel Blob Storage using server-issued token
   */
  async upload(file: File, options?: UploadOptions): Promise<UploadResult> {
    try {
      // Step 1: Request upload grant from server
      const grant = await this.requestUploadGrant(file, options);

      // Step 2: Upload file directly to Vercel Blob using the presigned URL
      const uploadResult = await this.uploadToBlob(file, grant.uploadUrl);

      // Step 3: Complete the upload by notifying the server
      await this.completeUpload(grant.token, uploadResult.url, file);

      return {
        url: uploadResult.url,
        key: this.extractKeyFromUrl(uploadResult.url),
        size: file.size,
        mimeType: file.type,
        provider: this.name,
        metadata: {
          filename: file.name,
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
          grantToken: grant.token,
          ...options?.metadata,
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to upload to Vercel Blob (grant-based): ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Request upload grant from server
   */
  private async requestUploadGrant(file: File, options?: UploadOptions): Promise<GrantResponse> {
    const response = await fetch('/api/memories/grant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename: file.name,
        size: file.size,
        mimeType: file.type,
        checksum: options?.metadata?.checksum,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get upload grant');
    }

    return await response.json();
  }

  /**
   * Upload file directly to Vercel Blob using presigned URL
   */
  private async uploadToBlob(file: File, uploadUrl: string): Promise<{ url: string }> {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to upload to blob storage: ${response.status} ${response.statusText}`);
    }

    // Return the URL (same as uploadUrl for Vercel Blob)
    return { url: uploadUrl };
  }

  /**
   * Complete the upload by notifying the server
   */
  private async completeUpload(token: string, url: string, file: File): Promise<{ success: boolean }> {
    const response = await fetch('/api/memories/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        url,
        size: file.size,
        mimeType: file.type,
        metadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to complete upload');
    }

    return await response.json();
  }

  /**
   * Delete a file from Vercel Blob Storage
   * Note: This would need a server-side delete endpoint
   */
  async delete(): Promise<void> {
    // TODO: Implement server-side delete endpoint
    throw new Error('Delete not implemented for grant-based provider');
  }

  /**
   * Get the public URL for a storage key
   */
  getUrl(key: string): string {
    // For Vercel Blob, the key should be the full URL
    if (key.startsWith('http')) {
      return key;
    }
    throw new Error('Cannot reconstruct Vercel Blob URL from key alone');
  }

  /**
   * Extract key from URL
   */
  private extractKeyFromUrl(url: string): string {
    // For Vercel Blob, the key is the filename part of the URL
    const urlParts = url.split('/');
    return urlParts[urlParts.length - 1];
  }
}
