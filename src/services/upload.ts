/**
 * UPLOAD SERVICE - BLOB-FIRST APPROACH
 *
 * This service implements the new blob-first upload flow:
 * 1. Upload file to blob storage (Vercel Blob, AWS S3, etc.)
 * 2. Get blob URL from storage provider
 * 3. Call POST /api/memories with blob URL and metadata
 *
 * This replaces the old approach of sending files directly to backend endpoints.
 */

import { StorageManager, type StorageBackend } from "@/lib/storage";
import { processImageForMultipleAssets } from "@/app/api/memories/utils/image-processing";
import { icpUploadService } from "@/services/icp-upload";
// import type { UploadStorage } from "@/hooks/use-upload-storage"; // Unused

interface UploadResponse {
  success: boolean;
  data: {
    id: string;
    type: string;
    title: string;
    description: string;
    fileCreatedAt: string;
    isPublic: boolean;
    parentFolderId: string | null;
    tags: string[];
    recipients: string[];
    unlockDate: string | null;
    metadata: Record<string, unknown>;
    createdAt: string;
    assets: Array<{
      id: string;
      assetType: string;
      url: string;
      bytes: number;
      mimeType: string;
      storageBackend: string;
      storageKey: string;
    }>;
  };
}

type UploadMode = "files" | "folder";

/**
 * Get memory type from file extension
 */
function getMemoryTypeFromFile(file: File): "image" | "video" | "document" | "note" | "audio" {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (!extension) return "document";

  const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "tiff"];
  const videoExtensions = ["mp4", "avi", "mov", "wmv", "flv", "webm", "mkv"];
  const audioExtensions = ["mp3", "wav", "flac", "aac", "ogg", "m4a"];

  if (imageExtensions.includes(extension)) return "image";
  if (videoExtensions.includes(extension)) return "video";
  if (audioExtensions.includes(extension)) return "audio";

  return "document";
}

/**
 * Upload file to ICP backend using real ICP upload service
 * This bypasses the normal blob-first flow and uploads directly to ICP canister
 *
 * NOTE: For ICP users, isOnboarding is not used because:
 * - ICP canister interactions ALWAYS require Internet Identity authentication
 * - Even "onboarding" users must be authenticated to interact with ICP
 * - The ICP canister itself handles user/memory creation, not our backend
 * - This is different from Neon users where onboarding creates temporary users without auth
 */
async function uploadToICPBackend(file: File): Promise<UploadResponse> {
  console.log(`🚀 Starting ICP backend upload for ${file.name}...`);

  try {
    // Get proper upload storage from the upload intent API
    const uploadStorageResponse = await fetch("/api/upload/intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storagePreference: { preferred: "icp-canister" },
      }),
    });

    if (!uploadStorageResponse.ok) {
      throw new Error(`Failed to get upload storage: ${uploadStorageResponse.status}`);
    }

    const { uploadStorage } = await uploadStorageResponse.json();

    if (uploadStorage.chosen_storage !== "icp-canister") {
      throw new Error("Expected ICP canister storage but got different backend");
    }

    // Upload to ICP canister using the real service
    const icpResult = await icpUploadService.uploadFile(file, uploadStorage, (progress) => {
      console.log(`📤 ICP Upload progress: ${progress.percentage}%`);
    });

    console.log(`✅ ICP upload successful: ${icpResult.memoryId}`);

    // Verify upload (best-effort, don't block on failure)
    try {
      await fetch("/api/upload/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app_memory_id: icpResult.memoryId,
          backend: "icp-canister",
          idem: uploadStorage.idem,
          checksum_sha256: icpResult.checksum_sha256,
          size: icpResult.size,
          remote_id: icpResult.remote_id,
        }),
      });
    } catch (verifyError) {
      console.warn("⚠️ Upload verification failed (non-blocking):", verifyError);
    }

    // Convert ICP result to expected format
    return {
      success: true,
      data: {
        id: icpResult.memoryId,
        type: getMemoryTypeFromFile(file),
        title: file.name.split(".")[0] || "Untitled",
        description: "",
        fileCreatedAt: new Date().toISOString(),
        isPublic: false,
        parentFolderId: null,
        tags: [],
        recipients: [],
        unlockDate: null,
        metadata: {},
        createdAt: new Date().toISOString(),
        assets: [
          {
            id: `asset-${icpResult.memoryId}`,
            assetType: "original",
            url: `icp://${icpResult.memoryId}`, // ICP URL format
            bytes: icpResult.size,
            mimeType: file.type,
            storageBackend: "icp",
            storageKey: icpResult.remote_id,
          },
        ],
      },
    };
  } catch (error) {
    console.error("❌ ICP backend upload failed:", error);
    throw error;
  }
}

/**
 * Upload a file using the new blob-first approach
 */
export const uploadFile = async (
  file: File,
  isOnboarding: boolean,
  existingUserId?: string,
  mode: UploadMode = "files",
  storageBackend: StorageBackend | StorageBackend[] = "vercel_blob",
  userStoragePreference?: "neon" | "icp" | "dual"
): Promise<UploadResponse> => {
  console.log(`🚀 Starting upload for ${file.name}...`);
  console.log(`🔍 Upload parameters:`, {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    isOnboarding,
    existingUserId,
    mode,
    storageBackend,
    userStoragePreference,
  });

  try {
    // Check if user prefers ICP-only backend
    if (userStoragePreference === "icp") {
      console.log(`🔗 User prefers ICP backend, routing to ICP canister...`);
      // NOTE: For ICP users, isOnboarding is ignored because ICP always requires Internet Identity auth
      // Even "onboarding" users must authenticate with II to interact with ICP canister
      return await uploadToICPBackend(file);
    }

    // Implement file size decision matrix
    const fileSizeMB = file.size / (1024 * 1024);
    const isLargeFile = fileSizeMB > 4; // 4MB threshold

    console.log(`📊 FILE SIZE ANALYSIS:`, {
      fileName: file.name,
      fileSizeBytes: file.size,
      fileSizeMB: fileSizeMB.toFixed(2),
      threshold: "4MB",
      isLargeFile,
      chosenPath: isLargeFile ? "LARGE_FILE_PATH" : "SMALL_FILE_PATH",
    });

    if (isLargeFile) {
      console.log(`📦 Large file detected (${fileSizeMB.toFixed(1)}MB), using direct-to-blob with server tokens...`);
      return await uploadLargeFile(file, isOnboarding, existingUserId, mode);
    } else {
      console.log(`📦 Small file detected (${fileSizeMB.toFixed(1)}MB), using server-side upload...`);
      return await uploadSmallFile(file);
    }
  } catch (error) {
    console.error("❌ Upload failed:", error);
    throw error;
  }
};

/**
 * Upload small files using server-side approach
 */
async function uploadSmallFile(file: File): Promise<UploadResponse> {
  console.log(`🖥️ Using server-side upload for small file: ${file.name}`);
  console.log(`📊 SMALL FILE UPLOAD DETAILS:`, {
    fileName: file.name,
    fileSize: file.size,
    fileSizeMB: (file.size / (1024 * 1024)).toFixed(2),
    fileType: file.type,
    endpoint: "/api/memories",
  });

  // Use the existing server-side approach (FormData upload)
  const formData = new FormData();
  formData.append("file", file);

  console.log(`🚀 Sending FormData to /api/memories...`);
  const response = await fetch("/api/memories", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Server-side upload failed");
  }

  return await response.json();
}

/**
 * Upload large files using direct-to-blob with server-issued tokens
 */
async function uploadLargeFile(
  file: File,
  isOnboarding: boolean,
  existingUserId?: string,
  mode: UploadMode = "files"
): Promise<UploadResponse> {
  console.log(`☁️ Using direct-to-blob upload for large file: ${file.name}`);

  console.log(`🔧 Creating StorageManager instance...`);
  const storageManager = new StorageManager();
  console.log(`🔍 Available providers after initialization:`, storageManager.getAvailableProviders());
  const memoryType = getMemoryTypeFromFile(file);

  let assets: Array<{
    assetType: "original" | "display" | "thumb" | "placeholder" | "poster" | "waveform";
    url: string;
    bytes: number;
    mimeType: string;
    storageBackend: string;
    storageKey: string;
    sha256: string | null;
    variant: string | null;
    width?: number;
    height?: number;
  }> = [];

  if (memoryType === "image") {
    // For images: Process and upload multiple versions (original, display, thumb)
    console.log(`🖼️ Processing image ${file.name} for multiple assets...`);

    const processedAssets = await processImageForMultipleAssets(file);
    console.log(`✅ Image processing complete: original, display, thumb`);

    // Upload all processed assets to blob storage using our StorageManager
    const [originalResult, displayResult, thumbResult] = await Promise.all([
      storageManager.upload(processedAssets.original.blob as File, "vercel_blob"),
      storageManager.upload(processedAssets.display.blob as File, "vercel_blob"),
      storageManager.upload(processedAssets.thumb.blob as File, "vercel_blob"),
    ]);

    // Convert to API format
    const originalUploads = Array.isArray(originalResult) ? originalResult : [originalResult];
    const displayUploads = Array.isArray(displayResult) ? displayResult : [displayResult];
    const thumbUploads = Array.isArray(thumbResult) ? thumbResult : [thumbResult];

    assets = [
      {
        assetType: "original",
        url: originalUploads[0].url,
        bytes: processedAssets.original.size,
        mimeType: processedAssets.original.mimeType,
        storageBackend: originalUploads[0].provider,
        storageKey: originalUploads[0].key,
        sha256: null,
        variant: null,
        width: processedAssets.original.width,
        height: processedAssets.original.height,
      },
      {
        assetType: "display",
        url: displayUploads[0].url,
        bytes: processedAssets.display.size,
        mimeType: processedAssets.display.mimeType,
        storageBackend: displayUploads[0].provider,
        storageKey: displayUploads[0].key,
        sha256: null,
        variant: null,
        width: processedAssets.display.width,
        height: processedAssets.display.height,
      },
      {
        assetType: "thumb",
        url: thumbUploads[0].url,
        bytes: processedAssets.thumb.size,
        mimeType: processedAssets.thumb.mimeType,
        storageBackend: thumbUploads[0].provider,
        storageKey: thumbUploads[0].key,
        sha256: null,
        variant: null,
        width: processedAssets.thumb.width,
        height: processedAssets.thumb.height,
      },
    ];

    console.log(`📤 Uploaded ${assets.length} image assets to blob storage`);
  } else {
    // For non-images: Upload only the original file
    console.log(`📤 Uploading ${file.name} (${memoryType}) to vercel_blob...`);

    const uploadResult = await storageManager.upload(file, "vercel_blob");
    const uploadResults = Array.isArray(uploadResult) ? uploadResult : [uploadResult];
    const primaryResult = uploadResults[0];

    console.log(`✅ Blob upload successful: ${primaryResult.url}`);

    // Create single asset for non-image files
    assets = uploadResults.map((result) => ({
      assetType: "original" as const,
      url: result.url,
      bytes: result.size,
      mimeType: result.mimeType,
      storageBackend: result.provider,
      storageKey: result.key,
      sha256: null,
      variant: null,
    }));
  }

  // 2. Call unified API with all assets
  const response = await fetch("/api/memories", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: memoryType,
      title: file.name.split(".")[0] || "Untitled",
      description: "",
      fileCreatedAt: new Date().toISOString(),
      isPublic: false,
      isOnboarding,
      mode,
      existingUserId,
      assets,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "API call failed");
  }

  const data = await response.json();
  console.log(`✅ Memory created successfully: ${data.data.id} with ${assets.length} assets`);

  return data;
}

/**
 * Upload multiple files (folder upload) using blob-first approach
 */
export const uploadFiles = async (
  files: File[],
  isOnboarding: boolean,
  existingUserId?: string,
  mode: UploadMode = "folder",
  storageBackend: StorageBackend | StorageBackend[] = "vercel_blob",
  userStoragePreference?: "neon" | "icp" | "dual"
): Promise<UploadResponse[]> => {
  console.log(`🚀 Starting folder upload for ${files.length} files...`);

  const uploadPromises = files.map((file, index) => {
    console.log(`📤 Uploading file ${index + 1}/${files.length}: ${file.name}`);
    return uploadFile(file, isOnboarding, existingUserId, mode, storageBackend, userStoragePreference);
  });

  try {
    const results = await Promise.allSettled(uploadPromises);

    const successful = results
      .filter((result): result is PromiseFulfilledResult<UploadResponse> => result.status === "fulfilled")
      .map((result) => result.value);

    const failed = results
      .filter((result): result is PromiseRejectedResult => result.status === "rejected")
      .map((result, index) => ({
        file: files[index].name,
        error: result.reason.message,
      }));

    if (failed.length > 0) {
      console.warn(`⚠️ ${failed.length} files failed to upload:`, failed);
    }

    console.log(`✅ Folder upload completed: ${successful.length}/${files.length} successful`);
    return successful;
  } catch (error) {
    console.error("❌ Folder upload failed:", error);
    throw error;
  }
};
