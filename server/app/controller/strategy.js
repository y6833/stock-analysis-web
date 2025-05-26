'use strict';

const Controller = require('egg').Controller;

/**
 * 策略控制器
 */
class StrategyController extends Controller {

  /**
   * 创建策略
   */
  async createStrategy() {
    const { ctx } = this;
    
    try {
      const { name, type, description, parameters, riskLevel, universe, benchmark } = ctx.request.body;
      
      // 参数验证
      if (!name || !type) {
        ctx.body = {
          success: false,
          message: '策略名称和类型不能为空'
        };
        return;
      }
      
      const strategyData = {
        name,
        type,
        description,
        parameters: parameters || {},
        riskLevel: riskLevel || 'medium',
        universe: universe || [],
        benchmark: benchmark || '000300.SH'
      };
      
      const strategy = await ctx.service.strategy.createStrategy(strategyData);
      
      ctx.body = {
        success: true,
        data: strategy,
        message: '策略创建成功'
      };
      
    } catch (error) {
      ctx.logger.error('创建策略失败:', error);
      ctx.body = {
        success: false,
        message: '创建策略失败: ' + error.message
      };
    }
  }

  /**
   * 获取策略列表
   */
  async getStrategies() {
    const { ctx } = this;
    
    try {
      const userId = ctx.user?.id;
      const strategies = await ctx.service.strategy.getStrategies(userId);
      
      ctx.body = {
        success: true,
        data: strategies
      };
      
    } catch (error) {
      ctx.logger.error('获取策略列表失败:', error);
      ctx.body = {
        success: false,
        message: '获取策略列表失败'
      };
    }
  }

  /**
   * 获取策略详情
   */
  async getStrategy() {
    const { ctx } = this;
    
    try {
      const { id } = ctx.params;
      
      if (!id) {
        ctx.body = {
          success: false,
          message: '策略ID不能为空'
        };
        return;
      }
      
      const strategy = await ctx.service.strategy.getStrategy(id);
      
      ctx.body = {
        success: true,
        data: strategy
      };
      
    } catch (error) {
      ctx.logger.error('获取策略详情失败:', error);
      ctx.body = {
        success: false,
        message: '获取策略详情失败: ' + error.message
      };
    }
  }

  /**
   * 更新策略
   */
  async updateStrategy() {
    const { ctx } = this;
    
    try {
      const { id } = ctx.params;
      const updateData = ctx.request.body;
      
      if (!id) {
        ctx.body = {
          success: false,
          message: '策略ID不能为空'
        };
        return;
      }
      
      const strategy = await ctx.service.strategy.updateStrategy(id, updateData);
      
      ctx.body = {
        success: true,
        data: strategy,
        message: '策略更新成功'
      };
      
    } catch (error) {
      ctx.logger.error('更新策略失败:', error);
      ctx.body = {
        success: false,
        message: '更新策略失败: ' + error.message
      };
    }
  }

  /**
   * 删除策略
   */
  async deleteStrategy() {
    const { ctx } = this;
    
    try {
      const { id } = ctx.params;
      
      if (!id) {
        ctx.body = {
          success: false,
          message: '策略ID不能为空'
        };
        return;
      }
      
      await ctx.service.strategy.deleteStrategy(id);
      
      ctx.body = {
        success: true,
        message: '策略删除成功'
      };
      
    } catch (error) {
      ctx.logger.error('删除策略失败:', error);
      ctx.body = {
        success: false,
        message: '删除策略失败: ' + error.message
      };
    }
  }

  /**
   * 执行策略
   */
  async executeStrategy() {
    const { ctx } = this;
    
    try {
      const { id } = ctx.params;
      const { symbols, useFeatures } = ctx.request.body;
      
      if (!id) {
        ctx.body = {
          success: false,
          message: '策略ID不能为空'
        };
        return;
      }
      
      // 获取市场数据
      const marketData = {};
      if (symbols && symbols.length > 0) {
        for (const symbol of symbols) {
          const stockData = await ctx.service.stock.getStockData(symbol);
          if (stockData) {
            marketData[symbol] = stockData;
          }
        }
      }
      
      // 获取特征矩阵（如果需要）
      let featureMatrix = null;
      if (useFeatures && symbols && symbols.length > 0) {
        const configs = ctx.service.factorEngine.getDefaultFactorConfigs();
        featureMatrix = {};
        
        for (const symbol of symbols) {
          const stockData = marketData[symbol];
          if (stockData) {
            const matrix = await ctx.service.factorEngine.calculateAllFactors(
              symbol,
              stockData,
              configs
            );
            featureMatrix[symbol] = matrix;
          }
        }
      }
      
      // 执行策略
      const result = await ctx.service.strategy.executeStrategy(id, marketData, featureMatrix);
      
      ctx.body = {
        success: true,
        data: result,
        message: '策略执行成功'
      };
      
    } catch (error) {
      ctx.logger.error('执行策略失败:', error);
      ctx.body = {
        success: false,
        message: '执行策略失败: ' + error.message
      };
    }
  }

  /**
   * 优化策略
   */
  async optimizeStrategy() {
    const { ctx } = this;
    
    try {
      const { id } = ctx.params;
      const optimizationConfig = ctx.request.body;
      
      if (!id) {
        ctx.body = {
          success: false,
          message: '策略ID不能为空'
        };
        return;
      }
      
      // 设置默认优化配置
      const config = {
        objective: optimizationConfig.objective || 'sharpe',
        method: optimizationConfig.method || 'random_search',
        maxIterations: optimizationConfig.maxIterations || 100,
        parameterRanges: optimizationConfig.parameterRanges || [],
        ...optimizationConfig
      };
      
      const result = await ctx.service.strategy.optimizeStrategy(id, config);
      
      ctx.body = {
        success: true,
        data: result,
        message: '策略优化成功'
      };
      
    } catch (error) {
      ctx.logger.error('优化策略失败:', error);
      ctx.body = {
        success: false,
        message: '优化策略失败: ' + error.message
      };
    }
  }

  /**
   * 获取策略执行历史
   */
  async getExecutionHistory() {
    const { ctx } = this;
    
    try {
      const { id } = ctx.params;
      const { limit = 50, offset = 0 } = ctx.query;
      
      if (!id) {
        ctx.body = {
          success: false,
          message: '策略ID不能为空'
        };
        return;
      }
      
      const history = await ctx.service.strategy.getExecutionHistory(id, {
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
      ctx.body = {
        success: true,
        data: history
      };
      
    } catch (error) {
      ctx.logger.error('获取执行历史失败:', error);
      ctx.body = {
        success: false,
        message: '获取执行历史失败'
      };
    }
  }

  /**
   * 获取策略绩效分析
   */
  async getPerformanceAnalysis() {
    const { ctx } = this;
    
    try {
      const { id } = ctx.params;
      const { period = '1M' } = ctx.query;
      
      if (!id) {
        ctx.body = {
          success: false,
          message: '策略ID不能为空'
        };
        return;
      }
      
      const analysis = await ctx.service.strategy.getPerformanceAnalysis(id, period);
      
      ctx.body = {
        success: true,
        data: analysis
      };
      
    } catch (error) {
      ctx.logger.error('获取绩效分析失败:', error);
      ctx.body = {
        success: false,
        message: '获取绩效分析失败'
      };
    }
  }

  /**
   * 获取策略风险分析
   */
  async getRiskAnalysis() {
    const { ctx } = this;
    
    try {
      const { id } = ctx.params;
      
      if (!id) {
        ctx.body = {
          success: false,
          message: '策略ID不能为空'
        };
        return;
      }
      
      const riskAnalysis = await ctx.service.strategy.getRiskAnalysis(id);
      
      ctx.body = {
        success: true,
        data: riskAnalysis
      };
      
    } catch (error) {
      ctx.logger.error('获取风险分析失败:', error);
      ctx.body = {
        success: false,
        message: '获取风险分析失败'
      };
    }
  }

  /**
   * 批量执行策略
   */
  async batchExecuteStrategies() {
    const { ctx } = this;
    
    try {
      const { strategyIds, symbols } = ctx.request.body;
      
      if (!strategyIds || !Array.isArray(strategyIds) || strategyIds.length === 0) {
        ctx.body = {
          success: false,
          message: '策略ID列表不能为空'
        };
        return;
      }
      
      if (strategyIds.length > 10) {
        ctx.body = {
          success: false,
          message: '批量执行策略数量不能超过10个'
        };
        return;
      }
      
      // 获取市场数据
      const marketData = {};
      if (symbols && symbols.length > 0) {
        for (const symbol of symbols) {
          const stockData = await ctx.service.stock.getStockData(symbol);
          if (stockData) {
            marketData[symbol] = stockData;
          }
        }
      }
      
      const results = {};
      const errors = {};
      
      // 并行执行策略
      const promises = strategyIds.map(async strategyId => {
        try {
          const result = await ctx.service.strategy.executeStrategy(strategyId, marketData);
          results[strategyId] = result;
        } catch (error) {
          ctx.logger.error(`执行策略 ${strategyId} 失败:`, error);
          errors[strategyId] = error.message;
        }
      });
      
      await Promise.all(promises);
      
      ctx.body = {
        success: true,
        data: {
          results,
          errors,
          summary: {
            total: strategyIds.length,
            success: Object.keys(results).length,
            failed: Object.keys(errors).length
          }
        }
      };
      
    } catch (error) {
      ctx.logger.error('批量执行策略失败:', error);
      ctx.body = {
        success: false,
        message: '批量执行策略失败: ' + error.message
      };
    }
  }

  /**
   * 获取策略模板
   */
  async getStrategyTemplates() {
    const { ctx } = this;
    
    try {
      const templates = [
        {
          id: 'factor_momentum',
          name: '动量因子策略',
          type: 'factor',
          description: '基于动量因子的选股策略',
          parameters: {
            lookbackPeriod: 20,
            rebalancePeriod: 5,
            topN: 10,
            factorWeights: [
              { factorName: 'momentum', weight: 0.4, direction: 'positive' },
              { factorName: 'volatility', weight: 0.3, direction: 'negative' },
              { factorName: 'volume_price_trend', weight: 0.3, direction: 'positive' }
            ]
          },
          riskLevel: 'medium'
        },
        {
          id: 'ml_xgboost',
          name: 'XGBoost机器学习策略',
          type: 'ml',
          description: '基于XGBoost的机器学习选股策略',
          parameters: {
            modelType: 'xgboost',
            maxFeatures: 10,
            trainPeriod: 60,
            retrainPeriod: 30,
            predictionHorizon: 5,
            threshold: 0.02
          },
          riskLevel: 'high'
        },
        {
          id: 'timing_trend',
          name: '趋势择时策略',
          type: 'timing',
          description: '基于技术指标的择时策略',
          parameters: {
            signalTypes: ['trend_following', 'momentum'],
            lookbackPeriod: 20,
            signalThreshold: 0.3,
            stopLoss: 0.05,
            takeProfit: 0.15
          },
          riskLevel: 'medium'
        },
        {
          id: 'portfolio_balanced',
          name: '平衡组合策略',
          type: 'portfolio',
          description: '多策略组合的平衡配置',
          parameters: {
            optimizationMethod: 'risk_parity',
            rebalanceTrigger: {
              timeBasedDays: 30,
              driftThreshold: 0.05
            },
            riskTarget: 0.15
          },
          riskLevel: 'low'
        }
      ];
      
      ctx.body = {
        success: true,
        data: templates
      };
      
    } catch (error) {
      ctx.logger.error('获取策略模板失败:', error);
      ctx.body = {
        success: false,
        message: '获取策略模板失败'
      };
    }
  }

  /**
   * 启用/禁用策略
   */
  async toggleStrategy() {
    const { ctx } = this;
    
    try {
      const { id } = ctx.params;
      const { enabled } = ctx.request.body;
      
      if (!id) {
        ctx.body = {
          success: false,
          message: '策略ID不能为空'
        };
        return;
      }
      
      const strategy = await ctx.service.strategy.updateStrategy(id, { enabled });
      
      ctx.body = {
        success: true,
        data: strategy,
        message: `策略${enabled ? '启用' : '禁用'}成功`
      };
      
    } catch (error) {
      ctx.logger.error('切换策略状态失败:', error);
      ctx.body = {
        success: false,
        message: '操作失败: ' + error.message
      };
    }
  }

  /**
   * 复制策略
   */
  async cloneStrategy() {
    const { ctx } = this;
    
    try {
      const { id } = ctx.params;
      const { name } = ctx.request.body;
      
      if (!id) {
        ctx.body = {
          success: false,
          message: '策略ID不能为空'
        };
        return;
      }
      
      const originalStrategy = await ctx.service.strategy.getStrategy(id);
      if (!originalStrategy) {
        ctx.body = {
          success: false,
          message: '原策略不存在'
        };
        return;
      }
      
      const clonedStrategyData = {
        ...originalStrategy,
        name: name || `${originalStrategy.name} (副本)`,
        enabled: false
      };
      
      delete clonedStrategyData.id;
      delete clonedStrategyData.createdAt;
      delete clonedStrategyData.updatedAt;
      
      const clonedStrategy = await ctx.service.strategy.createStrategy(clonedStrategyData);
      
      ctx.body = {
        success: true,
        data: clonedStrategy,
        message: '策略复制成功'
      };
      
    } catch (error) {
      ctx.logger.error('复制策略失败:', error);
      ctx.body = {
        success: false,
        message: '复制策略失败: ' + error.message
      };
    }
  }
}

module.exports = StrategyController;
