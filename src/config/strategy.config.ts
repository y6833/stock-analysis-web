/**
 * 策略配置文件
 * 定义策略系统的各种配置参数和常量
 */

export const STRATEGY_CONFIG = {
  // 策略类型配置
  STRATEGY_TYPES: {
    factor: {
      name: '因子策略',
      description: '基于量化因子的选股策略',
      icon: 'TrendCharts',
      color: '#409EFF',
      category: 'quantitative'
    },
    ml: {
      name: '机器学习策略',
      description: '基于机器学习模型的选股策略',
      icon: 'DataAnalysis',
      color: '#67C23A',
      category: 'ai'
    },
    timing: {
      name: '择时策略',
      description: '基于技术指标的择时策略',
      icon: 'Timer',
      color: '#E6A23C',
      category: 'technical'
    },
    portfolio: {
      name: '组合策略',
      description: '多策略组合优化',
      icon: 'PieChart',
      color: '#F56C6C',
      category: 'portfolio'
    },
    arbitrage: {
      name: '套利策略',
      description: '价差套利和统计套利',
      icon: 'Switch',
      color: '#909399',
      category: 'arbitrage'
    },
    custom: {
      name: '自定义策略',
      description: '用户自定义策略逻辑',
      icon: 'Setting',
      color: '#606266',
      category: 'custom'
    }
  },

  // 风险等级配置
  RISK_LEVELS: {
    low: {
      name: '低风险',
      description: '保守型投资，追求稳定收益',
      color: '#67C23A',
      maxDrawdown: 0.1,
      volatility: 0.15,
      leverage: 1.0,
      concentration: 0.2
    },
    medium: {
      name: '中风险',
      description: '平衡型投资，收益风险并重',
      color: '#E6A23C',
      maxDrawdown: 0.2,
      volatility: 0.25,
      leverage: 1.5,
      concentration: 0.3
    },
    high: {
      name: '高风险',
      description: '激进型投资，追求高收益',
      color: '#F56C6C',
      maxDrawdown: 0.3,
      volatility: 0.35,
      leverage: 2.0,
      concentration: 0.4
    }
  },

  // 再平衡频率配置
  REBALANCE_FREQUENCY: {
    daily: {
      name: '每日',
      description: '每个交易日重新平衡',
      days: 1,
      color: '#F56C6C'
    },
    weekly: {
      name: '每周',
      description: '每周重新平衡',
      days: 7,
      color: '#E6A23C'
    },
    monthly: {
      name: '每月',
      description: '每月重新平衡',
      days: 30,
      color: '#409EFF'
    },
    quarterly: {
      name: '每季度',
      description: '每季度重新平衡',
      days: 90,
      color: '#67C23A'
    }
  },

  // 默认参数配置
  DEFAULT_PARAMS: {
    factor: {
      lookbackPeriod: 20,
      rebalancePeriod: 5,
      topN: 10,
      maxPositions: 10,
      factorWeights: [
        { factorName: 'momentum', weight: 0.3, direction: 'positive' },
        { factorName: 'volatility', weight: 0.2, direction: 'negative' },
        { factorName: 'volume_price_trend', weight: 0.2, direction: 'positive' },
        { factorName: 'rsi_divergence', weight: 0.15, direction: 'positive' },
        { factorName: 'macd_signal', weight: 0.15, direction: 'positive' }
      ],
      minScore: 0.6,
      maxWeight: 0.15
    },
    ml: {
      modelType: 'xgboost',
      maxFeatures: 10,
      trainPeriod: 60,
      retrainPeriod: 30,
      predictionHorizon: 5,
      threshold: 0.02,
      topN: 10,
      maxPositions: 10,
      featureSelection: 'auto',
      modelParams: {
        nEstimators: 100,
        maxDepth: 6,
        learningRate: 0.1,
        subsample: 0.8,
        colsampleBytree: 0.8
      },
      crossValidation: {
        enabled: true,
        folds: 5,
        testSize: 0.2
      }
    },
    timing: {
      indicators: ['sma', 'rsi', 'macd', 'bollinger'],
      period: 20,
      threshold: 0.7,
      stopLoss: 0.05,
      takeProfit: 0.15,
      maxHoldingPeriod: 30,
      minHoldingPeriod: 3,
      rsiOverbought: 70,
      rsiOversold: 30,
      macdSignalThreshold: 0.01
    },
    portfolio: {
      maxPositions: 10,
      rebalanceFrequency: 'weekly',
      riskBudget: 0.15,
      correlationThreshold: 0.7,
      optimizationMethod: 'mean_variance',
      constraints: {
        maxWeight: 0.2,
        minWeight: 0.02,
        sectorLimit: 0.3,
        turnoverLimit: 0.5
      }
    },
    arbitrage: {
      pairSelection: 'correlation',
      lookbackPeriod: 60,
      entryThreshold: 2.0,
      exitThreshold: 0.5,
      stopLoss: 3.0,
      maxHoldingPeriod: 20,
      minCorrelation: 0.8,
      maxSpread: 0.1
    }
  },

  // 性能指标配置
  PERFORMANCE_METRICS: {
    return: {
      totalReturn: { name: '总收益率', format: 'percent', precision: 2 },
      annualizedReturn: { name: '年化收益率', format: 'percent', precision: 2 },
      monthlyReturn: { name: '月收益率', format: 'percent', precision: 2 }
    },
    risk: {
      volatility: { name: '波动率', format: 'percent', precision: 2 },
      maxDrawdown: { name: '最大回撤', format: 'percent', precision: 2 },
      var95: { name: '95% VaR', format: 'percent', precision: 2 },
      var99: { name: '99% VaR', format: 'percent', precision: 2 }
    },
    ratio: {
      sharpeRatio: { name: '夏普比率', format: 'number', precision: 2 },
      calmarRatio: { name: '卡玛比率', format: 'number', precision: 2 },
      sortinoRatio: { name: '索提诺比率', format: 'number', precision: 2 },
      informationRatio: { name: '信息比率', format: 'number', precision: 2 }
    },
    trading: {
      winRate: { name: '胜率', format: 'percent', precision: 1 },
      profitFactor: { name: '盈亏比', format: 'number', precision: 2 },
      avgWin: { name: '平均盈利', format: 'percent', precision: 2 },
      avgLoss: { name: '平均亏损', format: 'percent', precision: 2 }
    }
  },

  // 基准指数配置
  BENCHMARKS: {
    '000300.SH': { name: '沪深300', description: '大盘蓝筹股指数' },
    '000905.SH': { name: '中证500', description: '中盘股指数' },
    '000852.SH': { name: '中证1000', description: '小盘股指数' },
    '399006.SZ': { name: '创业板指', description: '创业板综合指数' },
    '000001.SH': { name: '上证指数', description: '上海证券交易所综合指数' },
    '399001.SZ': { name: '深证成指', description: '深圳证券交易所成份指数' }
  },

  // 机器学习模型配置
  ML_MODELS: {
    xgboost: {
      name: 'XGBoost',
      description: '极端梯度提升算法',
      type: 'ensemble',
      complexity: 'medium',
      trainTime: 'fast'
    },
    lightgbm: {
      name: 'LightGBM',
      description: '轻量级梯度提升算法',
      type: 'ensemble',
      complexity: 'medium',
      trainTime: 'fast'
    },
    random_forest: {
      name: '随机森林',
      description: '随机森林分类器',
      type: 'ensemble',
      complexity: 'low',
      trainTime: 'medium'
    },
    svm: {
      name: '支持向量机',
      description: '支持向量机分类器',
      type: 'kernel',
      complexity: 'high',
      trainTime: 'slow'
    },
    neural_network: {
      name: '神经网络',
      description: '多层感知机',
      type: 'neural',
      complexity: 'high',
      trainTime: 'slow'
    },
    linear_regression: {
      name: '线性回归',
      description: '线性回归模型',
      type: 'linear',
      complexity: 'low',
      trainTime: 'fast'
    }
  },

  // 特征选择方法配置
  FEATURE_SELECTION: {
    auto: { name: '自动选择', description: '系统自动选择最优特征' },
    correlation: { name: '相关性分析', description: '基于相关性选择特征' },
    mutual_info: { name: '互信息', description: '基于互信息选择特征' },
    rfe: { name: '递归特征消除', description: '递归特征消除方法' },
    lasso: { name: 'Lasso正则化', description: 'L1正则化特征选择' },
    manual: { name: '手动选择', description: '用户手动指定特征' }
  },

  // 优化算法配置
  OPTIMIZATION_ALGORITHMS: {
    random_search: {
      name: '随机搜索',
      description: '随机参数搜索算法',
      complexity: 'low',
      speed: 'fast'
    },
    grid_search: {
      name: '网格搜索',
      description: '网格参数搜索算法',
      complexity: 'medium',
      speed: 'medium'
    },
    bayesian: {
      name: '贝叶斯优化',
      description: '贝叶斯参数优化算法',
      complexity: 'high',
      speed: 'slow'
    },
    genetic: {
      name: '遗传算法',
      description: '遗传算法优化',
      complexity: 'high',
      speed: 'slow'
    }
  },

  // 系统限制配置
  SYSTEM_LIMITS: {
    maxStrategies: 50,
    maxExecutionsPerDay: 100,
    maxOptimizationsPerDay: 10,
    maxBacktestPeriod: 1825, // 5年
    maxUniverseSize: 1000,
    maxPositions: 50,
    minCash: 10000,
    maxLeverage: 3.0
  }
}

// 策略状态枚举
export enum StrategyStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  OPTIMIZING = 'optimizing',
  PAUSED = 'paused'
}

// 信号动作枚举
export enum SignalAction {
  BUY = 'buy',
  SELL = 'sell',
  HOLD = 'hold'
}

// 优化目标枚举
export enum OptimizationObjective {
  RETURN = 'return',
  SHARPE = 'sharpe',
  CALMAR = 'calmar',
  SORTINO = 'sortino',
  MAX_DRAWDOWN = 'max_drawdown'
}

export default STRATEGY_CONFIG
