import { logger } from '@/lib/logger';

/**
 * Grant service for single grant pattern
 *
 * Handles requesting presigned URLs for all assets (original, display, thumb)
 * in a single API call to reduce round trips and avoid presign rate limits.
 */

export interface GrantResponse {
  original: {
    uploadUrl: string;
    fileKey: string;
    contentType: string;
  };
  display?: {
    uploadUrl: string;
    fileKey: string;
    contentType: string;
  };
  thumb?: {
    uploadUrl: string;
    fileKey: string;
    contentType: string;
  };
  placeholderInDb: boolean;
}

/**
 * Get grants for files (single or multiple) - unified function
 * STEP 1 of the upload pipeline (uploadMultipleToS3WithProcessing in s3-with-processing.ts)
 */
export async function getGrants(files: File[]): Promise<GrantResponse[]> {
  logger.info(`🎫 Getting grants for ${files.length} file(s):`, undefined, { fileNames: files.map(f => f.name) });

  const response = await fetch('/api/upload/s3/presign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      files: files.map(file => ({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      })),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get presigned URLs');
  }

  const { grants } = await response.json();
  logger.info(`✅ Grants received for ${files.length} file(s)`);

  return grants;
}
