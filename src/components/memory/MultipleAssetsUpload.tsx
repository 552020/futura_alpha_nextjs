/**
 * MULTIPLE ASSETS UPLOAD COMPONENT
 *
 * This component demonstrates how to use the new multiple assets upload functionality.
 * It shows image processing, progress tracking, and multiple asset creation.
 *
 * FEATURES:
 * - Drag and drop file upload
 * - Image processing with progress tracking
 * - Multiple asset creation (original, display, thumb)
 * - Upload progress visualization
 * - Error handling and retry
 * - Preview of processed images
 */

"use client";

import React, { useState, useCallback } from "react";
import Image from "next/image";
import {
  uploadMultipleImagesWithAssets,
  getOptimalAssetUrl,
  calculateUploadSize,
  type UploadProgress,
  type UploadResult,
} from "@/lib/memory-upload";

interface MultipleAssetsUploadProps {
  parentFolderId?: string;
  onUploadComplete?: (results: UploadResult[]) => void;
  onUploadError?: (error: string) => void;
}

export default function MultipleAssetsUpload({
  parentFolderId,
  onUploadComplete,
  onUploadError,
}: MultipleAssetsUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Map<number, UploadProgress>>(new Map());
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = useCallback(
    async (files: File[]) => {
      // Filter for image files only
      const imageFiles = files.filter((file) => file.type.startsWith("image/"));

      if (imageFiles.length === 0) {
        onUploadError?.("Please select image files only");
        return;
      }

      setIsUploading(true);
      setUploadProgress(new Map());
      setUploadResults([]);

      try {
        // Calculate upload size info
        const sizeInfo = calculateUploadSize(imageFiles);
        console.log("Upload size info:", sizeInfo);

        // Upload files
        const results = await uploadMultipleImagesWithAssets(imageFiles, {
          parentFolderId,
          onProgress: (fileIndex, progress) => {
            setUploadProgress((prev) => new Map(prev).set(fileIndex, progress));
          },
          maxConcurrent: 2, // Limit concurrent uploads
        });

        setUploadResults([...results.successful, ...results.failed]);
        onUploadComplete?.(results.successful);

        if (results.failed.length > 0) {
          onUploadError?.(`${results.failed.length} files failed to upload`);
        }
      } catch (error) {
        console.error("Upload error:", error);
        onUploadError?.(error instanceof Error ? error.message : "Upload failed");
      } finally {
        setIsUploading(false);
      }
    },
    [parentFolderId, onUploadComplete, onUploadError]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFiles(Array.from(e.dataTransfer.files));
      }
    },
    [handleFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(Array.from(e.target.files));
      }
    },
    [handleFiles]
  );

  // const getProgressForFile = (fileIndex: number): UploadProgress | undefined => {
  //   return uploadProgress.get(fileIndex);
  // };

  const getOverallProgress = (): number => {
    if (uploadProgress.size === 0) return 0;

    const totalProgress = Array.from(uploadProgress.values()).reduce((sum, progress) => sum + progress.progress, 0);

    return Math.round(totalProgress / uploadProgress.size);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Multiple Assets Upload</h2>
        <p className="text-gray-600">
          Upload images with automatic processing for multiple optimized versions (original, display, thumbnail).
        </p>
      </div>

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
        } ${isUploading ? "opacity-50 pointer-events-none" : ""}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileInput}
          className="hidden"
          id="file-upload"
          disabled={isUploading}
        />
        <label htmlFor="file-upload" className="cursor-pointer block">
          <div className="text-4xl mb-4">📸</div>
          <div className="text-lg font-medium mb-2">
            {isUploading ? "Uploading..." : "Drop images here or click to select"}
          </div>
          <div className="text-sm text-gray-500">Supports JPEG, PNG, WebP, GIF, TIFF</div>
        </label>
      </div>

      {/* Overall Progress */}
      {isUploading && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-gray-500">{getOverallProgress()}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${getOverallProgress()}%` }}
            />
          </div>
        </div>
      )}

      {/* Individual File Progress */}
      {isUploading && uploadProgress.size > 0 && (
        <div className="mt-6 space-y-4">
          <h3 className="text-lg font-medium">Upload Progress</h3>
          {Array.from(uploadProgress.entries()).map(([fileIndex, progress]) => (
            <div key={fileIndex} className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium truncate">{progress.fileName}</span>
                <span className="text-sm text-gray-500">{progress.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    progress.stage === "error" ? "bg-red-500" : "bg-blue-600"
                  }`}
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span className="capitalize">{progress.stage.replace("-", " ")}</span>
                {progress.error && <span className="text-red-500">{progress.error}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Results */}
      {uploadResults.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-medium mb-4">Upload Results</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {uploadResults.map((result, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 ${
                  result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                }`}
              >
                {result.success && result.memory ? (
                  <div>
                    <div className="text-sm font-medium mb-2">{result.memory.title}</div>
                    <div className="space-y-2">
                      {result.memory.assets.map((asset, assetIndex) => (
                        <div key={assetIndex} className="text-xs">
                          <div className="flex justify-between">
                            <span className="capitalize font-medium">{asset.assetType}</span>
                            <span className="text-gray-500">{Math.round(asset.bytes / 1024)}KB</span>
                          </div>
                          <div className="text-gray-500">
                            {asset.width}×{asset.height}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3">
                      <Image
                        src={getOptimalAssetUrl(result.memory.assets, "grid")}
                        alt={result.memory.title}
                        width={200}
                        height={96}
                        className="w-full h-24 object-cover rounded"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-sm font-medium text-red-600 mb-1">Upload Failed</div>
                    <div className="text-xs text-red-500">{result.error}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Stats */}
      {uploadResults.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium mb-2">Upload Statistics</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Total Files</div>
              <div className="font-medium">{uploadResults.length}</div>
            </div>
            <div>
              <div className="text-gray-500">Successful</div>
              <div className="font-medium text-green-600">{uploadResults.filter((r) => r.success).length}</div>
            </div>
            <div>
              <div className="text-gray-500">Failed</div>
              <div className="font-medium text-red-600">{uploadResults.filter((r) => !r.success).length}</div>
            </div>
            <div>
              <div className="text-gray-500">Total Assets</div>
              <div className="font-medium">
                {uploadResults
                  .filter((r) => r.success && r.memory)
                  .reduce((sum, r) => sum + (r.memory?.assets.length || 0), 0)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
