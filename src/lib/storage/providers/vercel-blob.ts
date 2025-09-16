/**
 * VERCEL BLOB STORAGE PROVIDER
 *
 * This provider implements the StorageProvider interface for Vercel Blob Storage.
 * It provides fast, CDN-backed file storage with easy integration.
 */

import { put, del } from "@vercel/blob";
import type { StorageProvider, UploadOptions, UploadResult, DeleteOptions } from "../types";
import { generateBlobFilename } from "../blob-config";

export class VercelBlobProvider implements StorageProvider {
  readonly name = "vercel_blob";

  /**
   * Check if Vercel Blob is available
   * Vercel Blob requires the BLOB_READ_WRITE_TOKEN environment variable
   */
  isAvailable(): boolean {
    return typeof process !== "undefined" && !!process.env.BLOB_READ_WRITE_TOKEN;
  }

  /**
   * Upload a file to Vercel Blob Storage
   */
  async upload(file: File, options?: UploadOptions): Promise<UploadResult> {
    if (!this.isAvailable()) {
      throw new Error("Vercel Blob is not available. BLOB_READ_WRITE_TOKEN is required.");
    }

    try {
      // Generate a unique filename if not provided
      const filename = options?.filename || this.generateFilename(file);

      // Upload to Vercel Blob
      const { url } = await put(filename, file, {
        access: options?.public ? "public" : "public", // Vercel Blob is always public
        contentType: options?.contentType || file.type,
        // Note: Vercel Blob doesn't support custom metadata in the same way
        // We'll include it in the result metadata instead
      });

      // Extract the key from the URL (everything after the last slash)
      const key = url.split("/").pop() || filename;

      return {
        url,
        key,
        size: file.size,
        mimeType: file.type,
        provider: this.name,
        metadata: {
          filename: file.name,
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
          ...options?.metadata,
        },
      };
    } catch (error) {
      throw new Error(`Failed to upload to Vercel Blob: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delete a file from Vercel Blob Storage
   */
  async delete(options: DeleteOptions): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error("Vercel Blob is not available. BLOB_READ_WRITE_TOKEN is required.");
    }

    try {
      await del(options.key);
    } catch (error) {
      throw new Error(`Failed to delete from Vercel Blob: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get the public URL for a storage key
   * For Vercel Blob, the key is the filename, and the URL is constructed
   */
  getUrl(key: string): string {
    // Vercel Blob URLs follow the pattern: https://[hash].public.blob.vercel-storage.com/[filename]
    // We need the full URL, so we'll need to store it or reconstruct it
    // For now, we'll assume the key is the full URL or we need to reconstruct it
    if (key.startsWith("http")) {
      return key;
    }

    // If we only have the filename, we can't reconstruct the full URL
    // This is a limitation of Vercel Blob - we need to store the full URL
    throw new Error("Cannot reconstruct Vercel Blob URL from key alone. Store the full URL.");
  }

  /**
   * Generate a unique filename for the upload
   */
  private generateFilename(file: File): string {
    return generateBlobFilename(file.name, true);
  }
}
