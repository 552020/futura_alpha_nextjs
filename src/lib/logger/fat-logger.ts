/**
 * 🍔 fatLogger
 * The refactored full-featured logger with clean architecture.
 * Modular design with LogEngine, ServiceLogger, and FatLogger classes.
 *
 * Usage:
 * import { fatLogger } from '@/lib/logger/fat-logger';
 *
 * const log = fatLogger.service('upload', 'fe');
 * log.debug('Starting upload', { user: 'stefano' }, ['upload', 'ui']);
 */

// Re-export everything from the modular structure
export * from './fat-logger/index';
