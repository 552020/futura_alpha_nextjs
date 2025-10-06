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
const ENABLE_UPLOAD_LOGGING = true; // Upload routing and processing
const ENABLE_DATABASE_LOGGING = true; // Database operations
const ENABLE_AUTH_LOGGING = true; // Authentication flows
const ENABLE_ASSET_LOGGING = true; // Asset processing and thumbnails
const ENABLE_S3_LOGGING = true; // S3 presigned URLs and storage
const ENABLE_ICP_UPLOAD_LOGGING = true; // ICP upload and canister interactions

// Feature flags (cross-cutting concerns)
const ENABLE_HOSTING_PREFERENCES = true; // Hosting preference changes and routing
const ENABLE_DASHBOARD_LOGGING = true; // Dashboard state and API calls
const ENABLE_MEMORY_PROCESSING_LOGGING = true; // Memory processing and folder grouping
const ENABLE_RENDERING_LOGGING = true; // Component rendering logs

// Additional granular flags for specific log categories
const ENABLE_API_RESPONSE_LOGGING = true; // API response status and data logs
const ENABLE_FOLDER_GROUPING_LOGGING = true; // Folder grouping and memory processing logs
const ENABLE_MEMORY_GRID_LOGGING = true; // MemoryGrid component rendering logs
const ENABLE_USE_EFFECT_LOGGING = true; // useEffect hook logs
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

  private getServiceContext(): string {
    return `${this.service}:${this.context}`;
  }

  debug(message: string, data?: unknown, ...args: unknown[]): void {
    if (data !== undefined) {
      this.parentLogger.debug(message, this.getServiceContext(), data, ...args);
    } else {
      this.parentLogger.debug(message, this.getServiceContext());
    }
  }

  info(message: string, data?: unknown, ...args: unknown[]): void {
    if (data !== undefined) {
      this.parentLogger.info(message, this.getServiceContext(), data, ...args);
    } else {
      this.parentLogger.info(message, this.getServiceContext());
    }
  }

  warn(message: string, data?: unknown, ...args: unknown[]): void {
    if (data !== undefined) {
      this.parentLogger.warn(message, this.getServiceContext(), data, ...args);
    } else {
      this.parentLogger.warn(message, this.getServiceContext());
    }
  }

  error(message: string, errorOrData?: unknown, ...args: unknown[]): void {
    if (errorOrData instanceof Error) {
      this.parentLogger.error(message, this.getServiceContext(), errorOrData, ...args);
    } else if (errorOrData !== undefined) {
      this.parentLogger.error(message, this.getServiceContext(), errorOrData, ...args);
    } else {
      this.parentLogger.error(message, this.getServiceContext());
    }
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
    // If logging is disabled globally, don't log anything
    if (!ENABLE_LOGGING) return false;

    // If the log level is below the current level, don't log
    if (level < this.level) return false;

    // If no service is specified, allow the log
    if (!service) return true;

    // Handle service:context format (e.g., "upload:be", "database:fe")
    if (service.includes(':')) {
      const [serviceName, context] = service.split(':');

      // Check if the service is enabled
      let serviceEnabled = true; // Default to true if service is not explicitly disabled
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
          // If the service is not in our list, allow it by default
          serviceEnabled = true;
      }

      // Check if the context (be/fe) is enabled
      const contextEnabled = context === 'be' ? ENABLE_BACKEND_LOGGING : ENABLE_UI_LOGGING;

      return serviceEnabled && contextEnabled;
    }

    // If we get here, the service format is not recognized, so allow it by default
    return true;
  }

  private formatPrefix(level: string, service?: string): string {
    const timestamp = new Date().toISOString();
    const serviceTag = service ? `[${service}]` : `[${this.service}]`;
    return `[${timestamp}] ${level} ${serviceTag}`;
  }

  debug(message: string, serviceOrData?: string | Record<string, unknown>, data?: unknown, ...args: unknown[]): void {
    const service = typeof serviceOrData === 'string' ? serviceOrData : undefined;
    const logData = typeof serviceOrData === 'string' ? data : serviceOrData;

    if (!this.shouldLog(LogLevel.DEBUG, service)) return;
    const prefix = this.formatPrefix('DEBUG', service);

    if (logData !== undefined) {
      console.debug(prefix, message, logData, ...args);
    } else {
      console.debug(prefix, message);
    }
  }

  info(message: string, serviceOrData?: string | Record<string, unknown>, data?: unknown, ...args: unknown[]): void {
    const service = typeof serviceOrData === 'string' ? serviceOrData : undefined;
    const logData = typeof serviceOrData === 'string' ? data : serviceOrData;

    if (!this.shouldLog(LogLevel.INFO, service)) return;
    const prefix = this.formatPrefix('INFO', service);

    if (logData !== undefined) {
      console.info(prefix, message, logData, ...args);
    } else {
      console.info(prefix, message);
    }
  }

  warn(message: string, serviceOrData?: string | Record<string, unknown>, data?: unknown, ...args: unknown[]): void {
    const service = typeof serviceOrData === 'string' ? serviceOrData : undefined;
    const logData = typeof serviceOrData === 'string' ? data : serviceOrData;

    if (!this.shouldLog(LogLevel.WARN, service)) return;
    const prefix = this.formatPrefix('WARN', service);

    if (logData !== undefined) {
      console.warn(prefix, message, logData, ...args);
    } else {
      console.warn(prefix, message);
    }
  }

  error(
    message: string,
    serviceOrData?: string | Record<string, unknown> | Error,
    data?: unknown,
    ...args: unknown[]
  ): void {
    let service: string | undefined;
    let logData: unknown;

    if (serviceOrData instanceof Error) {
      // Handle case where error is passed as second parameter
      service = undefined;
      logData = serviceOrData;
    } else if (typeof serviceOrData === 'string') {
      // Handle case where service is passed as second parameter
      service = serviceOrData;
      logData = data;
    } else {
      // Handle case where data object is passed as second parameter
      service = undefined;
      logData = serviceOrData;
    }

    if (!this.shouldLog(LogLevel.ERROR, service)) return;
    const prefix = this.formatPrefix('ERROR', service);

    if (logData !== undefined) {
      if (logData instanceof Error) {
        // Special handling for Error objects to ensure stack traces are preserved
        console.error(prefix, message, logData, ...args);
      } else {
        console.error(prefix, message, logData, ...args);
      }
    } else {
      console.error(prefix, message);
    }
  }
  memoryCreated(memoryId: string, title: string, type: string, service: string = 'app'): void {
    this.info(`Memory created: ${title} (${type})`, `${service}:be`, { memoryId, title, type });
  }

  memoryUpdated(memoryId: string, changes: Record<string, unknown>, service: string = 'app'): void {
    this.info(`Memory updated: ${memoryId}`, `${service}:be`, { memoryId, changes });
  }

  memoryDeleted(memoryId: string, service: string = 'app'): void {
    this.info(`Memory deleted: ${memoryId}`, `${service}:be`, { memoryId });
  }

  fileUploaded(fileName: string, size: number, service: string = 'app'): void {
    this.info(`File uploaded: ${fileName} (${size} bytes)`, `${service}:be`, { fileName, size });
  }

  fileProcessed(fileName: string, url: string, service: string = 'app'): void {
    this.info(`File processed: ${fileName}`, `${service}:be`, { fileName, url });
  }

  // Specialized logging methods
  apiRequest(method: string, url: string, status: number, duration: number, service: string = 'api'): void {
    this.info(`API ${method} ${url} - ${status} (${duration}ms)`, `${service}:be`, { method, url, status, duration });
  }

  authEvent(userId: string, action: string, method: string, service: string = 'auth'): void {
    this.info(`Auth ${action} for user ${userId} (${method})`, `${service}:be`, { userId, method });
  }

  authFailed(userId: string, method: string, error: Error, service: string = 'auth'): void {
    this.error(`Authentication failed: ${userId} via ${method}`, `${service}:be`, {
      userId,
      method,
      error: error.message,
      stack: error.stack,
    });
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
export const logger = new SimpleLogger('app', LogLevel.DEBUG);

// Legacy exports for backward compatibility (all point to the same instance)
export const uploadLogger = logger;
export const authLogger = logger;
export const apiLogger = logger;
export const dbLogger = logger;
export const memoryLogger = logger;
export const galleryLogger = logger;
export const caseLogger = logger;
export const icpLogger = logger;
