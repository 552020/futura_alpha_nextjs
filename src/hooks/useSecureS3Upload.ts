import { useCallback, useState } from 'react';
import { useS3Upload } from './useS3Upload';

export interface FileMetadata {
  [key: string]: string | number | boolean | null | undefined;
  userId: string;
  isOnboarding: boolean;
  originalName: string;
  size: number;
  type: string;
  storageBackend: string;
}

interface SecureS3UploadOptions {
  onComplete?: (url: string, fileKey: string) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: number) => void;
}

export function useSecureS3Upload({
  onComplete,
  onError,
}: Omit<SecureS3UploadOptions, 'onProgress'> = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);

  const { upload } = useS3Upload({
    onComplete: (url, fileKey) => {
      setProgress(100);
      onComplete?.(url, fileKey || '');
    },
    onError: (err) => {
      setError(err);
      onError?.(err);
    },
  });

  const uploadFile = useCallback(
    async (file: File, metadata: Omit<FileMetadata, 'originalName' | 'size' | 'type'>) => {
      setIsUploading(true);
      setError(null);
      setProgress(0);

      try {
        const result = await upload(file, {
          ...metadata,
          originalName: file.name,
          size: file.size,
          type: file.type,
        });
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Upload failed');
        setError(error);
        onError?.(error);
        return undefined;
      } finally {
        setIsUploading(false);
      }
    },
    [onError, upload]
  );

  return {
    uploadFile,
    isUploading,
    error,
    progress,
  } as const;
}
