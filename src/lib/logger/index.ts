/**
 * Unified Logger Exports
 *
 * Import both loggers from a single location:
 * import { tinyLogger, fatLogger } from '@/lib/logger';
 */

// Export tinyLogger
export { tinyLogger, setLoggerFilter, toggleLogger } from './tiny-logger';

// Export fatLogger and its types
export { fatLogger, ICP_DEBUG } from './fat-logger';
export type { LogLevel, Context, LogEntry, LoggerConfig } from './fat-logger';
