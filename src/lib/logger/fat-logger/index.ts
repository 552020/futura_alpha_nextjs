import { FatLogger } from './fat-logger';
import {
  ENABLE_LOGGING,
  ENABLE_FRONTEND_LOGGING,
  ENABLE_BACKEND_LOGGING,
  LOG_LEVELS,
  ENABLED_TAGS,
  EXCLUDED_TAGS,
  SERVICE_FLAGS,
} from './config';

// Export config values for external use
export { ENABLE_LOGGING, ICP_DEBUG } from './config';

// Create the unified fatLogger instance with localStorage support
export const fatLogger = new FatLogger({
  enabled: ENABLE_LOGGING,
  frontend: ENABLE_FRONTEND_LOGGING,
  backend: ENABLE_BACKEND_LOGGING,
  levels: LOG_LEVELS,
  enabledTags: ENABLED_TAGS,
  excludedTags: EXCLUDED_TAGS,
  serviceFlags: SERVICE_FLAGS,
});

// Export types for external use
export type { LogLevel, Context, LogEntry, LoggerConfig, ServiceFlags } from './types';
export { FatLogger } from './fat-logger';
export { ServiceLogger } from './service-logger';
export { LogEngine } from './engine';

// Export tag governance helpers
export { TAG_NAMESPACES, createTag } from './types';
