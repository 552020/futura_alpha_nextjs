// src/lib/tiny-fatLogger.ts
export type LogTags = string[];

interface LogInput {
  tags?: LogTags;
  data?: unknown;
}

// map tag → console method
const LEVELS = ['debug', 'info', 'warn', 'error'] as const;

// Optional tiny extras (if you ever care)
let enabled = true;
let include: string[] = [];

export function setLoggerFilter(tags: string[] = []) {
  include = tags;
}

export function toggleLogger(on: boolean) {
  enabled = on;
}

export function logger(message: string, { tags = [], data }: LogInput = {}) {
  if (!enabled) return;
  if (include.length && !tags.some((t) => include.includes(t))) return;

  const level =
    tags.find((t) => LEVELS.includes(t as (typeof LEVELS)[number])) || 'info';
  const sink =
    (console as unknown as Record<string, (...args: unknown[]) => void>)[
      level
    ] || console.log;
  const timestamp = new Date().toISOString();
  sink(`[${timestamp}] [${tags.join(',')}]`, message, data ?? '');
}
