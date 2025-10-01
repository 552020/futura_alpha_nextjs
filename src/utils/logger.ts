/**
 * Standardized logging utility
 * @param level Log level ('info' | 'error' | 'warn')
 * @param message Log message
 * @param data Optional additional data to log
 */

export function log(level: 'info' | 'error' | 'warn', message: string, data?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  const logData = data ? `\n${JSON.stringify(data, null, 2)}` : '';
  console[level](`${timestamp} ${message}${logData}`);
}

/**
 * Creates a logger with a specific prefix
 * @param prefix String to prefix all log messages with
 * @returns Logger instance with prefixed messages
 */
export function createLogger(prefix: string) {
  return {
    info: (message: string, data?: Record<string, unknown>) => 
      log('info', `[${prefix}] ${message}`, data),
    error: (message: string, data?: Record<string, unknown>) => 
      log('error', `[${prefix}] ${message}`, data),
    warn: (message: string, data?: Record<string, unknown>) => 
      log('warn', `[${prefix}] ${message}`, data)
  };
}
