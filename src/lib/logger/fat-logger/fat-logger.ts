import { LogEngine } from './engine';
import { LoggerConfig, LogLevel, Context } from './types';
import { ServiceLogger } from './service-logger';

/**
 * 🍔 fatLogger
 * The advanced, structured, and context-aware fatLogger with localStorage support.
 * Supports both the new modular API and backward-compatible service:context parsing.
 */
export class FatLogger {
  private engine: LogEngine;

  constructor(private config: LoggerConfig) {
    this.engine = new LogEngine(config);
  }

  configure(newConfig: Partial<LoggerConfig>) {
    Object.assign(this.config, newConfig);
  }

  // New modular API
  service(name: string, context: Context = 'fe') {
    return new ServiceLogger(name, context, this.engine);
  }

  // Backward-compatible API: fatLogger.debug(message, context, data, tags)
  // where context can be 'fe', 'be', or 'service:context' format
  log(
    level: LogLevel,
    message: string,
    context: Context | string,
    data?: unknown,
    tags?: string[]
  ) {
    const { parsedContext, service } = this.parseContext(context);

    this.engine.emit({
      ts: Date.now(),
      level,
      msg: message,
      ctx: parsedContext,
      data,
      tags,
      service,
    });
  }

  debug(
    message: string,
    context: Context | string,
    data?: unknown,
    tags?: string[]
  ) {
    this.log('debug', message, context, data, tags);
  }

  info(
    message: string,
    context: Context | string,
    data?: unknown,
    tags?: string[]
  ) {
    this.log('info', message, context, data, tags);
  }

  warn(
    message: string,
    context: Context | string,
    data?: unknown,
    tags?: string[]
  ) {
    this.log('warn', message, context, data, tags);
  }

  error(
    message: string,
    context: Context | string,
    data?: unknown,
    tags?: string[]
  ) {
    this.log('error', message, context, data, tags);
  }

  // Parse context to support both 'fe'/'be' and 'service:context' formats
  private parseContext(context: Context | string): {
    parsedContext: Context;
    service?: string;
  } {
    // If it's already a valid context, return as-is
    if (context === 'fe' || context === 'be') {
      return { parsedContext: context };
    }

    // Handle service:context format (e.g., "upload:be", "database:fe")
    if (typeof context === 'string' && context.includes(':')) {
      const [service, ctx] = context.split(':');
      const parsedContext =
        ctx === 'fe' || ctx === 'be' ? (ctx as Context) : 'fe';
      return { parsedContext, service };
    }

    // Default to frontend context
    return { parsedContext: 'fe' };
  }
}
