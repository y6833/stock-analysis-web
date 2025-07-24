/**
 * Monitoring Service
 * Handles monitoring, metrics, and logging functionality
 */

const BaseService = require('../core/BaseService');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const logger = require('../utils/logger');
const performance = require('../utils/performance');

class MonitoringService extends BaseService {
  /**
   * Get performance metrics
   * @param {Object} options Query options
   * @returns {Array} Performance metrics
   */
  async getMetrics(options) {
    const { type, startTime, endTime, limit } = options;
    
    try {
      // Get metrics from database
      const metrics = await this.app.mysql.select('performance_metrics', {
        where: {
          type,
          ...(startTime ? { timestamp: { $gte: new Date(startTime) } } : {}),
          ...(endTime ? { timestamp: { $lte: new Date(endTime) } } : {})
        },
        orders: [['timestamp', 'desc']],
        limit: limit || 100
      });
      
      return metrics.map(metric => ({
        timestamp: metric.timestamp,
        value: metric.value,
        tags: JSON.parse(metric.tags || '{}')
      }));
    } catch (error) {
      logger.error('Failed to get metrics from database', { error, options });
      
      // Return mock data as fallback
      return this.getMockMetrics(type, limit || 100);
    }
  }
  
  /**
   * Get system metrics
   * @param {Object} options Query options
   * @returns {Array} System metrics
   */
  async getSystemMetrics(options) {
    const { startTime, endTime, limit } = options;
    
    try {
      // Get metrics from database
      const metrics = await this.app.mysql.select('system_metrics', {
        where: {
          ...(startTime ? { timestamp: { $gte: new Date(startTime) } } : {}),
          ...(endTime ? { timestamp: { $lte: new Date(endTime) } } : {})
        },
        orders: [['timestamp', 'desc']],
        limit: limit || 24
      });
      
      return metrics.map(metric => ({
        timestamp: metric.timestamp,
        value: metric.memory_used,
        cpu: metric.cpu_load,
        memory: {
          total: metric.memory_total,
          used: metric.memory_used,
          free: metric.memory_free
        }
      }));
    } catch (error) {
      logger.error('Failed to get system metrics from database', { error, options });
      
      // Return mock data as fallback
      return this.getMockSystemMetrics(limit || 24);
    }
  }
  
  /**
   * Get error logs
   * @param {Object} options Query options
   * @returns {Array} Error logs
   */
  async getErrors(options) {
    const { severity, component, startDate, endDate, limit } = options;
    
    try {
      // Get errors from database
      const errors = await this.app.mysql.select('error_logs', {
        where: {
          ...(severity ? { severity } : {}),
          ...(component ? { component } : {}),
          ...(startDate ? { timestamp: { $gte: new Date(startDate) } } : {}),
          ...(endDate ? { timestamp: { $lte: new Date(endDate) } } : {})
        },
        orders: [['timestamp', 'desc']],
        limit: limit || 100
      });
      
      return errors.map(error => ({
        id: error.id,
        timestamp: error.timestamp,
        severity: error.severity,
        component: error.component,
        message: error.message,
        name: error.name,
        stack: error.stack,
        url: error.url,
        userAgent: error.user_agent,
        additionalData: JSON.parse(error.additional_data || '{}')
      }));
    } catch (error) {
      logger.error('Failed to get errors from database', { error, options });
      
      // Return errors from log file as fallback
      return this.getErrorsFromLogFile(options);
    }
  }
  
  /**
   * Get application logs
   * @param {Object} options Query options
   * @returns {Array} Application logs
   */
  async getLogs(options) {
    const { level, module, query, startDate, endDate, limit } = options;
    
    try {
      // Get logs from database
      const logs = await this.app.mysql.select('application_logs', {
        where: {
          ...(level ? { level } : {}),
          ...(module ? { module } : {}),
          ...(query ? { message: { $like: `%${query}%` } } : {}),
          ...(startDate ? { timestamp: { $gte: new Date(startDate) } } : {}),
          ...(endDate ? { timestamp: { $lte: new Date(endDate) } } : {})
        },
        orders: [['timestamp', 'desc']],
        limit: limit || 100
      });
      
      return logs.map(log => ({
        id: log.id,
        timestamp: log.timestamp,
        level: log.level,
        module: log.module,
        message: log.message,
        details: JSON.parse(log.details || '{}')
      }));
    } catch (error) {
      logger.error('Failed to get logs from database', { error, options });
      
      // Return logs from log file as fallback
      return this.getLogsFromLogFile(options);
    }
  }
  
  /**
   * Track client-side error
   * @param {Object} errorData Error data
   */
  async trackError(errorData) {
    try {
      // Log the error
      logger.error(`Client error: ${errorData.message}`, {
        name: errorData.name,
        stack: errorData.stack,
        component: errorData.component,
        severity: errorData.severity,
        url: errorData.url,
        userAgent: errorData.userAgent
      });
      
      // Store in database
      await this.app.mysql.insert('error_logs', {
        timestamp: new Date(),
        severity: errorData.severity || 'medium',
        component: errorData.component || 'client',
        message: errorData.message,
        name: errorData.name,
        stack: errorData.stack,
        url: errorData.url,
        user_agent: errorData.userAgent,
        additional_data: JSON.stringify(errorData.additionalData || {})
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to track client error', { error, errorData });
      return false;
    }
  }
  
  /**
   * Track client-side performance metric
   * @param {Object} metricData Metric data
   */
  async trackMetric(metricData) {
    try {
      // Store in database
      await this.app.mysql.insert('performance_metrics', {
        timestamp: new Date(),
        type: metricData.name,
        value: metricData.duration || 0,
        tags: JSON.stringify(metricData.tags || {})
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to track client metric', { error, metricData });
      return false;
    }
  }
  
  /**
   * Get mock metrics data
   * @param {string} type Metric type
   * @param {number} count Number of data points
   * @returns {Array} Mock metrics
   */
  getMockMetrics(type, count) {
    const now = Date.now();
    const result = [];
    
    // Generate mock data
    for (let i = 0; i < count; i++) {
      const timestamp = new Date(now - (count - i) * 60000).toISOString();
      let value;
      
      // Generate different values based on type
      if (type === 'api.response') {
        value = Math.floor(Math.random() * 200) + 50; // 50-250ms
      } else if (type === 'page.load') {
        value = Math.floor(Math.random() * 500) + 200; // 200-700ms
      } else {
        value = Math.floor(Math.random() * 100) + 10; // 10-110ms
      }
      
      result.push({
        timestamp,
        value,
        tags: { type }
      });
    }
    
    return result;
  }
  
  /**
   * Get mock system metrics
   * @param {number} count Number of data points
   * @returns {Array} Mock system metrics
   */
  getMockSystemMetrics(count) {
    const now = Date.now();
    const result = [];
    
    // Generate mock data
    for (let i = 0; i < count; i++) {
      const timestamp = new Date(now - (count - i) * 3600000).toISOString();
      const memoryUsed = Math.floor(Math.random() * 100) + 200; // 200-300 MB
      
      result.push({
        timestamp,
        value: memoryUsed,
        cpu: Math.random() * 2 + 1, // 1-3 load average
        memory: {
          total: 1024,
          used: memoryUsed,
          free: 1024 - memoryUsed
        }
      });
    }
    
    return result;
  }
  
  /**
   * Get errors from log file
   * @param {Object} options Query options
   * @returns {Array} Error logs
   */
  async getErrorsFromLogFile(options) {
    const { severity, component, startDate, endDate, limit } = options;
    const logFilePath = process.env.ERROR_LOG_FILE_PATH || './logs/error.log';
    
    try {
      if (!fs.existsSync(logFilePath)) {
        return [];
      }
      
      const errors = [];
      const startTime = startDate ? new Date(startDate).getTime() : 0;
      const endTime = endDate ? new Date(endDate).getTime() : Date.now();
      
      // Read log file line by line
      const fileStream = fs.createReadStream(logFilePath);
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
      });
      
      for await (const line of rl) {
        try {
          const logEntry = JSON.parse(line);
          
          // Check if it's an error and matches filters
          if (
            logEntry.level === 'ERROR' &&
            (!severity || logEntry.severity === severity) &&
            (!component || logEntry.component === component)
          ) {
            const timestamp = new Date(logEntry.timestamp).getTime();
            
            // Check date range
            if (timestamp >= startTime && timestamp <= endTime) {
              errors.push({
                timestamp: logEntry.timestamp,
                severity: logEntry.severity || 'medium',
                component: logEntry.component || 'unknown',
                message: logEntry.message,
                name: logEntry.name || 'Error',
                stack: logEntry.stack || '',
                url: logEntry.url || '',
                userAgent: logEntry.userAgent || ''
              });
              
              // Check limit
              if (limit && errors.length >= limit) {
                break;
              }
            }
          }
        } catch (error) {
          // Skip invalid JSON lines
          continue;
        }
      }
      
      return errors;
    } catch (error) {
      logger.error('Failed to read error log file', { error, logFilePath });
      return [];
    }
  }
  
  /**
   * Get logs from log file
   * @param {Object} options Query options
   * @returns {Array} Application logs
   */
  async getLogsFromLogFile(options) {
    const { level, module, query, startDate, endDate, limit } = options;
    const logFilePath = process.env.LOG_FILE_PATH || './logs/app.log';
    
    try {
      if (!fs.existsSync(logFilePath)) {
        return [];
      }
      
      const logs = [];
      const startTime = startDate ? new Date(startDate).getTime() : 0;
      const endTime = endDate ? new Date(endDate).getTime() : Date.now();
      const searchQuery = query ? query.toLowerCase() : null;
      
      // Read log file line by line
      const fileStream = fs.createReadStream(logFilePath);
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
      });
      
      for await (const line of rl) {
        try {
          const logEntry = JSON.parse(line);
          
          // Check if it matches filters
          if (
            (!level || logEntry.level === level) &&
            (!module || logEntry.module === module) &&
            (!searchQuery || 
              logEntry.message.toLowerCase().includes(searchQuery) || 
              JSON.stringify(logEntry.details || {}).toLowerCase().includes(searchQuery))
          ) {
            const timestamp = new Date(logEntry.timestamp).getTime();
            
            // Check date range
            if (timestamp >= startTime && timestamp <= endTime) {
              logs.push({
                timestamp: logEntry.timestamp,
                level: logEntry.level,
                module: logEntry.module || '',
                message: logEntry.message,
                details: logEntry.details || {}
              });
              
              // Check limit
              if (limit && logs.length >= limit) {
                break;
              }
            }
          }
        } catch (error) {
          // Skip invalid JSON lines
          continue;
        }
      }
      
      return logs;
    } catch (error) {
      logger.error('Failed to read log file', { error, logFilePath });
      return [];
    }
  }
}

module.exports = MonitoringService;