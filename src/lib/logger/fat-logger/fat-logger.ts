import { LogEngine } from './engine';
import { LoggerConfig, LogLevel, Context } from './types';
import { ServiceLogger } from './service-logger';

/**
 * 🍔 fatLogger
 * The advanced, structured, and context-aware fatLogger.
 * Use only for more complex logging flows (e.g. service separation, backend events).
 * Keep tinyLogger as the default for most use cases.
 */
export class FatLogger {
  private engine: LogEngine;

  constructor(private config: LoggerConfig) {
    this.engine = new LogEngine(config);
  }

  configure(newConfig: Partial<LoggerConfig>) {
    Object.assign(this.config, newConfig);
  }

  service(name: string, context: Context = 'fe') {
    return new ServiceLogger(name, context, this.engine);
  }

  log(level: LogLevel, message: string, context: Context, data?: unknown, tags?: string[]) {
    this.engine.emit({
      ts: Date.now(),
      level,
      msg: message,
      ctx: context,
      data,
      tags,
    });
  }

  debug(message: string, context: Context, data?: unknown, tags?: string[]) {
    this.log('debug', message, context, data, tags);
  }

  info(message: string, context: Context, data?: unknown, tags?: string[]) {
    this.log('info', message, context, data, tags);
  }

  warn(message: string, context: Context, data?: unknown, tags?: string[]) {
    this.log('warn', message, context, data, tags);
  }

  error(message: string, context: Context, data?: unknown, tags?: string[]) {
    this.log('error', message, context, data, tags);
  }
}
