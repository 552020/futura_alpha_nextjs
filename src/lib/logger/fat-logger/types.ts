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

export interface LoggerConfig {
  enabled: boolean;
  frontend: boolean;
  backend: boolean;
  levels: Record<LogLevel, boolean>;
  enabledTags?: string[];
  excludedTags?: string[];
}
