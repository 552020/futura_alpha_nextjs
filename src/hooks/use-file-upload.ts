'use client';

import { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useOnboarding } from '@/contexts/onboarding-context';
import { useSession } from 'next-auth/react';
import { useHostingPreferences } from '@/hooks/use-hosting-preferences';
import { processSingleFile } from '@/services/upload/single-file-processor';
import { processMultipleFiles } from '@/services/upload/multiple-files-processor';
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;

    if (!fileList || fileList.length === 0) {
      return;
    }

    // Convert FileList to static Array BEFORE clearing input
    const files = Array.from(fileList);

    // Reset input value to allow selecting the same files again
    event.target.value = '';

    // Get the authenticated user's ID from the session (extract once)
    const userId = session?.user?.id;

    if (mode === 'single' || files.length === 1) {
      // Single file: use existing single file logic
      const file = files[0];
      setIsLoading(true);
      try {
        await processSingleFile({
          file,
          isOnboarding,
          mode,
          existingUserId: userId,
          preferences,
          onSuccess,
          onError,
          updateOnboardingContext,
          showToast: toast,
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      // Multiple files: handles both 'directory' and 'multiple-files' modes
      setIsLoading(true);
      try {
        await processMultipleFiles({
          files,
          mode,
          isOnboarding,
          preferences,
          onSuccess,
          onError,
          updateOnboardingContext,
          existingUserId: userId,
          showToast: toast,
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  return { isLoading, fileInputRef, handleFileUpload };
}
