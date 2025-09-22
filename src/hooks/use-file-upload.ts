'use client';

import { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useOnboarding } from '@/contexts/onboarding-context';
import { useSession } from 'next-auth/react';
// import { uploadFile } from '@/services/upload/upload'; // Now handled by processSingleFileService
// Lazy import to avoid eager loading of ICP declarations
// import { icpUploadService } from '@/services/upload/icp-upload';
// We'll need to create this context for post-onboarding state
// import { useVault } from '@/contexts/vault-context';
// import { isUploadStorageExpired } from '@/hooks/use-upload-storage'; // Not used anymore
import { useHostingPreferences } from '@/hooks/use-storage-preferences';
// import { verifyIntent } from '@/services/upload/intent'; // Now handled by services
// import { verifyUpload } from '@/services/upload/verification'; // Now handled by services
import { processSingleFile as processSingleFileService } from '@/services/upload/single-file-processor';
import { processMultipleFiles as processMultipleFilesService } from '@/services/upload/multiple-files-processor';
// import { UPLOAD_LIMITS } from '@/config/upload-limits'; // Now handled by services
import type { UseFileUploadProps } from '@/types/upload';

export function useFileUpload({ isOnboarding = false, mode = 'directory', onSuccess, onError }: UseFileUploadProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { addFile: addOnboardingFile, updateUserData, setCurrentStep } = useOnboarding();
  const { data: session } = useSession();

  // const { addFile: addVaultFile } = useVault(); // Future implementation

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: preferences } = useHostingPreferences();

  // REMOVED: mapBlobHostingToBackend - now handled in verifyIntent service

  // OLD FUNCTION - COMMENTED OUT
  // async function requestUploadStorage(preferred?: 's3' | 'vercel_blob' | 'icp' | 'arweave' | 'ipfs') {
  //   const chosenPreferred = preferred ?? mapBlobHostingToBackend(preferences?.blobHosting);
  //   const resp = await uploadStorageMutation.mutateAsync({
  //     preferred: chosenPreferred,
  //     databaseHosting: preferences?.databaseHosting,
  //   });
  //   const storage = resp.uploadStorage;

  //   if (isUploadStorageExpired(storage.expires_at)) {
  //     throw new Error('Upload storage selection expired. Please try again.');
  //   }
  //   return storage;
  // }

  // OLD FUNCTION - COMMENTED OUT
  // async function verifyUpload(args: {
  //   appMemoryId: string;
  //   database: 'neon' | 'icp';
  //   blob_storage: 's3' | 'vercel_blob' | 'icp' | 'arweave' | 'ipfs';
  //   idem: string;
  //   size?: number | null;
  //   checksum_sha256?: string | null;
  //   remote_id?: string | null;
  // }) {
  //   try {
  //     await fetch('/api/upload/verify', {
  //       method: 'POST',
  //       credentials: 'include',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({
  //         app_memory_id: args.appMemoryId,
  //         database: args.database,
  //         blob_storage: args.blob_storage,
  //         idem: args.idem,
  //         checksum_sha256: args.checksum_sha256 ?? null,
  //         size: args.size ?? null,
  //         remote_id: args.remote_id ?? null,
  //       }),
  //     });
  //   } catch {
  //     // best-effort in MVP; do not block UI
  //   }
  // }

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

  // DOM manipulation logic moved to src/lib/file-picker.ts
  // Components should call triggerFileInput(fileInputRef.current, mode) directly

  // File size validation moved to direct UPLOAD_LIMITS usage for consistency

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
    await processSingleFileService({
      file,
      isOnboarding,
      mode,
      existingUserId,
      preferences,
      onSuccess: skipSuccess ? undefined : onSuccess,
      onError,
      updateOnboardingContext,
      showToast: toast,
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    // console.log('🔍 DEBUG: handleFileUpload called with:', {
    //   mode,
    //   filesLength: fileList?.length || 0,
    //   files: fileList ? Array.from(fileList).map(f => f.name) : 'null',
    // });

    if (!fileList || fileList.length === 0) {
      // console.log('❌ DEBUG: No files found, returning early');
      return;
    }

    // Convert FileList to static Array BEFORE clearing input
    const files = Array.from(fileList);
    // console.log('🔍 DEBUG: Converted to static array:', {
    //   filesLength: files.length,
    //   files: files.map(f => f.name),
    // });

    // Reset input value to allow selecting the same files again
    event.target.value = '';

    if (mode === 'directory') {
      setIsLoading(true);
      try {
        await processMultipleFilesService({
          files: Array.from(files),
          mode: 'directory',
          isOnboarding,
          preferences,
          onSuccess,
          onError,
          updateUserData,
          setCurrentStep,
          session,
          showToast: toast,
        });
      } finally {
        setIsLoading(false);
      }
    } else if (mode === 'multiple-files' || mode === 'single') {
      // console.log('🔍 DEBUG: Entering multiple-files/single branch with:', {
      //   mode,
      //   filesLength: files.length,
      //   condition: `files.length === 1 (${files.length === 1}) || mode === 'single' (${mode === 'single'})`,
      //   willUseSingle: files.length === 1 || mode === 'single',
      // });

      if (files.length === 1 || mode === 'single') {
        // Single file: use existing single file logic
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
      } else if (mode === 'multiple-files') {
        // Multiple files: use multiple files processor
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

        setIsLoading(true);
        try {
          await processMultipleFilesService({
            files: Array.from(files),
            mode: 'multiple-files',
            isOnboarding,
            preferences,
            onSuccess,
            onError,
            updateUserData,
            setCurrentStep,
            session,
            showToast: toast,
          });
        } finally {
          setIsLoading(false);
        }
      }
    }
  };

  return { isLoading, fileInputRef, handleFileUpload };
}
