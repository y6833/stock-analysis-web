/**
 * Performance Service
 * Provides methods for retrieving performance metrics
 */

import axios from 'axios';
import config from '../utils/config';
import logger from '../utils/logger';
import performance from '../utils/performance';

// API endpoint for performance metrics
const API_URL = `${config.API_URL}${config.API_PREFIX}/monitoring`;

/**
 * Get performance metrics by type
 * @param type Metric type
 * @param options Query options
 * @returns Performance metrics data
 */
async function getMetrics(type: string, options: Record<string, any> = {}) {
  try {
    const response = await axios.get(`${API_URL}/metrics`, {
      params: {
        type,
        ...options
      }
    });
    
    return response.data;
  } catch (error) {
    logger.error(`Failed to fetch ${type} metrics`, 'PerformanceService', error);
    
    // Return local metrics as fallback
    return getLocalMetrics(type);
  }
}

/**
 * Get system metrics
 * @param options Query options
 * @returns System metrics data
 */
async function getSystemMetrics(options: Record<string, any> = {}) {
  try {
    const response = await axios.get(`${API_URL}/system`, {
      params: options
    });
    
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch system metrics', 'PerformanceService', error);
    
    // Return mock data as fallback
    return getMockSystemMetrics();
  }
}

/**
 * Get local performance metrics
 * @param type Metric type
 * @returns Local performance metrics
 */
function getLocalMetrics(type: string) {
  const metrics = performance.getMetrics(metric => metric.name.startsWith(type));
  
  // Format metrics for chart display
  return metrics.map(metric => ({
    timestamp: new Date(metric.startTime).toISOString(),
    value: metric.duration || 0,
    tags: metric.tags
  }));
}

/**
 * Get mock system metrics for fallback
 * @returns Mock system metrics
 */
function getMockSystemMetrics() {
  const now = Date.now();
  const result = [];
  
  // Generate mock data for the last 24 hours
  for (let i = 0; i < 24; i++) {
    const timestamp = new Date(now - (23 - i) * 3600000).toISOString();
    result.push({
      timestamp,
      value: Math.floor(Math.random() * 100) + 200 // Random memory usage between 200-300 MB
    });
  }
  
  return result;
}

export default {
  getMetrics,
  getSystemMetrics
};