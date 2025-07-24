/**
 * Configuration utility for managing environment-specific settings
 */

// Environment information
export const APP_VERSION = __APP_VERSION__;
export const APP_MODE = __APP_MODE__;
export const BUILD_TIME = __BUILD_TIME__;

// API configuration
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:7001';
export const API_PREFIX = import.meta.env.VITE_API_PREFIX || '/api/v1';

// Feature flags
export const ENABLE_MOCK_DATA = import.meta.env.VITE_ENABLE_MOCK_DATA === 'true';
export const ENABLE_DEBUG_TOOLS = import.meta.env.VITE_ENABLE_DEBUG_TOOLS === 'true';
export const ENABLE_PERFORMANCE_MONITORING = import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING === 'true';

// UI configuration
export const DEFAULT_THEME = import.meta.env.VITE_DEFAULT_THEME || 'light';
export const ENABLE_ANIMATIONS = import.meta.env.VITE_ENABLE_ANIMATIONS !== 'false';

// Analytics
export const ENABLE_ANALYTICS = import.meta.env.VITE_ENABLE_ANALYTICS === 'true';
export const ANALYTICS_ID = import.meta.env.VITE_ANALYTICS_ID || '';

// Environment detection helpers
export const isDevelopment = APP_MODE === 'development';
export const isStaging = APP_MODE === 'staging';
export const isProduction = APP_MODE === 'production';

/**
 * Get configuration value with environment-specific override
 * @param key Configuration key
 * @param defaultValue Default value if not found
 * @returns Configuration value
 */
export function getConfig<T>(key: string, defaultValue: T): T {
  const envKey = `VITE_${key.toUpperCase()}`;
  return (import.meta.env[envKey] as unknown as T) || defaultValue;
}

/**
 * Get environment-specific configuration
 * @param devValue Development value
 * @param stagingValue Staging value
 * @param prodValue Production value
 * @returns Environment-specific value
 */
export function getEnvConfig<T>(devValue: T, stagingValue: T, prodValue: T): T {
  if (isProduction) return prodValue;
  if (isStaging) return stagingValue;
  return devValue;
}

/**
 * Log application configuration (only in development)
 */
export function logConfig(): void {
  if (isDevelopment) {
    console.log('Application Configuration:');
    console.log(`- Version: ${APP_VERSION}`);
    console.log(`- Mode: ${APP_MODE}`);
    console.log(`- Build Time: ${BUILD_TIME}`);
    console.log(`- API URL: ${API_URL}`);
    console.log(`- Mock Data: ${ENABLE_MOCK_DATA}`);
    console.log(`- Debug Tools: ${ENABLE_DEBUG_TOOLS}`);
    console.log(`- Performance Monitoring: ${ENABLE_PERFORMANCE_MONITORING}`);
  }
}

// Export default configuration object
export default {
  APP_VERSION,
  APP_MODE,
  BUILD_TIME,
  API_URL,
  API_PREFIX,
  ENABLE_MOCK_DATA,
  ENABLE_DEBUG_TOOLS,
  ENABLE_PERFORMANCE_MONITORING,
  DEFAULT_THEME,
  ENABLE_ANIMATIONS,
  ENABLE_ANALYTICS,
  ANALYTICS_ID,
  isDevelopment,
  isStaging,
  isProduction,
  getConfig,
  getEnvConfig,
  logConfig
};