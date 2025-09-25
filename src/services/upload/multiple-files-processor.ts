/**
 * Multiple files processing service
 *
 * Handles the complete flow of processing multiple files upload (directory or multiple-files mode):
 * - File validation (count and total size)
 * - 413 solution (batch presigned URLs)
 * - Authentication checks
 * - Upload orchestration (ICP vs S3)
 * - Response processing
 * - Verification
 * - Context updates
 */

import { verifyIntent } from './intent';
import { verifyUpload } from './verification';
import { UPLOAD_LIMITS } from '@/config/upload-limits';
import type { HostingPreferences } from '@/hooks/use-storage-preferences';
import { getDefaultHostingPreferences } from '@/hooks/use-storage-preferences';
import { checkICPAuthentication, validateUploadFiles } from './shared-utils';
import { uploadMultipleToS3WithProcessing } from './s3-with-processing';

export interface ProcessMultipleFilesOptions {
  files: File[];
  mode: 'directory' | 'multiple-files';
  isOnboarding: boolean;
  preferences?: HostingPreferences;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  updateUserData?: (data: { uploadedFileCount: number; allUserId: string; memoryId: string }) => void;
  setCurrentStep?: (step: 'upload' | 'user-info' | 'share' | 'sign-up' | 'complete') => void;
  session?: { user?: { id?: string } } | null;
  showToast: (toast: { variant: 'destructive'; title: string; description: string }) => void;
  onProgress?: (file: File, progress: number) => void;
}

// Upload multiple files to ICP canister
async function uploadMultipleToICP(
  files: File[],
  preferences: HostingPreferences,
  onProgress?: (file: File, progress: number) => void
): Promise<{
  results?: Array<{ memoryId: string; size?: number; checksum_sha256?: string | null; name?: string; type?: string }>;
  userId?: string;
  successfulUploads?: number;
}> {
  await checkICPAuthentication();

  // Get storage configuration for ICP
  const storageResponse = await verifyIntent({
    preferred: 'icp',
    databaseHosting: preferences?.databaseHosting,
    backendHosting: preferences?.backendHosting,
  });
  const storage = storageResponse.uploadStorage;

  // Upload to ICP canister
  const { icpUploadService } = await import('./icp-upload');
  const icpResults = await icpUploadService.uploadFolder(files, storage, progress => {
    // Standardize progress format to match S3 (0-100 number)
    onProgress?.(files[0], progress.percentage); // Use first file for progress
  });

  return {
    results: icpResults.map((result, index) => ({
      memoryId: result.memoryId,
      size: result.size,
      name: files[index].name,
      type: files[index].type,
      checksum_sha256: result.checksum_sha256,
    })),
    successfulUploads: icpResults.length,
  };
}

// Upload multiple files to Vercel Blob (legacy fallback)
async function uploadMultipleToVercelBlob(
  files: File[],
  mode: 'directory' | 'multiple-files',
  onProgress?: (file: File, progress: number) => void
): Promise<{
  results?: Array<{ memoryId: string; size?: number; checksum_sha256?: string | null }>;
  userId?: string;
  successfulUploads?: number;
}> {
  // Create a progress wrapper for Vercel Blob
  let progressInterval: NodeJS.Timeout | null = null;

  try {
    // Start progress simulation (Vercel Blob doesn't provide real-time progress)
    if (onProgress) {
      let simulatedProgress = 0;
      progressInterval = setInterval(() => {
        if (simulatedProgress < 90) {
          simulatedProgress += Math.random() * 10;
          onProgress(files[0], Math.min(simulatedProgress, 90)); // Use first file for progress
        }
      }, 200);
    }

    // Use the original FormData approach for Vercel Blob
    const formData = new FormData();
    files.forEach(file => {
      formData.append('file', file);
    });

    if (mode === 'directory') {
      formData.append('storageBackend', 'vercel_blob');
    }

    const response = await fetch('/api/memories', { method: 'POST', body: formData });

    // Complete progress
    if (onProgress) {
      onProgress(files[0], 100);
    }

    type MultipleFilesResp = {
      error?: string;
      userId?: string;
      successfulUploads?: number;
      results?: Array<{ memoryId: string; size?: number; checksum_sha256?: string | null }>;
    };
    const json = (await response.json()) as MultipleFilesResp;

    if (!response.ok) {
      throw new Error(json?.error || `${mode === 'directory' ? 'Folder' : 'Multiple files'} upload failed`);
    }

    return json;
  } finally {
    // Clean up progress interval
    if (progressInterval) {
      clearInterval(progressInterval);
    }
  }
}

export async function processMultipleFiles(options: ProcessMultipleFilesOptions): Promise<void> {
  const {
    files,
    mode,
    isOnboarding,
    preferences,
    onSuccess,
    onError,
    updateUserData,
    setCurrentStep,
    session,
    showToast,
    onProgress,
  } = options;

  // Validate files using shared validation function
  if (!validateUploadFiles(files, showToast)) {
    return;
  }

  try {
    // Route to appropriate upload service based on user preferences
    const userBlobHosting = preferences?.blobHosting || 's3'; // Default to S3 (413 solution)

    let data: {
      results?: Array<{
        memoryId: string;
        size?: number;
        checksum_sha256?: string | null;
        name?: string;
        type?: string;
      }>;
      userId?: string;
      successfulUploads?: number;
    };

    // Upload routing based on storage preference
    if (userBlobHosting === 'icp') {
      data = await uploadMultipleToICP(files, preferences || getDefaultHostingPreferences(), onProgress);
    } else if (userBlobHosting === 'vercel_blob') {
      data = await uploadMultipleToVercelBlob(files, mode, onProgress);
    } else if (userBlobHosting === 's3') {
      // S3 with parallel processing (Lane A + Lane B)
      data = await uploadMultipleToS3WithProcessing(files, mode, onProgress);
    } else {
      // Default to S3 with parallel processing for unknown preferences
      data = await uploadMultipleToS3WithProcessing(files, mode, onProgress);
    }

    // Future storage options can be added here:
    // else if (userBlobHosting === 'arweave') {
    //   data = await uploadMultipleToArweave(files, onProgress);
    // } else if (userBlobHosting === 'ipfs') {
    //   data = await uploadMultipleToIPFS(files, onProgress);
    // }

    // Best-effort verify first reported memory
    const appMemoryId = data?.results?.[0]?.memoryId;
    if (appMemoryId && userBlobHosting !== 'icp') {
      // For non-ICP flows, we still need to get storage info for verification
      const storageResponse = await verifyIntent({
        preferred: preferences?.blobHosting,
        databaseHosting: preferences?.databaseHosting,
        backendHosting: preferences?.backendHosting,
      });
      const storage = storageResponse.uploadStorage;
      await verifyUpload({
        appMemoryId,
        database: storage.database,
        blob_storage: storage.blob_storage,
        idem: storage.idem,
        size: data?.results?.[0]?.size || null,
        checksum_sha256: data?.results?.[0]?.checksum_sha256 || null,
        remote_id: data?.results?.[0]?.memoryId || appMemoryId,
      });
    }

    // Update context with results (onboarding)
    if (isOnboarding && data?.successfulUploads && data.successfulUploads > 0 && updateUserData && setCurrentStep) {
      updateUserData({
        uploadedFileCount: data.successfulUploads,
        allUserId: data.userId ?? '',
        memoryId: data.results?.[0]?.memoryId ?? '',
      });

      if (session) {
        setCurrentStep('share');
      } else {
        setCurrentStep('user-info');
      }
    }

    onSuccess?.();
  } catch (error) {
    showToast({
      variant: 'destructive',
      title: 'Upload failed',
      description: error instanceof Error ? error.message : 'Please try again.',
    });
    onError?.(error as Error);
  }
}
