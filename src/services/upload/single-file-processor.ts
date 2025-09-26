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

// import { verifyIntent } from './intent';
// import { verifyUpload } from './verification';
import type { FileInputAttributeMode } from '@/types/upload';
import type { HostingPreferences } from '@/hooks/use-storage-preferences';
import { getDefaultHostingPreferences } from '@/hooks/use-storage-preferences';
import { validateUploadFiles } from './shared-utils';
import { uploadToS3WithProcessing } from './s3-with-processing';

export interface ProcessSingleFileOptions {
  file: File;
  isOnboarding: boolean;
  mode: FileInputAttributeMode;
  existingUserId?: string;
  preferences?: HostingPreferences;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  updateOnboardingContext?: (data: { data: { ownerId: string; id: string } }, files: File[]) => void;
  showToast: (toast: { variant: 'destructive'; title: string; description: string }) => void;
  onProgress?: (progress: number) => void;
}

// Upload to ICP canister - moved to icp-upload.ts

// Upload to S3 using 413 solution (presigned URLs)
// export async function uploadToS3(
//   file: File,
//   onProgress?: (progress: number) => void
// ): Promise<{
//   data: { id: string };
//   results: Array<{ memoryId: string; size: number; checksum_sha256: string | null }>;
//   userId: string;
// }> {
//   const presignResponse = await fetch('/api/upload/presign', {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify({
//       fileName: file.name,
//       fileType: file.type,
//       fileSize: file.size,
//     }),
//   });

//   if (!presignResponse.ok) {
//     const error = await presignResponse.json();
//     throw new Error(error.error || 'Failed to get presigned URL');
//   }

//   const { signedUrl, s3Key } = await presignResponse.json();

//   // Upload file to S3 with progress
//   await uploadFileWithProgress(file, signedUrl, progress => {
//     onProgress?.(progress);
//   });

//   // Commit to database
//   const commitResponse = await fetch('/api/upload/commit', {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify({
//       fileName: file.name,
//       fileType: file.type,
//       fileSize: file.size,
//       s3Url: generateS3PublicUrl(s3Key),
//     }),
//   });

//   if (!commitResponse.ok) {
//     const error = await commitResponse.json();
//     throw new Error(error.error || 'Failed to commit upload');
//   }

//   const commitResult = await commitResponse.json();

//   return {
//     data: { id: commitResult.data.id },
//     results: [
//       {
//         memoryId: commitResult.data.id,
//         size: file.size,
//         checksum_sha256: null,
//       },
//     ],
//     userId: '', // Will be set by caller
//   };
// }

// Upload to Vercel Blob (legacy fallback)

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

  if (!validateUploadFiles([file], showToast)) {
    return;
  }

  try {
    // Route to appropriate upload service based on user preferences
    const userBlobHostingPreferences = preferences?.blobHosting || ['s3']; // Default to S3 (413 solution)

    let data: {
      data: { id: string };
      results: Array<{ memoryId: string; size: number; checksum_sha256: string | null }>;
      userId: string;
    };

    // Upload routing based on storage preferences (check if preference is in array)
    if (userBlobHostingPreferences.includes('icp')) {
      // NOTE: For ICP users, isOnboarding is ignored because ICP always requires Internet Identity auth
      // Even "onboarding" users must authenticate with II to interact with ICP canister
      const { uploadToICP } = await import('./icp-upload');
      const results = await uploadToICP([file], preferences || getDefaultHostingPreferences(), onProgress);
      data = results[0]; // Get first (and only) result
    } else if (userBlobHostingPreferences.includes('vercel_blob')) {
      const { uploadToVercelBlob } = await import('./vercel-blob-upload');
      const results = await uploadToVercelBlob([file], isOnboarding, existingUserId, mode);
      data = results[0]; // Get first (and only) result
    } else if (userBlobHostingPreferences.includes('s3')) {
      // S3 with parallel processing (Lane A + Lane B)
      data = await uploadToS3WithProcessing(file, onProgress);
    } else {
      // Default to S3 with parallel processing for unknown preferences
      data = await uploadToS3WithProcessing(file, onProgress);
    }

    // Set userId for all upload services (normalize response)
    data.userId = existingUserId || '';

    // 3) Get memory ID for context updates
    // if (data?.data?.id && !userBlobHostingPreferences.includes('icp')) {
    //   // For non-ICP flows, we still need to get storage info for verification
    //   const storageResponse = await verifyIntent({
    //     preferred: preferences?.blobHosting[0] === 'neon' ? 's3' : preferences?.blobHosting[0],
    //     databaseHosting: preferences?.databaseHosting[0],
    //     backendHosting: preferences?.backendHosting,
    //   });
    //   const storage = storageResponse.uploadStorage;
    //   await verifyUpload({
    //     appMemoryId,
    //     database: storage.database,
    //     blob_storage: storage.blob_storage,
    //     idem: storage.idem,
    //     size: file.size,
    //     checksum_sha256: data?.results?.[0]?.checksum_sha256 ?? null,
    //     remote_id: data?.results?.[0]?.memoryId ?? data?.data?.id,
    //   });
    // }

    if (isOnboarding && data && updateOnboardingContext) {
      updateOnboardingContext({ data: { ownerId: data.userId ?? '', id: data.data?.id ?? '' } }, [file]);
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
