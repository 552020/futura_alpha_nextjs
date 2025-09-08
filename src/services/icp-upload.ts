"use client";

import { HttpAgent } from "@dfinity/agent";
import type { MemoryData, MemoryMeta, _SERVICE } from "@/ic/declarations/backend/backend.did";

// Types for ICP upload - compatible with existing UploadStorage
export interface UploadStorage {
  chosen_storage: "icp-canister" | "neon-db" | "vercel-blob";
  idem: string;
  expires_at: string;
  ttl_seconds: number;
  limits?: {
    inline_max: number;
    chunk_size: number;
    max_chunks: number;
  };
  icp?: {
    canister_id: string;
    network?: string;
  };
}

export interface UploadResult {
  memoryId: string;
  size: number;
  checksum_sha256: string | null;
  remote_id: string;
}

export interface UploadProgress {
  fileIndex: number;
  totalFiles: number;
  currentFile: string;
  bytesUploaded: number;
  totalBytes: number;
  percentage: number;
}

// Use the generated backend types and IDL factory
type CanisterActor = _SERVICE;

export class ICPUploadService {
  private agent: HttpAgent | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private authClient: any = null;

  constructor() {
    // Don't initialize auth in constructor to avoid SSR issues
  }

  private async initializeAuth() {
    if (typeof window === "undefined") {
      throw new Error("ICP authentication not available in server environment");
    }

    try {
      // Dynamic import to avoid SSR issues
      const { AuthClient } = await import("@dfinity/auth-client");
      this.authClient = await AuthClient.create();
    } catch (error) {
      console.error("Failed to initialize ICP auth client:", error);
      throw new Error("ICP authentication not available");
    }
  }

  private async ensureAuthenticated(): Promise<HttpAgent> {
    if (!this.authClient) {
      await this.initializeAuth();
    }

    if (!(await this.authClient?.isAuthenticated())) {
      throw new Error("User not authenticated with Internet Identity");
    }

    if (!this.agent) {
      // Dynamic import to avoid SSR issues
      const { createAgent } = await import("@/ic/agent");
      const identity = this.authClient!.getIdentity();
      this.agent = await createAgent(identity);
    }

    return this.agent;
  }

  /**
   * Upload a single file to ICP canister
   */
  async uploadFile(
    file: File,
    uploadStorage: UploadStorage,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    if (uploadStorage.chosen_storage !== "icp-canister") {
      throw new Error("Upload storage is not ICP canister");
    }

    if (!uploadStorage.icp?.canister_id) {
      throw new Error("ICP canister ID not provided in upload storage");
    }

    const agent = await this.ensureAuthenticated();

    // Dynamic import to avoid SSR issues
    const { makeActor } = await import("@/ic/actor-factory");
    const { idlFactory } = await import("@/ic/declarations/backend");

    const actor = makeActor(idlFactory, uploadStorage.icp.canister_id, agent) as CanisterActor;

    const fileSize = file.size;
    const limits = uploadStorage.limits || { inline_max: 32 * 1024, chunk_size: 64 * 1024, max_chunks: 512 };
    const isInline = fileSize <= limits.inline_max;

    // For now, we'll use a mock capsule ID - this should come from user context
    const capsuleId = "mock-capsule-id";

    if (isInline) {
      return this.uploadInline(file, actor, capsuleId, uploadStorage, onProgress);
    } else {
      return this.uploadChunked(file, actor, capsuleId, uploadStorage, onProgress);
    }
  }

  /**
   * Upload multiple files to ICP canister
   */
  async uploadFolder(
    files: File[],
    uploadStorage: UploadStorage,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    const totalFiles = files.length;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Update progress for current file
      onProgress?.({
        fileIndex: i,
        totalFiles,
        currentFile: file.name,
        bytesUploaded: 0,
        totalBytes: file.size,
        percentage: (i / totalFiles) * 100,
      });

      try {
        const result = await this.uploadFile(file, uploadStorage, (fileProgress) => {
          // Calculate overall progress including current file
          const overallPercentage = (i / totalFiles) * 100 + fileProgress.percentage / totalFiles;
          onProgress?.({
            fileIndex: i,
            totalFiles,
            currentFile: file.name,
            bytesUploaded: fileProgress.bytesUploaded,
            totalBytes: fileProgress.totalBytes,
            percentage: overallPercentage,
          });
        });

        results.push(result);
      } catch (error) {
        console.error(`Failed to upload file ${file.name}:`, error);
        // Continue with other files, but log the error
        throw new Error(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    return results;
  }

  private async uploadInline(
    file: File,
    actor: CanisterActor,
    capsuleId: string,
    uploadStorage: UploadStorage,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    try {
      // Read file as bytes
      const fileBytes = await file.arrayBuffer();
      const bytesArray = Array.from(new Uint8Array(fileBytes));

      // Update progress
      onProgress?.({
        fileIndex: 0,
        totalFiles: 1,
        currentFile: file.name,
        bytesUploaded: file.size,
        totalBytes: file.size,
        percentage: 100,
      });

      // Call canister inline upload with correct MemoryData structure
      const memoryData: MemoryData = {
        Inline: {
          bytes: bytesArray,
          meta: {
            name: file.name,
            description: [`Uploaded file: ${file.name}`], // Optional string in array format
            tags: [file.type.split("/")[0] || "file"], // Extract main type (image, video, etc.)
          },
        },
      };

      const createResult = await actor.memories_create(capsuleId, memoryData, uploadStorage.idem);

      if ("Err" in createResult) {
        throw new Error(`Failed to create memory: ${JSON.stringify(createResult.Err)}`);
      }
      const memoryId = createResult.Ok;

      return {
        memoryId: memoryId,
        size: file.size,
        checksum_sha256: null, // Inline uploads don't provide checksum
        remote_id: memoryId,
      };
    } catch (error) {
      console.error("Inline upload failed:", error);
      throw new Error(`Inline upload failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  private async uploadChunked(
    file: File,
    actor: CanisterActor,
    capsuleId: string,
    uploadStorage: UploadStorage,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    try {
      const fileSize = file.size;
      const limits = uploadStorage.limits || { inline_max: 32 * 1024, chunk_size: 64 * 1024, max_chunks: 512 };
      const chunkSize = limits.chunk_size;
      const expectedChunks = Math.ceil(fileSize / chunkSize);

      if (expectedChunks > limits.max_chunks) {
        throw new Error(`File too large: ${expectedChunks} chunks exceeds limit of ${limits.max_chunks}`);
      }

      // Begin upload session
      const memoryMeta: MemoryMeta = {
        name: file.name,
        description: [`Uploaded file: ${file.name}`],
        tags: [file.type.split("/")[0] || "file"],
      };

      const sessionResult = await actor.uploads_begin(capsuleId, memoryMeta, expectedChunks, uploadStorage.idem);

      if ("Err" in sessionResult) {
        throw new Error(`Failed to begin upload: ${JSON.stringify(sessionResult.Err)}`);
      }
      const sessionId = sessionResult.Ok;

      // Upload chunks
      let bytesUploaded = 0;
      for (let i = 0; i < expectedChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, fileSize);
        const chunk = await file.slice(start, end).arrayBuffer();
        const chunkBytes = Array.from(new Uint8Array(chunk));

        await actor.uploads_put_chunk(sessionId, i, chunkBytes);

        bytesUploaded += chunk.byteLength;

        // Update progress
        onProgress?.({
          fileIndex: 0,
          totalFiles: 1,
          currentFile: file.name,
          bytesUploaded,
          totalBytes: fileSize,
          percentage: (bytesUploaded / fileSize) * 100,
        });
      }

      // Calculate SHA256 hash (simplified - in real implementation, calculate actual hash)
      const expectedHash = new Uint8Array(32); // Mock hash

      // Finish upload
      const finishResult = await actor.uploads_finish(sessionId, Array.from(expectedHash), BigInt(fileSize));

      if ("Err" in finishResult) {
        throw new Error(`Failed to finish upload: ${JSON.stringify(finishResult.Err)}`);
      }
      const memoryId = finishResult.Ok;

      return {
        memoryId: memoryId,
        size: file.size,
        checksum_sha256: Array.from(expectedHash)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(""),
        remote_id: memoryId,
      };
    } catch (error) {
      console.error("Chunked upload failed:", error);
      throw new Error(`Chunked upload failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Check if user is authenticated with Internet Identity
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      if (!this.authClient) {
        await this.initializeAuth();
      }
      return (await this.authClient?.isAuthenticated()) ?? false;
    } catch {
      return false;
    }
  }

  /**
   * Get user's Internet Identity principal
   */
  async getPrincipal(): Promise<string | null> {
    try {
      if (!this.authClient) {
        await this.initializeAuth();
      }
      return this.authClient?.getIdentity()?.getPrincipal()?.toText() ?? null;
    } catch {
      return null;
    }
  }
}

// Export singleton instance
export const icpUploadService = new ICPUploadService();
