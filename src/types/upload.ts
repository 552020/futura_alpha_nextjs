/**
 * Upload-related type definitions
 */

/**
 * File input attribute mode - controls which HTML attributes are set on the file input
 *
 * - 'directory': Sets webkitdirectory, directory, and multiple attributes (folder selection)
 * - 'multiple-files': Sets multiple attribute only (multiple file selection)
 * - 'single-file': No special attributes (default single file selection)
 */
export type FileInputAttributeMode = 'directory' | 'multiple-files' | 'single-file';

/**
 * Props for the useFileUpload hook
 */
export interface UseFileUploadProps {
  mode?: FileInputAttributeMode;
  isOnboarding?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}
