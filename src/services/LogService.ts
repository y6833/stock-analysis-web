/**
 * Log Service
 * Provides methods for retrieving and managing logs
 */

import axios from 'axios';
import config from '../utils/config';
import logger from '../utils/logger';
import { saveAs } from 'file-saver';

// API endpoint for logs
const API_URL = `${config.API_URL}${config.API_PREFIX}/monitoring`;

/**
 * Get logs from the server
 * @param filters Log filters
 * @returns Log data
 */
async function getLogs(filters: Record<string, any> = {}) {
  try {
    const response = await axios.get(`${API_URL}/logs`, {
      params: filters
    });
    
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch logs', 'LogService', error);
    
    // Return local logs as fallback
    return getLocalLogs(filters);
  }
}

/**
 * Download logs as a file
 * @param filters Log filters
 */
async function downloadLogs(filters: Record<string, any> = {}) {
  try {
    const response = await axios.get(`${API_URL}/logs/download`, {
      params: filters,
      responseType: 'blob'
    });
    
    // Generate filename with current date
    const date = new Date().toISOString().split('T')[0];
    const filename = `logs-${date}.json`;
    
    // Save file
    saveAs(new Blob([response.data]), filename);
  } catch (error) {
    logger.error('Failed to download logs', 'LogService', error);
    
    // Fallback to downloading local logs
    downloadLocalLogs(filters);
  }
}

/**
 * Get local logs from the logger
 * @param filters Log filters
 * @returns Local log data
 */
function getLocalLogs(filters: Record<string, any> = {}) {
  // Get logs from logger
  let logs = logger.getLogs();
  
  // Apply filters
  if (filters.level) {
    logs = logs.filter(log => log.level === filters.level);
  }
  
  if (filters.module) {
    logs = logs.filter(log => log.module === filters.module);
  }
  
  if (filters.query) {
    const query = filters.query.toLowerCase();
    logs = logs.filter(log => 
      log.message.toLowerCase().includes(query) || 
      (log.details && JSON.stringify(log.details).toLowerCase().includes(query))
    );
  }
  
  if (filters.startDate) {
    const startDate = new Date(filters.startDate);
    logs = logs.filter(log => new Date(log.timestamp) >= startDate);
  }
  
  if (filters.endDate) {
    const endDate = new Date(filters.endDate);
    logs = logs.filter(log => new Date(log.timestamp) <= endDate);
  }
  
  return logs;
}

/**
 * Download local logs as a file
 * @param filters Log filters
 */
function downloadLocalLogs(filters: Record<string, any> = {}) {
  // Get filtered logs
  const logs = getLocalLogs(filters);
  
  // Convert to JSON
  const logsJson = JSON.stringify(logs, null, 2);
  
  // Generate filename with current date
  const date = new Date().toISOString().split('T')[0];
  const filename = `local-logs-${date}.json`;
  
  // Create blob and save
  const blob = new Blob([logsJson], { type: 'application/json' });
  saveAs(blob, filename);
}

export default {
  getLogs,
  downloadLogs
};