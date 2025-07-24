/**
 * Error Tracking Service
 * Provides centralized error handling and reporting
 */

import axios from 'axios';
import logger from '../utils/logger';
import config from '../utils/config';

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Error context interface
export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  url?: string;
  additionalData?: Record<string, any>;
}

// Error tracking configuration
const ENABLE_ERROR_TRACKING = config.getEnvConfig(
  false,  // Development
  true,   // Staging
  true    // Production
);

const ERROR_TRACKING_URL = config.getConfig('ERROR_TRACKING_URL', '');
const ERROR_SAMPLE_RATE = parseFloat(config.getConfig('ERROR_SAMPLE_RATE', '1.0'));
const API_URL = `${config.API_URL}${config.API_PREFIX}/monitoring`;

/**
 * Track an error with the error tracking service
 * @param error Error object
 * @param severity Error severity
 * @param context Additional context
 */
export function trackError(
  error: Error | string,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  context: ErrorContext = {}
): void {
  // Create error object if string was provided
  const errorObj = typeof error === 'string' ? new Error(error) : error;
  
  // Log the error locally
  logger.error(
    errorObj.message,
    context.component || 'ErrorTracking',
    {
      name: errorObj.name,
      stack: errorObj.stack,
      severity,
      ...context
    }
  );
  
  // Skip remote reporting based on configuration and sampling
  if (!ENABLE_ERROR_TRACKING || Math.random() > ERROR_SAMPLE_RATE) {
    return;
  }
  
  // Prepare error report
  const errorReport = {
    name: errorObj.name,
    message: errorObj.message,
    stack: errorObj.stack,
    severity,
    timestamp: new Date().toISOString(),
    app: 'stock-analysis-web',
    version: config.APP_VERSION,
    environment: config.APP_MODE,
    userAgent: navigator.userAgent,
    url: context.url || window.location.href,
    ...context
  };
  
  // Send to error tracking service
  if (ERROR_TRACKING_URL) {
    try {
      fetch(ERROR_TRACKING_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorReport),
        // Use keepalive to ensure the request completes even if page is unloading
        keepalive: true
      }).catch(() => {
        // Silent fail for error reporting
      });
    } catch (e) {
      // Ignore errors in error reporting
    }
  }
}

/**
 * Create a global error handler
 */
export function setupGlobalErrorHandling(): void {
  // Handle uncaught exceptions
  window.addEventListener('error', (event) => {
    trackError(
      event.error || new Error(event.message),
      ErrorSeverity.HIGH,
      {
        action: 'uncaught_exception',
        url: event.filename,
        additionalData: {
          lineno: event.lineno,
          colno: event.colno
        }
      }
    );
    
    // Don't prevent default error handling
    return false;
  });
  
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    let error: Error;
    
    if (event.reason instanceof Error) {
      error = event.reason;
    } else if (typeof event.reason === 'string') {
      error = new Error(event.reason);
    } else {
      try {
        error = new Error(JSON.stringify(event.reason));
      } catch {
        error = new Error('Unknown promise rejection');
      }
    }
    
    trackError(
      error,
      ErrorSeverity.MEDIUM,
      {
        action: 'unhandled_rejection',
        additionalData: { reason: event.reason }
      }
    );
    
    // Don't prevent default error handling
    return false;
  });
  
  logger.info('Global error handling initialized', 'ErrorTracking');
}

/**
 * Get errors from the error tracking service
 * @param filters Error filters
 * @returns Error data
 */
async function getErrors(filters: Record<string, any> = {}) {
  try {
    const response = await axios.get(`${API_URL}/errors`, {
      params: filters
    });
    
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch errors', 'ErrorTrackingService', error);
    
    // Return local errors as fallback
    return getLocalErrors(filters);
  }
}

/**
 * Get local errors from the logger
 * @param filters Error filters
 * @returns Local error data
 */
function getLocalErrors(filters: Record<string, any> = {}) {
  // Get logs from logger
  const logs = logger.getLogs().filter(log => log.level === 'ERROR');
  
  // Format logs as errors
  return logs.map(log => ({
    timestamp: log.timestamp,
    severity: log.details?.severity || ErrorSeverity.MEDIUM,
    component: log.module || 'Unknown',
    message: log.message,
    name: log.details?.name || 'Error',
    stack: log.details?.stack || '',
    url: log.details?.url || window.location.href,
    userAgent: navigator.userAgent
  }));
}

// Export default error tracking service
export default {
  trackError,
  setupGlobalErrorHandling,
  getErrors,
  ErrorSeverity
};