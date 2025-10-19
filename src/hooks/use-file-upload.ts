'use client';

import { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useOnboarding } from '@/contexts/onboarding-context';
import { useSession } from 'next-auth/react';
import { useHostingPreferences, type DatabaseHosting, type BlobHosting } from '@/hooks/use-hosting-preferences';
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
  const { data: preferences } = useHostingPreferences({ enabled: !isOnboarding });

  const updateOnboardingContext = (data: { data: { ownerId: string; id: string } }, files: File[]) => {
    console.log('🔍 [DEBUG] updateOnboardingContext called with data:', JSON.stringify(data, null, 2));
    console.log('📋 [DEBUG] Setting allUserId to:', data.data.ownerId);
    console.log('📋 [DEBUG] Setting memoryId to:', data.data.id);

    if (!data.data.ownerId) {
      console.log('❌ [DEBUG] ownerId is empty or undefined in upload response');
      console.log('📋 [DEBUG] Full data structure:', JSON.stringify(data, null, 2));
    }

    updateUserData({
      allUserId: data.data.ownerId,
      isTemporary: true, // Onboarding users are always temporary (unauthenticated)
      memoryId: data.data.id,
    });

    console.log('✅ [DEBUG] updateUserData called with allUserId:', data.data.ownerId);

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

    // Onboarding users always go to user-info step (they're not authenticated)
    setCurrentStep('user-info');
  };

  const handleFileUploadOnboarding = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;

    if (!fileList || fileList.length === 0) {
      return;
    }

    // Convert FileList to static Array BEFORE clearing input
    const files = Array.from(fileList);

    // Reset input value to allow selecting the same files again
    event.target.value = '';

    // For onboarding, always use Vercel Blob with specific preferences
    const onboardingPreferences = {
      frontendHosting: 'vercel' as const,
      backendHosting: 'vercel' as const,
      databaseHosting: ['neon'] as DatabaseHosting[],
      blobHosting: ['vercel_blob'] as BlobHosting[], // Force Vercel Blob for onboarding
      updatedAt: new Date().toISOString(),
    };

    if (mode === 'single' || files.length === 1) {
      // Single file: use existing single file logic with Vercel Blob
      const file = files[0];
      console.log('🔍 [DEBUG] handleFileUploadOnboarding: Processing single file:', file.name);

      setIsLoading(true);
      try {
        console.log('🔍 [DEBUG] Calling processSingleFile...');
        await processSingleFile({
          file,
          isOnboarding,
          mode,
          existingUserId: undefined, // Onboarding users are always unauthenticated
          preferences: onboardingPreferences,
          onSuccess,
          onError,
          updateOnboardingContext,
          showToast: toast,
        });
        console.log('✅ [DEBUG] processSingleFile completed successfully');
      } catch (error) {
        console.log('❌ [DEBUG] processSingleFile failed:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    } else {
      // Multiple files: handles both 'directory' and 'multiple-files' modes
      console.log('🔍 [DEBUG] handleFileUploadOnboarding: Processing multiple files:', files.length);
      setIsLoading(true);
      try {
        console.log('🔍 [DEBUG] Calling processMultipleFiles...');
        await processMultipleFiles({
          files,
          mode,
          isOnboarding,
          preferences: onboardingPreferences,
          onSuccess,
          onError,
          updateOnboardingContext,
          existingUserId: undefined, // Onboarding users are always unauthenticated
          showToast: toast,
        });
        console.log('✅ [DEBUG] processMultipleFiles completed successfully');
      } catch (error) {
        console.log('❌ [DEBUG] processMultipleFiles failed:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;

    if (!fileList || fileList.length === 0) {
      return;
    }

    // For onboarding users, use Vercel Blob instead of user preferences
    if (isOnboarding) {
      return handleFileUploadOnboarding(event);
    }

    fatLogger.info('Upload started', 'fe', { fileCount: fileList.length, mode });
    fatLogger.info('Hosting preferences', 'fe', preferences);

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

    fatLogger.info('Upload config:', 'fe', uploadPreferences);

    // Only check ICP authentication if backend is actually set to ICP
    // Don't check just because blob hosting includes ICP
    if (preferences?.backendHosting === 'icp' && userBlobHostingPreferences.includes('icp')) {
      fatLogger.info('ICP authentication required - checking Internet Identity', 'fe', {
        backendHosting: preferences?.backendHosting,
        blobHosting: userBlobHostingPreferences,
      });

      try {
        await checkICPAuthentication();
        fatLogger.info('ICP authentication successful', 'fe');
      } catch (error) {
        fatLogger.info('ICP authentication required - user not authenticated', 'fe', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        toast({
          variant: 'destructive',
          title: 'Authentication Required',
          description: 'Please connect your Internet Identity to upload to ICP',
        });
        return;
      }
    } else {
      fatLogger.debug('Skipping ICP authentication check (backend is not ICP)', 'fe', {
        backendHosting: preferences?.backendHosting,
        blobHosting: userBlobHostingPreferences,
      });
    }

    // Convert FileList to static Array BEFORE clearing input
    const files = Array.from(fileList);

    // Reset input value to allow selecting the same files again
    event.target.value = '';

    // Get the authenticated user's ID from the session (extract once)
    const userId = session?.user?.id;

    // Log processing decision
    const processingMode = mode === 'single' || files.length === 1 ? 'single' : 'multiple';
    fatLogger.info('Starting file processing', 'fe', {
      processingMode,
      fileCount: files.length,
      userId: userId || 'anonymous',
      preferences: uploadPreferences,
    });

    if (mode === 'single' || files.length === 1) {
      // Single file: use existing single file logic
      const file = files[0];
      fatLogger.debug('Processing single file', 'fe', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      });

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
      fatLogger.debug('Processing multiple files', 'fe', {
        fileCount: files.length,
        mode,
        fileNames: files.map(f => f.name),
      });

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
