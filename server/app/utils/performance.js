/**
 * Server-side performance monitoring utility
 * Provides tools for measuring and tracking server performance
 */

const logger = require('./logger');
const os = require('os');

// Performance metrics storage
const metrics = new Map();
const MAX_METRICS = 1000;

// Performance monitoring configuration
const ENABLE_MONITORING = process.env.ENABLE_PERFORMANCE_MONITORING === 'true';
const SAMPLE_RATE = parseFloat(process.env.PERFORMANCE_SAMPLE_RATE || '0.1');

// System metrics collection interval (ms)
const SYSTEM_METRICS_INTERVAL = 60000; // 1 minute

// Check if this request should be sampled based on sample rate
function shouldSample() {
  return ENABLE_MONITORING && Math.random() < SAMPLE_RATE;
}

/**
 * Start timing a performance metric
 * @param {string} name Metric name
 * @param {object} tags Additional tags for the metric
 * @returns {string} Metric ID for stopping the timer
 */
function startTimer(name, tags = {}) {
  if (!shouldSample()) {
    return ''; // Skip if not sampling
  }
  
  const id = `${name}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const metric = {
    name,
    startTime: process.hrtime(),
    tags: {
      ...tags,
      id
    }
  };
  
  // Manage metrics collection size
  if (metrics.size >= MAX_METRICS) {
    // Remove oldest metric
    const firstKey = metrics.keys().next().value;
    metrics.delete(firstKey);
  }
  
  metrics.set(id, metric);
  return id;
}

/**
 * Stop timing a performance metric
 * @param {string} id Metric ID from startTimer
 * @returns {number|undefined} Duration in milliseconds, or undefined if metric not found
 */
function stopTimer(id) {
  if (!id) return undefined;
  
  const metric = metrics.get(id);
  if (!metric) return undefined;
  
  const hrDuration = process.hrtime(metric.startTime);
  const durationMs = (hrDuration[0] * 1000) + (hrDuration[1] / 1000000);
  
  metric.endTime = process.hrtime();
  metric.duration = durationMs;
  
  // Log slow operations
  const slowThreshold = getSlowThreshold(metric.name);
  if (metric.duration > slowThreshold) {
    logger.warn(`Slow operation detected: ${metric.name} took ${metric.duration.toFixed(2)}ms`, {
      metric: {
        name: metric.name,
        duration: metric.duration,
        tags: metric.tags
      }
    });
  }
  
  // Report metric
  reportMetric(metric);
  
  return metric.duration;
}

/**
 * Measure execution time of a function
 * @param {string} name Metric name
 * @param {Function} fn Function to measure
 * @param {object} tags Additional tags
 * @returns {*} Function result
 */
async function measure(name, fn, tags = {}) {
  const id = startTimer(name, tags);
  
  try {
    const result = await fn();
    return result;
  } finally {
    stopTimer(id);
  }
}

/**
 * Create Express middleware for measuring request performance
 * @returns {Function} Express middleware
 */
function performanceMiddleware() {
  return (req, res, next) => {
    const path = req.path || req.url;
    const id = startTimer('http.request', {
      method: req.method,
      path,
      route: req.route ? req.route.path : path
    });
    
    // Track response time
    res.on('finish', () => {
      stopTimer(id);
    });
    
    next();
  };
}

/**
 * Get threshold for slow operation warning based on operation type (in ms)
 * @param {string} name Operation name
 * @returns {number} Threshold in milliseconds
 */
function getSlowThreshold(name) {
  if (name.includes('http.request')) return 1000;
  if (name.includes('db.query')) return 500;
  if (name.includes('redis')) return 100;
  if (name.includes('api.external')) return 2000;
  return 500; // Default threshold
}

/**
 * Report metric to monitoring service or log
 * @param {object} metric Performance metric
 */
function reportMetric(metric) {
  if (!metric.duration) return;
  
  // Log metric
  logger.debug(`Performance metric: ${metric.name} ${metric.duration.toFixed(2)}ms`, {
    metric: {
      name: metric.name,
      duration: metric.duration,
      tags: metric.tags
    }
  });
  
  // Additional reporting logic can be added here
  // For example, sending to a time-series database or monitoring service
}

/**
 * Collect system metrics
 * @returns {object} System metrics
 */
function collectSystemMetrics() {
  const loadAvg = os.loadavg();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsage = process.memoryUsage();
  
  return {
    timestamp: new Date().toISOString(),
    cpu: {
      loadAvg1m: loadAvg[0],
      loadAvg5m: loadAvg[1],
      loadAvg15m: loadAvg[2],
      cores: os.cpus().length
    },
    memory: {
      total: totalMem,
      free: freeMem,
      used: usedMem,
      usedPercent: (usedMem / totalMem) * 100
    },
    process: {
      uptime: process.uptime(),
      rss: memUsage.rss,
      heapTotal: memUsage.heapTotal,
      heapUsed: memUsage.heapUsed,
      external: memUsage.external
    }
  };
}

/**
 * Start collecting system metrics at regular intervals
 */
function startSystemMetricsCollection() {
  if (!ENABLE_MONITORING) return;
  
  // Collect and report system metrics immediately
  const metrics = collectSystemMetrics();
  logger.info('System metrics', { metrics });
  
  // Set up interval for regular collection
  setInterval(() => {
    const metrics = collectSystemMetrics();
    logger.info('System metrics', { metrics });
  }, SYSTEM_METRICS_INTERVAL);
  
  logger.info(`System metrics collection started (interval: ${SYSTEM_METRICS_INTERVAL}ms)`);
}

module.exports = {
  startTimer,
  stopTimer,
  measure,
  performanceMiddleware,
  collectSystemMetrics,
  startSystemMetricsCollection
};