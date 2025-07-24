/**
 * Monitoring Controller
 * Handles API endpoints for monitoring and logging
 */

const BaseController = require('../core/BaseController');

class MonitoringController extends BaseController {
  /**
   * Get performance metrics
   */
  async getMetrics() {
    const { ctx, service } = this;
    const { type, startTime, endTime, limit } = ctx.query;
    
    try {
      const metrics = await service.monitoring.getMetrics({
        type,
        startTime,
        endTime,
        limit: parseInt(limit, 10) || 100
      });
      
      this.success(metrics);
    } catch (error) {
      this.error('Failed to get metrics', error);
    }
  }
  
  /**
   * Get system metrics
   */
  async getSystemMetrics() {
    const { ctx, service } = this;
    const { startTime, endTime, limit } = ctx.query;
    
    try {
      const metrics = await service.monitoring.getSystemMetrics({
        startTime,
        endTime,
        limit: parseInt(limit, 10) || 24
      });
      
      this.success(metrics);
    } catch (error) {
      this.error('Failed to get system metrics', error);
    }
  }
  
  /**
   * Get error logs
   */
  async getErrors() {
    const { ctx, service } = this;
    const { severity, component, startDate, endDate, limit } = ctx.query;
    
    try {
      const errors = await service.monitoring.getErrors({
        severity,
        component,
        startDate,
        endDate,
        limit: parseInt(limit, 10) || 100
      });
      
      this.success(errors);
    } catch (error) {
      this.error('Failed to get errors', error);
    }
  }
  
  /**
   * Get application logs
   */
  async getLogs() {
    const { ctx, service } = this;
    const { level, module, query, startDate, endDate, limit } = ctx.query;
    
    try {
      const logs = await service.monitoring.getLogs({
        level,
        module,
        query,
        startDate,
        endDate,
        limit: parseInt(limit, 10) || 100
      });
      
      this.success(logs);
    } catch (error) {
      this.error('Failed to get logs', error);
    }
  }
  
  /**
   * Download logs as file
   */
  async downloadLogs() {
    const { ctx, service } = this;
    const { level, module, query, startDate, endDate } = ctx.query;
    
    try {
      const logs = await service.monitoring.getLogs({
        level,
        module,
        query,
        startDate,
        endDate,
        limit: 10000 // Higher limit for downloads
      });
      
      // Set response headers
      ctx.set('Content-Type', 'application/json');
      ctx.set('Content-Disposition', `attachment; filename=logs-${new Date().toISOString().split('T')[0]}.json`);
      
      // Send logs as JSON
      ctx.body = JSON.stringify(logs, null, 2);
    } catch (error) {
      this.error('Failed to download logs', error);
    }
  }
  
  /**
   * Track client-side error
   */
  async trackError() {
    const { ctx, service } = this;
    const errorData = ctx.request.body;
    
    try {
      await service.monitoring.trackError(errorData);
      this.success({ message: 'Error tracked successfully' });
    } catch (error) {
      this.error('Failed to track error', error);
    }
  }
  
  /**
   * Track client-side performance metric
   */
  async trackMetric() {
    const { ctx, service } = this;
    const metricData = ctx.request.body;
    
    try {
      await service.monitoring.trackMetric(metricData);
      this.success({ message: 'Metric tracked successfully' });
    } catch (error) {
      this.error('Failed to track metric', error);
    }
  }
}

module.exports = MonitoringController;