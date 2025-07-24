/**
 * Performance monitoring utility
 * Provides tools for measuring and tracking application performance
 */

import logger from './logger';
import config from './config';

// Performance metrics storage
interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  tags: Record<string, string>;
}

// Store metrics in memory
const metrics: PerformanceMetric[] = [];
const MAX_METRICS = 1000;

// Performance monitoring configuration
const ENABLE_MONITORING = config.ENABLE_PERFORMANCE_MONITORING;
const SAMPLE_RATE = parseFloat(config.getConfig('PERFORMANCE_SAMPLE_RATE', '1.0'));

// Check if this request should be sampled based on sample rate
function shouldSample(): boolean {
  return ENABLE_MONITORING && Math.random() < SAMPLE_RATE;
}

/**
 * Start timing a performance metric
 * @param name Metric name
 * @param tags Additional tags for the metric
 * @returns Metric ID for stopping the timer
 */
export function startTimer(name: string, tags: Record<string, string> = {}): string {
  if (!shouldSample()) {
    return ''; // Skip if not sampling
  }
  
  const id = `${name}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const metric: PerformanceMetric = {
    name,
    startTime: performance.now(),
    tags: {
      ...tags,
      id
    }
  };
  
  // Manage metrics array size
  if (metrics.length >= MAX_METRICS) {
    metrics.shift(); // Remove oldest metric
  }
  
  metrics.push(metric);
  return id;
}

/**
 * Stop timing a performance metric
 * @param id Metric ID from startTimer
 * @returns Duration in milliseconds, or undefined if metric not found
 */
export function stopTimer(id: string): number | undefined {
  if (!id) return undefined;
  
  const metric = metrics.find(m => m.tags.id === id);
  if (!metric) return undefined;
  
  metric.endTime = performance.now();
  metric.duration = metric.endTime - metric.startTime;
  
  // Log slow operations
  const slowThreshold = getSlowThreshold(metric.name);
  if (metric.duration > slowThreshold) {
    logger.warn(
      `Slow operation detected: ${metric.name} took ${metric.duration.toFixed(2)}ms`,
      'Performance',
      { metric }
    );
  }
  
  // Report metric to monitoring service
  reportMetric(metric);
  
  return metric.duration;
}

/**
 * Measure execution time of a function
 * @param name Metric name
 * @param fn Function to measure
 * @param tags Additional tags
 * @returns Function result
 */
export async function measure<T>(
  name: string,
  fn: () => Promise<T> | T,
  tags: Record<string, string> = {}
): Promise<T> {
  const id = startTimer(name, tags);
  
  try {
    const result = await fn();
    return result;
  } finally {
    stopTimer(id);
  }
}

/**
 * Get performance metrics
 * @param filter Optional filter function
 * @returns Filtered metrics
 */
export function getMetrics(filter?: (metric: PerformanceMetric) => boolean): PerformanceMetric[] {
  return filter ? metrics.filter(filter) : [...metrics];
}

/**
 * Clear stored metrics
 */
export function clearMetrics(): void {
  metrics.length = 0;
}

/**
 * Get threshold for slow operation warning based on operation type
 */
function getSlowThreshold(name: string): number {
  // Default thresholds for different operation types (in ms)
  if (name.includes('api.')) return 1000;
  if (name.includes('render.')) return 100;
  if (name.includes('calculation.')) return 200;
  if (name.includes('animation.')) return 50;
  return 500; // Default threshold
}

/**
 * Report metric to monitoring service
 */
function reportMetric(metric: PerformanceMetric): void {
  if (!metric.duration) return;
  
  const reportingEnabled = config.getConfig('ENABLE_METRIC_REPORTING', 'false') === 'true';
  const reportingUrl = config.getConfig('METRIC_REPORTING_URL', '');
  
  if (reportingEnabled && reportingUrl) {
    try {
      fetch(reportingUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...metric,
          app: 'stock-analysis-web',
          version: config.APP_VERSION,
          environment: config.APP_MODE,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }),
      }).catch(() => {
        // Silent fail for metric reporting
      });
    } catch (error) {
      // Ignore errors in reporting
    }
  }
  
  // Also report to browser performance API if available
  try {
    if (window.performance && window.performance.mark && window.performance.measure) {
      const startMark = `${metric.name}-start-${metric.tags.id}`;
      const endMark = `${metric.name}-end-${metric.tags.id}`;
      
      window.performance.mark(startMark, { startTime: metric.startTime });
      window.performance.mark(endMark, { startTime: metric.endTime });
      
      window.performance.measure(metric.name, startMark, endMark);
    }
  } catch (error) {
    // Ignore errors in browser API
  }
}

// Export default performance monitoring object
export default {
  startTimer,
  stopTimer,
  measure,
  getMetrics,
  clearMetrics
};