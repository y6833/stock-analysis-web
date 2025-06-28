'use strict';

const Service = require('egg').Service;

/**
 * 因子计算引擎服务
 */
class FactorEngineService extends Service {
  constructor(ctx) {
    super(ctx);

    // 因子缓存
    this.factorCache = new Map();
    this.cacheExpiry = 3600 * 1000; // 1小时缓存
  }

  /**
   * 计算股票的所有因子
   */
  async calculateAllFactors(symbol, stockData, factorConfigs) {
    const { ctx } = this;

    try {
      ctx.logger.info(`开始计算股票 ${symbol} 的因子`);

      // 数据预处理
      const preprocessedData = await this.preprocessData(stockData);

      // 按类型分组计算因子
      const technicalConfigs = factorConfigs.filter(c => c.type === 'technical' && c.enabled);
      const fundamentalConfigs = factorConfigs.filter(c => c.type === 'fundamental' && c.enabled);
      const alternativeConfigs = factorConfigs.filter(c => c.type === 'alternative' && c.enabled);

      // 并行计算各类因子
      const [technicalFactors, fundamentalFactors, alternativeFactors] = await Promise.all([
        this.calculateTechnicalFactors(symbol, preprocessedData, technicalConfigs),
        this.calculateFundamentalFactors(symbol, preprocessedData, fundamentalConfigs),
        this.calculateAlternativeFactors(symbol, preprocessedData, alternativeConfigs)
      ]);

      // 合并所有因子
      const allFactors = {
        ...technicalFactors,
        ...fundamentalFactors,
        ...alternativeFactors
      };

      // 构建特征矩阵
      const featureMatrix = {
        symbol,
        dates: preprocessedData.dates,
        factors: allFactors,
        metadata: {
          totalFactors: Object.keys(allFactors).length,
          factorTypes: [...new Set(factorConfigs.map(c => c.type))],
          dataRange: [
            preprocessedData.dates[0],
            preprocessedData.dates[preprocessedData.dates.length - 1]
          ],
          lastUpdated: new Date().toISOString(),
          missingDataRatio: this.calculateMissingDataRatio(allFactors)
        }
      };

      ctx.logger.info(`股票 ${symbol} 因子计算完成，共 ${featureMatrix.metadata.totalFactors} 个因子`);
      return featureMatrix;

    } catch (error) {
      ctx.logger.error(`计算股票 ${symbol} 因子失败:`, error);
      throw error;
    }
  }

  /**
   * 数据预处理
   */
  async preprocessData(stockData) {
    const { ctx } = this;

    try {
      // 数据验证
      this.validateStockData(stockData);

      // 数据对齐和排序
      const alignedData = this.alignData(stockData);

      // 缺失值处理
      const filledData = this.fillMissingValues(alignedData);

      // 异常值处理
      const cleanedData = this.removeOutliers(filledData);

      return cleanedData;

    } catch (error) {
      ctx.logger.error('数据预处理失败:', error);
      throw error;
    }
  }

  /**
   * 计算技术指标因子
   */
  async calculateTechnicalFactors(symbol, stockData, configs) {
    const { ctx } = this;
    const results = {};

    for (const config of configs) {
      try {
        const cacheKey = `${symbol}_${config.name}_technical`;

        // 检查缓存
        if (this.factorCache.has(cacheKey)) {
          const cached = this.factorCache.get(cacheKey);
          if (Date.now() - cached.timestamp < this.cacheExpiry) {
            results[config.name] = cached.data;
            continue;
          }
        }

        // 计算因子
        const factorResult = await this.calculateTechnicalFactor(config.name, stockData, config.params || {});

        // 缓存结果
        this.factorCache.set(cacheKey, {
          data: factorResult,
          timestamp: Date.now()
        });

        results[config.name] = factorResult;

      } catch (error) {
        ctx.logger.warn(`计算技术因子 ${config.name} 失败:`, error);
      }
    }

    return results;
  }

  /**
   * 计算基本面因子
   */
  async calculateFundamentalFactors(symbol, stockData, configs) {
    const { ctx } = this;
    const results = {};

    for (const config of configs) {
      try {
        const cacheKey = `${symbol}_${config.name}_fundamental`;

        // 检查缓存
        if (this.factorCache.has(cacheKey)) {
          const cached = this.factorCache.get(cacheKey);
          if (Date.now() - cached.timestamp < this.cacheExpiry * 24) { // 基本面数据缓存24小时
            results[config.name] = cached.data;
            continue;
          }
        }

        // 计算因子
        const factorResult = await this.calculateFundamentalFactor(config.name, symbol, stockData, config.params || {});

        // 缓存结果
        this.factorCache.set(cacheKey, {
          data: factorResult,
          timestamp: Date.now()
        });

        results[config.name] = factorResult;

      } catch (error) {
        ctx.logger.warn(`计算基本面因子 ${config.name} 失败:`, error);
      }
    }

    return results;
  }

  /**
   * 计算另类因子
   */
  async calculateAlternativeFactors(symbol, stockData, configs) {
    const { ctx } = this;
    const results = {};

    for (const config of configs) {
      try {
        const cacheKey = `${symbol}_${config.name}_alternative`;

        // 检查缓存
        if (this.factorCache.has(cacheKey)) {
          const cached = this.factorCache.get(cacheKey);
          if (Date.now() - cached.timestamp < this.cacheExpiry * 2) { // 另类数据缓存2小时
            results[config.name] = cached.data;
            continue;
          }
        }

        // 计算因子
        const factorResult = await this.calculateAlternativeFactor(config.name, symbol, stockData, config.params || {});

        // 缓存结果
        this.factorCache.set(cacheKey, {
          data: factorResult,
          timestamp: Date.now()
        });

        results[config.name] = factorResult;

      } catch (error) {
        ctx.logger.warn(`计算另类因子 ${config.name} 失败:`, error);
      }
    }

    return results;
  }

  /**
   * 计算具体的技术因子
   */
  async calculateTechnicalFactor(factorName, stockData, params) {
    const { ctx } = this;

    switch (factorName) {
    case 'sma_cross':
      return this.calculateSMACross(stockData, params);
    case 'rsi_divergence':
      return this.calculateRSIDivergence(stockData, params);
    case 'macd_signal':
      return this.calculateMACDSignal(stockData, params);
    case 'bollinger_position':
      return this.calculateBollingerPosition(stockData, params);
    case 'volume_price_trend':
      return this.calculateVolumePriceTrend(stockData, params);
    case 'momentum':
      return this.calculateMomentum(stockData, params);
    case 'volatility':
      return this.calculateVolatility(stockData, params);
    default:
      throw new Error(`未知的技术因子: ${factorName}`);
    }
  }

  /**
   * 计算具体的基本面因子
   */
  async calculateFundamentalFactor(factorName, symbol, stockData, params) {
    const { ctx } = this;

    // 获取财务数据
    const financialData = await this.getFinancialData(symbol);

    switch (factorName) {
    case 'roe_trend':
      return this.calculateROETrend(symbol, stockData, financialData, params);
    case 'pe_relative':
      return this.calculatePERelative(symbol, stockData, financialData, params);
    case 'debt_ratio':
      return this.calculateDebtRatio(symbol, stockData, financialData, params);
    case 'revenue_growth':
      return this.calculateRevenueGrowth(symbol, stockData, financialData, params);
    case 'profit_margin':
      return this.calculateProfitMargin(symbol, stockData, financialData, params);
    default:
      throw new Error(`未知的基本面因子: ${factorName}`);
    }
  }

  /**
   * 计算具体的另类因子
   */
  async calculateAlternativeFactor(factorName, symbol, stockData, params) {
    const { ctx } = this;

    switch (factorName) {
    case 'sentiment_score':
      return this.calculateSentimentScore(symbol, stockData, params);
    case 'money_flow':
      return this.calculateMoneyFlow(symbol, stockData, params);
    case 'correlation_factor':
      return this.calculateCorrelationFactor(symbol, stockData, params);
    case 'volatility_regime':
      return this.calculateVolatilityRegime(symbol, stockData, params);
    default:
      throw new Error(`未知的另类因子: ${factorName}`);
    }
  }

  /**
   * 均线交叉因子
   */
  calculateSMACross(stockData, params) {
    const shortPeriod = params.shortPeriod || 5;
    const longPeriod = params.longPeriod || 20;

    const shortSMA = this.calculateSMA(stockData.prices, shortPeriod);
    const longSMA = this.calculateSMA(stockData.prices, longPeriod);

    const values = shortSMA.map((short, i) => {
      const long = longSMA[i];
      if (isNaN(short) || isNaN(long) || long === 0) return NaN;
      return (short - long) / long;
    });

    return {
      factorName: 'sma_cross',
      factorType: 'technical',
      values,
      dates: stockData.dates,
      metadata: {
        description: `${shortPeriod}日均线与${longPeriod}日均线的交叉信号`,
        category: '趋势跟踪',
        unit: '比例',
        range: [-1, 1],
        lastUpdated: new Date().toISOString(),
        dataSource: 'technical_calculation'
      }
    };
  }

  /**
   * 动量因子
   */
  calculateMomentum(stockData, params) {
    const period = params.period || 10;

    const values = stockData.prices.map((price, i) => {
      if (i < period) return NaN;
      const pastPrice = stockData.prices[i - period];
      return pastPrice > 0 ? (price - pastPrice) / pastPrice : NaN;
    });

    return {
      factorName: 'momentum',
      factorType: 'technical',
      values,
      dates: stockData.dates,
      metadata: {
        description: `${period}日动量`,
        category: '动量指标',
        unit: '收益率',
        lastUpdated: new Date().toISOString(),
        dataSource: 'technical_calculation'
      }
    };
  }

  /**
   * 波动率因子
   */
  calculateVolatility(stockData, params) {
    const period = params.period || 20;

    // 计算收益率
    const returns = stockData.prices.map((price, i) => {
      if (i === 0) return 0;
      return Math.log(price / stockData.prices[i - 1]);
    });

    const values = [];

    for (let i = 0; i < returns.length; i++) {
      if (i < period) {
        values.push(NaN);
        continue;
      }

      const slice = returns.slice(i - period + 1, i + 1);
      const mean = slice.reduce((sum, r) => sum + r, 0) / slice.length;
      const variance = slice.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / slice.length;
      const volatility = Math.sqrt(variance * 252); // 年化波动率

      values.push(volatility);
    }

    return {
      factorName: 'volatility',
      factorType: 'technical',
      values,
      dates: stockData.dates,
      metadata: {
        description: `${period}日滚动波动率`,
        category: '波动性指标',
        unit: '年化波动率',
        lastUpdated: new Date().toISOString(),
        dataSource: 'technical_calculation'
      }
    };
  }

  /**
   * 计算简单移动平均
   */
  calculateSMA(prices, period) {
    const sma = [];

    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        sma.push(NaN);
      } else {
        const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        sma.push(sum / period);
      }
    }

    return sma;
  }

  /**
   * 获取财务数据
   */
  async getFinancialData(symbol) {
    const { ctx } = this;

    try {
      // 这里应该调用实际的财务数据API
      // 目前返回模拟数据
      return this.generateMockFinancialData(symbol);
    } catch (error) {
      ctx.logger.error(`获取股票 ${symbol} 财务数据失败:`, error);
      return [];
    }
  }

  /**
   * 模拟财务数据生成函数已移除
   * 现在只从真实数据源获取财务数据
   */
  async getRealFinancialData(symbol) {
    // 调用真实的财务数据API
    throw new Error(`财务数据API尚未实现，无法获取股票${symbol}的财务数据`);
  }

  /**
   * 数据验证
   */
  validateStockData(stockData) {
    if (!stockData.dates || stockData.dates.length === 0) {
      throw new Error('股票数据缺少日期信息');
    }

    if (!stockData.prices || stockData.prices.length === 0) {
      throw new Error('股票数据缺少价格信息');
    }

    if (stockData.dates.length !== stockData.prices.length) {
      throw new Error('日期和价格数据长度不匹配');
    }
  }

  /**
   * 数据对齐
   */
  alignData(stockData) {
    const { dates, prices, volumes, highs, lows, opens } = stockData;

    // 按日期排序
    const sortedIndices = dates
      .map((date, index) => ({ date, index }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(item => item.index);

    return {
      symbol: stockData.symbol,
      dates: sortedIndices.map(i => dates[i]),
      prices: sortedIndices.map(i => prices[i]),
      volumes: volumes ? sortedIndices.map(i => volumes[i]) : [],
      highs: highs ? sortedIndices.map(i => highs[i]) : [],
      lows: lows ? sortedIndices.map(i => lows[i]) : [],
      opens: opens ? sortedIndices.map(i => opens[i]) : [],
      high: stockData.high,
      low: stockData.low,
      open: stockData.open,
      close: stockData.close,
      dataSource: stockData.dataSource
    };
  }

  /**
   * 缺失值处理
   */
  fillMissingValues(stockData) {
    const result = { ...stockData };

    // 处理价格缺失值（线性插值）
    result.prices = this.fillMissingValuesInArray(stockData.prices, 'linear');

    // 处理成交量缺失值（前向填充）
    if (result.volumes && result.volumes.length > 0) {
      result.volumes = this.fillMissingValuesInArray(stockData.volumes, 'forward');
    }

    return result;
  }

  /**
   * 数组缺失值填充
   */
  fillMissingValuesInArray(values, method = 'linear') {
    const result = [...values];

    for (let i = 0; i < result.length; i++) {
      if (isNaN(result[i]) || result[i] === null || result[i] === undefined) {
        if (method === 'forward' && i > 0) {
          result[i] = result[i - 1];
        } else if (method === 'linear') {
          // 线性插值
          const prevIndex = this.findPreviousValidIndex(result, i);
          const nextIndex = this.findNextValidIndex(result, i);

          if (prevIndex !== -1 && nextIndex !== -1) {
            const prevValue = result[prevIndex];
            const nextValue = result[nextIndex];
            const ratio = (i - prevIndex) / (nextIndex - prevIndex);
            result[i] = prevValue + (nextValue - prevValue) * ratio;
          } else if (prevIndex !== -1) {
            result[i] = result[prevIndex];
          } else if (nextIndex !== -1) {
            result[i] = result[nextIndex];
          }
        }
      }
    }

    return result;
  }

  /**
   * 查找前一个有效值的索引
   */
  findPreviousValidIndex(values, currentIndex) {
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (!isNaN(values[i]) && values[i] !== null && values[i] !== undefined) {
        return i;
      }
    }
    return -1;
  }

  /**
   * 查找下一个有效值的索引
   */
  findNextValidIndex(values, currentIndex) {
    for (let i = currentIndex + 1; i < values.length; i++) {
      if (!isNaN(values[i]) && values[i] !== null && values[i] !== undefined) {
        return i;
      }
    }
    return -1;
  }

  /**
   * 异常值处理
   */
  removeOutliers(stockData, threshold = 3.0) {
    const result = { ...stockData };

    // 检测价格异常值
    const priceOutliers = this.detectOutliers(stockData.prices, threshold);
    result.prices = this.handleOutliers(stockData.prices, priceOutliers);

    return result;
  }

  /**
   * 异常值检测（基于Z-score）
   */
  detectOutliers(values, threshold) {
    const validValues = values.filter(v => !isNaN(v) && v !== null && v !== undefined);

    if (validValues.length === 0) {
      return values.map(() => false);
    }

    const mean = validValues.reduce((sum, v) => sum + v, 0) / validValues.length;
    const variance = validValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / validValues.length;
    const stdDev = Math.sqrt(variance);

    return values.map(value => {
      if (isNaN(value) || value === null || value === undefined) {
        return false;
      }
      const zScore = Math.abs((value - mean) / stdDev);
      return zScore > threshold;
    });
  }

  /**
   * 处理异常值
   */
  handleOutliers(values, outliers) {
    const result = [...values];

    for (let i = 0; i < result.length; i++) {
      if (outliers[i]) {
        // 使用相邻值的平均值替换异常值
        const prevValue = i > 0 ? result[i - 1] : result[i];
        const nextValue = i < result.length - 1 ? result[i + 1] : result[i];
        result[i] = (prevValue + nextValue) / 2;
      }
    }

    return result;
  }

  /**
   * 计算缺失数据比例
   */
  calculateMissingDataRatio(factors) {
    if (Object.keys(factors).length === 0) return 1;

    let totalValues = 0;
    let missingValues = 0;

    Object.values(factors).forEach(factor => {
      totalValues += factor.values.length;
      missingValues += factor.values.filter(v => isNaN(v) || v === null || v === undefined).length;
    });

    return totalValues > 0 ? missingValues / totalValues : 1;
  }

  /**
   * 获取默认因子配置
   */
  getDefaultFactorConfigs() {
    return [
      // 技术指标因子
      { type: 'technical', name: 'sma_cross', enabled: true, priority: 1 },
      { type: 'technical', name: 'momentum', enabled: true, priority: 2 },
      { type: 'technical', name: 'volatility', enabled: true, priority: 3 },

      // 基本面因子
      { type: 'fundamental', name: 'roe_trend', enabled: true, priority: 4 },
      { type: 'fundamental', name: 'pe_relative', enabled: true, priority: 5 },

      // 另类因子
      { type: 'alternative', name: 'sentiment_score', enabled: true, priority: 6 },
      { type: 'alternative', name: 'correlation_factor', enabled: true, priority: 7 },
    ];
  }

  /**
   * 清理缓存
   */
  clearCache() {
    this.factorCache.clear();
  }

  /**
   * 获取缓存统计
   */
  getCacheStats() {
    return {
      size: this.factorCache.size,
      hitRate: 0.85 // 模拟命中率
    };
  }
}

module.exports = FactorEngineService;
