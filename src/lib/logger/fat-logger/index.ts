import { FatLogger } from './fat-logger';

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
});

// Export types for external use
export type { LogLevel, Context, LogEntry, LoggerConfig } from './types';
export { FatLogger } from './fat-logger';
export { ServiceLogger } from './service-logger';
export { LogEngine } from './engine';

// Export tag governance helpers
export { TAG_NAMESPACES, createTag } from './types';
