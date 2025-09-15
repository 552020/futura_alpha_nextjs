/**
 * MEMORY UPLOAD UTILITIES - CLIENT SIDE
 *
 * This module provides client-side utilities for uploading memories with multiple assets.
 * It handles image processing, multiple asset creation, and upload to the API.
 *
 * USAGE:
 * - Upload single images with multiple optimized versions
 * - Upload multiple images in batch
 * - Process images client-side for better performance
 * - Handle upload progress and error states
 */

import { processImageForMultipleAssets, uploadProcessedAssetsToBlob } from "@/app/api/memories/utils/image-processing";

export interface UploadProgress {
  fileIndex: number;
  fileName: string;
  stage: "processing" | "uploading" | "creating-memory" | "adding-assets" | "completed" | "error";
  progress: number; // 0-100
  error?: string;
}

export interface UploadResult {
  success: boolean;
  memory?: {
    id: string;
    type: string;
    title: string;
    assets: Array<{
      assetType: string;
      url: string;
      width: number;
      height: number;
      bytes: number;
    }>;
  };
  error?: string;
}

export interface BatchUploadResult {
  successful: UploadResult[];
  failed: UploadResult[];
  totalFiles: number;
  duration: number;
}

/**
 * Upload a single image with multiple optimized assets
 * This is the recommended approach for image uploads
 */
export async function uploadImageWithMultipleAssets(
  file: File,
  options: {
    parentFolderId?: string;
    onProgress?: (progress: UploadProgress) => void;
  } = {}
): Promise<UploadResult> {
  const { parentFolderId, onProgress } = options;

  try {
    // Stage 1: Process image for multiple assets
    onProgress?.({
      fileIndex: 0,
      fileName: file.name,
      stage: "processing",
      progress: 10,
    });

    const processedAssets = await processImageForMultipleAssets(file);

    onProgress?.({
      fileIndex: 0,
      fileName: file.name,
      stage: "processing",
      progress: 30,
    });

    // Stage 2: Upload processed assets to blob storage
    onProgress?.({
      fileIndex: 0,
      fileName: file.name,
      stage: "uploading",
      progress: 40,
    });

    const baseFileName = file.name.replace(/[^a-zA-Z0-9-_\.]/g, "_");
    const blobResults = await uploadProcessedAssetsToBlob(processedAssets, baseFileName);

    onProgress?.({
      fileIndex: 0,
      fileName: file.name,
      stage: "uploading",
      progress: 70,
    });

    // Stage 3: Create memory
    onProgress?.({
      fileIndex: 0,
      fileName: file.name,
      stage: "creating-memory",
      progress: 80,
    });

    const memoryResponse = await fetch("/api/memories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "image",
        title: file.name.split(".")[0],
        description: "",
        fileCreatedAt: new Date().toISOString(),
        isPublic: false,
        parentFolderId: parentFolderId || null,
        tags: [],
        recipients: [],
        unlockDate: null,
        metadata: {},
      }),
    });

    if (!memoryResponse.ok) {
      throw new Error(`Failed to create memory: ${memoryResponse.statusText}`);
    }

    const { data: memory } = await memoryResponse.json();

    // Stage 4: Add assets to memory
    onProgress?.({
      fileIndex: 0,
      fileName: file.name,
      stage: "adding-assets",
      progress: 90,
    });

    const assetsResponse = await fetch(`/api/memories/${memory.id}/assets`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        assets: [
          {
            assetType: "original",
            url: blobResults.original.url,
            bytes: processedAssets.original.size,
            width: processedAssets.original.width,
            height: processedAssets.original.height,
            mimeType: processedAssets.original.mimeType,
            storageBackend: "vercel_blob",
            storageKey: blobResults.original.storageKey,
            sha256: null, // Could be calculated if needed
            variant: null,
          },
          {
            assetType: "display",
            url: blobResults.display.url,
            bytes: processedAssets.display.size,
            width: processedAssets.display.width,
            height: processedAssets.display.height,
            mimeType: processedAssets.display.mimeType,
            storageBackend: "vercel_blob",
            storageKey: blobResults.display.storageKey,
            sha256: null,
            variant: null,
          },
          {
            assetType: "thumb",
            url: blobResults.thumb.url,
            bytes: processedAssets.thumb.size,
            width: processedAssets.thumb.width,
            height: processedAssets.thumb.height,
            mimeType: processedAssets.thumb.mimeType,
            storageBackend: "vercel_blob",
            storageKey: blobResults.thumb.storageKey,
            sha256: null,
            variant: null,
          },
        ],
      }),
    });

    if (!assetsResponse.ok) {
      throw new Error(`Failed to add assets: ${assetsResponse.statusText}`);
    }

    const { data: assetsData } = await assetsResponse.json();

    onProgress?.({
      fileIndex: 0,
      fileName: file.name,
      stage: "completed",
      progress: 100,
    });

    return {
      success: true,
      memory: {
        id: memory.id,
        type: memory.type,
        title: memory.title,
        assets: assetsData.assets.map((asset: any) => ({
          // eslint-disable-line @typescript-eslint/no-explicit-any
          assetType: asset.assetType,
          url: asset.url,
          width: asset.width,
          height: asset.height,
          bytes: asset.bytes,
        })),
      },
    };
  } catch (error) {
    onProgress?.({
      fileIndex: 0,
      fileName: file.name,
      stage: "error",
      progress: 0,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Upload multiple images with multiple assets in batch
 * This is more efficient for multiple file uploads
 */
export async function uploadMultipleImagesWithAssets(
  files: File[],
  options: {
    parentFolderId?: string;
    onProgress?: (fileIndex: number, progress: UploadProgress) => void;
    maxConcurrent?: number;
  } = {}
): Promise<BatchUploadResult> {
  const { parentFolderId, onProgress, maxConcurrent = 3 } = options;
  const startTime = Date.now();

  const successful: UploadResult[] = [];
  const failed: UploadResult[] = [];

  // Process files in batches to avoid overwhelming the browser
  for (let i = 0; i < files.length; i += maxConcurrent) {
    const batch = files.slice(i, i + maxConcurrent);

    const batchPromises = batch.map(async (file, batchIndex) => {
      const fileIndex = i + batchIndex;

      const result = await uploadImageWithMultipleAssets(file, {
        parentFolderId,
        onProgress: (progress) => {
          onProgress?.(fileIndex, progress);
        },
      });

      if (result.success) {
        successful.push(result);
      } else {
        failed.push(result);
      }

      return result;
    });

    await Promise.all(batchPromises);
  }

  const duration = Date.now() - startTime;

  return {
    successful,
    failed,
    totalFiles: files.length,
    duration,
  };
}

/**
 * Upload using the simplified single-request approach
 * This uses the new multipleAssets=true parameter
 */
export async function uploadImageWithMultipleAssetsSimplified(
  file: File,
  options: {
    parentFolderId?: string;
    onProgress?: (progress: UploadProgress) => void;
  } = {}
): Promise<UploadResult> {
  const { parentFolderId, onProgress } = options;

  try {
    onProgress?.({
      fileIndex: 0,
      fileName: file.name,
      stage: "processing",
      progress: 20,
    });

    // Process image for multiple assets
    // const processedAssets = await processImageForMultipleAssets(file);

    onProgress?.({
      fileIndex: 0,
      fileName: file.name,
      stage: "uploading",
      progress: 50,
    });

    // Upload to blob storage
    // const baseFileName = file.name.replace(/[^a-zA-Z0-9-_\.]/g, "_");
    // const blobResults = await uploadProcessedAssetsToBlob(processedAssets, baseFileName);

    onProgress?.({
      fileIndex: 0,
      fileName: file.name,
      stage: "creating-memory",
      progress: 80,
    });

    // Create FormData with multiple assets flag
    const formData = new FormData();
    formData.append("file", file);
    formData.append("multipleAssets", "true");
    if (parentFolderId) {
      formData.append("parentFolderId", parentFolderId);
    }

    // Upload using the simplified endpoint
    const response = await fetch("/api/memories", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();

    onProgress?.({
      fileIndex: 0,
      fileName: file.name,
      stage: "completed",
      progress: 100,
    });

    return {
      success: true,
      memory: result.data[0], // Single file upload returns array with one item
    };
  } catch (error) {
    onProgress?.({
      fileIndex: 0,
      fileName: file.name,
      stage: "error",
      progress: 0,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get the optimal asset URL for a given use case
 */
export function getOptimalAssetUrl(
  assets: Array<{
    assetType: string;
    url: string;
    width: number;
    height: number;
    bytes: number;
  }>,
  useCase: "grid" | "lightbox" | "fullscreen" | "original"
): string {
  switch (useCase) {
    case "grid":
      // Use thumbnail for grid view
      const thumb = assets.find((a) => a.assetType === "thumb");
      return thumb?.url || assets[0]?.url || "";

    case "lightbox":
      // Use display version for lightbox
      const display = assets.find((a) => a.assetType === "display");
      return display?.url || assets[0]?.url || "";

    case "fullscreen":
      // Use display version for fullscreen (could be original for very high-res displays)
      const fullscreen = assets.find((a) => a.assetType === "display");
      return fullscreen?.url || assets[0]?.url || "";

    case "original":
      // Use original for editing/downloading
      const original = assets.find((a) => a.assetType === "original");
      return original?.url || assets[0]?.url || "";

    default:
      return assets[0]?.url || "";
  }
}

/**
 * Calculate total upload size for multiple assets
 */
export function calculateUploadSize(files: File[]): {
  originalSize: number;
  estimatedProcessedSize: number;
  compressionRatio: number;
} {
  const originalSize = files.reduce((sum, file) => sum + file.size, 0);

  // Estimate processed size (display + thumb are typically 5-10% of original)
  const estimatedProcessedSize = originalSize * 0.15; // 15% of original size

  const compressionRatio = originalSize > 0 ? estimatedProcessedSize / originalSize : 0;

  return {
    originalSize,
    estimatedProcessedSize,
    compressionRatio,
  };
}
