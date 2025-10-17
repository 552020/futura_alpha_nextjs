import { LogEntry, LogLevel, Context } from './types';
import { LogEngine } from './engine';

export class ServiceLogger {
  constructor(
    private service: string,
    private context: Context,
    private engine: LogEngine
  ) {}

  private log(level: LogLevel, message: string, data?: unknown, tags?: string[]) {
    const entry: LogEntry = {
      ts: Date.now(),
      level,
      msg: message,
      ctx: this.context,
      tags,
      data,
      service: this.service,
    };
    this.engine.emit(entry);
  }

  debug(message: string, data?: unknown, tags?: string[]) {
    this.log('debug', message, data, tags);
  }

  info(message: string, data?: unknown, tags?: string[]) {
    this.log('info', message, data, tags);
  }

  warn(message: string, data?: unknown, tags?: string[]) {
    this.log('warn', message, data, tags);
  }

  error(message: string, data?: unknown, tags?: string[]) {
    this.log('error', message, data, tags);
  }
}
