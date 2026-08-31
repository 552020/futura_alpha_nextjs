/**
 * FORM PARSING UTILITIES
 *
 * This module handles parsing of multipart/form-data requests.
 * Used for extracting files and form data from HTTP requests.
 *
 * USAGE:
 * - Parse single file uploads
 * - Parse multiple file uploads (folder uploads)
 * - Extract additional form data (userId, etc.)
 */

import { NextRequest } from 'next/server';

import { fatLogger } from '@/lib/logger';
/**
 * Parse form data and extract a single file
 * Used for single file uploads
 */
export async function parseSingleFile(
  request: NextRequest
): Promise<{
  file: File | null;
  formData: FormData | null;
  error: string | null;
}> {
  // fatLogger.info("📦 Parsing form data...");

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      fatLogger.error('No file found in form data', 'be');
      return {
        file: null,
        formData: null,
        error: 'Missing file',
      };
    }

    return { file, formData, error: null };
  } catch (error) {
    fatLogger.error('Error parsing form data', 'be', {
      error: error instanceof Error ? error : undefined,
    });
    return {
      file: null,
      formData: null,
      error: 'Invalid form data',
    };
  }
}

/**
 * Parse form data and extract multiple files
 * Used for folder uploads
 */
export async function parseMultipleFiles(
  request: NextRequest
): Promise<{ files: File[]; userId?: string; error: string | null }> {
  // fatLogger.info("📦 Parsing form data for folder upload...");

  try {
    const formData = await request.formData();
    const files = formData.getAll('file') as File[];
    const userId = formData.get('userId') as string | null;

    if (!files || files.length === 0) {
      fatLogger.error('No files found in form data', 'be');
      return {
        files: [],
        error: 'Missing files',
      };
    }

    // fatLogger.info(`📁 Found ${files.length} files in folder upload`);
    return { files, userId: userId || undefined, error: null };
  } catch (error) {
    fatLogger.error('Error parsing form data', 'be', {
      error: error instanceof Error ? error : undefined,
    });
    return {
      files: [],
      error: 'Invalid form data',
    };
  }
}
