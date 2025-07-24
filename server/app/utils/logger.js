/**
 * Server-side logging utility
 * Provides structured logging with different output formats and destinations
 */

const fs = require('fs');
const path = require('path');
const util = require('util');

// Log levels
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
};

// Get log level from environment or default to INFO
const LOG_LEVEL = process.env.LOG_LEVEL 
  ? (LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] || LOG_LEVELS.INFO)
  : LOG_LEVELS.INFO;

// Log to file configuration
const LOG_TO_FILE = process.env.LOG_TO_FILE === 'true';
const LOG_FILE_PATH = process.env.LOG_FILE_PATH || './logs/app.log';
const ERROR_LOG_FILE_PATH = process.env.ERROR_LOG_FILE_PATH || './logs/error.log';

// Ensure log directory exists
if (LOG_TO_FILE) {
  const logDir = path.dirname(LOG_FILE_PATH);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

/**
 * Format log message with timestamp and level
 * @param {string} level Log level
 * @param {string} message Log message
 * @param {object} meta Additional metadata
 * @returns {string} Formatted log message
 */
function formatLogMessage(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const metaString = Object.keys(meta).length > 0
    ? '\n' + util.inspect(meta, { depth: 4, colors: false })
    : '';
  
  return `[${timestamp}] ${level}: ${message}${metaString}`;
}

/**
 * Format log entry as JSON
 * @param {string} level Log level
 * @param {string} message Log message
 * @param {object} meta Additional metadata
 * @returns {string} JSON formatted log entry
 */
function formatLogJson(level, message, meta = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
    app: 'stock-analysis-web-server',
    environment: process.env.NODE_ENV || 'development',
    pid: process.pid
  };
  
  return JSON.stringify(entry);
}

/**
 * Write log to file
 * @param {string} formattedMessage Formatted log message
 * @param {string} level Log level
 */
function writeToFile(formattedMessage, level) {
  if (!LOG_TO_FILE) return;
  
  try {
    // Append to main log file
    fs.appendFileSync(LOG_FILE_PATH, formattedMessage + '\n');
    
    // Also write errors to separate error log
    if (level === 'ERROR') {
      fs.appendFileSync(ERROR_LOG_FILE_PATH, formattedMessage + '\n');
    }
  } catch (err) {
    console.error('Failed to write to log file:', err);
  }
}

/**
 * Log message with specified level
 * @param {string} level Log level
 * @param {string} message Log message
 * @param {object} meta Additional metadata
 */
function log(level, message, meta = {}) {
  const levelValue = LOG_LEVELS[level];
  
  // Skip if below configured log level
  if (levelValue < LOG_LEVEL) {
    return;
  }
  
  // Format log message
  const formattedMessage = formatLogMessage(level, message, meta);
  const jsonMessage = formatLogJson(level, message, meta);
  
  // Output to console
  switch (level) {
    case 'DEBUG':
      console.debug(formattedMessage);
      break;
    case 'INFO':
      console.info(formattedMessage);
      break;
    case 'WARN':
      console.warn(formattedMessage);
      break;
    case 'ERROR':
      console.error(formattedMessage);
      break;
  }
  
  // Write to file
  writeToFile(jsonMessage, level);
}

/**
 * Debug level log
 * @param {string} message Log message
 * @param {object} meta Additional metadata
 */
function debug(message, meta = {}) {
  log('DEBUG', message, meta);
}

/**
 * Info level log
 * @param {string} message Log message
 * @param {object} meta Additional metadata
 */
function info(message, meta = {}) {
  log('INFO', message, meta);
}

/**
 * Warning level log
 * @param {string} message Log message
 * @param {object} meta Additional metadata
 */
function warn(message, meta = {}) {
  log('WARN', message, meta);
}

/**
 * Error level log
 * @param {string} message Log message
 * @param {object} meta Additional metadata
 */
function error(message, meta = {}) {
  log('ERROR', message, meta);
}

/**
 * Log error object with stack trace
 * @param {Error} err Error object
 * @param {string} context Error context
 * @param {object} additionalData Additional data
 */
function logError(err, context = '', additionalData = {}) {
  error(
    `${context ? `[${context}] ` : ''}${err.message}`,
    {
      name: err.name,
      stack: err.stack,
      ...additionalData
    }
  );
}

/**
 * Create request logger middleware
 * @returns {Function} Express middleware function
 */
function requestLogger() {
  return (req, res, next) => {
    const startTime = Date.now();
    
    // Log request
    debug(`${req.method} ${req.url}`, {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    // Log response when finished
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const level = res.statusCode >= 400 ? 'WARN' : 'INFO';
      
      log(level, `${req.method} ${req.url} ${res.statusCode} ${duration}ms`, {
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration,
        contentLength: res.get('Content-Length')
      });
    });
    
    next();
  };
}

/**
 * Create error logger middleware
 * @returns {Function} Express error middleware function
 */
function errorLogger() {
  return (err, req, res, next) => {
    logError(err, 'RequestError', {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    next(err);
  };
}

module.exports = {
  debug,
  info,
  warn,
  error,
  logError,
  requestLogger,
  errorLogger,
  LOG_LEVELS
};