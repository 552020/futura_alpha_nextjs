import { LogEntry, LoggerConfig } from './types';

export class LogEngine {
  constructor(private config: LoggerConfig) {}

  shouldLog(entry: LogEntry): boolean {
    if (!this.config.enabled) return false;
    if (!this.config.levels[entry.level]) return false;

    const contextEnabled = entry.ctx === 'fe' ? this.config.frontend : this.config.backend;
    if (!contextEnabled) return false;

    const tags = entry.tags ?? [];

    // Check blacklist first
    if (this.config.excludedTags?.length) {
      if (tags.some(t => this.config.excludedTags!.includes(t))) return false;
    }

    // Check whitelist
    if (this.config.enabledTags?.length) {
      if (!tags.some(t => this.config.enabledTags!.includes(t))) return false;
    }

    return true;
  }

  emit(entry: LogEntry) {
    if (!this.shouldLog(entry)) return;

    const ts = new Date(entry.ts).toISOString();
    const tagString = entry.tags?.join(',') || '';
    const prefix = `[${ts}] [${entry.level.toUpperCase()}] [${entry.ctx}] [${entry.service || ''}] [${tagString}]`;

    console[entry.level](prefix, entry.msg, entry.data || '');
  }
}
