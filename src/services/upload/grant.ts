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
 * Get single grant for all assets before starting parallel lanes
 */
export async function getSingleGrant(file: File): Promise<GrantResponse> {
  console.log(`🎫 Getting single grant for: ${file.name}`);

  const response = await fetch('/api/upload/request', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      // Request presigned URLs for all derivative types
      derivatives: ['display', 'thumb'],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get presigned URLs');
  }

  const grant = await response.json();
  console.log(`✅ Grant received for: ${file.name}`);

  return grant;
}
