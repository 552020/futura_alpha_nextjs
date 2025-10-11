import { FatLogger } from './fat-logger';

// Simple ICP upload tracking flag
export const ICP_DEBUG = true; // Set to false to disable ICP logs

// Create the unified fatLogger instance with localStorage support
export const fatLogger = new FatLogger({
  enabled: true,
  frontend: true,
  backend: true,
  levels: {
    debug: true,
    info: true,
    warn: true,
    error: true,
  },
  enabledTags: [],
  excludedTags: [],
  serviceFlags: {
    ENABLE_LOGGING: false,
    ENABLE_FRONTEND_LOGGING: true,
    ENABLE_BACKEND_LOGGING: true,
    ENABLE_UPLOAD_LOGGING: true,
    ENABLE_DATABASE_LOGGING: true,
    ENABLE_AUTH_LOGGING: true,
    ENABLE_ASSET_LOGGING: true,
    ENABLE_S3_LOGGING: true,
    ENABLE_ICP_UPLOAD_LOGGING: true,
    ENABLE_DASHBOARD_LOGGING: true,
    ENABLE_MEMORY_PROCESSING_LOGGING: true,
    ENABLE_RENDERING_LOGGING: true,
    ENABLE_API_RESPONSE_LOGGING: true,
    ENABLE_FOLDER_GROUPING_LOGGING: true,
    ENABLE_MEMORY_GRID_LOGGING: true,
    ENABLE_USE_EFFECT_LOGGING: true,
    ENABLE_HOSTING_PREFERENCES: true,
  },
});

// Export types for external use
export type { LogLevel, Context, LogEntry, LoggerConfig, ServiceFlags } from './types';
export { FatLogger } from './fat-logger';
export { ServiceLogger } from './service-logger';
export { LogEngine } from './engine';

// Export tag governance helpers
export { TAG_NAMESPACES, createTag } from './types';
