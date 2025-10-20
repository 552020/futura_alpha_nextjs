/**
 * fatLogger Usage Examples
 *
 * This file demonstrates how to use the refactored fatLogger
 * with its clean, modular architecture.
 */

import { fatLogger, createTag } from './index';

// Example 1: Service-specific logging
export function demonstrateServiceLogging() {
  const uploadLog = fatLogger.service('upload', 'fe');
  const apiLog = fatLogger.service('api', 'be');

  uploadLog.debug('User clicked upload button', { userId: '123' }, [
    createTag('COMPONENT', 'ui'),
    createTag('FEATURE', 'interaction'),
  ]);
  uploadLog.info('File selected', { fileName: 'photo.jpg', size: '2MB' });

  apiLog.warn('Upload taking longer than expected', { duration: 5000 }, [createTag('PERF', 'slow')]);
  apiLog.error('Upload failed', { error: 'Network timeout' }, [createTag('ERROR', 'network')]);
}

// Example 2: Direct logging without service context
export function demonstrateDirectLogging() {
  fatLogger.info('Application started', 'be', { version: '1.0.0' });
  fatLogger.warn('Memory usage high', 'be', { usage: '85%' }, [createTag('PERF', 'memory')]);
  fatLogger.error('Database connection failed', 'be', { error: 'Connection timeout' });
}

// Example 3: Configuration changes
export function demonstrateConfiguration() {
  // Disable frontend logging
  fatLogger.configure({ frontend: false });

  const log = fatLogger.service('test', 'fe');
  log.info('This will not appear'); // Won't show because frontend is disabled

  // Re-enable frontend
  fatLogger.configure({ frontend: true });
  log.info('This will appear'); // Will show now
}

// Example 4: Tag-based filtering
export function demonstrateTagFiltering() {
  // Only show logs with 'error' tag
  fatLogger.configure({
    enabledTags: [createTag('ERROR', 'network')],
  });

  const log = fatLogger.service('test', 'be');
  log.info('Regular info message'); // Won't show
  log.error('Critical error', {}, [createTag('ERROR', 'network')]); // Will show
  log.warn('Warning message', {}, [createTag('PERF', 'slow')]); // Won't show
}

// Example 5: Per-level configuration
export function demonstrateLevelFiltering() {
  // Disable debug logs
  fatLogger.configure({
    levels: {
      debug: false,
      info: true,
      warn: true,
      error: true,
    },
  });

  const log = fatLogger.service('test', 'be');
  log.debug('This will not show'); // Won't show
  log.info('This will show'); // Will show
}

// Example 6: Tag blacklist
export function demonstrateTagBlacklist() {
  // Exclude all performance logs
  fatLogger.configure({
    excludedTags: [createTag('PERF', 'slow')],
  });

  const log = fatLogger.service('test', 'be');
  log.warn('Regular warning'); // Will show
  log.warn('Slow operation', {}, [createTag('PERF', 'slow')]); // Won't show
}
