import { useState, useCallback } from 'react';

interface FileMetadata {
  [key: string]: string | number | boolean | null | undefined;
}

interface UploadOptions {
  onComplete?: (url: string, fileKey: string) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: number) => void;
  metadata?: FileMetadata;
}

export interface UseS3UploadResult {
  upload: (file: File, metadata?: FileMetadata) => Promise<string | undefined>;
  progress: number;
  isUploading: boolean;
  error: Error | null;
  reset: () => void;
}

export function useS3Upload({
  onComplete,
  onError,
}: Omit<UploadOptions, 'onProgress'> = {}): UseS3UploadResult {
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const upload = useCallback(
    async (file: File, metadata: FileMetadata = {}): Promise<string | undefined> => {
      if (!file) {
        const error = new Error('No file provided');
        setError(error);
        onError?.(error);
        return undefined;
      }

      setIsUploading(true);
      setProgress(0);
      setError(null);

      try {
        // 1. Request a presigned URL from our API
        const response = await fetch('/api/upload/request', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to get upload URL');
        }

const { uploadUrl, fileKey } = await response.json();

        // 2. Upload the file directly to S3 using the presigned URL
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
            'Content-Length': file.size.toString(),
          },
        });

        if (!uploadResponse.ok) {
          throw new Error('Upload to S3 failed');
        }

        // 3. Notify our API that the upload is complete
        const completeResponse = await fetch('/api/upload/complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileKey,
            originalName: file.name,
            size: file.size,
            type: file.type,
            metadata,
          }),
        });

        if (!completeResponse.ok) {
          const errorData = await completeResponse.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to complete upload');
        }

        const { url: finalUrl } = await completeResponse.json();
        
        // Update progress to 100%
        setProgress(100);
        
        // Call the completion callback
        onComplete?.(finalUrl, fileKey);
        
        return finalUrl;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Upload failed');
        setError(error);
        onError?.(error);
        return undefined;
      } finally {
        setIsUploading(false);
      }
    },
    [onComplete, onError]
  );

  const reset = useCallback(() => {
    setProgress(0);
    setError(null);
    setIsUploading(false);
  }, []);

  return {
    upload,
    progress,
    isUploading,
    error,
    reset,
  } as const;
}

// Example usage in a component:
/*
function UploadComponent() {
  const { upload, progress, isUploading, error } = useS3Upload({
    onComplete: (url) => console.log('Upload complete:', url),
    onError: (error) => console.error('Upload error:', error),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      upload(file);
    }
  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} disabled={isUploading} />
      {isUploading && (
        <div>
          <progress value={progress} max="100" />
          <span>{progress}%</span>
        </div>
      )}
      {error && <div className="error">{error.message}</div>}
    </div>
  );
}
*/
