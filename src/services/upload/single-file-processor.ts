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

import type { FileInputAttributeMode } from '@/types/upload';
import type { HostingPreferences } from '@/hooks/use-hosting-preferences';
// import { getDefaultHostingPreferences } from '@/hooks/use-hosting-preferences'; // Not used with ICP processing
import { validateUploadFiles, checkICPAuthentication } from './shared-utils';
import { uploadToS3WithProcessing } from './s3-with-processing';
import { logger } from '@/lib/logger';

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

  // Basic validation using general upload limits
  if (!validateUploadFiles([file], showToast)) {
    return;
  }

  try {
    // Route to appropriate upload service based on user preferences
    const userBlobHostingPreferences = preferences?.blobHosting || ['s3'];

    // Log upload routing decision
    logger.upload().info('📤 Single file upload routing decision', {
      selectedProvider: userBlobHostingPreferences[0],
      availableProviders: userBlobHostingPreferences,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      isOnboarding,
      mode,
    });

    let data: {
      data: { id: string };
      results: Array<{ memoryId: string; size: number; checksum_sha256: string | null }>;
      userId: string;
    };

    // Upload routing based on storage preferences (check if preference is in array)
    if (userBlobHostingPreferences.includes('icp')) {
      // Double-check ICP authentication (safety net for multiple upload flows)
      try {
        await checkICPAuthentication();
      } catch (_error) {
        showToast({
          variant: 'destructive',
          title: 'Authentication Required',
          description: 'Please connect your Internet Identity to upload to ICP',
        });
        return;
      }

      // ICP upload with parallel processing (Lane A + Lane B + finalizeAllAssets)
      // NOTE: For ICP users, isOnboarding is ignored because ICP always requires Internet Identity auth
      // Even "onboarding" users must authenticate with II to interact with ICP canister
      const { uploadToICPWithProcessing } = await import('./icp-with-processing');
      const uploadResult = await uploadToICPWithProcessing(file, onProgress);
      data = {
        data: uploadResult.data,
        results: uploadResult.results.map(result => ({
          memoryId: result.memoryId,
          size: Number(result.size),
          checksum_sha256: result.checksumSha256
            ? Array.from(result.checksumSha256)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('')
            : null,
        })),
        userId: uploadResult.userId,
      };
    } else if (userBlobHostingPreferences.includes('vercel_blob')) {
      const { uploadToVercelBlob } = await import('./vercel-blob-upload');
      const results = await uploadToVercelBlob([file], isOnboarding, existingUserId, mode);
      const vercelResult = results[0]; // Get first (and only) result
      data = {
        data: vercelResult.data,
        results: vercelResult.results.map(result => ({
          memoryId: result.memoryId,
          size: Number(result.size),
          checksum_sha256: result.checksumSha256
            ? Array.from(result.checksumSha256)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('')
            : null,
        })),
        userId: vercelResult.userId,
      };
    } else if (userBlobHostingPreferences.includes('s3')) {
      // S3 with parallel processing (Lane A + Lane B)
      const uploadResult = await uploadToS3WithProcessing(file, onProgress);
      data = {
        data: uploadResult.data,
        results: uploadResult.results.map(result => ({
          memoryId: result.memoryId,
          size: Number(result.size),
          checksum_sha256: result.checksumSha256
            ? Array.from(result.checksumSha256)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('')
            : null,
        })),
        userId: uploadResult.userId,
      };
    } else {
      // Default to S3 with parallel processing for unknown preferences
      const uploadResult = await uploadToS3WithProcessing(file, onProgress);
      data = {
        data: uploadResult.data,
        results: uploadResult.results.map(result => ({
          memoryId: result.memoryId,
          size: Number(result.size),
          checksum_sha256: result.checksumSha256
            ? Array.from(result.checksumSha256)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('')
            : null,
        })),
        userId: uploadResult.userId,
      };
    }

    // Set userId for all upload services (normalize response)
    data.userId = existingUserId || '';
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
