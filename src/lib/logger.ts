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
const ENABLE_ICP_UPLOAD_LOGGING = true; // ICP upload and canister interactions

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
  [key: string]: unknown;
}

class ServiceLogger {
  constructor(
    private service: string,
    private context: string,
    private parentLogger: SimpleLogger
  ) {}

  debug(message: string, ...args: unknown[]): void {
    this.parentLogger.debug(message, `${this.service}:${this.context}`, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.parentLogger.info(message, `${this.service}:${this.context}`, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.parentLogger.warn(message, `${this.service}:${this.context}`, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    this.parentLogger.error(message, `${this.service}:${this.context}`, ...args);
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
      // Handle service:context format (e.g., "upload:be", "database:fe")
      if (service.includes(':')) {
        const [serviceName, context] = service.split(':');

        // Check service flag
        let serviceEnabled = false;
        switch (serviceName) {
          case 'upload':
            serviceEnabled = ENABLE_UPLOAD_LOGGING;
            break;
          case 'database':
            serviceEnabled = ENABLE_DATABASE_LOGGING;
            break;
          case 'auth':
            serviceEnabled = ENABLE_AUTH_LOGGING;
            break;
          case 'asset':
            serviceEnabled = ENABLE_ASSET_LOGGING;
            break;
          case 's3':
            serviceEnabled = ENABLE_S3_LOGGING;
            break;
          case 'icp-upload':
            serviceEnabled = ENABLE_ICP_UPLOAD_LOGGING;
            break;
          case 'dashboard':
            serviceEnabled = ENABLE_DASHBOARD_LOGGING;
            break;
          case 'memory-processing':
            serviceEnabled = ENABLE_MEMORY_PROCESSING_LOGGING;
            break;
          case 'rendering':
            serviceEnabled = ENABLE_RENDERING_LOGGING;
            break;
          case 'api-response':
            serviceEnabled = ENABLE_API_RESPONSE_LOGGING;
            break;
          case 'folder-grouping':
            serviceEnabled = ENABLE_FOLDER_GROUPING_LOGGING;
            break;
          case 'memory-grid':
            serviceEnabled = ENABLE_MEMORY_GRID_LOGGING;
            break;
          case 'use-effect':
            serviceEnabled = ENABLE_USE_EFFECT_LOGGING;
            break;
          case 'hosting-preferences':
            serviceEnabled = ENABLE_HOSTING_PREFERENCES;
            break;
          default:
            return false;
        }

        // Check context flag
        const contextEnabled = context === 'be' ? ENABLE_BACKEND_LOGGING : ENABLE_UI_LOGGING;

        return serviceEnabled && contextEnabled;
      }

      // Fallback for old format without context
      return false;
    }
    return false; // Only show logs with service parameter
  }

  private formatPrefix(level: string, service?: string): string {
    const timestamp = new Date().toISOString();
    // Handle case where service might be an object (fallback to default service)
    const serviceTag = typeof service === 'string' ? service : this.service;
    return `[${timestamp}] ${level} [${serviceTag}]`;
  }

  debug(message: string, service?: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.DEBUG, service)) {
      console.debug(this.formatPrefix('DEBUG', service), message, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    // TODO: Performance optimization - implement lazy evaluation for context objects
    // Currently context objects are created even when logging is disabled
    // Consider: info(message: string, contextFactory?: () => unknown) for better performance
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatPrefix('INFO'), message, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatPrefix('WARN'), message, ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatPrefix('ERROR'), message, ...args);
    }
  }

  // Convenience methods for common logging patterns
  memoryCreated(memoryId: string, title: string, type: string): void {
    this.info(`Memory created: ${title} (${type})`, { memoryId, title, type });
  }

  memoryUpdated(memoryId: string, changes: Record<string, unknown>): void {
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

  // Service-specific method chaining
  dashboard(context: 'be' | 'fe' = 'fe'): ServiceLogger {
    return new ServiceLogger('dashboard', context, this);
  }

  memoryProcessing(context: 'be' | 'fe' = 'fe'): ServiceLogger {
    return new ServiceLogger('memory-processing', context, this);
  }

  hostingPreferences(context: 'be' | 'fe' = 'fe'): ServiceLogger {
    return new ServiceLogger('hosting-preferences', context, this);
  }

  upload(context: 'be' | 'fe' = 'be'): ServiceLogger {
    return new ServiceLogger('upload', context, this);
  }

  database(context: 'be' | 'fe' = 'be'): ServiceLogger {
    return new ServiceLogger('database', context, this);
  }

  auth(context: 'be' | 'fe' = 'be'): ServiceLogger {
    return new ServiceLogger('auth', context, this);
  }

  asset(context: 'be' | 'fe' = 'be'): ServiceLogger {
    return new ServiceLogger('asset', context, this);
  }

  s3(context: 'be' | 'fe' = 'be'): ServiceLogger {
    return new ServiceLogger('s3', context, this);
  }

  rendering(context: 'be' | 'fe' = 'fe'): ServiceLogger {
    return new ServiceLogger('rendering', context, this);
  }

  apiResponse(context: 'be' | 'fe' = 'fe'): ServiceLogger {
    return new ServiceLogger('api-response', context, this);
  }

  folderGrouping(context: 'be' | 'fe' = 'fe'): ServiceLogger {
    return new ServiceLogger('folder-grouping', context, this);
  }

  memoryGrid(context: 'be' | 'fe' = 'fe'): ServiceLogger {
    return new ServiceLogger('memory-grid', context, this);
  }

  useEffect(context: 'be' | 'fe' = 'fe'): ServiceLogger {
    return new ServiceLogger('use-effect', context, this);
  }

  icpUpload(context: 'be' | 'fe' = 'fe'): ServiceLogger {
    return new ServiceLogger('icp-upload', context, this);
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
