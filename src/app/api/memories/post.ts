/**
 * MEMORY CREATION HANDLER
 *
 * This module handles all memory creation scenarios:
 * - JSON requests (memory creation without files)
 * - Single file uploads
 * - Multiple file uploads (folder uploads)
 * - Onboarding context support
 *
 * This replaces the need for separate upload routes and provides
 * a unified interface for all memory creation operations.
 */

import { NextRequest, NextResponse } from 'next/server';

// Import organized utilities
import {
  // File processing
  validateFile,
  validateFileWithErrorHandling,
  validateFileType,
  isAcceptedMimeType,
  getMemoryType,
  toAcceptedMimeType,
  logFileDetails,

  // Storage
  uploadFileToStorage,
  uploadFileToStorageWithErrorHandling,

  // Database
  storeInNewDatabase,

  // Memory creation
  getAllUserId,
  createMemoryFromJson,
  createUploadResponse,

  // Types
  type AcceptedMimeType,
} from './utils';

// Import new folder upload utilities
import { getUserIdForUpload } from './utils/user-management';
import {
  formatFolderUploadResponse,
  formatErrorResponse,
  calculateUploadStats,
  type UploadResult,
} from './utils/response-formatting';

/**
 * Main POST handler for memory creation
 * Handles both JSON requests and file uploads
 */
export async function handleApiMemoryPost(request: NextRequest): Promise<NextResponse> {
  console.log('🚀 Starting memory creation process...');

  try {
    // Check if this is a file upload (multipart/form-data) or JSON request
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      // Parse FormData ONCE to avoid double parsing bug
      const formData = await request.formData();
      const files = formData.getAll('file') as File[];

      console.log(`📊 BACKEND FILE ANALYSIS:`, {
        fileCount: files.length,
        files: files.map(f => ({
          name: f.name,
          size: f.size,
          sizeMB: (f.size / (1024 * 1024)).toFixed(2),
          type: f.type,
        })),
        isFolderUpload: files.length > 1,
        chosenPath: files.length > 1 ? 'FOLDER_UPLOAD' : 'SINGLE_FILE_UPLOAD',
      });

      // Get user ID using the same pattern for both single and folder uploads
      // Extract userId from FormData to avoid double parsing in getAllUserId
      const providedUserId = formData.get('userId') as string | null;
      const { allUserId, error } = await getUserIdForUpload({ providedUserId: providedUserId || undefined });
      if (error) {
        return error;
      }

      if (files.length > 1) {
        // Handle folder upload using new streamlined approach
        console.log(`📁 Processing folder upload with ${files.length} files`);
        return await handleFolderUpload(formData, allUserId);
      } else {
        // Handle single file upload (legacy)
        console.log(`📄 Processing single file upload: ${files[0]?.name}`);
        return await handleFileUpload(formData, allUserId);
      }
    } else {
      // JSON REQUESTS: Memory creation without files (text notes, metadata-only memories)
      // Examples:
      // - Creating text notes: { "type": "note", "title": "My thoughts", "description": "..." }
      // - Onboarding memory creation: { "type": "document", "title": "Welcome", "isOnboarding": true }
      // - Metadata-only memories: { "type": "document", "title": "Meeting Notes", "metadata": {...} }

      // For JSON requests, check if this is an onboarding request
      const body = await request.json();
      const { isOnboarding } = body;

      if (isOnboarding) {
        console.log('🎯 Onboarding JSON request detected - bypassing authentication');
        // For onboarding, we don't need authentication - createMemoryFromJson will handle temporary user creation
        return await createMemoryFromJson(request, ''); // Pass empty string, function will create temporary user
      } else {
        // For regular JSON requests, get the allUserId for the user (authenticated or temporary)
        const { allUserId, error } = await getAllUserId(request);
        if (error) {
          return error;
        }
        return await createMemoryFromJson(request, allUserId);
      }
    }
  } catch (error) {
    console.error('Error in memory creation:', error);
    return NextResponse.json({ error: 'Failed to create memory' }, { status: 500 });
  }
}

/**
 * Handle folder upload requests using new blob-first approach with multiple assets support
 */
async function handleFolderUpload(formData: FormData, allUserId: string): Promise<NextResponse> {
  const startTime = Date.now();
  console.log('🚀 Starting folder upload process with blob-first approach...');

  try {
    // Extract files from the already-parsed FormData
    const files = formData.getAll('file') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    console.log(`📁 Processing ${files.length} files with blob-first approach...`);

    // Validate file types for all files
    for (const file of files) {
      const { error: fileTypeError } = validateFileType(file, isAcceptedMimeType);
      if (fileTypeError) {
        return NextResponse.json({ error: fileTypeError }, { status: 400 });
      }
    }

    // Use the allUserId passed from the main handler

    // Import the uploadFiles service for blob-first approach
    const { uploadFiles } = await import('@/services/upload');

    // Use the new blob-first uploadFiles service which handles multiple assets for images
    const uploadResults = await uploadFiles(
      files,
      false, // isOnboarding - will be determined by the service
      allUserId, // existingUserId
      'folder', // mode
      'vercel_blob', // storageBackend
      'neon' // userStoragePreference - default to neon for now
    );

    // Calculate statistics
    const stats = calculateUploadStats(files, startTime);

    // Convert upload results to the expected format
    const formattedResults: UploadResult[] = uploadResults.map((result, index) => ({
      fileName: files[index]?.name || 'Unknown',
      url: result.data.assets?.[0]?.url || '', // Use first asset URL
      success: result.success,
      userId: allUserId,
      memoryId: result.data.id,
      assetId: result.data.assets?.[0]?.id || '',
    }));

    const successfulUploads = uploadResults.filter(r => r.success).length;
    const failedUploads = uploadResults.length - successfulUploads;

    console.log('=== FOLDER UPLOAD COMPLETE (BLOB-FIRST) ===');
    console.log(`📁 Files processed: ${successfulUploads}/${files.length} successful`);
    console.log(`📦 Total size: ${stats.totalSizeMB} MB`);
    console.log(`⏱️ Total time: ${stats.totalTime.toFixed(1)} seconds`);
    console.log(`📊 Average: ${stats.averageTime.toFixed(1)} seconds per file`);
    console.log(`🚀 Upload speed: ${stats.uploadSpeedMBps} MB/s`);
    console.log(`👤 User ID: ${allUserId}`);
    console.log(`❌ Failed uploads: ${failedUploads}`);
    console.log('=============================================');

    // Use extracted response formatting utility
    return NextResponse.json(
      formatFolderUploadResponse({
        results: formattedResults,
        totalFiles: files.length,
        totalTime: stats.totalTime,
        totalSize: stats.totalSize,
        userId: allUserId,
      })
    );
  } catch (error) {
    return formatErrorResponse(error);
  }
}

/**
 * Handle file upload requests (single or multiple files)
 */
async function handleFileUpload(formData: FormData, ownerId: string): Promise<NextResponse> {
  const startTime = Date.now();

  // Extract files from the already-parsed FormData
  const files = formData.getAll('file') as File[];

  if (!files || files.length === 0) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 });
  }

  console.log(`📁 Processing ${files.length} file(s)...`);
  console.log(`📊 HANDLE_FILE_UPLOAD ANALYSIS:`, {
    fileCount: files.length,
    files: files.map(f => ({
      name: f.name,
      size: f.size,
      sizeMB: (f.size / (1024 * 1024)).toFixed(2),
      type: f.type,
      isLargeFile: f.size / (1024 * 1024) > 4,
    })),
    ownerId,
    uploadMethod: 'SERVER_SIDE_DIRECT_UPLOAD',
  });

  // Log file details for debugging
  files.forEach((file, index) => {
    console.log(`📄 File ${index + 1}:`, {
      name: file.name,
      type: file.type,
      size: file.size,
    });
  });

  // Process files in parallel (limit to 5 concurrent uploads)
  const pLimit = (await import('p-limit')).default;
  const limit = pLimit(5);

  const uploadTasks = files.map(file =>
    limit(async () => {
      try {
        const name = String(file.name || 'Untitled');

        // Log file details
        logFileDetails(file);

        // Validate file type first
        const fileTypeError = validateFileType(file, isAcceptedMimeType);
        if (fileTypeError.error) {
          console.error(`❌ File type validation failed for ${name}:`, fileTypeError);
          return { success: false, fileName: name, error: fileTypeError.error };
        }

        // Validate file
        const { validationResult, error: validationError } = await validateFileWithErrorHandling(file, validateFile);
        if (validationError) {
          console.error(`❌ Validation failed for ${name}:`, validationError);
          return { success: false, fileName: name, error: validationError };
        }

        // Upload file to storage
        const { url, error: uploadError } = await uploadFileToStorageWithErrorHandling(
          file,
          validationResult!.buffer!,
          uploadFileToStorage
        );
        if (uploadError) {
          console.error(`❌ Upload failed for ${name}:`, uploadError);
          return { success: false, fileName: name, error: uploadError };
        }

        // Determine memory type from file
        const memoryType = getMemoryType(file.type as AcceptedMimeType);

        // Store in database using the new unified schema
        const mimeType = toAcceptedMimeType(file.type);
        const result = await storeInNewDatabase({
          type: memoryType,
          ownerId,
          url,
          file,
          metadata: {
            uploadedAt: new Date().toISOString(),
            originalName: file.name,
            size: file.size,
            mimeType,
          },
        });

        return {
          success: true,
          fileName: name,
          url,
          memory: result.data,
        };
      } catch (error) {
        const name = String(file.name || 'Untitled');
        console.error(`❌ Unexpected error for ${name}:`, error);
        return { success: false, fileName: name, error };
      }
    })
  );

  const results = await Promise.allSettled(uploadTasks);

  // Process results
  const successfulUploads: Array<{
    success: true;
    fileName: string;
    url: string;
    memory: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  }> = [];
  const failedUploads: Array<{
    success: false;
    fileName: string;
    error: unknown;
  }> = [];

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.success === true) {
      successfulUploads.push(result.value as (typeof successfulUploads)[0]);
    } else {
      if (result.status === 'fulfilled') {
        failedUploads.push({
          success: false,
          fileName: result.value.fileName,
          error: result.value.error,
        });
      } else {
        failedUploads.push({
          success: false,
          fileName: 'unknown',
          error: result.reason,
        });
      }
    }
  }

  const duration = Date.now() - startTime;
  console.log(`✅ Memory creation completed in ${duration}ms`);

  return createUploadResponse(successfulUploads, failedUploads, files.length, duration);
}
