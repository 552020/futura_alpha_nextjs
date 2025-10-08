'use client';

import { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useOnboarding } from '@/contexts/onboarding-context';
import { useSession } from 'next-auth/react';
import { useHostingPreferences } from '@/hooks/use-hosting-preferences';
import { processSingleFile } from '@/services/upload/single-file-processor';
import { processMultipleFiles } from '@/services/upload/multiple-files-processor';
import { checkICPAuthentication } from '@/services/upload/shared-utils';
import { fatLogger } from '@/lib/logger';
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

    // Debug: Log current hosting preferences
    fatLogger.debug('🔍 [FILE UPLOAD] Current hosting preferences:', 'fe', {
      preferences,
      backendHosting: preferences?.backendHosting,
      databaseHosting: preferences?.databaseHosting,
      blobHosting: preferences?.blobHosting,
    });

    // Use actual user preferences instead of hardcoded values
    const userBlobHostingPreferences = preferences?.blobHosting || ['s3'];

    // Create preferences object for processors
    const uploadPreferences = {
      frontendHosting: preferences?.frontendHosting || 'vercel',
      backendHosting: preferences?.backendHosting || 'vercel',
      databaseHosting: preferences?.databaseHosting || ['neon'],
      blobHosting: userBlobHostingPreferences,
      updatedAt: preferences?.updatedAt,
    };

    fatLogger.debug('🚀 [FILE UPLOAD] Upload preferences being used:', 'fe', uploadPreferences);

    // Only check ICP authentication if backend is actually set to ICP
    // Don't check just because blob hosting includes ICP
    if (preferences?.backendHosting === 'icp' && userBlobHostingPreferences.includes('icp')) {
      fatLogger.debug('🔐 [FILE UPLOAD] Checking ICP authentication (backend is ICP)', 'fe');
      try {
        await checkICPAuthentication();
        fatLogger.debug('✅ [FILE UPLOAD] ICP authentication successful', 'fe');
      } catch (_error) {
        fatLogger.debug('❌ [FILE UPLOAD] ICP authentication failed', 'fe');
        toast({
          variant: 'destructive',
          title: 'Authentication Required',
          description: 'Please connect your Internet Identity to upload to ICP',
        });
        return;
      }
    } else {
      fatLogger.debug('ℹ️ [FILE UPLOAD] Skipping ICP authentication check (backend is not ICP)', 'fe');
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
          preferences: uploadPreferences,
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
          preferences: uploadPreferences,
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
