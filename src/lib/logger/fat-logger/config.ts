/**
 * FatLogger Configuration
 *
 * This file contains all the configuration options for the FatLogger system.
 * Modify these settings to control logging behavior across the application.
 */

// ============================================================================
// MAIN CONFIGURATION - All variables in one place
// ============================================================================

// Master switches
export const ENABLE_LOGGING = false; // Master switch - set to false to disable ALL logging
export const ICP_DEBUG = true; // ICP upload tracking flag

// Environment settings
export const ENABLE_FRONTEND_LOGGING = false; // Frontend (browser) logging (ignored when ENABLE_LOGGING = false)
export const ENABLE_BACKEND_LOGGING = false; // Backend (server) logging (ignored when ENABLE_LOGGING = false)

// Log levels
export const LOG_LEVELS = {
  debug: true,
  info: true,
  warn: true,
  error: true,
} as const;

// Service-specific logging flags
export const SERVICE_FLAGS = {
  ENABLE_LOGGING: false, // Main logging control - master switch (when false, all logging is disabled)
  ENABLE_FRONTEND_LOGGING: true, // Frontend logging (ignored when ENABLE_LOGGING = false)
  ENABLE_BACKEND_LOGGING: true, // Backend logging (ignored when ENABLE_LOGGING = false)
  ENABLE_UPLOAD_LOGGING: true, // File upload logging (ignored when ENABLE_LOGGING = false)
  ENABLE_DATABASE_LOGGING: true, // Database operations (ignored when ENABLE_LOGGING = false)
  ENABLE_AUTH_LOGGING: true, // Authentication (ignored when ENABLE_LOGGING = false)
  ENABLE_ASSET_LOGGING: true, // S3 asset processing (ignored when ENABLE_LOGGING = false)
  ENABLE_S3_LOGGING: true, // S3 operations (ignored when ENABLE_LOGGING = false)
  ENABLE_ICP_UPLOAD_LOGGING: true, // ICP upload logging (ignored when ENABLE_LOGGING = false)
  ENABLE_DASHBOARD_LOGGING: true, // Dashboard UI (ignored when ENABLE_LOGGING = false)
  ENABLE_MEMORY_PROCESSING_LOGGING: true, // Memory processing pipeline (ignored when ENABLE_LOGGING = false)
  ENABLE_RENDERING_LOGGING: true, // React rendering (ignored when ENABLE_LOGGING = false)
  ENABLE_API_RESPONSE_LOGGING: true, // API responses (ignored when ENABLE_LOGGING = false)
  ENABLE_FOLDER_GROUPING_LOGGING: true, // Folder grouping (ignored when ENABLE_LOGGING = false)
  ENABLE_MEMORY_GRID_LOGGING: true, // Memory grid (ignored when ENABLE_LOGGING = false)
  ENABLE_USE_EFFECT_LOGGING: true, // React useEffect (ignored when ENABLE_LOGGING = false)
  ENABLE_HOSTING_PREFERENCES: true, // Hosting preferences (ignored when ENABLE_LOGGING = false)
} as const;

// Tag configuration
export const ENABLED_TAGS: string[] = []; // Tags enabled by default (empty = all enabled)
export const EXCLUDED_TAGS: string[] = []; // Tags explicitly disabled

// ============================================================================
// QUICK SWITCHES (Optional - for easy toggling)
// ============================================================================

// Uncomment one of these to quickly switch logging modes:

// 🔧 DEBUG MODE - Enable all logging
// export const ENABLE_LOGGING = true;
// export const ENABLE_FRONTEND_LOGGING = true;
// export const ENABLE_BACKEND_LOGGING = true;
// export const ENABLE_UPLOAD_LOGGING = true;
// export const ENABLE_DATABASE_LOGGING = true;
// export const ENABLE_AUTH_LOGGING = true;
// export const ENABLE_ASSET_LOGGING = true;
// export const ENABLE_S3_LOGGING = true;
// export const ENABLE_ICP_UPLOAD_LOGGING = true;
// export const ENABLE_DASHBOARD_LOGGING = true;
// export const ENABLE_MEMORY_PROCESSING_LOGGING = true;
// export const ENABLE_RENDERING_LOGGING = true;
// export const ENABLE_API_RESPONSE_LOGGING = true;
// export const ENABLE_FOLDER_GROUPING_LOGGING = true;
// export const ENABLE_MEMORY_GRID_LOGGING = true;
// export const ENABLE_USE_EFFECT_LOGGING = true;
// export const ENABLE_HOSTING_PREFERENCES = true;

// 🚀 PRODUCTION MODE - Disable all logging
// export const ENABLE_LOGGING = false;
// export const ENABLE_FRONTEND_LOGGING = false;
// export const ENABLE_BACKEND_LOGGING = false;
// export const ENABLE_UPLOAD_LOGGING = false;
// export const ENABLE_DATABASE_LOGGING = false;
// export const ENABLE_AUTH_LOGGING = false;
// export const ENABLE_ASSET_LOGGING = false;
// export const ENABLE_S3_LOGGING = false;
// export const ENABLE_ICP_UPLOAD_LOGGING = false;
// export const ENABLE_DASHBOARD_LOGGING = false;
// export const ENABLE_MEMORY_PROCESSING_LOGGING = false;
// export const ENABLE_RENDERING_LOGGING = false;
// export const ENABLE_API_RESPONSE_LOGGING = false;
// export const ENABLE_FOLDER_GROUPING_LOGGING = false;
// export const ENABLE_MEMORY_GRID_LOGGING = false;
// export const ENABLE_USE_EFFECT_LOGGING = false;
// export const ENABLE_HOSTING_PREFERENCES = false;

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * 🎯 SIMPLE USAGE:
 *
 * To disable ALL logging:
 * Set ENABLE_LOGGING = false
 *
 * To enable only backend logging:
 * Set ENABLE_LOGGING = true, ENABLE_BACKEND_LOGGING = true, ENABLE_FRONTEND_LOGGING = false
 *
 * To enable only S3 and API logging:
 * Set ENABLE_LOGGING = true, ENABLE_S3_LOGGING = true, ENABLE_API_RESPONSE_LOGGING = true
 * Set all other service flags to false
 *
 * 🔧 QUICK SWITCHES:
 * Uncomment the DEBUG MODE or PRODUCTION MODE sections above for easy switching
 */
