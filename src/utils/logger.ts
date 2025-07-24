/**
 * Centralized logging utility for the application
 * Provides consistent logging with different levels and formats
 */

import config from './config';

// Log levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

// Current log level based on environment
const currentLogLevel = config.getEnvConfig(
  LogLevel.DEBUG, // Development
  LogLevel.INFO,  // Staging
  LogLevel.WARN   // Production
);

// Log entry interface
interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  module?: string;
  details?: any;
}

// Format log entry as JSON string
function formatLogEntry(entry: LogEntry): string {
  return JSON.stringify(entry);
}

// Send log to remote logging service if configured
function sendRemoteLog(entry: LogEntry): void {
  const remoteLoggingEnabled = config.getConfig('ENABLE_REMOTE_LOGGING', 'false') === 'true';
  const remoteLoggingUrl = config.getConfig('REMOTE_LOGGING_URL', '');
  
  if (remoteLoggingEnabled && remoteLoggingUrl && entry.level !== 'DEBUG') {
    // Only send non-debug logs to remote service
    try {
      fetch(remoteLoggingUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...entry,
          app: 'stock-analysis-web',
          version: config.APP_VERSION,
          environment: config.APP_MODE
        }),
      }).catch(err => {
        // Silent fail for logging errors
        console.error('Failed to send remote log:', err);
      });
    } catch (error) {
      // Ignore errors in logging
    }
  }
}

// Store logs in memory for debugging
const inMemoryLogs: LogEntry[] = [];
const MAX_IN_MEMORY_LOGS = 1000;

// Add log to in-memory storage
function addToInMemoryLogs(entry: LogEntry): void {
  if (inMemoryLogs.length >= MAX_IN_MEMORY_LOGS) {
    inMemoryLogs.shift(); // Remove oldest log
  }
  inMemoryLogs.push(entry);
}

// Base logging function
function log(level: LogLevel, message: string, module?: string, details?: any): void {
  if (level < currentLogLevel) {
    return; // Skip logs below current level
  }
  
  const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
  const timestamp = new Date().toISOString();
  
  const entry: LogEntry = {
    timestamp,
    level: levelNames[level],
    message,
    module,
    details
  };
  
  // Log to console with appropriate styling
  const consoleMethod = level === LogLevel.DEBUG ? 'debug' :
                       level === LogLevel.INFO ? 'info' :
                       level === LogLevel.WARN ? 'warn' : 'error';
  
  // Format for console
  const modulePrefix = module ? `[${module}] ` : '';
  console[consoleMethod](`${timestamp} ${levelNames[level]}: ${modulePrefix}${message}`, details || '');
  
  // Add to in-memory logs
  addToInMemoryLogs(entry);
  
  // Send to remote logging service
  sendRemoteLog(entry);
}

// Specific logging methods
export function debug(message: string, module?: string, details?: any): void {
  log(LogLevel.DEBUG, message, module, details);
}

export function info(message: string, module?: string, details?: any): void {
  log(LogLevel.INFO, message, module, details);
}

export function warn(message: string, module?: string, details?: any): void {
  log(LogLevel.WARN, message, module, details);
}

export function error(message: string, module?: string, details?: any): void {
  log(LogLevel.ERROR, message, module, details);
}

// Error tracking with stack traces
export function trackError(err: Error, module?: string, context?: any): void {
  const errorDetails = {
    name: err.name,
    message: err.message,
    stack: err.stack,
    context
  };
  
  error(err.message, module, errorDetails);
}

// Get all in-memory logs (for debugging tools)
export function getLogs(): LogEntry[] {
  return [...inMemoryLogs];
}

// Clear in-memory logs
export function clearLogs(): void {
  inMemoryLogs.length = 0;
}

// Export default logger object
export default {
  debug,
  info,
  warn,
  error,
  trackError,
  getLogs,
  clearLogs,
  LogLevel
};