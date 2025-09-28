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

// Core service flags
const ENABLE_UI_LOGGING = true; // UI components and interactions
const ENABLE_BACKEND_LOGGING = true; // Backend API and processing
const ENABLE_UPLOAD_LOGGING = false; // Upload routing and processing
const ENABLE_DATABASE_LOGGING = false; // Database operations
const ENABLE_AUTH_LOGGING = false; // Authentication flows
const ENABLE_ASSET_LOGGING = false; // Asset processing and thumbnails
const ENABLE_S3_LOGGING = false; // S3 presigned URLs and storage

// Feature flags (cross-cutting concerns)
const ENABLE_HOSTING_PREFERENCES = true; // Hosting preference changes and routing
const ENABLE_DASHBOARD_LOGGING = false; // Dashboard state and API calls
const ENABLE_MEMORY_PROCESSING_LOGGING = false; // Memory processing and folder grouping
const ENABLE_RENDERING_LOGGING = false; // Component rendering logs

// Additional granular flags for specific log categories
const ENABLE_API_RESPONSE_LOGGING = false; // API response status and data logs
const ENABLE_FOLDER_GROUPING_LOGGING = false; // Folder grouping and memory processing logs
const ENABLE_MEMORY_GRID_LOGGING = false; // MemoryGrid component rendering logs
const ENABLE_USE_EFFECT_LOGGING = false; // useEffect hook logs
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

class ServiceLogger {
  constructor(
    private service: string,
    private parentLogger: SimpleLogger
  ) {}

  debug(message: string, ...args: any[]): void {
    this.parentLogger.debug(message, this.service, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.parentLogger.info(message, this.service, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.parentLogger.warn(message, this.service, ...args);
  }

  error(message: string, ...args: any[]): void {
    this.parentLogger.error(message, this.service, ...args);
  }
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
        // Backend services
        case 'upload':
          return ENABLE_BACKEND_LOGGING && ENABLE_UPLOAD_LOGGING;
        case 'database':
          return ENABLE_BACKEND_LOGGING && ENABLE_DATABASE_LOGGING;
        case 'auth':
          return ENABLE_BACKEND_LOGGING && ENABLE_AUTH_LOGGING;
        case 'asset':
          return ENABLE_BACKEND_LOGGING && ENABLE_ASSET_LOGGING;
        case 's3':
          return ENABLE_BACKEND_LOGGING && ENABLE_S3_LOGGING;

        // UI services
        case 'dashboard':
          return ENABLE_UI_LOGGING && ENABLE_DASHBOARD_LOGGING;
        case 'memory-processing':
          return ENABLE_UI_LOGGING && ENABLE_MEMORY_PROCESSING_LOGGING;
        case 'rendering':
          return ENABLE_UI_LOGGING && ENABLE_RENDERING_LOGGING;

        // Additional granular services
        case 'api-response':
          return ENABLE_UI_LOGGING && ENABLE_API_RESPONSE_LOGGING;
        case 'folder-grouping':
          return ENABLE_UI_LOGGING && ENABLE_FOLDER_GROUPING_LOGGING;
        case 'memory-grid':
          return ENABLE_UI_LOGGING && ENABLE_MEMORY_GRID_LOGGING;
        case 'use-effect':
          return ENABLE_UI_LOGGING && ENABLE_USE_EFFECT_LOGGING;

        // Cross-cutting concerns (need multiple flags)
        case 'hosting-preferences':
          return ENABLE_UI_LOGGING && ENABLE_HOSTING_PREFERENCES;

        default:
          return false; // Only show logs with recognized service flags
      }
    }
    return false; // Only show logs with service parameter
  }

  private formatPrefix(level: string, service?: string): string {
    const timestamp = new Date().toISOString();
    // Handle case where service might be an object (fallback to default service)
    const serviceTag = typeof service === 'string' ? service : this.service;
    return `[${timestamp}] ${level} [${serviceTag}]`;
  }

  debug(message: string, service?: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.DEBUG, service)) {
      console.debug(this.formatPrefix('DEBUG', service), message, ...args);
    }
  }

  info(message: string, service?: string, ...args: any[]): void {
    // TODO: Performance optimization - implement lazy evaluation for context objects
    // Currently context objects are created even when logging is disabled
    // Consider: info(message: string, contextFactory?: () => any) for better performance
    if (this.shouldLog(LogLevel.INFO, service)) {
      console.info(this.formatPrefix('INFO', service), message, ...args);
    }
  }

  warn(message: string, service?: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.WARN, service)) {
      console.warn(this.formatPrefix('WARN', service), message, ...args);
    }
  }

  error(message: string, service?: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.ERROR, service)) {
      console.error(this.formatPrefix('ERROR', service), message, ...args);
    }
  }

  // Convenience methods for common logging patterns
  memoryCreated(memoryId: string, title: string, type: string): void {
    this.info(`Memory created: ${title} (${type})`, undefined, { memoryId, title, type });
  }

  memoryUpdated(memoryId: string, changes: Record<string, any>): void {
    this.info(`Memory updated: ${memoryId}`, undefined, { memoryId, changes });
  }

  memoryDeleted(memoryId: string): void {
    this.info(`Memory deleted: ${memoryId}`, undefined, { memoryId });
  }

  uploadStarted(fileName: string, size: number): void {
    this.info(`Upload started: ${fileName} (${size} bytes)`, undefined, { fileName, size });
  }

  uploadCompleted(fileName: string, url: string): void {
    this.info(`Upload completed: ${fileName}`, undefined, { fileName, url });
  }

  uploadFailed(fileName: string, error: Error): void {
    this.error(`Upload failed: ${fileName}`, undefined, error);
  }

  authSuccess(userId: string, method: string): void {
    this.info(`Authentication successful: ${userId} via ${method}`, undefined, { userId, method });
  }

  authFailed(userId: string, method: string, error: Error): void {
    this.error(`Authentication failed: ${userId} via ${method}`, undefined, error);
  }

  // Service-specific method chaining
  dashboard(): ServiceLogger {
    return new ServiceLogger('dashboard', this);
  }

  memoryProcessing(): ServiceLogger {
    return new ServiceLogger('memory-processing', this);
  }

  hostingPreferences(): ServiceLogger {
    return new ServiceLogger('hosting-preferences', this);
  }

  upload(): ServiceLogger {
    return new ServiceLogger('upload', this);
  }

  database(): ServiceLogger {
    return new ServiceLogger('database', this);
  }

  auth(): ServiceLogger {
    return new ServiceLogger('auth', this);
  }

  asset(): ServiceLogger {
    return new ServiceLogger('asset', this);
  }

  s3(): ServiceLogger {
    return new ServiceLogger('s3', this);
  }

  rendering(): ServiceLogger {
    return new ServiceLogger('rendering', this);
  }

  apiResponse(): ServiceLogger {
    return new ServiceLogger('api-response', this);
  }

  folderGrouping(): ServiceLogger {
    return new ServiceLogger('folder-grouping', this);
  }

  memoryGrid(): ServiceLogger {
    return new ServiceLogger('memory-grid', this);
  }

  useEffect(): ServiceLogger {
    return new ServiceLogger('use-effect', this);
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
