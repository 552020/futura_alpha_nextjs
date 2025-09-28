import { useState } from 'react';

import { logger } from '@/lib/logger';
type PresignedUrlInfo = {
  signedUrl: string;
  s3Key: string;
};

type UploadProgress = {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
};

type UseMemoryUploadResult = {
  uploads: UploadProgress[];
  isUploading: boolean;
  uploadFiles: (files: FileList | File[], folderName?: string) => Promise<void>;
  resetUploads: () => void;
};

async function uploadFileWithProgress(file: File, url: string, onProgress: (progress: number) => void): Promise<File> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);
    xhr.setRequestHeader('Content-Type', file.type);

    xhr.upload.onprogress = event => {
      if (event.lengthComputable) {
        const progress = (event.loaded / event.total) * 100;
        onProgress(progress);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve(file);
      } else {
        reject(new Error(`Upload failed with status: ${xhr.status}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Upload failed due to a network error'));
    };

    xhr.send(file);
  });
}

export function useMemoryUpload(): UseMemoryUploadResult {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const resetUploads = () => {
    setUploads([]);
  };

  const updateUploadProgress = (file: File, updates: Partial<UploadProgress>) => {
    setUploads(prev => prev.map(upload => (upload.file === file ? { ...upload, ...updates } : upload)));
  };

  const uploadFiles = async (files: FileList | File[], folderName?: string) => {
    const fileArray = Array.from(files);

    // Initialize upload progress
    const initialUploads: UploadProgress[] = fileArray.map(file => ({
      file,
      progress: 0,
      status: 'pending' as const,
    }));

    setUploads(initialUploads);
    setIsUploading(true);

    try {
      // Step 1: Get presigned URLs
      const presignResponse = await fetch('/api/upload/batch-presign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: fileArray.map(file => ({
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
          })),
        }),
      });

      if (!presignResponse.ok) {
        const error = await presignResponse.json();
        throw new Error(error.error || 'Failed to get presigned URLs');
      }

      const { presignedUrls } = await presignResponse.json();

      // Step 2: Upload files to S3
      const uploadPromises = presignedUrls.map((upload: PresignedUrlInfo, index: number) => {
        const file = fileArray[index];
        return uploadFileWithProgress(file, upload.signedUrl, progress => {
          updateUploadProgress(file, { progress, status: 'uploading' });
        });
      });

      const uploadedFiles = await Promise.all(uploadPromises);

      let parentFolderId: string | undefined = undefined;
      if (folderName) {
        const folderResponse = await fetch('/api/folders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ folderName }),
        });

        if (!folderResponse.ok) {
          const error = await folderResponse.json();
          throw new Error(error.error || 'Failed to create folder');
        }

        const { folder } = await folderResponse.json();
        parentFolderId = folder.id;
      }

      // Step 3: Commit the upload with public S3 URLs
      const commitResponse = await fetch('/api/upload/batch-commit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: uploadedFiles.map((file, index) => {
            // Construct the public URL using the s3Key from the presigned response
            const s3Key = presignedUrls[index].s3Key;
            const publicUrl = `https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET}.s3.${process.env.NEXT_PUBLIC_AWS_S3_REGION || 'eu-central-1'}.amazonaws.com/${s3Key}`;

            return {
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
              s3Url: publicUrl,
            };
          }),
          parentFolderId,
        }),
      });

      if (!commitResponse.ok) {
        const error = await commitResponse.json();
        throw new Error(error.error || 'Failed to commit upload');
      }

      // Mark all as completed
      fileArray.forEach(file => {
        updateUploadProgress(file, { status: 'completed', progress: 100 });
      });

      return await commitResponse.json();
    } catch (error) {
      logger.error('Error during upload:', undefined, { data: error instanceof Error ? error : undefined });
      // Update all pending/uploading uploads to error state
      setUploads(prev =>
        prev.map(upload =>
          upload.status !== 'completed' && upload.status !== 'error'
            ? {
                ...upload,
                status: 'error' as const,
                error: error instanceof Error ? error.message : 'Upload failed',
              }
            : upload
        )
      );
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploads,
    isUploading,
    uploadFiles,
    resetUploads,
  };
}

export default useMemoryUpload;
