#!/usr/bin/env node

/**
 * System metrics collection script
 * Collects system metrics and stores them in the database
 * 
 * Usage: node collect-system-metrics.js [--interval=60000] [--env=production]
 */

const os = require('os');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.replace(/^--/, '').split('=');
  acc[key] = value;
  return acc;
}, {});

// Set default values
const interval = parseInt(args.interval || '60000', 10); // Default: 1 minute
const environment = args.env || process.env.NODE_ENV || 'development';

// Load environment variables
const envFile = path.resolve(process.cwd(), `.env.${environment}`);
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile });
} else {
  dotenv.config();
}

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'stock_analysis'
};

// Create database connection pool
const pool = mysql.createPool(dbConfig);

/**
 * Collect system metrics
 * @returns {Object} System metrics
 */
function collectSystemMetrics() {
  const loadAvg = os.loadavg();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  
  return {
    timestamp: new Date(),
    cpuLoad: loadAvg[0],
    memoryTotal: totalMem,
    memoryUsed: usedMem,
    memoryFree: freeMem
  };
}

/**
 * Store metrics in database
 * @param {Object} metrics System metrics
 */
async function storeMetrics(metrics) {
  try {
    const connection = await pool.getConnection();
    
    try {
      await connection.execute(
        'INSERT INTO system_metrics (timestamp, cpu_load, memory_total, memory_used, memory_free) VALUES (?, ?, ?, ?, ?)',
        [
          metrics.timestamp,
          metrics.cpuLoad,
          metrics.memoryTotal,
          metrics.memoryUsed,
          metrics.memoryFree
        ]
      );
      
      console.log(`[${metrics.timestamp.toISOString()}] Metrics stored successfully`);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to store metrics:`, error.message);
  }
}

/**
 * Clean up old metrics
 * @param {number} days Number of days to keep
 */
async function cleanupOldMetrics(days = 30) {
  try {
    const connection = await pool.getConnection();
    
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const [result] = await connection.execute(
        'DELETE FROM system_metrics WHERE timestamp < ?',
        [cutoffDate]
      );
      
      if (result.affectedRows > 0) {
        console.log(`[${new Date().toISOString()}] Cleaned up ${result.affectedRows} old metrics`);
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to clean up old metrics:`, error.message);
  }
}

/**
 * Main function
 */
async function main() {
  console.log(`[${new Date().toISOString()}] Starting system metrics collection`);
  console.log(`Environment: ${environment}`);
  console.log(`Interval: ${interval}ms`);
  console.log(`Database: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
  
  // Test database connection
  try {
    const connection = await pool.getConnection();
    connection.release();
    console.log(`[${new Date().toISOString()}] Database connection successful`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Database connection failed:`, error.message);
    process.exit(1);
  }
  
  // Collect and store metrics immediately
  const metrics = collectSystemMetrics();
  await storeMetrics(metrics);
  
  // Clean up old metrics
  await cleanupOldMetrics();
  
  // Set up interval for regular collection
  setInterval(async () => {
    const metrics = collectSystemMetrics();
    await storeMetrics(metrics);
  }, interval);
  
  // Set up daily cleanup
  setInterval(async () => {
    await cleanupOldMetrics();
  }, 24 * 60 * 60 * 1000); // 24 hours
}

// Run the main function
main().catch(error => {
  console.error(`[${new Date().toISOString()}] Fatal error:`, error);
  process.exit(1);
});