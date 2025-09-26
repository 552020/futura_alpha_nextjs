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

  const updateOnboardingContext = (data: { data: { ownerId: string; id: string } }, files: File[]) => {
    updateUserData({
      allUserId: data.data.ownerId,
      isTemporary: !session,
      memoryId: data.data.id,
    });

    // Add files to context
    files.forEach(file => {
      const url = URL.createObjectURL(file);
      const fileToAdd = {
        url,
        file,
        uploadedAt: new Date(),
        memoryId: data.data.id,
        fileType: file.type,
      };
      addOnboardingFile(fileToAdd);
    });

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

  const processMultipleFiles = async (files: File[], mode: 'directory' | 'multiple-files') => {
    await processMultipleFilesService({
      files,
      mode,
      isOnboarding,
      preferences,
      onSuccess,
      onError,
      updateOnboardingContext,
      session,
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

    if (mode === 'single' || files.length === 1) {
      // Single file: use existing single file logic
      const file = files[0];
      setIsLoading(true);
      try {
        // Get the authenticated user's ID from the session
        const userId = session?.user?.id;
        await processSingleFile(file, false, userId);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Multiple files: handles both 'directory' and 'multiple-files' modes
      setIsLoading(true);
      try {
        await processMultipleFiles(files, mode);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return { isLoading, fileInputRef, handleFileUpload };
}
