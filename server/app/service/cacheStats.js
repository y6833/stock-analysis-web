'use strict';

const Service = require('egg').Service;

/**
 * 缓存统计服务
 * 收集和展示缓存统计信息
 */
class CacheStatsService extends Service {
  constructor(ctx) {
    super(ctx);
    
    // 初始化缓存统计信息
    if (!global.cacheStats) {
      global.cacheStats = {
        hits: 0,
        misses: 0,
        requests: 0,
        apiCalls: 0,
        errors: 0,
        lastReset: new Date().toISOString(),
        dataSourceStats: {},
        apiStats: {},
      };
    }
  }
  
  /**
   * 记录缓存命中
   * @param {string} dataSource - 数据源名称
   * @param {string} apiName - API名称
   */
  recordHit(dataSource = 'tushare', apiName = 'unknown') {
    const { ctx } = this;
    
    try {
      // 更新全局统计信息
      global.cacheStats.hits += 1;
      global.cacheStats.requests += 1;
      
      // 更新数据源统计信息
      if (!global.cacheStats.dataSourceStats[dataSource]) {
        global.cacheStats.dataSourceStats[dataSource] = {
          hits: 0,
          misses: 0,
          requests: 0,
          apiCalls: 0,
          errors: 0,
        };
      }
      
      global.cacheStats.dataSourceStats[dataSource].hits += 1;
      global.cacheStats.dataSourceStats[dataSource].requests += 1;
      
      // 更新API统计信息
      const apiKey = `${dataSource}:${apiName}`;
      if (!global.cacheStats.apiStats[apiKey]) {
        global.cacheStats.apiStats[apiKey] = {
          hits: 0,
          misses: 0,
          requests: 0,
          apiCalls: 0,
          errors: 0,
          lastAccess: new Date().toISOString(),
        };
      }
      
      global.cacheStats.apiStats[apiKey].hits += 1;
      global.cacheStats.apiStats[apiKey].requests += 1;
      global.cacheStats.apiStats[apiKey].lastAccess = new Date().toISOString();
      
      ctx.logger.debug(`缓存命中: ${dataSource}/${apiName}`);
    } catch (err) {
      ctx.logger.warn(`记录缓存命中失败: ${err.message}`);
    }
  }
  
  /**
   * 记录缓存未命中
   * @param {string} dataSource - 数据源名称
   * @param {string} apiName - API名称
   */
  recordMiss(dataSource = 'tushare', apiName = 'unknown') {
    const { ctx } = this;
    
    try {
      // 更新全局统计信息
      global.cacheStats.misses += 1;
      global.cacheStats.requests += 1;
      
      // 更新数据源统计信息
      if (!global.cacheStats.dataSourceStats[dataSource]) {
        global.cacheStats.dataSourceStats[dataSource] = {
          hits: 0,
          misses: 0,
          requests: 0,
          apiCalls: 0,
          errors: 0,
        };
      }
      
      global.cacheStats.dataSourceStats[dataSource].misses += 1;
      global.cacheStats.dataSourceStats[dataSource].requests += 1;
      
      // 更新API统计信息
      const apiKey = `${dataSource}:${apiName}`;
      if (!global.cacheStats.apiStats[apiKey]) {
        global.cacheStats.apiStats[apiKey] = {
          hits: 0,
          misses: 0,
          requests: 0,
          apiCalls: 0,
          errors: 0,
          lastAccess: new Date().toISOString(),
        };
      }
      
      global.cacheStats.apiStats[apiKey].misses += 1;
      global.cacheStats.apiStats[apiKey].requests += 1;
      global.cacheStats.apiStats[apiKey].lastAccess = new Date().toISOString();
      
      ctx.logger.debug(`缓存未命中: ${dataSource}/${apiName}`);
    } catch (err) {
      ctx.logger.warn(`记录缓存未命中失败: ${err.message}`);
    }
  }
  
  /**
   * 记录API调用
   * @param {string} dataSource - 数据源名称
   * @param {string} apiName - API名称
   */
  recordApiCall(dataSource = 'tushare', apiName = 'unknown') {
    const { ctx } = this;
    
    try {
      // 更新全局统计信息
      global.cacheStats.apiCalls += 1;
      
      // 更新数据源统计信息
      if (!global.cacheStats.dataSourceStats[dataSource]) {
        global.cacheStats.dataSourceStats[dataSource] = {
          hits: 0,
          misses: 0,
          requests: 0,
          apiCalls: 0,
          errors: 0,
        };
      }
      
      global.cacheStats.dataSourceStats[dataSource].apiCalls += 1;
      
      // 更新API统计信息
      const apiKey = `${dataSource}:${apiName}`;
      if (!global.cacheStats.apiStats[apiKey]) {
        global.cacheStats.apiStats[apiKey] = {
          hits: 0,
          misses: 0,
          requests: 0,
          apiCalls: 0,
          errors: 0,
          lastAccess: new Date().toISOString(),
        };
      }
      
      global.cacheStats.apiStats[apiKey].apiCalls += 1;
      global.cacheStats.apiStats[apiKey].lastAccess = new Date().toISOString();
      
      ctx.logger.debug(`API调用: ${dataSource}/${apiName}`);
    } catch (err) {
      ctx.logger.warn(`记录API调用失败: ${err.message}`);
    }
  }
  
  /**
   * 记录错误
   * @param {string} dataSource - 数据源名称
   * @param {string} apiName - API名称
   * @param {Error} error - 错误对象
   */
  recordError(dataSource = 'tushare', apiName = 'unknown', error = null) {
    const { ctx } = this;
    
    try {
      // 更新全局统计信息
      global.cacheStats.errors += 1;
      
      // 更新数据源统计信息
      if (!global.cacheStats.dataSourceStats[dataSource]) {
        global.cacheStats.dataSourceStats[dataSource] = {
          hits: 0,
          misses: 0,
          requests: 0,
          apiCalls: 0,
          errors: 0,
        };
      }
      
      global.cacheStats.dataSourceStats[dataSource].errors += 1;
      
      // 更新API统计信息
      const apiKey = `${dataSource}:${apiName}`;
      if (!global.cacheStats.apiStats[apiKey]) {
        global.cacheStats.apiStats[apiKey] = {
          hits: 0,
          misses: 0,
          requests: 0,
          apiCalls: 0,
          errors: 0,
          lastAccess: new Date().toISOString(),
          lastError: null,
        };
      }
      
      global.cacheStats.apiStats[apiKey].errors += 1;
      global.cacheStats.apiStats[apiKey].lastAccess = new Date().toISOString();
      
      if (error) {
        global.cacheStats.apiStats[apiKey].lastError = {
          message: error.message || '未知错误',
          time: new Date().toISOString(),
        };
      }
      
      ctx.logger.debug(`错误: ${dataSource}/${apiName} - ${error ? error.message : '未知错误'}`);
    } catch (err) {
      ctx.logger.warn(`记录错误失败: ${err.message}`);
    }
  }
  
  /**
   * 获取缓存统计信息
   * @param {string} dataSource - 数据源名称，如果为null则返回所有数据源的统计信息
   * @return {Object} 缓存统计信息
   */
  getStats(dataSource = null) {
    const { ctx } = this;
    
    try {
      // 计算全局命中率
      const hitRate = global.cacheStats.requests > 0
        ? (global.cacheStats.hits / global.cacheStats.requests * 100).toFixed(2)
        : 0;
      
      // 基础统计信息
      const stats = {
        hits: global.cacheStats.hits,
        misses: global.cacheStats.misses,
        requests: global.cacheStats.requests,
        apiCalls: global.cacheStats.apiCalls,
        errors: global.cacheStats.errors,
        hitRate: `${hitRate}%`,
        lastReset: global.cacheStats.lastReset,
      };
      
      // 如果指定了数据源，只返回该数据源的统计信息
      if (dataSource) {
        const sourceStats = global.cacheStats.dataSourceStats[dataSource] || {
          hits: 0,
          misses: 0,
          requests: 0,
          apiCalls: 0,
          errors: 0,
        };
        
        // 计算数据源命中率
        const sourceHitRate = sourceStats.requests > 0
          ? (sourceStats.hits / sourceStats.requests * 100).toFixed(2)
          : 0;
        
        // 获取该数据源的API统计信息
        const apiStats = {};
        Object.keys(global.cacheStats.apiStats).forEach(key => {
          if (key.startsWith(`${dataSource}:`)) {
            const apiName = key.split(':')[1];
            apiStats[apiName] = global.cacheStats.apiStats[key];
            
            // 计算API命中率
            const apiHitRate = apiStats[apiName].requests > 0
              ? (apiStats[apiName].hits / apiStats[apiName].requests * 100).toFixed(2)
              : 0;
            
            apiStats[apiName].hitRate = `${apiHitRate}%`;
          }
        });
        
        return {
          ...stats,
          dataSource,
          sourceStats: {
            ...sourceStats,
            hitRate: `${sourceHitRate}%`,
          },
          apiStats,
        };
      }
      
      // 返回所有统计信息
      return {
        ...stats,
        dataSourceStats: global.cacheStats.dataSourceStats,
        apiStats: global.cacheStats.apiStats,
      };
    } catch (err) {
      ctx.logger.error(`获取缓存统计信息失败: ${err.message}`);
      return {
        error: `获取缓存统计信息失败: ${err.message}`,
      };
    }
  }
  
  /**
   * 重置缓存统计信息
   * @param {string} dataSource - 数据源名称，如果为null则重置所有数据源的统计信息
   * @return {Object} 重置结果
   */
  resetStats(dataSource = null) {
    const { ctx } = this;
    
    try {
      if (dataSource) {
        // 重置指定数据源的统计信息
        if (global.cacheStats.dataSourceStats[dataSource]) {
          global.cacheStats.dataSourceStats[dataSource] = {
            hits: 0,
            misses: 0,
            requests: 0,
            apiCalls: 0,
            errors: 0,
          };
        }
        
        // 重置该数据源的API统计信息
        Object.keys(global.cacheStats.apiStats).forEach(key => {
          if (key.startsWith(`${dataSource}:`)) {
            global.cacheStats.apiStats[key] = {
              hits: 0,
              misses: 0,
              requests: 0,
              apiCalls: 0,
              errors: 0,
              lastAccess: new Date().toISOString(),
            };
          }
        });
        
        ctx.logger.info(`已重置数据源 ${dataSource} 的缓存统计信息`);
        
        return {
          success: true,
          message: `已重置数据源 ${dataSource} 的缓存统计信息`,
          dataSource,
          resetTime: new Date().toISOString(),
        };
      } else {
        // 重置所有统计信息
        global.cacheStats = {
          hits: 0,
          misses: 0,
          requests: 0,
          apiCalls: 0,
          errors: 0,
          lastReset: new Date().toISOString(),
          dataSourceStats: {},
          apiStats: {},
        };
        
        ctx.logger.info('已重置所有缓存统计信息');
        
        return {
          success: true,
          message: '已重置所有缓存统计信息',
          resetTime: global.cacheStats.lastReset,
        };
      }
    } catch (err) {
      ctx.logger.error(`重置缓存统计信息失败: ${err.message}`);
      return {
        success: false,
        error: `重置缓存统计信息失败: ${err.message}`,
      };
    }
  }
}

module.exports = CacheStatsService;
