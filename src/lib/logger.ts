/**
 * Simple logging wrapper with timestamps and service tags
 *
 * Provides structured logging without complex serialization.
 * Handles any object type without circular reference issues.
 *
 * Usage:
 * import { logger } from '@/lib/logger';
 *
 * logger.info('User created', user);
 * logger.error('Database error', error);
 * logger.debug('Debug info', complexObject);
 */

// ===== LOGGING CONTROL FLAGS =====
const ENABLE_LOGGING = true;
const ENABLE_UPLOAD_LOGGING = true;
const ENABLE_DATABASE_LOGGING = true;
const ENABLE_AUTH_LOGGING = true;
// ===================================

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = -1,
}

export interface LogContext {
  service?: 'upload' | 'database' | 'auth' | 'app';
  [key: string]: any;
}

class SimpleLogger {
  private level: LogLevel;
  private service: string;

  constructor(service: string = 'app', level: LogLevel = LogLevel.INFO) {
    this.service = service;
    this.level = level;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }

  silence(): void {
    this.level = LogLevel.SILENT;
  }

  enableDebug(): void {
    this.level = LogLevel.DEBUG;
  }

  enableInfo(): void {
    this.level = LogLevel.INFO;
  }

  enableWarn(): void {
    this.level = LogLevel.WARN;
  }

  enableError(): void {
    this.level = LogLevel.ERROR;
  }

  private shouldLog(level: LogLevel, service?: string): boolean {
    if (!ENABLE_LOGGING) return false;
    if (level < this.level) return false;

    if (service) {
      switch (service) {
        case 'upload':
          return ENABLE_UPLOAD_LOGGING;
        case 'database':
          return ENABLE_DATABASE_LOGGING;
        case 'auth':
          return ENABLE_AUTH_LOGGING;
        default:
          return true;
      }
    }
    return true;
  }

  private formatPrefix(level: string, service?: string): string {
    const timestamp = new Date().toISOString();
    const serviceTag = service || this.service;
    return `[${timestamp}] ${level} [${serviceTag}]`;
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatPrefix('DEBUG'), message, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatPrefix('INFO'), message, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatPrefix('WARN'), message, ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatPrefix('ERROR'), message, ...args);
    }
  }

  // Convenience methods for common logging patterns
  memoryCreated(memoryId: string, title: string, type: string): void {
    this.info(`Memory created: ${title} (${type})`, { memoryId, title, type });
  }

  memoryUpdated(memoryId: string, changes: Record<string, any>): void {
    this.info(`Memory updated: ${memoryId}`, { memoryId, changes });
  }

  memoryDeleted(memoryId: string): void {
    this.info(`Memory deleted: ${memoryId}`, { memoryId });
  }

  uploadStarted(fileName: string, size: number): void {
    this.info(`Upload started: ${fileName} (${size} bytes)`, { fileName, size });
  }

  uploadCompleted(fileName: string, url: string): void {
    this.info(`Upload completed: ${fileName}`, { fileName, url });
  }

  uploadFailed(fileName: string, error: Error): void {
    this.error(`Upload failed: ${fileName}`, error);
  }

  authSuccess(userId: string, method: string): void {
    this.info(`Authentication successful: ${userId} via ${method}`, { userId, method });
  }

  authFailed(userId: string, method: string, error: Error): void {
    this.error(`Authentication failed: ${userId} via ${method}`, error);
  }
}

// ===== SINGLE LOGGER INSTANCE =====
export const logger = new SimpleLogger('app', LogLevel.INFO);

// Legacy exports for backward compatibility (all point to the same instance)
export const uploadLogger = logger;
export const authLogger = logger;
export const apiLogger = logger;
export const dbLogger = logger;
export const memoryLogger = logger;
export const galleryLogger = logger;
export const caseLogger = logger;
export const icpLogger = logger;
