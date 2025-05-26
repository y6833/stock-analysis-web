'use strict';

const Service = require('egg').Service;

/**
 * 策略服务
 */
class StrategyService extends Service {
  constructor(ctx) {
    super(ctx);
    
    // 策略缓存
    this.strategyCache = new Map();
    this.executionCache = new Map();
    this.cacheExpiry = 1800 * 1000; // 30分钟缓存
  }

  /**
   * 创建策略
   */
  async createStrategy(strategyData) {
    const { ctx } = this;
    
    try {
      ctx.logger.info(`创建策略: ${strategyData.name}`);
      
      // 验证策略数据
      this.validateStrategyData(strategyData);
      
      // 生成策略ID
      const strategyId = this.generateStrategyId();
      
      // 构建策略配置
      const strategyConfig = {
        id: strategyId,
        name: strategyData.name,
        type: strategyData.type,
        description: strategyData.description || '',
        parameters: strategyData.parameters || {},
        enabled: strategyData.enabled !== false,
        priority: strategyData.priority || 0,
        riskLevel: strategyData.riskLevel || 'medium',
        expectedReturn: strategyData.expectedReturn || 0.1,
        maxDrawdown: strategyData.maxDrawdown || 0.2,
        rebalanceFrequency: strategyData.rebalanceFrequency || 'weekly',
        universe: strategyData.universe || [],
        benchmark: strategyData.benchmark || '000300.SH',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // 保存到数据库
      await this.saveStrategyToDatabase(strategyConfig);
      
      // 缓存策略
      this.strategyCache.set(strategyId, strategyConfig);
      
      ctx.logger.info(`策略 ${strategyData.name} 创建成功，ID: ${strategyId}`);
      return strategyConfig;
      
    } catch (error) {
      ctx.logger.error(`创建策略失败:`, error);
      throw error;
    }
  }

  /**
   * 获取策略列表
   */
  async getStrategies(userId) {
    const { ctx } = this;
    
    try {
      // 从数据库获取策略列表
      const strategies = await this.getStrategiesFromDatabase(userId);
      
      // 添加运行时状态信息
      const strategiesWithStatus = await Promise.all(
        strategies.map(async strategy => {
          const status = await this.getStrategyStatus(strategy.id);
          const performance = await this.getStrategyPerformance(strategy.id);
          
          return {
            ...strategy,
            status,
            performance
          };
        })
      );
      
      return strategiesWithStatus;
      
    } catch (error) {
      ctx.logger.error('获取策略列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取策略详情
   */
  async getStrategy(strategyId) {
    const { ctx } = this;
    
    try {
      // 先从缓存获取
      if (this.strategyCache.has(strategyId)) {
        const cached = this.strategyCache.get(strategyId);
        if (Date.now() - cached.timestamp < this.cacheExpiry) {
          return cached.data;
        }
      }
      
      // 从数据库获取
      const strategy = await this.getStrategyFromDatabase(strategyId);
      if (!strategy) {
        throw new Error(`策略 ${strategyId} 不存在`);
      }
      
      // 获取执行历史
      const executionHistory = await this.getExecutionHistory(strategyId);
      
      // 获取绩效分析
      const performance = await this.getStrategyPerformance(strategyId);
      
      // 获取风险指标
      const riskMetrics = await this.getStrategyRiskMetrics(strategyId);
      
      const strategyDetail = {
        ...strategy,
        executionHistory,
        performance,
        riskMetrics
      };
      
      // 缓存结果
      this.strategyCache.set(strategyId, {
        data: strategyDetail,
        timestamp: Date.now()
      });
      
      return strategyDetail;
      
    } catch (error) {
      ctx.logger.error(`获取策略 ${strategyId} 详情失败:`, error);
      throw error;
    }
  }

  /**
   * 执行策略
   */
  async executeStrategy(strategyId, marketData, featureMatrix) {
    const { ctx } = this;
    
    try {
      ctx.logger.info(`执行策略: ${strategyId}`);
      
      const strategy = await this.getStrategy(strategyId);
      if (!strategy) {
        throw new Error(`策略 ${strategyId} 不存在`);
      }
      
      if (!strategy.enabled) {
        throw new Error(`策略 ${strategyId} 已禁用`);
      }
      
      // 根据策略类型执行相应逻辑
      let executionResult;
      
      switch (strategy.type) {
        case 'factor':
          executionResult = await this.executeFactorStrategy(strategy, marketData, featureMatrix);
          break;
        case 'ml':
          executionResult = await this.executeMLStrategy(strategy, marketData, featureMatrix);
          break;
        case 'timing':
          executionResult = await this.executeTimingStrategy(strategy, marketData, featureMatrix);
          break;
        case 'portfolio':
          executionResult = await this.executePortfolioStrategy(strategy, marketData, featureMatrix);
          break;
        default:
          throw new Error(`不支持的策略类型: ${strategy.type}`);
      }
      
      // 保存执行结果
      await this.saveExecutionResult(strategyId, executionResult);
      
      // 更新策略状态
      await this.updateStrategyStatus(strategyId, 'completed');
      
      ctx.logger.info(`策略 ${strategyId} 执行完成`);
      return executionResult;
      
    } catch (error) {
      ctx.logger.error(`执行策略 ${strategyId} 失败:`, error);
      await this.updateStrategyStatus(strategyId, 'failed', error.message);
      throw error;
    }
  }

  /**
   * 优化策略
   */
  async optimizeStrategy(strategyId, optimizationConfig) {
    const { ctx } = this;
    
    try {
      ctx.logger.info(`开始优化策略: ${strategyId}`);
      
      const strategy = await this.getStrategy(strategyId);
      if (!strategy) {
        throw new Error(`策略 ${strategyId} 不存在`);
      }
      
      // 更新策略状态
      await this.updateStrategyStatus(strategyId, 'optimizing');
      
      // 获取历史数据
      const marketData = await ctx.service.stock.getHistoricalData(strategy.universe);
      const featureMatrix = await ctx.service.factorEngine.calculateAllFactors(
        strategy.universe[0], 
        marketData, 
        []
      );
      
      // 执行优化
      const optimizationResult = await this.performOptimization(
        strategy, 
        marketData, 
        featureMatrix, 
        optimizationConfig
      );
      
      // 更新策略参数
      const updatedStrategy = {
        ...strategy,
        parameters: optimizationResult.bestParameters,
        updatedAt: new Date().toISOString()
      };
      
      await this.updateStrategyInDatabase(strategyId, updatedStrategy);
      
      // 清除缓存
      this.strategyCache.delete(strategyId);
      
      // 更新策略状态
      await this.updateStrategyStatus(strategyId, 'optimized');
      
      ctx.logger.info(`策略 ${strategyId} 优化完成`);
      return {
        strategy: updatedStrategy,
        optimizationResult
      };
      
    } catch (error) {
      ctx.logger.error(`优化策略 ${strategyId} 失败:`, error);
      await this.updateStrategyStatus(strategyId, 'failed', error.message);
      throw error;
    }
  }

  /**
   * 删除策略
   */
  async deleteStrategy(strategyId) {
    const { ctx } = this;
    
    try {
      ctx.logger.info(`删除策略: ${strategyId}`);
      
      // 检查策略是否存在
      const strategy = await this.getStrategyFromDatabase(strategyId);
      if (!strategy) {
        throw new Error(`策略 ${strategyId} 不存在`);
      }
      
      // 停止策略执行
      await this.stopStrategy(strategyId);
      
      // 从数据库删除
      await this.deleteStrategyFromDatabase(strategyId);
      
      // 清除缓存
      this.strategyCache.delete(strategyId);
      this.executionCache.delete(strategyId);
      
      ctx.logger.info(`策略 ${strategyId} 删除成功`);
      return true;
      
    } catch (error) {
      ctx.logger.error(`删除策略 ${strategyId} 失败:`, error);
      throw error;
    }
  }

  /**
   * 执行因子策略
   */
  async executeFactorStrategy(strategy, marketData, featureMatrix) {
    const { ctx } = this;
    
    // 模拟因子策略执行
    const signals = [];
    const positions = [];
    
    // 基于因子计算股票评分
    const stockScores = this.calculateFactorScores(featureMatrix, strategy.parameters);
    
    // 选择前N只股票
    const topStocks = stockScores
      .sort((a, b) => b.score - a.score)
      .slice(0, strategy.parameters.topN || 10);
    
    // 生成交易信号
    topStocks.forEach(stock => {
      signals.push({
        symbol: stock.symbol,
        action: 'buy',
        strength: stock.score,
        confidence: 0.8,
        price: marketData[stock.symbol]?.close || 100,
        quantity: 100,
        reason: `因子得分: ${stock.score.toFixed(3)}`,
        timestamp: new Date().toISOString()
      });
    });
    
    return {
      signals,
      positions,
      cash: 1000000,
      totalValue: 1000000,
      confidence: 0.8,
      metadata: {
        stockScores,
        factorWeights: strategy.parameters.factorWeights || []
      }
    };
  }

  /**
   * 执行机器学习策略
   */
  async executeMLStrategy(strategy, marketData, featureMatrix) {
    const { ctx } = this;
    
    // 模拟机器学习策略执行
    const signals = [];
    const predictions = [];
    
    // 模拟模型预测
    Object.keys(marketData).forEach(symbol => {
      const prediction = Math.random();
      predictions.push({
        symbol,
        prediction,
        probability: prediction,
        confidence: 0.7
      });
      
      if (prediction > 0.6) {
        signals.push({
          symbol,
          action: 'buy',
          strength: prediction,
          confidence: 0.7,
          price: marketData[symbol]?.close || 100,
          quantity: 100,
          reason: `ML预测概率: ${(prediction * 100).toFixed(1)}%`,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    return {
      signals,
      positions: [],
      cash: 1000000,
      totalValue: 1000000,
      confidence: 0.7,
      metadata: {
        predictions,
        modelType: strategy.parameters.modelType || 'xgboost'
      }
    };
  }

  /**
   * 执行择时策略
   */
  async executeTimingStrategy(strategy, marketData, featureMatrix) {
    const { ctx } = this;
    
    // 模拟择时策略执行
    const signals = [];
    const timingSignals = [];
    
    // 分析市场状态
    const marketRegime = this.analyzeMarketRegime(marketData);
    
    // 根据市场状态生成信号
    if (marketRegime.trend > 0.02) {
      Object.keys(marketData).slice(0, 5).forEach(symbol => {
        signals.push({
          symbol,
          action: 'buy',
          strength: 0.8,
          confidence: 0.75,
          price: marketData[symbol]?.close || 100,
          quantity: 100,
          reason: '市场趋势向上',
          timestamp: new Date().toISOString()
        });
      });
    }
    
    return {
      signals,
      positions: [],
      cash: 1000000,
      totalValue: 1000000,
      confidence: 0.75,
      metadata: {
        marketRegime,
        timingSignals
      }
    };
  }

  /**
   * 执行组合策略
   */
  async executePortfolioStrategy(strategy, marketData, featureMatrix) {
    const { ctx } = this;
    
    // 模拟组合策略执行
    const signals = [];
    const subStrategyResults = new Map();
    
    // 执行子策略
    const subStrategies = strategy.parameters.subStrategies || [];
    
    for (const subStrategy of subStrategies) {
      const result = await this.executeStrategy(subStrategy.id, marketData, featureMatrix);
      subStrategyResults.set(subStrategy.id, result);
    }
    
    // 组合优化
    const optimizedWeights = this.optimizePortfolioWeights(subStrategyResults);
    
    // 生成组合信号
    subStrategyResults.forEach((result, strategyId) => {
      const weight = optimizedWeights.get(strategyId) || 0;
      
      result.signals.forEach(signal => {
        signals.push({
          ...signal,
          strength: signal.strength * weight,
          reason: `${signal.reason} (权重: ${(weight * 100).toFixed(1)}%)`
        });
      });
    });
    
    return {
      signals,
      positions: [],
      cash: 1000000,
      totalValue: 1000000,
      confidence: 0.8,
      metadata: {
        subStrategyResults: Object.fromEntries(subStrategyResults),
        optimizedWeights: Object.fromEntries(optimizedWeights)
      }
    };
  }

  // 辅助方法

  /**
   * 验证策略数据
   */
  validateStrategyData(strategyData) {
    if (!strategyData.name) {
      throw new Error('策略名称不能为空');
    }
    
    if (!strategyData.type) {
      throw new Error('策略类型不能为空');
    }
    
    const validTypes = ['factor', 'ml', 'timing', 'portfolio'];
    if (!validTypes.includes(strategyData.type)) {
      throw new Error(`无效的策略类型: ${strategyData.type}`);
    }
  }

  /**
   * 生成策略ID
   */
  generateStrategyId() {
    return 'strategy_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 计算因子得分
   */
  calculateFactorScores(featureMatrix, parameters) {
    const scores = [];
    const factorWeights = parameters.factorWeights || [];
    
    Object.keys(featureMatrix).forEach(symbol => {
      let totalScore = 0;
      let validFactors = 0;
      
      factorWeights.forEach(({ factorName, weight }) => {
        const factorValue = Math.random(); // 模拟因子值
        totalScore += factorValue * weight;
        validFactors++;
      });
      
      if (validFactors > 0) {
        scores.push({
          symbol,
          score: totalScore / validFactors
        });
      }
    });
    
    return scores;
  }

  /**
   * 分析市场状态
   */
  analyzeMarketRegime(marketData) {
    // 模拟市场状态分析
    return {
      trend: (Math.random() - 0.5) * 0.1, // -5% to 5%
      volatility: Math.random() * 0.3 + 0.1, // 10% to 40%
      momentum: (Math.random() - 0.5) * 0.2,
      regime: Math.random() > 0.5 ? 'bull' : 'bear'
    };
  }

  /**
   * 优化组合权重
   */
  optimizePortfolioWeights(subStrategyResults) {
    const weights = new Map();
    const strategies = Array.from(subStrategyResults.keys());
    
    // 简化的等权重分配
    const equalWeight = 1 / strategies.length;
    strategies.forEach(strategyId => {
      weights.set(strategyId, equalWeight);
    });
    
    return weights;
  }

  /**
   * 执行优化
   */
  async performOptimization(strategy, marketData, featureMatrix, config) {
    // 模拟优化过程
    const bestParameters = { ...strategy.parameters };
    
    // 随机调整参数
    if (bestParameters.topN) {
      bestParameters.topN = Math.floor(Math.random() * 20) + 5;
    }
    
    return {
      bestParameters,
      objectiveValue: Math.random(),
      iterations: 100,
      convergence: true
    };
  }

  // 数据库操作方法（简化实现）
  async saveStrategyToDatabase(strategy) {
    // 实际应该保存到数据库
    console.log('保存策略到数据库:', strategy.name);
  }

  async getStrategiesFromDatabase(userId) {
    // 实际应该从数据库获取
    return [];
  }

  async getStrategyFromDatabase(strategyId) {
    // 实际应该从数据库获取
    return null;
  }

  async updateStrategyInDatabase(strategyId, strategy) {
    // 实际应该更新数据库
    console.log('更新策略:', strategyId);
  }

  async deleteStrategyFromDatabase(strategyId) {
    // 实际应该从数据库删除
    console.log('删除策略:', strategyId);
  }

  async saveExecutionResult(strategyId, result) {
    // 实际应该保存到数据库
    console.log('保存执行结果:', strategyId);
  }

  async getExecutionHistory(strategyId) {
    // 实际应该从数据库获取
    return [];
  }

  async getStrategyStatus(strategyId) {
    // 实际应该从数据库获取
    return 'idle';
  }

  async updateStrategyStatus(strategyId, status, message) {
    // 实际应该更新数据库
    console.log(`更新策略 ${strategyId} 状态为 ${status}`);
  }

  async getStrategyPerformance(strategyId) {
    // 模拟绩效数据
    return {
      totalReturn: Math.random() * 0.3 - 0.1,
      annualizedReturn: Math.random() * 0.25 - 0.05,
      volatility: Math.random() * 0.3 + 0.1,
      sharpeRatio: Math.random() * 2 - 0.5,
      maxDrawdown: Math.random() * 0.25 + 0.05
    };
  }

  async getStrategyRiskMetrics(strategyId) {
    // 模拟风险指标
    return {
      var95: Math.random() * 0.1 + 0.02,
      var99: Math.random() * 0.15 + 0.03,
      maxDrawdown: Math.random() * 0.25 + 0.05,
      volatility: Math.random() * 0.3 + 0.1
    };
  }

  async stopStrategy(strategyId) {
    // 停止策略执行
    console.log('停止策略:', strategyId);
  }
}

module.exports = StrategyService;
