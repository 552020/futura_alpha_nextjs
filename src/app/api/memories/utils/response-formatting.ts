/**
 * RESPONSE FORMATTING UTILITIES
 *
 * This module handles formatting of API responses for uploads.
 * Provides consistent response structures across different upload endpoints.
 *
 * USAGE:
 * - Format single file upload responses
 * - Format folder upload responses
 * - Format error responses
 * - Calculate upload statistics
 */

import { NextResponse } from "next/server";

export type UploadResult = {
  fileName: string;
  url: string;
  success: boolean;
  userId: string;
  memoryId: string;
  assetId: string;
};

export type FolderUploadResponse = {
  message: string;
  status: string;
  totalFiles: number;
  successfulUploads: number;
  failedUploads: number;
  totalTime: string;
  averageTime: string;
  totalSizeMB: string;
  uploadSpeedMBps: string;
  userId: string;
  results: UploadResult[];
};

/**
 * Format folder upload response with statistics
 */
export function formatFolderUploadResponse(params: {
  results: UploadResult[];
  totalFiles: number;
  totalTime: number;
  totalSize: number;
  userId: string;
}): FolderUploadResponse {
  const { results, totalFiles, totalTime, totalSize, userId } = params;

  const successfulUploads = results.length;
  const failedUploads = totalFiles - successfulUploads;
  const averageTime = totalTime / totalFiles;
  const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
  const uploadSpeedMBps = (parseFloat(totalSizeMB) / totalTime).toFixed(2);

  return {
    message: "Folder upload completed successfully",
    status: "success",
    totalFiles,
    successfulUploads,
    failedUploads,
    totalTime: totalTime.toFixed(1),
    averageTime: averageTime.toFixed(1),
    totalSizeMB,
    uploadSpeedMBps,
    userId,
    results,
  };
}

/**
 * Format error response
 */
export function formatErrorResponse(error: unknown, message: string = "Unexpected error occurred"): NextResponse {
  console.error("❌ Error:", error);
  return NextResponse.json(
    {
      error: message,
      details: error instanceof Error ? error.message : String(error),
    },
    { status: 500 }
  );
}

/**
 * Calculate upload statistics
 */
export function calculateUploadStats(files: File[], startTime: number) {
  const endTime = Date.now();
  const totalTime = (endTime - startTime) / 1000;
  const totalSize = files.reduce((acc, file) => acc + file.size, 0);
  const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
  const averageTime = totalTime / files.length;
  const uploadSpeedMBps = (parseFloat(totalSizeMB) / totalTime).toFixed(2);

  return {
    totalTime,
    totalSize,
    totalSizeMB,
    averageTime,
    uploadSpeedMBps,
  };
}
