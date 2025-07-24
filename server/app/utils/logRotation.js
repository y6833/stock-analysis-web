/**
 * Log rotation utility
 * Handles log file rotation to prevent excessive log file sizes
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const logger = require('./logger');

// Configuration
const MAX_LOG_SIZE = parseInt(process.env.MAX_LOG_SIZE || '10485760', 10); // 10MB default
const MAX_LOG_FILES = parseInt(process.env.MAX_LOG_FILES || '10', 10);
const LOG_CHECK_INTERVAL = parseInt(process.env.LOG_CHECK_INTERVAL || '3600000', 10); // 1 hour default

/**
 * Check if a file exists
 * @param {string} filePath File path
 * @returns {boolean} True if file exists
 */
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (err) {
    return false;
  }
}

/**
 * Get file size in bytes
 * @param {string} filePath File path
 * @returns {number} File size in bytes
 */
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (err) {
    return 0;
  }
}

/**
 * Compress a log file
 * @param {string} source Source file path
 * @param {string} destination Destination file path
 * @returns {Promise<boolean>} True if successful
 */
async function compressFile(source, destination) {
  return new Promise((resolve) => {
    try {
      const gzip = zlib.createGzip();
      const sourceStream = fs.createReadStream(source);
      const destinationStream = fs.createWriteStream(destination);
      
      sourceStream
        .pipe(gzip)
        .pipe(destinationStream)
        .on('finish', () => {
          // Delete the original file after successful compression
          try {
            fs.unlinkSync(source);
            resolve(true);
          } catch (err) {
            logger.error(`Failed to delete original log file: ${source}`, { error: err.message });
            resolve(false);
          }
        })
        .on('error', (err) => {
          logger.error(`Failed to compress log file: ${source}`, { error: err.message });
          resolve(false);
        });
    } catch (err) {
      logger.error(`Error setting up compression for: ${source}`, { error: err.message });
      resolve(false);
    }
  });
}

/**
 * Rotate a log file if it exceeds the maximum size
 * @param {string} logFilePath Log file path
 */
async function rotateLogIfNeeded(logFilePath) {
  if (!fileExists(logFilePath)) {
    return;
  }
  
  const fileSize = getFileSize(logFilePath);
  
  if (fileSize < MAX_LOG_SIZE) {
    return;
  }
  
  logger.info(`Rotating log file: ${logFilePath} (size: ${fileSize} bytes)`);
  
  const dirName = path.dirname(logFilePath);
  const baseName = path.basename(logFilePath);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const rotatedFilePath = path.join(dirName, `${baseName}.${timestamp}`);
  
  try {
    // Rename current log file
    fs.renameSync(logFilePath, rotatedFilePath);
    
    // Create a new empty log file
    fs.writeFileSync(logFilePath, '');
    
    // Compress the rotated file
    await compressFile(rotatedFilePath, `${rotatedFilePath}.gz`);
    
    // Clean up old log files
    cleanupOldLogs(dirName, baseName);
    
    logger.info(`Log rotation completed: ${logFilePath}`);
  } catch (err) {
    logger.error(`Failed to rotate log file: ${logFilePath}`, { error: err.message });
  }
}

/**
 * Clean up old log files, keeping only the most recent ones
 * @param {string} dirName Directory name
 * @param {string} baseName Base file name
 */
function cleanupOldLogs(dirName, baseName) {
  try {
    // Get all rotated log files
    const files = fs.readdirSync(dirName)
      .filter(file => file.startsWith(baseName) && file !== baseName && file.endsWith('.gz'))
      .map(file => ({
        name: file,
        path: path.join(dirName, file),
        time: fs.statSync(path.join(dirName, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time); // Sort by modification time, newest first
    
    // Delete old files beyond the limit
    if (files.length > MAX_LOG_FILES) {
      const filesToDelete = files.slice(MAX_LOG_FILES);
      
      filesToDelete.forEach(file => {
        try {
          fs.unlinkSync(file.path);
          logger.debug(`Deleted old log file: ${file.name}`);
        } catch (err) {
          logger.warn(`Failed to delete old log file: ${file.name}`, { error: err.message });
        }
      });
    }
  } catch (err) {
    logger.error(`Failed to clean up old log files in ${dirName}`, { error: err.message });
  }
}

/**
 * Start log rotation service
 * @param {string[]} logFilePaths Array of log file paths to monitor
 */
function startLogRotation(logFilePaths) {
  if (!Array.isArray(logFilePaths) || logFilePaths.length === 0) {
    logger.warn('No log files specified for rotation');
    return;
  }
  
  logger.info(`Starting log rotation service for ${logFilePaths.length} files`);
  
  // Initial check
  logFilePaths.forEach(async (logFilePath) => {
    await rotateLogIfNeeded(logFilePath);
  });
  
  // Set up interval for regular checks
  setInterval(() => {
    logFilePaths.forEach(async (logFilePath) => {
      await rotateLogIfNeeded(logFilePath);
    });
  }, LOG_CHECK_INTERVAL);
}

module.exports = {
  rotateLogIfNeeded,
  startLogRotation
};