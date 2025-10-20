export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type Context = 'fe' | 'be';

// Tag governance - common namespaces
export const TAG_NAMESPACES = {
  SERVICE: 'service',
  FEATURE: 'feature',
  USER: 'user',
  COMPONENT: 'component',
  ERROR: 'error',
  PERF: 'perf',
  ROUTE: 'route',
  ENV: 'env',
} as const;

// Helper function for creating namespaced tags
export function createTag(namespace: keyof typeof TAG_NAMESPACES, value: string): string {
  return `${TAG_NAMESPACES[namespace]}:${value}`;
}

export interface LogEntry {
  ts: number;
  level: LogLevel;
  ctx: Context;
  msg: string;
  tags?: string[];
  data?: unknown;
  service?: string;
}

// Essential service flags (simplified from the original 15+ flags)
export interface ServiceFlags {
  ENABLE_LOGGING: boolean;
  ENABLE_FRONTEND_LOGGING: boolean;
  ENABLE_BACKEND_LOGGING: boolean;
  ENABLE_UPLOAD_LOGGING: boolean;
  ENABLE_DATABASE_LOGGING: boolean;
  ENABLE_AUTH_LOGGING: boolean;
  ENABLE_ASSET_LOGGING: boolean;
  ENABLE_S3_LOGGING: boolean;
  ENABLE_ICP_UPLOAD_LOGGING: boolean;
  ENABLE_DASHBOARD_LOGGING: boolean;
  ENABLE_MEMORY_PROCESSING_LOGGING: boolean;
  ENABLE_RENDERING_LOGGING: boolean;
  ENABLE_API_RESPONSE_LOGGING: boolean;
  ENABLE_FOLDER_GROUPING_LOGGING: boolean;
  ENABLE_MEMORY_GRID_LOGGING: boolean;
  ENABLE_USE_EFFECT_LOGGING: boolean;
  ENABLE_HOSTING_PREFERENCES: boolean;
  ENABLE_WEBWORKER_LOGGING: boolean;
}

export interface LoggerConfig {
  enabled: boolean;
  frontend: boolean;
  backend: boolean;
  levels: Record<LogLevel, boolean>;
  enabledTags?: string[];
  excludedTags?: string[];
  serviceFlags: ServiceFlags;
}
