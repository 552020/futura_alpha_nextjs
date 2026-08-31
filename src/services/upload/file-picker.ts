/**
 * Pure DOM functions for file input manipulation
 *
 * This service handles all file input DOM manipulation logic,
 * keeping it separate from React hooks and components.
 */

import type { FileInputAttributeMode } from '@/types/upload';

/**
 * Configures a file input element with the appropriate attributes for the given mode
 *
 * @param el - The HTML input element to configure
 * @param mode - The file selection mode
 */
export function configureFileInput(
  el: HTMLInputElement,
  mode: FileInputAttributeMode
) {
  // Reset to single file mode first
  el.removeAttribute('webkitdirectory');
  el.removeAttribute('directory');
  el.multiple = false;

  if (mode === 'directory') {
    // Support chromium-only directory selection
    if ('webkitdirectory' in el) {
      el.setAttribute('webkitdirectory', '');
      el.setAttribute('directory', '');
    }
    el.multiple = true;
  } else if (mode === 'multiple-files') {
    el.multiple = true;
  }
  // 'single' mode: no additional attributes needed (already set by reset)
}

/**
 * Triggers a file input dialog with the specified mode
 *
 * @param el - The HTML input element to trigger
 * @param mode - The file selection mode
 */
export function triggerFileInput(
  el: HTMLInputElement,
  mode: FileInputAttributeMode
) {
  configureFileInput(el, mode);

  // Reset value so selecting the same files triggers onChange again
  el.value = '';

  el.click();
}

/**
 * Type guard to check if an element supports webkitdirectory
 */
export function supportsWebkitDirectory(el: HTMLInputElement): boolean {
  return 'webkitdirectory' in el;
}
