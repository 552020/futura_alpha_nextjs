'use client';

// import { HttpAgent } from '@dfinity/agent';
import type { MemoryData, MemoryMeta, _SERVICE } from '@/ic/declarations/backend/backend.did';
import type { BlobHosting, HostingPreferences } from '@/hooks/use-storage-preferences';
import { UPLOAD_LIMITS_ICP } from '@/config/upload-limits';
import type { UploadServiceResult } from './shared-utils';

// Types for ICP upload - compatible with existing UploadStorage
export interface UploadStorage {
  database: 'neon' | 'icp';
  blob_storage: 's3' | 'vercel_blob' | 'icp' | 'arweave' | 'ipfs';
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
  constructor() {
    // Service class for ICP upload operations
  }

  /**
   * Upload a single file to ICP canister
   */
  async uploadFile(
    file: File,
    blobHostingPreferences: BlobHosting[],
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    // Handle blob hosting preferences
    if (blobHostingPreferences.includes('icp')) {
      // Case 1: ICP storage - current implementation
      const limits = {
        inline_max: UPLOAD_LIMITS_ICP.INLINE_MAX_BYTES,
        chunk_size: UPLOAD_LIMITS_ICP.CHUNK_SIZE_BYTES,
        max_chunks: UPLOAD_LIMITS_ICP.MAX_CHUNKS,
      };
      const idem = crypto.randomUUID();

      // Use existing backendActor function (simplified approach)
      const { backendActor } = await import('@/ic/backend');
      const actor = (await backendActor()) as CanisterActor;

      const fileSize = file.size;
      const isInline = fileSize <= limits.inline_max;
      const capsuleId = 'mock-capsule-id';

      if (isInline) {
        return this.uploadInline(file, actor, capsuleId, idem, onProgress);
      } else {
        return this.uploadChunked(file, actor, capsuleId, idem, limits, onProgress);
      }
    }

    if (blobHostingPreferences.includes('s3')) {
      // Case 2: S3 storage - TODO: implement
      throw new Error('ICP upload service: S3 storage not yet implemented');
    }

    if (blobHostingPreferences.includes('arweave')) {
      // Case 3: Arweave storage - TODO: implement
      throw new Error('ICP upload service: Arweave storage not yet implemented');
    }

    if (blobHostingPreferences.includes('ipfs')) {
      // Case 4: IPFS storage - TODO: implement
      throw new Error('ICP upload service: IPFS storage not yet implemented');
    }

    if (blobHostingPreferences.includes('vercel_blob')) {
      // Case 5: Vercel Blob storage - TODO: implement
      throw new Error('ICP upload service: Vercel Blob storage not yet implemented');
    }

    if (blobHostingPreferences.includes('neon')) {
      // Case 6: Neon storage - TODO: implement
      throw new Error('ICP upload service: Neon storage not yet implemented');
    }

    // No matching storage preference found
    throw new Error(
      `ICP upload service: No supported storage preference found. User preferences: ${blobHostingPreferences.join(', ')}`
    );
  }

  /**
   * Upload multiple files to ICP canister
   */
  async uploadFolder(
    files: File[],
    blobHostingPreferences: BlobHosting[],
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
        const result = await this.uploadFile(file, blobHostingPreferences, fileProgress => {
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
        throw new Error(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return results;
  }

  private async uploadInline(
    file: File,
    actor: CanisterActor,
    capsuleId: string,
    idem: string,
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
            tags: [file.type.split('/')[0] || 'file'], // Extract main type (image, video, etc.)
          },
        },
      };

      const createResult = await actor.memories_create(capsuleId, memoryData, idem);

      if ('Err' in createResult) {
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
      console.error('Inline upload failed:', error);
      throw new Error(`Inline upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async uploadChunked(
    file: File,
    actor: CanisterActor,
    capsuleId: string,
    idem: string,
    limits: { inline_max: number; chunk_size: number; max_chunks: number },
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    try {
      const fileSize = file.size;
      const chunkSize = limits.chunk_size;
      const expectedChunks = Math.ceil(fileSize / chunkSize);

      if (expectedChunks > limits.max_chunks) {
        throw new Error(`File too large: ${expectedChunks} chunks exceeds limit of ${limits.max_chunks}`);
      }

      // Begin upload session
      const memoryMeta: MemoryMeta = {
        name: file.name,
        description: [`Uploaded file: ${file.name}`],
        tags: [file.type.split('/')[0] || 'file'],
      };

      const sessionResult = await actor.uploads_begin(capsuleId, memoryMeta, expectedChunks, idem);

      if ('Err' in sessionResult) {
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

      if ('Err' in finishResult) {
        throw new Error(`Failed to finish upload: ${JSON.stringify(finishResult.Err)}`);
      }
      const memoryId = finishResult.Ok;

      return {
        memoryId: memoryId,
        size: file.size,
        checksum_sha256: Array.from(expectedHash)
          .map(b => b.toString(16).padStart(2, '0'))
          .join(''),
        remote_id: memoryId,
      };
    } catch (error) {
      console.error('Chunked upload failed:', error);
      throw new Error(`Chunked upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const icpUploadService = new ICPUploadService();

// Unified upload to ICP canister (single or multiple files)
export async function uploadToICP(
  files: File[], // Always an array (single file = [file])
  preferences: HostingPreferences,
  onProgress?: (progress: number) => void // Overall progress (0-100)
): Promise<UploadServiceResult[]> {
  // Always returns array
  const { checkICPAuthentication } = await import('./shared-utils');
  await checkICPAuthentication();

  const isSingleFile = files.length === 1;
  const results: UploadServiceResult[] = [];

  if (isSingleFile) {
    // Single file mode - use uploadFile
    const file = files[0];
    const icpResult = await icpUploadService.uploadFile(file, preferences.blobHosting, progress => {
      onProgress?.(progress.percentage);
    });

    results.push({
      data: { id: icpResult.memoryId },
      results: [
        {
          memoryId: icpResult.memoryId,
          size: file.size,
          checksum_sha256: icpResult.checksum_sha256,
        },
      ],
      userId: '', // Will be set by caller
    });
  } else {
    // Multiple files mode - use uploadFolder
    const icpResults = await icpUploadService.uploadFolder(files, preferences.blobHosting, progress => {
      onProgress?.(progress.percentage);
    });

    // Convert to UploadServiceResult format
    for (let i = 0; i < icpResults.length; i++) {
      const icpResult = icpResults[i];
      const file = files[i];

      results.push({
        data: { id: icpResult.memoryId },
        results: [
          {
            memoryId: icpResult.memoryId,
            size: file.size,
            checksum_sha256: icpResult.checksum_sha256,
          },
        ],
        userId: '', // Will be set by caller
      });
    }
  }

  return results;
}
