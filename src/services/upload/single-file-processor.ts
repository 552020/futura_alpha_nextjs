/**
 * Single file processing service
 *
 * Handles the complete flow of processing a single file upload:
 * - File validation
 * - Authentication checks
 * - Upload orchestration
 * - Response processing
 * - Verification
 * - Context updates
 */

import { uploadFile } from './upload';
import { verifyIntent } from './intent';
import { verifyUpload } from './verification';
import { UPLOAD_LIMITS } from '@/config/upload-limits';
import type { FileInputAttributeMode } from '@/types/upload';
import type { HostingPreferences } from '@/hooks/use-storage-preferences';

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
  } = options;

  console.log(`📁 Processing single file: ${file.name} (${file.size} bytes)`);
  console.log(`📊 DASHBOARD UPLOAD ANALYSIS:`, {
    fileName: file.name,
    fileSize: file.size,
    fileSizeMB: (file.size / (1024 * 1024)).toFixed(2),
    fileType: file.type,
    isOnboarding,
    mode,
    existingUserId,
    isLargeFile: file.size / (1024 * 1024) > 4,
    threshold: '4MB',
  });

  try {
    // Validate file size
    if (!UPLOAD_LIMITS.isFileSizeValid(file.size)) {
      console.error('❌ File too large:', UPLOAD_LIMITS.getFileSizeErrorMessage(file.size));
      throw new Error(UPLOAD_LIMITS.getFileSizeErrorMessage(file.size));
    }

    // Create a temporary URL for preview
    const url = URL.createObjectURL(file);

    // Use unified upload service with storage preference
    const userBlobHosting = preferences?.blobHosting; // "s3" | "vercel_blob" | "icp" | "arweave" | "ipfs" | "neon"
    console.log(`🔍 User blob hosting: ${userBlobHosting}`);

    // For ICP preference, check authentication first
    if (userBlobHosting === 'icp') {
      console.log(`🔐 Checking ICP authentication...`);
      const { icpUploadService } = await import('./icp-upload');
      const isAuthenticated = await icpUploadService.isAuthenticated();
      if (!isAuthenticated) {
        throw new Error('Please connect your Internet Identity to upload to ICP');
      }
      console.log(`✅ ICP authentication confirmed`);
    }

    // Temporary override for testing - force S3 uploads
    const storageBackend = 's3' as const;
    console.log('🔧 TEMPORARY OVERRIDE: Forcing S3 uploads for testing');
    // Original code (commented out for reference):
    // let storageBackend: 'vercel_blob' | 's3' = 'vercel_blob';
    // if (userStoragePreference === 's3') {
    //   storageBackend = 's3';
    // }

    // Use the unified uploadFile function
    console.log(`🚀 Calling uploadFile with parameters:`, {
      fileName: file.name,
      isOnboarding,
      existingUserId,
      mode,
      storageBackend,
      userBlobHosting,
    });

    const uploadResult = await uploadFile(file, isOnboarding, existingUserId, mode, storageBackend, userBlobHosting);

    // Convert to expected format for compatibility
    // Note: uploadResult.data is an array of memories from the backend
    const memory = Array.isArray(uploadResult.data) ? uploadResult.data[0] : uploadResult.data;

    // Check if we have a valid memory response
    if (!memory || !memory.id) {
      console.error('❌ Invalid upload response:', uploadResult);
      throw new Error('Upload failed: Invalid response from server');
    }

    const data = {
      data: { id: memory.id },
      results: [
        {
          memoryId: memory.id,
          size: file.size, // Use original file size since assets array might not be available
          checksum_sha256: null, // Will be filled by verification if available
        },
      ],
      userId: existingUserId || '', // Add userId for compatibility
    };

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

    console.error('❌ Upload error:', error);

    showToast({ variant: 'destructive', title, description });

    onError?.(error as Error);
  }
}
