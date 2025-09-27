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

import type { HostingPreferences } from '@/hooks/use-storage-preferences';
import { getDefaultHostingPreferences } from '@/hooks/use-storage-preferences';
import { validateUploadFiles } from './shared-utils';
import { uploadMultipleToS3WithProcessing } from './s3-with-processing';

export interface ProcessMultipleFilesOptions {
  files: File[];
  mode: 'directory' | 'multiple-files';
  isOnboarding: boolean;
  preferences?: HostingPreferences;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  updateOnboardingContext?: (data: { data: { ownerId: string; id: string } }, files: File[]) => void;
  session?: { user?: { id?: string } } | null;
  showToast: (toast: { variant: 'destructive'; title: string; description: string }) => void;
  onProgress?: (file: File, progress: number) => void;
}

// Upload multiple files to ICP canister - moved to icp-upload.ts

// Upload multiple files to Vercel Blob (legacy fallback)

export async function processMultipleFiles(options: ProcessMultipleFilesOptions): Promise<void> {
  const {
    files,
    mode,
    isOnboarding,
    preferences,
    onSuccess,
    onError,
    updateOnboardingContext,
    session,
    showToast,
    onProgress,
  } = options;

  const existingUserId = session?.user?.id;

  // Validate files using shared validation function
  if (!validateUploadFiles(files, showToast)) {
    return;
  }

  try {
    // Route to appropriate upload service based on user preferences
    const userBlobHostingPreference = preferences?.blobHosting[0] || 's3'; // Default to S3 (413 solution)

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
    if (userBlobHostingPreference === 'icp') {
      // NOTE: For ICP users, isOnboarding is ignored because ICP always requires Internet Identity auth
      // Even "onboarding" users must authenticate with II to interact with ICP canister
      const { uploadToICP } = await import('./icp-upload');
      const results = await uploadToICP(files, preferences || getDefaultHostingPreferences(), progress => {
        // Convert overall progress to per-file progress for compatibility
        onProgress?.(files[0], progress);
      });

      // Convert results to expected format
      data = {
        results: results.map(result => ({
          memoryId: result.data.id,
          size: result.results[0]?.size,
          checksum_sha256: result.results[0]?.checksum_sha256,
        })),
        successfulUploads: results.length,
      };
    } else if (userBlobHostingPreference === 'vercel_blob') {
      const { uploadToVercelBlob } = await import('./vercel-blob-upload');
      const results = await uploadToVercelBlob(files, isOnboarding, existingUserId, mode, progress => {
        // Convert overall progress to per-file progress for compatibility
        onProgress?.(files[0], progress);
      });

      // Convert results to expected format
      data = {
        results: results.map(result => ({
          memoryId: result.data.id,
          size: result.results[0]?.size,
          checksum_sha256: result.results[0]?.checksum_sha256,
        })),
        successfulUploads: results.length,
      };
    } else if (userBlobHostingPreference === 's3') {
      // S3 with parallel processing (Lane A + Lane B)
      data = await uploadMultipleToS3WithProcessing(files, mode, onProgress);
    } else {
      // Default to S3 with parallel processing for unknown preferences
      data = await uploadMultipleToS3WithProcessing(files, mode, onProgress);
    }
    // Update context with results (onboarding)
    if (isOnboarding && data?.successfulUploads && data.successfulUploads > 0 && updateOnboardingContext) {
      updateOnboardingContext({ data: { ownerId: data.userId ?? '', id: data.results?.[0]?.memoryId ?? '' } }, files);
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
