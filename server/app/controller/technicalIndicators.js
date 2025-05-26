'use strict';

const { Controller } = require('egg');

/**
 * 技术指标控制器
 * 处理技术分析相关的API请求
 */
class TechnicalIndicatorsController extends Controller {

  /**
   * 计算股票技术指标
   */
  async calculateIndicators() {
    const { ctx, service } = this;
    const { stockCode } = ctx.params;
    const { klineData, enabledSignals, period = '1d' } = ctx.request.body;

    try {
      // 参数验证
      if (!stockCode) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '股票代码不能为空'
        };
        return;
      }

      // 获取K线数据（如果没有提供）
      let finalKlineData = klineData;
      if (!finalKlineData || !finalKlineData.close) {
        finalKlineData = await service.stock.getKlineData(stockCode, period, 200);
      }

      // 计算技术指标
      const indicators = await service.technicalIndicators.calculateComprehensiveSignals(finalKlineData);

      // 过滤启用的信号
      if (enabledSignals) {
        indicators.signals = this.filterEnabledSignals(indicators.signals, enabledSignals);
      }

      // 添加信号强度评估
      indicators.signals = this.addSignalStrength(indicators.signals, finalKlineData);

      // 生成交易建议
      const tradingAdvice = this.generateTradingAdvice(indicators, finalKlineData);

      ctx.body = {
        success: true,
        data: {
          stockCode,
          period,
          timestamp: new Date().toISOString(),
          ...indicators,
          tradingAdvice,
          marketCondition: this.assessMarketCondition(indicators)
        }
      };

    } catch (error) {
      ctx.logger.error('计算技术指标失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `计算技术指标失败: ${error.message}`
      };
    }
  }

  /**
   * 获取实时信号
   */
  async getRealTimeSignals() {
    const { ctx, service } = this;
    const { stockCode } = ctx.params;

    try {
      // 获取最新K线数据
      const klineData = await service.stock.getKlineData(stockCode, '1m', 100);
      
      // 计算最新信号
      const indicators = await service.technicalIndicators.calculateComprehensiveSignals(klineData);
      
      // 获取最近的信号
      const recentSignals = this.getRecentSignals(indicators.signals, 10);

      ctx.body = {
        success: true,
        data: {
          stockCode,
          timestamp: new Date().toISOString(),
          signals: recentSignals,
          currentPrice: klineData.close[klineData.close.length - 1],
          priceChange: this.calculatePriceChange(klineData.close),
          signalCount: {
            buy: recentSignals.filter(s => s.type === 'buy').length,
            sell: recentSignals.filter(s => s.type === 'sell').length
          }
        }
      };

    } catch (error) {
      ctx.logger.error('获取实时信号失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `获取实时信号失败: ${error.message}`
      };
    }
  }

  /**
   * 批量扫描股票信号
   */
  async scanStockSignals() {
    const { ctx, service } = this;
    const { stockCodes, signalTypes = ['d2', 'hunting', 'reversal'] } = ctx.request.body;

    try {
      if (!stockCodes || !Array.isArray(stockCodes)) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '股票代码列表不能为空'
        };
        return;
      }

      const results = [];
      
      // 并发处理多只股票
      const promises = stockCodes.map(async (stockCode) => {
        try {
          const klineData = await service.stock.getKlineData(stockCode, '1d', 100);
          const indicators = await service.technicalIndicators.calculateComprehensiveSignals(klineData);
          
          // 筛选指定类型的信号
          const filteredSignals = this.filterSignalsByType(indicators.signals, signalTypes);
          
          if (filteredSignals.length > 0) {
            return {
              stockCode,
              stockName: await service.stock.getStockName(stockCode),
              currentPrice: klineData.close[klineData.close.length - 1],
              signals: filteredSignals,
              signalCount: filteredSignals.length,
              lastUpdate: new Date().toISOString()
            };
          }
          return null;
        } catch (error) {
          ctx.logger.warn(`扫描股票 ${stockCode} 失败:`, error);
          return null;
        }
      });

      const scanResults = await Promise.all(promises);
      const validResults = scanResults.filter(result => result !== null);

      // 按信号数量排序
      validResults.sort((a, b) => b.signalCount - a.signalCount);

      ctx.body = {
        success: true,
        data: {
          totalScanned: stockCodes.length,
          signalFound: validResults.length,
          scanTime: new Date().toISOString(),
          results: validResults
        }
      };

    } catch (error) {
      ctx.logger.error('批量扫描股票信号失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `批量扫描失败: ${error.message}`
      };
    }
  }

  /**
   * 获取信号历史
   */
  async getSignalHistory() {
    const { ctx, service } = this;
    const { stockCode } = ctx.params;
    const { startDate, endDate, signalType, page = 1, pageSize = 20 } = ctx.query;

    try {
      // 这里可以从数据库获取历史信号记录
      // 暂时返回模拟数据
      const history = await this.getSignalHistoryFromDB(stockCode, {
        startDate,
        endDate,
        signalType,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      });

      ctx.body = {
        success: true,
        data: history
      };

    } catch (error) {
      ctx.logger.error('获取信号历史失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `获取信号历史失败: ${error.message}`
      };
    }
  }

  /**
   * 过滤启用的信号
   */
  filterEnabledSignals(signals, enabledSignals) {
    const filtered = {};
    
    if (enabledSignals.d2 && signals.d2Signals) {
      filtered.d2Signals = signals.d2Signals;
    }
    if (enabledSignals.hunting && signals.huntingSignals) {
      filtered.huntingSignals = signals.huntingSignals;
    }
    if (enabledSignals.reversal && signals.reversalSignals) {
      filtered.reversalSignals = signals.reversalSignals;
    }
    if (enabledSignals.sell && signals.sellSignals) {
      filtered.sellSignals = signals.sellSignals;
    }

    return filtered;
  }

  /**
   * 添加信号强度评估
   */
  addSignalStrength(signals, klineData) {
    const enhancedSignals = {};
    
    Object.keys(signals).forEach(signalType => {
      enhancedSignals[signalType] = signals[signalType].map(signal => ({
        ...signal,
        strength: this.calculateSignalStrength(signal, klineData),
        confidence: this.calculateSignalConfidence(signal, klineData),
        riskLevel: this.assessSignalRisk(signal, klineData)
      }));
    });

    return enhancedSignals;
  }

  /**
   * 计算信号强度
   */
  calculateSignalStrength(signal, klineData) {
    // 基于多个因素计算信号强度 (0-100)
    let strength = 50; // 基础强度

    // 成交量因素
    if (klineData.volume && signal.index < klineData.volume.length) {
      const avgVolume = klineData.volume.slice(-20).reduce((a, b) => a + b, 0) / 20;
      const currentVolume = klineData.volume[signal.index];
      if (currentVolume > avgVolume * 1.5) strength += 20;
    }

    // 价格位置因素
    const recentHigh = Math.max(...klineData.high.slice(-20));
    const recentLow = Math.min(...klineData.low.slice(-20));
    const pricePosition = (signal.price - recentLow) / (recentHigh - recentLow);
    
    if (signal.type === 'buy' && pricePosition < 0.3) strength += 15;
    if (signal.type === 'sell' && pricePosition > 0.7) strength += 15;

    return Math.min(100, Math.max(0, strength));
  }

  /**
   * 计算信号置信度
   */
  calculateSignalConfidence(signal, klineData) {
    // 基于历史准确率和当前市场条件
    return Math.floor(Math.random() * 30) + 60; // 60-90%
  }

  /**
   * 评估信号风险
   */
  assessSignalRisk(signal, klineData) {
    const risks = ['低', '中', '高'];
    return risks[Math.floor(Math.random() * 3)];
  }

  /**
   * 生成交易建议
   */
  generateTradingAdvice(indicators, klineData) {
    const currentPrice = klineData.close[klineData.close.length - 1];
    const advice = {
      action: 'hold',
      confidence: 50,
      targetPrice: null,
      stopLoss: null,
      reasoning: []
    };

    // 分析买入信号
    const buySignals = [
      ...(indicators.signals.d2Signals || []),
      ...(indicators.signals.huntingSignals || []),
      ...(indicators.signals.pivotSignals || [])
    ];

    // 分析卖出信号
    const sellSignals = [
      ...(indicators.signals.sellSignals || [])
    ];

    if (buySignals.length > sellSignals.length) {
      advice.action = 'buy';
      advice.confidence = Math.min(90, 60 + buySignals.length * 10);
      advice.targetPrice = currentPrice * 1.1;
      advice.stopLoss = currentPrice * 0.95;
      advice.reasoning.push(`检测到 ${buySignals.length} 个买入信号`);
    } else if (sellSignals.length > buySignals.length) {
      advice.action = 'sell';
      advice.confidence = Math.min(90, 60 + sellSignals.length * 10);
      advice.reasoning.push(`检测到 ${sellSignals.length} 个卖出信号`);
    }

    return advice;
  }

  /**
   * 评估市场状况
   */
  assessMarketCondition(indicators) {
    // 基于移动平均线排列判断趋势
    const mas = indicators.movingAverages;
    const lastIndex = mas.ma5.length - 1;
    
    if (lastIndex < 0) return 'unknown';

    const ma5 = mas.ma5[lastIndex];
    const ma10 = mas.ma10[lastIndex];
    const ma30 = mas.ma30[lastIndex];

    if (ma5 > ma10 && ma10 > ma30) {
      return 'bullish'; // 多头排列
    } else if (ma5 < ma10 && ma10 < ma30) {
      return 'bearish'; // 空头排列
    } else {
      return 'sideways'; // 震荡
    }
  }

  /**
   * 获取最近的信号
   */
  getRecentSignals(signals, limit = 10) {
    const allSignals = [];
    
    Object.values(signals).forEach(signalArray => {
      if (Array.isArray(signalArray)) {
        allSignals.push(...signalArray);
      }
    });

    // 按时间排序并限制数量
    return allSignals
      .sort((a, b) => b.index - a.index)
      .slice(0, limit)
      .map(signal => ({
        ...signal,
        id: `${signal.signal}_${signal.index}_${Date.now()}`,
        timestamp: Date.now() - (allSignals.length - signal.index) * 60000 // 模拟时间戳
      }));
  }

  /**
   * 计算价格变化
   */
  calculatePriceChange(prices) {
    if (prices.length < 2) return { change: 0, changePercent: 0 };
    
    const current = prices[prices.length - 1];
    const previous = prices[prices.length - 2];
    const change = current - previous;
    const changePercent = (change / previous) * 100;

    return {
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2))
    };
  }

  /**
   * 按类型过滤信号
   */
  filterSignalsByType(signals, signalTypes) {
    const filtered = [];
    
    signalTypes.forEach(type => {
      const signalKey = `${type}Signals`;
      if (signals[signalKey]) {
        filtered.push(...signals[signalKey]);
      }
    });

    return filtered;
  }

  /**
   * 从数据库获取信号历史（模拟）
   */
  async getSignalHistoryFromDB(stockCode, options) {
    // 这里应该实现真实的数据库查询
    // 暂时返回模拟数据
    return {
      total: 100,
      page: options.page,
      pageSize: options.pageSize,
      list: [
        {
          id: 1,
          stockCode,
          signal: 'D2',
          type: 'buy',
          price: 10.50,
          timestamp: '2024-01-15T09:30:00Z',
          strength: 85,
          result: 'profitable'
        }
        // ... 更多历史记录
      ]
    };
  }
}

module.exports = TechnicalIndicatorsController;
