'use client';

import { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useOnboarding } from '@/contexts/onboarding-context';
import { useSession } from 'next-auth/react';
import { useHostingPreferences } from '@/hooks/use-storage-preferences';
import { processSingleFile as processSingleFileService } from '@/services/upload/single-file-processor';
import { processMultipleFiles as processMultipleFilesService } from '@/services/upload/multiple-files-processor';
import type { UseFileUploadProps } from '@/types/upload';

export function useFileUpload({ isOnboarding = false, mode = 'directory', onSuccess, onError }: UseFileUploadProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { addFile: addOnboardingFile, updateUserData, setCurrentStep } = useOnboarding();
  const { data: session } = useSession();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: preferences } = useHostingPreferences();

  const updateOnboardingContext = (data: { data: { ownerId: string; id: string } }, file: File, url: string) => {
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
    addOnboardingFile(fileToAdd);

    // Set the next step based on authentication status
    if (session) {
      setCurrentStep('share');
    } else {
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

    if (!fileList || fileList.length === 0) {
      return;
    }

    // Convert FileList to static Array BEFORE clearing input
    const files = Array.from(fileList);

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
