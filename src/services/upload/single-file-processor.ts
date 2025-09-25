/**
 * Single file processing service
 *
 * Handles the complete flow of processing a single file upload:
 * - File validation
 * - Authentication checks
 * - 413 solution (presigned URLs)
 * - Response processing
 * - Verification
 * - Context updates
 */

import { verifyIntent } from './intent';
import { verifyUpload } from './verification';
import { UPLOAD_LIMITS } from '@/config/upload-limits';
import type { FileInputAttributeMode } from '@/types/upload';
import type { HostingPreferences } from '@/hooks/use-storage-preferences';
import { getDefaultHostingPreferences } from '@/hooks/use-storage-preferences';
import { uploadFileWithProgress, checkICPAuthentication, generateS3PublicUrl } from './shared-utils';
import { uploadToS3WithProcessing } from './s3-with-processing';

export interface ProcessSingleFileOptions {
  file: File;
  isOnboarding: boolean;
  mode: FileInputAttributeMode;
  existingUserId?: string;
  preferences?: HostingPreferences;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  updateOnboardingContext?: (data: { data: { ownerId: string; id: string } }, file: File, url: string) => void;
  showToast: (toast: { variant: 'destructive'; title: string; description: string }) => void;
  onProgress?: (progress: number) => void;
}

// Upload to ICP canister
async function uploadToICP(
  file: File,
  preferences: HostingPreferences,
  onProgress?: (progress: number) => void
): Promise<{
  data: { id: string };
  results: Array<{ memoryId: string; size: number; checksum_sha256: string | null }>;
  userId: string;
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
  const icpResult = await icpUploadService.uploadFile(file, storage, progress => {
    // Standardize progress format to match S3 (0-100 number)
    onProgress?.(progress.percentage);
  });

  return {
    data: { id: icpResult.memoryId },
    results: [
      {
        memoryId: icpResult.memoryId,
        size: file.size,
        checksum_sha256: icpResult.checksum_sha256,
      },
    ],
    userId: '', // Will be set by caller
  };
}

// Upload to S3 using 413 solution (presigned URLs)
export async function uploadToS3(
  file: File,
  onProgress?: (progress: number) => void
): Promise<{
  data: { id: string };
  results: Array<{ memoryId: string; size: number; checksum_sha256: string | null }>;
  userId: string;
}> {
  const presignResponse = await fetch('/api/upload/presign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    }),
  });

  if (!presignResponse.ok) {
    const error = await presignResponse.json();
    throw new Error(error.error || 'Failed to get presigned URL');
  }

  const { signedUrl, s3Key } = await presignResponse.json();

  // Upload file to S3 with progress
  await uploadFileWithProgress(file, signedUrl, progress => {
    onProgress?.(progress);
  });

  // Commit to database
  const commitResponse = await fetch('/api/upload/commit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      s3Url: generateS3PublicUrl(s3Key),
    }),
  });

  if (!commitResponse.ok) {
    const error = await commitResponse.json();
    throw new Error(error.error || 'Failed to commit upload');
  }

  const commitResult = await commitResponse.json();

  return {
    data: { id: commitResult.data.id },
    results: [
      {
        memoryId: commitResult.data.id,
        size: file.size,
        checksum_sha256: null,
      },
    ],
    userId: '', // Will be set by caller
  };
}

// Upload to Vercel Blob (legacy fallback)
async function uploadToVercelBlob(
  file: File,
  isOnboarding: boolean,
  existingUserId: string | undefined,
  mode: FileInputAttributeMode,
  userBlobHosting: string,
  onProgress?: (progress: number) => void
): Promise<{
  data: { id: string };
  results: Array<{ memoryId: string; size: number; checksum_sha256: string | null }>;
  userId: string;
}> {
  // Use the original uploadFile function for Vercel Blob
  const { uploadFile } = await import('./upload');

  // Create a progress wrapper for Vercel Blob
  let progressInterval: NodeJS.Timeout | null = null;

  try {
    // Start progress simulation (Vercel Blob doesn't provide real-time progress)
    if (onProgress) {
      let simulatedProgress = 0;
      progressInterval = setInterval(() => {
        if (simulatedProgress < 90) {
          simulatedProgress += Math.random() * 10;
          onProgress(Math.min(simulatedProgress, 90));
        }
      }, 200);
    }

    const uploadResult = await uploadFile(
      file,
      isOnboarding,
      existingUserId,
      mode,
      'vercel_blob',
      userBlobHosting as 'vercel_blob'
    );

    // Complete progress
    if (onProgress) {
      onProgress(100);
    }

    // Convert to expected format
    const memory = Array.isArray(uploadResult.data) ? uploadResult.data[0] : uploadResult.data;

    if (!memory || !memory.id) {
      throw new Error('Upload failed: Invalid response from server');
    }

    return {
      data: { id: memory.id },
      results: [
        {
          memoryId: memory.id,
          size: file.size,
          checksum_sha256: null,
        },
      ],
      userId: existingUserId || '',
    };
  } finally {
    // Clean up progress interval
    if (progressInterval) {
      clearInterval(progressInterval);
    }
  }
}

export async function processSingleFile(options: ProcessSingleFileOptions): Promise<void> {
  const {
    file,
    isOnboarding,
    mode,
    existingUserId,
    preferences,
    onSuccess,
    onError,
    updateOnboardingContext,
    showToast,
    onProgress,
  } = options;

  try {
    // Validate file size
    if (!UPLOAD_LIMITS.isFileSizeValid(file.size)) {
      throw new Error(UPLOAD_LIMITS.getFileSizeErrorMessage(file.size));
    }

    // Create a temporary URL for preview
    const url = URL.createObjectURL(file);

    // Route to appropriate upload service based on user preferences
    const userBlobHosting = preferences?.blobHosting || 's3'; // Default to S3 (413 solution)

    let data: {
      data: { id: string };
      results: Array<{ memoryId: string; size: number; checksum_sha256: string | null }>;
      userId: string;
    };

    // Upload routing based on storage preference
    if (userBlobHosting === 'icp') {
      data = await uploadToICP(file, preferences || getDefaultHostingPreferences(), onProgress);
      data.userId = existingUserId || '';
    } else if (userBlobHosting === 'vercel_blob') {
      data = await uploadToVercelBlob(file, isOnboarding, existingUserId, mode, userBlobHosting, onProgress);
    } else if (userBlobHosting === 's3') {
      // S3 with parallel processing (Lane A + Lane B)
      data = await uploadToS3WithProcessing(file, onProgress);
      data.userId = existingUserId || '';
    } else {
      // Default to S3 with parallel processing for unknown preferences
      data = await uploadToS3WithProcessing(file, onProgress);
      data.userId = existingUserId || '';
    }

    // Future storage options can be added here:
    // else if (userBlobHosting === 'arweave') {
    //   data = await uploadToArweave(file, onProgress);
    //   data.userId = existingUserId || '';
    // } else if (userBlobHosting === 'ipfs') {
    //   data = await uploadToIPFS(file, onProgress);
    //   data.userId = existingUserId || '';
    // }

    // 3) Verify after upload (best-effort) - only for non-ICP flows
    // ICP flows handle verification internally
    const appMemoryId = data?.data?.id;
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
        size: file.size,
        checksum_sha256: data?.results?.[0]?.checksum_sha256 ?? null,
        remote_id: data?.results?.[0]?.memoryId ?? appMemoryId,
      });
    }

    if (isOnboarding && data && updateOnboardingContext) {
      updateOnboardingContext(
        { data: { ownerId: data.userId ?? '', id: data.data?.id ?? appMemoryId ?? '' } },
        file,
        url
      );
    }

    onSuccess?.();
  } catch (error) {
    let title = 'Something went wrong';
    let description = 'Please try uploading again.';

    if (error instanceof Error && error.message.includes('File too large')) {
      title = 'File too large';
      description = error.message; // Use the detailed error message from UPLOAD_LIMITS
    }

    if (error instanceof Error && error.message.includes('intent')) {
      title = 'Upload not ready';
      description = error.message;
    }

    showToast({ variant: 'destructive', title, description });

    onError?.(error as Error);
  }
}
