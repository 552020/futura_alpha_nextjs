/**
 * Multiple files processing service
 *
 * Handles the complete flow of processing multiple files upload (directory or multiple-files mode):
 * - File validation (count and total size)
 * - Storage intent verification
 * - Authentication checks
 * - Upload orchestration (ICP vs S3)
 * - Response processing
 * - Verification
 * - Context updates
 */

import { verifyIntent } from './intent';
import { verifyUpload } from './verification';
import { UPLOAD_LIMITS } from '@/config/upload-limits';
// import type { FileInputAttributeMode } from '@/types/upload'; // Not used in this service
import type { HostingPreferences } from '@/hooks/use-storage-preferences';

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
  } = options;

  // Validate file count limit
  if (!UPLOAD_LIMITS.isFileCountValid(files.length)) {
    showToast({
      variant: 'destructive',
      title: 'Too many files',
      description: UPLOAD_LIMITS.getFileCountErrorMessage(files.length),
    });
    return;
  }

  // Validate total size limit
  const totalSize = Array.from(files).reduce((sum, file) => sum + file.size, 0);
  if (!UPLOAD_LIMITS.isTotalSizeValid(totalSize)) {
    showToast({
      variant: 'destructive',
      title: 'Upload too large',
      description: UPLOAD_LIMITS.getTotalSizeErrorMessage(totalSize),
    });
    return;
  }

  try {
    // 1) Request upload storage (MVP mock)
    const storageResponse = await verifyIntent({
      preferred: preferences?.blobHosting,
      databaseHosting: preferences?.databaseHosting,
      backendHosting: preferences?.backendHosting,
    });
    const storage = storageResponse.uploadStorage;

    let data:
      | {
          results?: Array<{
            memoryId: string;
            size?: number;
            checksum_sha256?: string | null;
            name?: string;
            type?: string;
          }>;
          userId?: string;
          successfulUploads?: number;
        }
      | undefined;

    // 2) Route to appropriate upload service based on chosen storage
    if (storage.blob_storage === 'icp') {
      // Pre-check Internet Identity authentication before attempting ICP upload
      const { icpUploadService } = await import('./icp-upload');
      const isAuthenticated = await icpUploadService.isAuthenticated();
      if (!isAuthenticated) {
        throw new Error('Please connect your Internet Identity to upload to ICP');
      }

      const icpResults = await icpUploadService.uploadFolder(Array.from(files), storage, () => {});

      // Convert ICP results to expected format
      data = {
        results: icpResults.map((result, index) => ({
          memoryId: result.memoryId,
          size: result.size,
          name: files[index].name,
          type: files[index].type,
          checksum_sha256: result.checksum_sha256,
        })),
      };
    } else {
      // Upload files using unified POST /api/memories endpoint
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('file', file);
      });

      // Add storage backend information for directory mode to ensure consistent behavior
      if (mode === 'directory') {
        formData.append('storageBackend', 's3');
        console.log('📤 Uploading folder with storageBackend=s3');
      }

      // Note: The unified POST /api/memories endpoint handles user authentication internally
      // No need to pass userId as it will be determined from the session or onboarding context

      const response = await fetch('/api/memories', { method: 'POST', body: formData });

      type MultipleFilesResp = {
        error?: string;
        userId?: string;
        successfulUploads?: number;
        results?: Array<{ memoryId: string; size?: number; checksum_sha256?: string | null }>;
      };
      const json = (await response.json()) as MultipleFilesResp;
      data = json;

      if (!response.ok) {
        throw new Error(json?.error || `${mode === 'directory' ? 'Folder' : 'Multiple files'} upload failed`);
      }
    }

    // Best-effort verify first reported memory
    const appMemoryId = data?.results?.[0]?.memoryId;
    if (appMemoryId) {
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
    console.error(`${mode === 'directory' ? 'Folder' : 'Multiple files'} upload error:`, error);
    showToast({
      variant: 'destructive',
      title: 'Upload failed',
      description: error instanceof Error ? error.message : 'Please try again.',
    });
    onError?.(error as Error);
  }
}
