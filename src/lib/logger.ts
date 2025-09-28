// Removed circular import - icpLogger is defined below

/**
 * Comprehensive logging system for the entire codebase
 *
 * Provides structured logging with different levels, context, and service-specific loggers.
 * Replaces all console.log statements throughout the application.
 */

// ===== LOGGING CONTROL FLAGS =====
// Master switch - disable ALL logging
const ENABLE_LOGGING = true;

// Semantic service flags - control specific service categories
const ENABLE_UPLOAD_LOGGING = true;    // Upload, S3, Vercel Blob, ICP storage
const ENABLE_DATABASE_LOGGING = true;  // Database operations, memory management
const ENABLE_AUTH_LOGGING = true;      // Authentication, user management, II coauth
// ===================================

export enum LogLevel {
  SILENT = -1, // No logs at all
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogContext {
  service?: string;
  operation?: string;
  userId?: string;
  fileId?: string;
  memoryId?: string;
  galleryId?: string;
  folderId?: string;
  [key: string]: unknown;
}

class Logger {
  private level: LogLevel;
  private service: string;
  private isDevelopment: boolean;

  constructor(service: string, level: LogLevel = LogLevel.INFO) {
    this.service = service;
    this.level = level;
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  // Method to change log level for this specific logger
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  // Method to get current log level
  getLevel(): LogLevel {
    return this.level;
  }

  // Convenience methods for easy control
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

  private shouldLog(level: LogLevel, context?: LogContext): boolean {
    // Check if logging is disabled via the main control
    if (!ENABLE_LOGGING) {
      return false;
    }
    
    // Check semantic service flags
    if (context?.service) {
      const service = context.service.toLowerCase();
      
      // Upload & Storage services
      if (service.includes('upload') || service.includes('storage') || 
          service.includes('s3') || service.includes('blob') || 
          service.includes('vercel') || service.includes('icp-storage')) {
        if (!ENABLE_UPLOAD_LOGGING) return false;
      }
      
      // Database operations
      if (service.includes('database') || service.includes('db') || 
          service.includes('memory') || service.includes('gallery') ||
          service.includes('data')) {
        if (!ENABLE_DATABASE_LOGGING) return false;
      }
      
      // Authentication services
      if (service.includes('auth') || service.includes('user') || 
          service.includes('ii') || service.includes('coauth') ||
          service.includes('login') || service.includes('signin')) {
        if (!ENABLE_AUTH_LOGGING) return false;
      }
    }
    
    // In production, only log WARN and ERROR unless explicitly set to DEBUG
    if (!this.isDevelopment && level < LogLevel.WARN) {
      return false;
    }
    return level >= this.level;
  }

  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const serviceContext = context?.service || this.service;
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] ${level} [${serviceContext}] ${message}${contextStr}`;
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.DEBUG, context)) {
      console.debug(this.formatMessage('DEBUG', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.INFO, context)) {
      console.info(this.formatMessage('INFO', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.WARN, context)) {
      console.warn(this.formatMessage('WARN', message, context));
    }
  }

  error(message: string, error?: Error, context?: LogContext): void {
    if (this.shouldLog(LogLevel.ERROR, context)) {
      const errorContext = error ? { ...context, error: error.message, stack: error.stack } : context;
      console.error(this.formatMessage('ERROR', message, errorContext));
    }
  }

  // Convenience methods for common operations
  uploadStart(fileName: string, fileSize: number, context?: LogContext): void {
    this.info(`Upload started: ${fileName} (${fileSize} bytes)`, {
      ...context,
      operation: 'upload_start',
      fileName,
      fileSize,
    });
  }

  uploadComplete(fileName: string, duration: number, context?: LogContext): void {
    this.info(`Upload completed: ${fileName} in ${duration}ms`, {
      ...context,
      operation: 'upload_complete',
      fileName,
      duration,
    });
  }

  processingStart(fileName: string, context?: LogContext): void {
    this.info(`Processing started: ${fileName}`, {
      ...context,
      operation: 'processing_start',
      fileName,
    });
  }

  processingComplete(fileName: string, assets: string[], context?: LogContext): void {
    this.info(`Processing completed: ${fileName} - assets: ${assets.join(', ')}`, {
      ...context,
      operation: 'processing_complete',
      fileName,
      assets,
    });
  }

  memoryCreated(memoryId: string, title: string, context?: LogContext): void {
    this.info(`Memory created: ${title} (${memoryId})`, {
      ...context,
      operation: 'memory_created',
      memoryId,
      title,
    });
  }

  userCreated(userId: string, userType: 'permanent' | 'temporary', context?: LogContext): void {
    this.info(`User created: ${userId} (${userType})`, {
      ...context,
      operation: 'user_created',
      userId,
      userType,
    });
  }

  apiRequest(method: string, path: string, context?: LogContext): void {
    this.info(`API ${method} ${path}`, {
      ...context,
      operation: 'api_request',
      method,
      path,
    });
  }

  apiResponse(method: string, path: string, status: number, duration: number, context?: LogContext): void {
    this.info(`API ${method} ${path} - ${status} (${duration}ms)`, {
      ...context,
      operation: 'api_response',
      method,
      path,
      status,
      duration,
    });
  }

  authEvent(event: string, userId?: string, context?: LogContext): void {
    this.info(`Auth: ${event}`, {
      ...context,
      operation: 'auth_event',
      event,
      userId,
    });
  }

  databaseOperation(operation: string, table: string, context?: LogContext): void {
    this.debug(`DB ${operation} on ${table}`, {
      ...context,
      operation: 'database_operation',
      dbOperation: operation,
      table,
    });
  }
}

// Single logger instance with semantic flags
const defaultLevel = LogLevel.INFO;
export const logger = new Logger('app', defaultLevel);

// Export the Logger class for custom loggers
export { Logger };

// Global logger for quick access (replaces console.log)
export const log = logger;

// ===== SEMANTIC LOGGING CONTROL FUNCTIONS =====
// Control specific service categories

// Upload & Storage control
export const enableUploadLogging = () => { /* ENABLE_UPLOAD_LOGGING = true; */ };
export const disableUploadLogging = () => { /* ENABLE_UPLOAD_LOGGING = false; */ };

// Database control  
export const enableDatabaseLogging = () => { /* ENABLE_DATABASE_LOGGING = true; */ };
export const disableDatabaseLogging = () => { /* ENABLE_DATABASE_LOGGING = false; */ };

// Authentication control
export const enableAuthLogging = () => { /* ENABLE_AUTH_LOGGING = true; */ };
export const disableAuthLogging = () => { /* ENABLE_AUTH_LOGGING = false; */ };

// Master control
export const enableAllLogging = () => { /* ENABLE_LOGGING = true; */ };
export const disableAllLogging = () => { /* ENABLE_LOGGING = false; */ };
