import { LogEntry, LoggerConfig, ServiceFlags } from './types';
import { SERVICE_FLAGS } from './config';

// Use the config.ts as the single source of truth
const DEFAULT_SERVICE_FLAGS: ServiceFlags = SERVICE_FLAGS;

// Helper function to resolve three-state toggle to boolean
function resolveToggleState(uiState: string | undefined, defaultValue: boolean): boolean {
  if (uiState === 'enabled') return true;
  if (uiState === 'disabled') return false;
  return defaultValue; // 'not-set' or undefined
}

// Runtime configuration getter (from localStorage)
function getLoggerConfig(): ServiceFlags {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    // Server-side or no localStorage: use config.ts values
    return DEFAULT_SERVICE_FLAGS;
  }

  // Client-side: try to load from localStorage, fallback to defaults
  try {
    const savedConfig = localStorage.getItem('logger-config');
    if (savedConfig) {
      const parsed = JSON.parse(savedConfig);
      return {
        ENABLE_LOGGING: resolveToggleState(parsed.ENABLE_LOGGING, DEFAULT_SERVICE_FLAGS.ENABLE_LOGGING),
        ENABLE_FRONTEND_LOGGING: resolveToggleState(
          parsed.ENABLE_FRONTEND_LOGGING,
          DEFAULT_SERVICE_FLAGS.ENABLE_FRONTEND_LOGGING
        ),
        ENABLE_BACKEND_LOGGING: resolveToggleState(
          parsed.ENABLE_BACKEND_LOGGING,
          DEFAULT_SERVICE_FLAGS.ENABLE_BACKEND_LOGGING
        ),
        ENABLE_UPLOAD_LOGGING: resolveToggleState(
          parsed.ENABLE_UPLOAD_LOGGING,
          DEFAULT_SERVICE_FLAGS.ENABLE_UPLOAD_LOGGING
        ),
        ENABLE_DATABASE_LOGGING: resolveToggleState(
          parsed.ENABLE_DATABASE_LOGGING,
          DEFAULT_SERVICE_FLAGS.ENABLE_DATABASE_LOGGING
        ),
        ENABLE_AUTH_LOGGING: resolveToggleState(parsed.ENABLE_AUTH_LOGGING, DEFAULT_SERVICE_FLAGS.ENABLE_AUTH_LOGGING),
        ENABLE_ASSET_LOGGING: resolveToggleState(
          parsed.ENABLE_ASSET_LOGGING,
          DEFAULT_SERVICE_FLAGS.ENABLE_ASSET_LOGGING
        ),
        ENABLE_S3_LOGGING: resolveToggleState(parsed.ENABLE_S3_LOGGING, DEFAULT_SERVICE_FLAGS.ENABLE_S3_LOGGING),
        ENABLE_ICP_UPLOAD_LOGGING: resolveToggleState(
          parsed.ENABLE_ICP_UPLOAD_LOGGING,
          DEFAULT_SERVICE_FLAGS.ENABLE_ICP_UPLOAD_LOGGING
        ),
        ENABLE_DASHBOARD_LOGGING: resolveToggleState(
          parsed.ENABLE_DASHBOARD_LOGGING,
          DEFAULT_SERVICE_FLAGS.ENABLE_DASHBOARD_LOGGING
        ),
        ENABLE_MEMORY_PROCESSING_LOGGING: resolveToggleState(
          parsed.ENABLE_MEMORY_PROCESSING_LOGGING,
          DEFAULT_SERVICE_FLAGS.ENABLE_MEMORY_PROCESSING_LOGGING
        ),
        ENABLE_RENDERING_LOGGING: resolveToggleState(
          parsed.ENABLE_RENDERING_LOGGING,
          DEFAULT_SERVICE_FLAGS.ENABLE_RENDERING_LOGGING
        ),
        ENABLE_API_RESPONSE_LOGGING: resolveToggleState(
          parsed.ENABLE_API_RESPONSE_LOGGING,
          DEFAULT_SERVICE_FLAGS.ENABLE_API_RESPONSE_LOGGING
        ),
        ENABLE_FOLDER_GROUPING_LOGGING: resolveToggleState(
          parsed.ENABLE_FOLDER_GROUPING_LOGGING,
          DEFAULT_SERVICE_FLAGS.ENABLE_FOLDER_GROUPING_LOGGING
        ),
        ENABLE_MEMORY_GRID_LOGGING: resolveToggleState(
          parsed.ENABLE_MEMORY_GRID_LOGGING,
          DEFAULT_SERVICE_FLAGS.ENABLE_MEMORY_GRID_LOGGING
        ),
        ENABLE_USE_EFFECT_LOGGING: resolveToggleState(
          parsed.ENABLE_USE_EFFECT_LOGGING,
          DEFAULT_SERVICE_FLAGS.ENABLE_USE_EFFECT_LOGGING
        ),
        ENABLE_HOSTING_PREFERENCES: resolveToggleState(
          parsed.ENABLE_HOSTING_PREFERENCES,
          DEFAULT_SERVICE_FLAGS.ENABLE_HOSTING_PREFERENCES
        ),
        ENABLE_WEBWORKER_LOGGING: resolveToggleState(
          parsed.ENABLE_WEBWORKER_LOGGING,
          DEFAULT_SERVICE_FLAGS.ENABLE_WEBWORKER_LOGGING
        ),
      };
    }
  } catch (error) {
    console.warn('Failed to load logger config from localStorage:', error);
  }

  // Fallback to defaults
  return DEFAULT_SERVICE_FLAGS;
}

export class LogEngine {
  constructor(private config: LoggerConfig) {}

  shouldLog(entry: LogEntry): boolean {
    // Get current configuration (reads from localStorage on client-side)
    const serviceFlags = getLoggerConfig();

    // If logging is disabled globally, don't log anything
    if (!serviceFlags.ENABLE_LOGGING) return false;

    // Check if the log level is enabled in config
    if (!this.config.levels[entry.level]) return false;

    // Check context (frontend/backend)
    const contextEnabled =
      entry.ctx === 'fe' ? serviceFlags.ENABLE_FRONTEND_LOGGING : serviceFlags.ENABLE_BACKEND_LOGGING;
    if (!contextEnabled) return false;

    // Check service-specific flags if service is specified
    if (entry.service) {
      const serviceEnabled = this.getServiceEnabled(entry.service, serviceFlags);
      if (!serviceEnabled) return false;
    }

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

  private getServiceEnabled(service: string, serviceFlags: ServiceFlags): boolean {
    // Handle service:context format (e.g., "upload:be", "database:fe")
    if (service.includes(':')) {
      const [serviceName] = service.split(':');
      return this.getServiceFlag(serviceName, serviceFlags);
    }

    // Handle direct service names
    return this.getServiceFlag(service, serviceFlags);
  }

  private getServiceFlag(serviceName: string, serviceFlags: ServiceFlags): boolean {
    switch (serviceName) {
      case 'upload':
        return serviceFlags.ENABLE_UPLOAD_LOGGING;
      case 'database':
        return serviceFlags.ENABLE_DATABASE_LOGGING;
      case 'auth':
        return serviceFlags.ENABLE_AUTH_LOGGING;
      case 'asset':
        return serviceFlags.ENABLE_ASSET_LOGGING;
      case 's3':
        return serviceFlags.ENABLE_S3_LOGGING;
      case 'icp-upload':
        return serviceFlags.ENABLE_ICP_UPLOAD_LOGGING;
      case 'dashboard':
        return serviceFlags.ENABLE_DASHBOARD_LOGGING;
      case 'memory-processing':
        return serviceFlags.ENABLE_MEMORY_PROCESSING_LOGGING;
      case 'rendering':
        return serviceFlags.ENABLE_RENDERING_LOGGING;
      case 'api-response':
        return serviceFlags.ENABLE_API_RESPONSE_LOGGING;
      case 'folder-grouping':
        return serviceFlags.ENABLE_FOLDER_GROUPING_LOGGING;
      case 'memory-grid':
        return serviceFlags.ENABLE_MEMORY_GRID_LOGGING;
      case 'use-effect':
        return serviceFlags.ENABLE_USE_EFFECT_LOGGING;
      case 'hosting-preferences':
        return serviceFlags.ENABLE_HOSTING_PREFERENCES;
      case 'webworker':
        return serviceFlags.ENABLE_WEBWORKER_LOGGING;
      default:
        return true; // Default to enabled if service not recognized
    }
  }

  emit(entry: LogEntry) {
    if (!this.shouldLog(entry)) return;

    const ts = new Date(entry.ts).toISOString();
    const tagString = entry.tags?.join(',') || '';
    const prefix = `[${ts}] [${entry.level.toUpperCase()}] [${entry.ctx}] [${entry.service || ''}] [${tagString}]`;

    console[entry.level](prefix, entry.msg, entry.data || '');
  }
}
