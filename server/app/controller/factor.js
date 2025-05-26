'use strict';

const Controller = require('egg').Controller;

/**
 * 因子分析控制器
 */
class FactorController extends Controller {

  /**
   * 计算股票因子
   */
  async calculateFactors() {
    const { ctx } = this;
    
    try {
      const { symbol, factorTypes, customConfigs } = ctx.request.body;
      
      // 参数验证
      if (!symbol) {
        ctx.body = {
          success: false,
          message: '股票代码不能为空'
        };
        return;
      }
      
      // 获取股票数据
      const stockData = await ctx.service.stock.getStockData(symbol);
      if (!stockData) {
        ctx.body = {
          success: false,
          message: '获取股票数据失败'
        };
        return;
      }
      
      // 获取因子配置
      let factorConfigs = customConfigs || ctx.service.factorEngine.getDefaultFactorConfigs();
      
      // 根据因子类型过滤
      if (factorTypes && factorTypes.length > 0) {
        factorConfigs = factorConfigs.filter(config => factorTypes.includes(config.type));
      }
      
      // 计算因子
      const featureMatrix = await ctx.service.factorEngine.calculateAllFactors(
        symbol,
        stockData,
        factorConfigs
      );
      
      ctx.body = {
        success: true,
        data: featureMatrix
      };
      
    } catch (error) {
      ctx.logger.error('计算因子失败:', error);
      ctx.body = {
        success: false,
        message: '计算因子失败: ' + error.message
      };
    }
  }

  /**
   * 获取因子配置
   */
  async getFactorConfigs() {
    const { ctx } = this;
    
    try {
      const configs = ctx.service.factorEngine.getDefaultFactorConfigs();
      
      ctx.body = {
        success: true,
        data: configs
      };
      
    } catch (error) {
      ctx.logger.error('获取因子配置失败:', error);
      ctx.body = {
        success: false,
        message: '获取因子配置失败'
      };
    }
  }

  /**
   * 批量计算多个股票的因子
   */
  async batchCalculateFactors() {
    const { ctx } = this;
    
    try {
      const { symbols, factorTypes, customConfigs } = ctx.request.body;
      
      // 参数验证
      if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
        ctx.body = {
          success: false,
          message: '股票代码列表不能为空'
        };
        return;
      }
      
      if (symbols.length > 50) {
        ctx.body = {
          success: false,
          message: '批量计算股票数量不能超过50个'
        };
        return;
      }
      
      // 获取因子配置
      let factorConfigs = customConfigs || ctx.service.factorEngine.getDefaultFactorConfigs();
      
      // 根据因子类型过滤
      if (factorTypes && factorTypes.length > 0) {
        factorConfigs = factorConfigs.filter(config => factorTypes.includes(config.type));
      }
      
      const results = {};
      const errors = {};
      
      // 并行计算，但限制并发数
      const concurrency = 5;
      const batches = [];
      
      for (let i = 0; i < symbols.length; i += concurrency) {
        batches.push(symbols.slice(i, i + concurrency));
      }
      
      for (const batch of batches) {
        const batchPromises = batch.map(async symbol => {
          try {
            // 获取股票数据
            const stockData = await ctx.service.stock.getStockData(symbol);
            if (!stockData) {
              errors[symbol] = '获取股票数据失败';
              return;
            }
            
            // 计算因子
            const featureMatrix = await ctx.service.factorEngine.calculateAllFactors(
              symbol,
              stockData,
              factorConfigs
            );
            
            results[symbol] = featureMatrix;
            
          } catch (error) {
            ctx.logger.error(`计算股票 ${symbol} 因子失败:`, error);
            errors[symbol] = error.message;
          }
        });
        
        await Promise.all(batchPromises);
        
        // 批次间延迟，避免过载
        if (batches.indexOf(batch) < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      ctx.body = {
        success: true,
        data: {
          results,
          errors,
          summary: {
            total: symbols.length,
            success: Object.keys(results).length,
            failed: Object.keys(errors).length
          }
        }
      };
      
    } catch (error) {
      ctx.logger.error('批量计算因子失败:', error);
      ctx.body = {
        success: false,
        message: '批量计算因子失败: ' + error.message
      };
    }
  }

  /**
   * 获取因子相关性矩阵
   */
  async getFactorCorrelation() {
    const { ctx } = this;
    
    try {
      const { symbol, factorNames } = ctx.query;
      
      if (!symbol) {
        ctx.body = {
          success: false,
          message: '股票代码不能为空'
        };
        return;
      }
      
      // 获取股票数据
      const stockData = await ctx.service.stock.getStockData(symbol);
      if (!stockData) {
        ctx.body = {
          success: false,
          message: '获取股票数据失败'
        };
        return;
      }
      
      // 获取因子配置
      let factorConfigs = ctx.service.factorEngine.getDefaultFactorConfigs();
      
      // 根据指定的因子名称过滤
      if (factorNames) {
        const names = factorNames.split(',');
        factorConfigs = factorConfigs.filter(config => names.includes(config.name));
      }
      
      // 计算因子
      const featureMatrix = await ctx.service.factorEngine.calculateAllFactors(
        symbol,
        stockData,
        factorConfigs
      );
      
      // 计算相关性矩阵
      const correlationMatrix = this.calculateCorrelationMatrix(featureMatrix.factors);
      
      ctx.body = {
        success: true,
        data: {
          correlationMatrix,
          factorNames: Object.keys(featureMatrix.factors)
        }
      };
      
    } catch (error) {
      ctx.logger.error('计算因子相关性失败:', error);
      ctx.body = {
        success: false,
        message: '计算因子相关性失败: ' + error.message
      };
    }
  }

  /**
   * 获取因子重要性排名
   */
  async getFactorImportance() {
    const { ctx } = this;
    
    try {
      const { symbol, method = 'variance' } = ctx.query;
      
      if (!symbol) {
        ctx.body = {
          success: false,
          message: '股票代码不能为空'
        };
        return;
      }
      
      // 获取股票数据
      const stockData = await ctx.service.stock.getStockData(symbol);
      if (!stockData) {
        ctx.body = {
          success: false,
          message: '获取股票数据失败'
        };
        return;
      }
      
      // 计算因子
      const factorConfigs = ctx.service.factorEngine.getDefaultFactorConfigs();
      const featureMatrix = await ctx.service.factorEngine.calculateAllFactors(
        symbol,
        stockData,
        factorConfigs
      );
      
      // 计算因子重要性
      const importance = this.calculateFactorImportance(featureMatrix.factors, method);
      
      ctx.body = {
        success: true,
        data: importance
      };
      
    } catch (error) {
      ctx.logger.error('计算因子重要性失败:', error);
      ctx.body = {
        success: false,
        message: '计算因子重要性失败: ' + error.message
      };
    }
  }

  /**
   * 获取因子统计信息
   */
  async getFactorStatistics() {
    const { ctx } = this;
    
    try {
      const { symbol } = ctx.query;
      
      if (!symbol) {
        ctx.body = {
          success: false,
          message: '股票代码不能为空'
        };
        return;
      }
      
      // 获取股票数据
      const stockData = await ctx.service.stock.getStockData(symbol);
      if (!stockData) {
        ctx.body = {
          success: false,
          message: '获取股票数据失败'
        };
        return;
      }
      
      // 计算因子
      const factorConfigs = ctx.service.factorEngine.getDefaultFactorConfigs();
      const featureMatrix = await ctx.service.factorEngine.calculateAllFactors(
        symbol,
        stockData,
        factorConfigs
      );
      
      // 计算统计信息
      const statistics = this.calculateFactorStatistics(featureMatrix.factors);
      
      ctx.body = {
        success: true,
        data: {
          ...featureMatrix.metadata,
          factorStatistics: statistics
        }
      };
      
    } catch (error) {
      ctx.logger.error('获取因子统计信息失败:', error);
      ctx.body = {
        success: false,
        message: '获取因子统计信息失败: ' + error.message
      };
    }
  }

  /**
   * 清理因子缓存
   */
  async clearFactorCache() {
    const { ctx } = this;
    
    try {
      ctx.service.factorEngine.clearCache();
      
      ctx.body = {
        success: true,
        message: '因子缓存清理成功'
      };
      
    } catch (error) {
      ctx.logger.error('清理因子缓存失败:', error);
      ctx.body = {
        success: false,
        message: '清理因子缓存失败'
      };
    }
  }

  /**
   * 获取因子缓存统计
   */
  async getFactorCacheStats() {
    const { ctx } = this;
    
    try {
      const stats = ctx.service.factorEngine.getCacheStats();
      
      ctx.body = {
        success: true,
        data: stats
      };
      
    } catch (error) {
      ctx.logger.error('获取因子缓存统计失败:', error);
      ctx.body = {
        success: false,
        message: '获取因子缓存统计失败'
      };
    }
  }

  /**
   * 计算相关性矩阵
   */
  calculateCorrelationMatrix(factors) {
    const factorNames = Object.keys(factors);
    const matrix = [];
    
    for (let i = 0; i < factorNames.length; i++) {
      for (let j = 0; j < factorNames.length; j++) {
        const factor1 = factors[factorNames[i]];
        const factor2 = factors[factorNames[j]];
        
        const correlation = this.calculateCorrelation(factor1.values, factor2.values);
        matrix.push([i, j, correlation]);
      }
    }
    
    return matrix;
  }

  /**
   * 计算相关系数
   */
  calculateCorrelation(x, y) {
    if (x.length !== y.length) return 0;
    
    const validPairs = x.map((val, i) => ({ x: val, y: y[i] }))
      .filter(pair => !isNaN(pair.x) && !isNaN(pair.y));
    
    if (validPairs.length < 2) return 0;
    
    const n = validPairs.length;
    const sumX = validPairs.reduce((sum, pair) => sum + pair.x, 0);
    const sumY = validPairs.reduce((sum, pair) => sum + pair.y, 0);
    const sumXY = validPairs.reduce((sum, pair) => sum + pair.x * pair.y, 0);
    const sumX2 = validPairs.reduce((sum, pair) => sum + pair.x * pair.x, 0);
    const sumY2 = validPairs.reduce((sum, pair) => sum + pair.y * pair.y, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * 计算因子重要性
   */
  calculateFactorImportance(factors, method) {
    const importance = [];
    
    Object.entries(factors).forEach(([name, factor]) => {
      const validValues = factor.values.filter(v => !isNaN(v));
      if (validValues.length === 0) {
        importance.push({ name, value: 0, type: factor.factorType });
        return;
      }
      
      let score = 0;
      
      switch (method) {
        case 'variance':
          const mean = validValues.reduce((sum, v) => sum + v, 0) / validValues.length;
          const variance = validValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / validValues.length;
          score = Math.sqrt(variance);
          break;
          
        case 'range':
          const min = Math.min(...validValues);
          const max = Math.max(...validValues);
          score = max - min;
          break;
          
        default:
          score = Math.abs(validValues[validValues.length - 1] || 0);
      }
      
      importance.push({
        name,
        value: score,
        type: factor.factorType
      });
    });
    
    return importance.sort((a, b) => b.value - a.value);
  }

  /**
   * 计算因子统计信息
   */
  calculateFactorStatistics(factors) {
    const statistics = {};
    
    Object.entries(factors).forEach(([name, factor]) => {
      const validValues = factor.values.filter(v => !isNaN(v));
      
      if (validValues.length === 0) {
        statistics[name] = {
          count: 0,
          mean: NaN,
          std: NaN,
          min: NaN,
          max: NaN,
          skewness: NaN,
          kurtosis: NaN
        };
        return;
      }
      
      const count = validValues.length;
      const mean = validValues.reduce((sum, v) => sum + v, 0) / count;
      const variance = validValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / count;
      const std = Math.sqrt(variance);
      const min = Math.min(...validValues);
      const max = Math.max(...validValues);
      
      // 计算偏度和峰度
      const skewness = this.calculateSkewness(validValues, mean, std);
      const kurtosis = this.calculateKurtosis(validValues, mean, std);
      
      statistics[name] = {
        count,
        mean,
        std,
        min,
        max,
        skewness,
        kurtosis
      };
    });
    
    return statistics;
  }

  /**
   * 计算偏度
   */
  calculateSkewness(values, mean, std) {
    if (std === 0) return 0;
    
    const n = values.length;
    const sum = values.reduce((sum, v) => sum + Math.pow((v - mean) / std, 3), 0);
    
    return (n / ((n - 1) * (n - 2))) * sum;
  }

  /**
   * 计算峰度
   */
  calculateKurtosis(values, mean, std) {
    if (std === 0) return 0;
    
    const n = values.length;
    const sum = values.reduce((sum, v) => sum + Math.pow((v - mean) / std, 4), 0);
    
    return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum - 
           (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
  }
}

module.exports = FactorController;
