/**
 * PM2 Configuration File
 * 
 * This file defines the application processes managed by PM2
 */

module.exports = {
  apps: [
    {
      name: 'stock-analysis-web-server',
      script: 'app.js',
      cwd: './server',
      instances: 'max',
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
        PORT: 7001
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 7001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 7001
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      combine_logs: true,
      error_file: '../logs/pm2-error.log',
      out_file: '../logs/pm2-out.log',
      merge_logs: true,
      time: true
    },
    {
      name: 'stock-analysis-web-metrics',
      script: './scripts/collect-system-metrics.js',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      args: '--interval=60000',
      env: {
        NODE_ENV: 'development'
      },
      env_staging: {
        NODE_ENV: 'staging'
      },
      env_production: {
        NODE_ENV: 'production'
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: './logs/metrics-error.log',
      out_file: './logs/metrics-out.log',
      merge_logs: true,
      time: true
    },
    {
      name: 'stock-analysis-web-proxy',
      script: 'proxy-server.cjs',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: './logs/proxy-error.log',
      out_file: './logs/proxy-out.log',
      merge_logs: true,
      time: true
    }
  ]
};