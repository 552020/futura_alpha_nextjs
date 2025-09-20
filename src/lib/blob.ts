import { put } from '@vercel/blob';
import { join } from 'path';

/**
 * Uploads a file to blob storage from a buffer or file path
 * @param content The file content as a Buffer
 * @param filename The name of the file
 * @param folder Optional folder path within the blob storage
 * @returns The public URL of the uploaded file
 */
export async function uploadFromPath(content: Buffer, filename: string, folder?: string): Promise<string> {
  try {
    const pathname = folder ? join(folder, filename) : filename;
    const { url } = await put(pathname, content, {
      access: 'public',
    });
    return url;
  } catch (error) {
    console.error('Error uploading to blob storage:', error);
    throw error;
  }
}
