import { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useOnboarding } from '@/contexts/onboarding-context';
import { useSession } from 'next-auth/react';
import { uploadFile } from '@/services/upload';
// Lazy import to avoid eager loading of ICP declarations
// import { icpUploadService } from '@/services/icp-upload';
// We'll need to create this context for post-onboarding state
// import { useVault } from '@/contexts/vault-context';
import { useUploadStorage, isUploadStorageExpired } from '@/hooks/use-upload-storage';
import { useStoragePreferences } from '@/hooks/use-storage-preferences';
import { UPLOAD_LIMITS } from '@/config/upload-limits';

type UploadMode = 'folder' | 'files';

interface UseFileUploadProps {
  mode?: UploadMode;
  isOnboarding?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useFileUpload({ isOnboarding = false, mode = 'folder', onSuccess, onError }: UseFileUploadProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { addFile: addOnboardingFile, updateUserData, setCurrentStep } = useOnboarding();
  const { data: session } = useSession();

  // const { addFile: addVaultFile } = useVault(); // Future implementation

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: preferences } = useStoragePreferences();
  const uploadStorageMutation = useUploadStorage();

  function mapPrefToBackend(pref?: 'neon' | 'icp' | 'dual' | 's3'): 'neon-db' | 'icp-canister' {
    if (pref === 'icp') return 'icp-canister';
    return 'neon-db'; // default for neon, dual, s3, undefined
  }

  async function requestUploadStorage(preferred?: 'neon-db' | 'icp-canister') {
    const chosenPreferred = preferred ?? mapPrefToBackend(preferences?.preference);
    const resp = await uploadStorageMutation.mutateAsync({ preferred: chosenPreferred });
    const storage = resp.uploadStorage;

    if (isUploadStorageExpired(storage.expires_at)) {
      throw new Error('Upload storage selection expired. Please try again.');
    }
    return storage;
  }

  async function verifyUpload(args: {
    appMemoryId: string;
    backend: 'neon-db' | 'icp-canister' | 'vercel-blob';
    idem: string;
    size?: number | null;
    checksum_sha256?: string | null;
    remote_id?: string | null;
  }) {
    try {
      await fetch('/api/upload/verify', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_memory_id: args.appMemoryId,
          backend: args.backend,
          idem: args.idem,
          checksum_sha256: args.checksum_sha256 ?? null,
          size: args.size ?? null,
          remote_id: args.remote_id ?? null,
        }),
      });
    } catch {
      // best-effort in MVP; do not block UI
    }
  }

  //   const handleUploadClick = () => {
  //     fileInputRef.current?.click();
  //   };

  //   const handleFolderUploadClick = () => {
  //     const el = fileInputRef.current;
  //     if (!el) return;

  //     el.setAttribute("webkitdirectory", "");
  //     el.setAttribute("directory", "");
  //     el.multiple = true;

  //     el.click();
  //   };

  const handleUploadClick = () => {
    const el = fileInputRef.current;
    if (!el) return;

    // reset to file mode first
    el.removeAttribute('webkitdirectory');
    el.removeAttribute('directory');
    el.multiple = false;

    if (mode === 'folder') {
      el.setAttribute('webkitdirectory', '');
      el.setAttribute('directory', '');
      el.multiple = true;
    } else if (mode === 'files') {
      // Enable multiple file selection for Files mode
      el.multiple = true;
    }

    el.click();
  };

  const checkFileSize = (file: File) => {
    if (!UPLOAD_LIMITS.isFileSizeValid(file.size)) {
      console.error('❌ File too large:', UPLOAD_LIMITS.getFileSizeErrorMessage(file.size));
      throw new Error(UPLOAD_LIMITS.getFileSizeErrorMessage(file.size));
    }
  };

  const updateOnboardingContext = (data: { data: { ownerId: string; id: string } }, file: File, url: string) => {
    // console.log("👤 Updating user data with:", {
    //   allUserId: data.data.ownerId,
    //   memoryId: data.data.id,
    // });

    updateUserData({
      allUserId: data.data.ownerId,
      isTemporary: !session,
      memoryId: data.data.id,
    });

    // Add file to context without user data
    const fileToAdd = {
      url,
      file,
      uploadedAt: new Date(),
      memoryId: data.data.id,
      fileType: file.type,
    };
    // console.log("📝 Adding file to onboarding context:", fileToAdd);
    addOnboardingFile(fileToAdd);

    // Set the next step based on authentication status
    if (session) {
      // console.log("🔄 Setting current step to share (authenticated user)");
      setCurrentStep('share');
    } else {
      // console.log("🔄 Setting current step to user-info (unauthenticated user)");
      setCurrentStep('user-info');
    }
  };

  const processSingleFile = async (file: File, skipSuccess = false, existingUserId?: string) => {
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
      checkFileSize(file);

      // Create a temporary URL for preview
      const url = URL.createObjectURL(file);

      // Use unified upload service with storage preference
      const userStoragePreference = preferences?.preference; // "neon" | "icp" | "dual" | "s3"
      console.log(`🔍 User storage preference: ${userStoragePreference}`);

      // For ICP preference, check authentication first
      if (userStoragePreference === 'icp') {
        console.log(`🔐 Checking ICP authentication...`);
        const { icpUploadService } = await import('@/services/icp-upload');
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
        userStoragePreference,
      });

      const uploadResult = await uploadFile(
        file,
        isOnboarding,
        existingUserId,
        mode,
        storageBackend,
        userStoragePreference
      );

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
      if (appMemoryId && userStoragePreference !== 'icp') {
        // For non-ICP flows, we still need to get storage info for verification
        const storage = await requestUploadStorage();
        await verifyUpload({
          appMemoryId,
          backend: storage.chosen_storage,
          idem: storage.idem,
          size: file.size,
          checksum_sha256: data?.results?.[0]?.checksum_sha256 ?? null,
          remote_id: data?.results?.[0]?.memoryId ?? appMemoryId,
        });
      }

      if (isOnboarding && data) {
        updateOnboardingContext(
          { data: { ownerId: data.userId ?? '', id: data.data?.id ?? appMemoryId ?? '' } },
          file,
          url
        );
      }

      if (!skipSuccess) {
        onSuccess?.();
      }
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

      toast({ variant: 'destructive', title, description });

      onError?.(error as Error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (mode == 'folder') {
      const files = event.target.files;
      if (!files) return;

      // Check file count limit
      if (!UPLOAD_LIMITS.isFileCountValid(files.length)) {
        toast({
          variant: 'destructive',
          title: 'Too many files',
          description: UPLOAD_LIMITS.getFileCountErrorMessage(files.length),
        });
        return;
      }

      // Check total size limit
      const totalSize = Array.from(files).reduce((sum, file) => sum + file.size, 0);
      if (!UPLOAD_LIMITS.isTotalSizeValid(totalSize)) {
        toast({
          variant: 'destructive',
          title: 'Upload too large',
          description: UPLOAD_LIMITS.getTotalSizeErrorMessage(totalSize),
        });
        return;
      }

      setIsLoading(true);

      try {
        // 1) Request upload storage (MVP mock)
        const storage = await requestUploadStorage();

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
        if (storage.chosen_storage === 'icp-canister') {
          // Pre-check Internet Identity authentication before attempting ICP upload
          const { icpUploadService } = await import('@/services/icp-upload');
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
          // Upload folder using unified POST /api/memories endpoint
          const formData = new FormData();
          Array.from(files).forEach(file => {
            formData.append('file', file);
          });

          // Add storage backend information to ensure consistent behavior with single file uploads
          formData.append('storageBackend', 's3');
          
          // Note: The unified POST /api/memories endpoint handles user authentication internally
          // No need to pass userId as it will be determined from the session or onboarding context

          console.log('📤 Uploading folder with storageBackend=s3');
          const response = await fetch('/api/memories', { method: 'POST', body: formData });

          type FolderResp = {
            error?: string;
            userId?: string;
            successfulUploads?: number;
            results?: Array<{ memoryId: string; size?: number; checksum_sha256?: string | null }>;
          };
          const json = (await response.json()) as FolderResp;
          data = json;

          if (!response.ok) {
            throw new Error(json?.error || 'Folder upload failed');
          }
        }

        // Best-effort verify first reported memory
        const appMemoryId = data?.results?.[0]?.memoryId;
        if (appMemoryId) {
          await verifyUpload({
            appMemoryId,
            backend: storage.chosen_storage,
            idem: storage.idem,
            size: data?.results?.[0]?.size || null,
            checksum_sha256: data?.results?.[0]?.checksum_sha256 || null,
            remote_id: data?.results?.[0]?.memoryId || appMemoryId,
          });
        }

        // Update context with results (onboarding)
        if (isOnboarding && data?.successfulUploads && data.successfulUploads > 0) {
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
        console.error('Folder upload error:', error);
        toast({
          variant: 'destructive',
          title: 'Upload failed',
          description: error instanceof Error ? error.message : 'Please try again.',
        });
        onError?.(error as Error);
      } finally {
        setIsLoading(false);
      }
    }

    if (mode == 'files') {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      if (files.length === 1) {
        // Single file: use existing single file logic (backward compatibility)
        const file = files[0];
        console.log(`🎯 DASHBOARD SINGLE FILE UPLOAD TRIGGERED:`, {
          fileName: file.name,
          fileSize: file.size,
          fileSizeMB: (file.size / (1024 * 1024)).toFixed(2),
          fileType: file.type,
          mode,
          isOnboarding,
        });

        setIsLoading(true);
        // Get the authenticated user's ID from the session
        const userId = session?.user?.id;
        await processSingleFile(file, false, userId);
        setIsLoading(false);
      } else {
        // Multiple files: reuse folder upload logic
        console.log(`🎯 DASHBOARD MULTIPLE FILES UPLOAD TRIGGERED:`, {
          fileCount: files.length,
          files: Array.from(files).map(f => ({
            name: f.name,
            size: f.size,
            sizeMB: (f.size / (1024 * 1024)).toFixed(2),
            type: f.type,
          })),
          mode,
          isOnboarding,
        });

        // Check file count limit
        if (!UPLOAD_LIMITS.isFileCountValid(files.length)) {
          toast({
            variant: 'destructive',
            title: 'Too many files',
            description: UPLOAD_LIMITS.getFileCountErrorMessage(files.length),
          });
          return;
        }

        // Check total size limit
        const totalSize = Array.from(files).reduce((sum, file) => sum + file.size, 0);
        if (!UPLOAD_LIMITS.isTotalSizeValid(totalSize)) {
          toast({
            variant: 'destructive',
            title: 'Upload too large',
            description: UPLOAD_LIMITS.getTotalSizeErrorMessage(totalSize),
          });
          return;
        }

        setIsLoading(true);

        try {
          // 1) Request upload storage (MVP mock)
          const storage = await requestUploadStorage();

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
          if (storage.chosen_storage === 'icp-canister') {
            // Pre-check Internet Identity authentication before attempting ICP upload
            const { icpUploadService } = await import('@/services/icp-upload');
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
            // Upload multiple files using unified POST /api/memories endpoint
            const formData = new FormData();
            Array.from(files).forEach(file => {
              formData.append('file', file);
            });

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
              throw new Error(json?.error || 'Multiple files upload failed');
            }
          }

          // Best-effort verify first reported memory
          const appMemoryId = data?.results?.[0]?.memoryId;
          if (appMemoryId) {
            await verifyUpload({
              appMemoryId,
              backend: storage.chosen_storage,
              idem: storage.idem,
              size: data?.results?.[0]?.size || null,
              checksum_sha256: data?.results?.[0]?.checksum_sha256 || null,
              remote_id: data?.results?.[0]?.memoryId || appMemoryId,
            });
          }

          // Update context with results (onboarding)
          if (isOnboarding && data?.successfulUploads && data.successfulUploads > 0) {
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
          console.error('Multiple files upload error:', error);
          toast({
            variant: 'destructive',
            title: 'Upload failed',
            description: error instanceof Error ? error.message : 'Please try again.',
          });
          onError?.(error as Error);
        } finally {
          setIsLoading(false);
        }
      }
    }
  };

  return { isLoading, fileInputRef, handleUploadClick, handleFileUpload };
}
