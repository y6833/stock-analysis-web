'use strict';

const { Service } = require('egg');

/**
 * 技术指标计算服务
 * 实现通达信风格的技术分析指标
 */
class TechnicalIndicatorsService extends Service {
  
  /**
   * 计算指数移动平均线 (EMA)
   * @param {Array} data - 价格数据
   * @param {number} period - 周期
   * @return {Array} EMA值数组
   */
  calculateEMA(data, period) {
    if (!data || data.length === 0) return [];
    
    const ema = [];
    const multiplier = 2 / (period + 1);
    
    // 第一个值使用简单平均
    ema[0] = data[0];
    
    for (let i = 1; i < data.length; i++) {
      ema[i] = (data[i] * multiplier) + (ema[i - 1] * (1 - multiplier));
    }
    
    return ema;
  }

  /**
   * 计算简单移动平均线 (MA)
   * @param {Array} data - 价格数据
   * @param {number} period - 周期
   * @return {Array} MA值数组
   */
  calculateMA(data, period) {
    if (!data || data.length < period) return [];
    
    const ma = [];
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      ma.push(sum / period);
    }
    
    return ma;
  }

  /**
   * 计算SMA (平滑移动平均)
   * @param {Array} data - 数据
   * @param {number} period - 周期
   * @param {number} weight - 权重
   * @return {Array} SMA值数组
   */
  calculateSMA(data, period, weight = 1) {
    if (!data || data.length === 0) return [];
    
    const sma = [];
    sma[0] = data[0];
    
    for (let i = 1; i < data.length; i++) {
      sma[i] = (data[i] * weight + sma[i - 1] * (period - weight)) / period;
    }
    
    return sma;
  }

  /**
   * 计算最高价和最低价
   * @param {Array} highs - 最高价数组
   * @param {Array} lows - 最低价数组
   * @param {number} period - 周期
   * @return {Object} {hhv: 最高价数组, llv: 最低价数组}
   */
  calculateHHVLLV(highs, lows, period) {
    const hhv = [];
    const llv = [];
    
    for (let i = 0; i < highs.length; i++) {
      const start = Math.max(0, i - period + 1);
      const end = i + 1;
      
      hhv[i] = Math.max(...highs.slice(start, end));
      llv[i] = Math.min(...lows.slice(start, end));
    }
    
    return { hhv, llv };
  }

  /**
   * 计算综合技术指标信号
   * @param {Object} klineData - K线数据 {open, high, low, close, volume}
   * @return {Object} 技术指标结果
   */
  calculateComprehensiveSignals(klineData) {
    const { open, high, low, close } = klineData;
    const result = {
      movingAverages: {},
      signals: {},
      watershed: null,
      indicators: {}
    };

    try {
      // 1. 计算移动平均线系统
      result.movingAverages = {
        ma5: this.calculateEMA(close, 5),
        ma10: this.calculateEMA(close, 10),
        ma30: this.calculateEMA(close, 30),
        ma60: this.calculateEMA(close, 60)
      };

      // 2. 计算分水岭指标
      const var37 = this.calculateTripleEMA(close, 2);
      const var47 = this.calculateMA(var37, 47).map(x => x * 0.99);
      result.watershed = this.calculateMA(var37, 13).map(x => x * 0.99);

      // 3. 计算买卖信号
      result.signals = this.calculateTradingSignals(klineData, result.movingAverages);

      // 4. 计算技术指标
      result.indicators = this.calculateTechnicalIndicators(klineData);

      return result;
    } catch (error) {
      this.ctx.logger.error('计算技术指标失败:', error);
      throw error;
    }
  }

  /**
   * 计算三重EMA平滑
   * @param {Array} data - 价格数据
   * @param {number} period - 周期
   * @return {Array} 三重平滑结果
   */
  calculateTripleEMA(data, period) {
    const ema1 = this.calculateEMA(data, period);
    const ema2 = this.calculateEMA(ema1, period);
    const ema3 = this.calculateEMA(ema2, period);
    return ema3;
  }

  /**
   * 计算交易信号
   * @param {Object} klineData - K线数据
   * @param {Object} mas - 移动平均线数据
   * @return {Object} 交易信号
   */
  calculateTradingSignals(klineData, mas) {
    const { close, low, high } = klineData;
    const signals = {
      d2Signals: [],
      huntingSignals: [],
      reversalSignals: [],
      sellSignals: [],
      pivotSignals: []
    };

    // D2买入信号
    const ma4 = this.calculateMA(close, 4);
    const ma13 = this.calculateMA(close, 13);
    const ma18 = this.calculateMA(close, 18);

    for (let i = 1; i < close.length; i++) {
      // D2信号条件
      if (ma13[i] > ma18[i] && 
          close[i] > ma4[i] && close[i-1] <= ma4[i-1] && 
          ma4[i] < ma13[i]) {
        signals.d2Signals.push({
          index: i,
          price: low[i],
          type: 'buy',
          signal: 'D2'
        });
      }
    }

    // 猎庄信号
    const ma3 = this.calculateMA(close, 3);
    const ma6 = this.calculateMA(close, 6);
    const ma12 = this.calculateMA(close, 12);

    for (let i = 1; i < close.length; i++) {
      const b36 = ma3[i] - ma6[i];
      const b612 = ma6[i] - ma12[i];
      const j = (b36 / close[i]) * 10;
      const j1 = (b612 / close[i]) * 10;

      if (j < -0.2 && j1 < -0.2 && j > j1 && (i === 0 || j <= j1)) {
        signals.huntingSignals.push({
          index: i,
          price: low[i],
          type: 'buy',
          signal: '猎庄'
        });
      }
    }

    return signals;
  }

  /**
   * 计算技术指标
   * @param {Object} klineData - K线数据
   * @return {Object} 技术指标结果
   */
  calculateTechnicalIndicators(klineData) {
    const { close, high, low } = klineData;
    
    // 随机指标计算
    const { hhv: hhv22, llv: llv22 } = this.calculateHHVLLV(high, low, 22);
    const { hhv: hhv34, llv: llv55 } = this.calculateHHVLLV(high, low, 34);
    const { llv: llv55_2 } = this.calculateHHVLLV(high, low, 55);

    const ak1 = [];
    const ak = [];
    
    for (let i = 0; i < close.length; i++) {
      if (hhv22[i] !== llv22[i]) {
        ak1[i] = ((close[i] - llv22[i]) / (hhv22[i] - llv22[i])) * 100;
      } else {
        ak1[i] = 50;
      }
      
      if (hhv22[i] !== llv22[i]) {
        ak[i] = ((close[i] - llv22[i]) / (hhv22[i] - llv22[i])) * 50;
      } else {
        ak[i] = 25;
      }
    }

    const ak1Ema = this.calculateEMA(ak1, 5);
    const akEma = this.calculateEMA(ak, 13);

    return {
      ak1: ak1Ema,
      ak: akEma,
      stochastic: {
        k: ak1Ema,
        d: akEma
      }
    };
  }

  /**
   * 检测交叉信号
   * @param {Array} line1 - 线1数据
   * @param {Array} line2 - 线2数据
   * @param {number} index - 当前索引
   * @return {boolean} 是否发生上穿
   */
  isCrossUp(line1, line2, index) {
    if (index === 0) return false;
    return line1[index] > line2[index] && line1[index - 1] <= line2[index - 1];
  }

  /**
   * 检测交叉信号
   * @param {Array} line1 - 线1数据
   * @param {Array} line2 - 线2数据
   * @param {number} index - 当前索引
   * @return {boolean} 是否发生下穿
   */
  isCrossDown(line1, line2, index) {
    if (index === 0) return false;
    return line1[index] < line2[index] && line1[index - 1] >= line2[index - 1];
  }
}

module.exports = TechnicalIndicatorsService;
