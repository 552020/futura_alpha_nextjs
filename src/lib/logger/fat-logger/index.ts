import { FatLogger } from './fat-logger';

export const fatLogger = new FatLogger({
  enabled: false,
  frontend: false,
  backend: false,
  levels: {
    debug: false,
    info: false,
    warn: false,
    error: false,
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
