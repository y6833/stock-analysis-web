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
   * @param {Object} turtleParams - 海龟交易参数 {period}
   * @return {Object} 技术指标结果
   */
  calculateComprehensiveSignals(klineData, turtleParams = null, maParams = null) {
    const { open, high, low, close } = klineData;
    const result = {
      movingAverages: {},
      signals: {},
      watershed: null,
      indicators: {},
      donchianChannel: {},
      maStrategy: {} // 单均线策略结果
    };

    try {
      // 1. 计算移动平均线系统
      const maPeriod = maParams?.period || 20;
      result.movingAverages = {
        ma5: this.calculateEMA(close, 5),
        ma10: this.calculateEMA(close, 10),
        ma20: this.calculateEMA(close, maPeriod), // 使用配置的均线周期
        ma30: this.calculateEMA(close, 30),
        ma60: this.calculateEMA(close, 60)
      };

      // 2. 计算单均线策略信号
      if (maParams) {
        result.maStrategy = this.calculateMASignals(
          close,
          result.movingAverages[`ma${maPeriod}`],
          maPeriod
        );
      }

      // 3. 计算分水岭指标
      const var37 = this.calculateTripleEMA(close, 2);
      const var47 = this.calculateMA(var37, 47).map(x => x * 0.99);
      result.watershed = this.calculateMA(var37, 13).map(x => x * 0.99);

      // 4. 计算海龟交易法则的唐奇安通道（包含风险管理）
      const turtlePeriod = turtleParams?.period || 20;
      const riskParams = {
        accountValue: turtleParams?.accountValue || 100000,
        riskPercent: turtleParams?.riskPercent || 0.02,
        atrMultiplier: turtleParams?.atrMultiplier || 2
      };
      result.donchianChannel = this.calculateDonchianChannel(high, low, close, turtlePeriod, riskParams);

      // 5. 计算买卖信号（包含海龟交易信号和单均线信号）
      result.signals = this.calculateTradingSignals(
        klineData, 
        result.movingAverages, 
        result.donchianChannel,
        result.maStrategy
      );

      // 6. 计算技术指标
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
   * @param {Object} donchianChannel - 唐奇安通道数据（可选）
   * @return {Object} 交易信号
   */
  calculateTradingSignals(klineData, mas, donchianChannel = null, maStrategy = null) {
    const { close, low, high } = klineData;
    const signals = {
      d2Signals: [],
      huntingSignals: [],
      reversalSignals: [],
      sellSignals: [],
      pivotSignals: [],
      turtleSignals: [], // 海龟交易信号
      maSignals: [] // 单均线策略信号
    };

    // 添加单均线策略信号
    if (maStrategy && maStrategy.signals) {
      signals.maSignals = maStrategy.signals;
    }

    // D2买入信号
    const ma4 = this.calculateMA(close, 4);
    const ma13 = this.calculateMA(close, 13);
    const ma18 = this.calculateMA(close, 18);

    for (let i = 1; i < close.length; i++) {
      // D2信号条件
      if (ma13[i] > ma18[i] &&
        close[i] > ma4[i] && close[i - 1] <= ma4[i - 1] &&
        ma4[i] < ma13[i]) {
        signals.d2Signals.push({
          index: i,
          price: low[i],
          type: 'buy',
          signal: 'D2',
          strength: 75,
          confidence: 70,
          timestamp: new Date().toISOString()
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
          signal: '猎庄',
          strength: 80,
          confidence: 75,
          timestamp: new Date().toISOString()
        });
      }
    }

    // 添加海龟交易信号（如果提供了唐奇安通道数据）
    if (donchianChannel && donchianChannel.signals) {
      signals.turtleSignals = donchianChannel.signals.map(signal => ({
        ...signal,
        id: `turtle_${signal.index}_${Date.now()}`
      }));
    }

    return signals;
  }

  /**
   * 计算唐奇安通道（海龟交易法则核心指标）
   * @param {Array} highs - 最高价数组
   * @param {Array} lows - 最低价数组
   * @param {Array} closes - 收盘价数组
   * @param {number} period - 突破周期，默认20
   * @param {Object} riskParams - 风险管理参数
   * @return {Object} 唐奇安通道数据和交易信号
   */
  calculateDonchianChannel(highs, lows, closes, period = 20, riskParams = {}) {
    if (!highs || !lows || !closes || highs.length === 0) {
      return { upband: [], dnband: [], signals: [], atr: [], riskManagement: {} };
    }

    const upband = []; // 上轨（period周期最高价）
    const dnband = []; // 下轨（period周期最低价）
    const signals = []; // 交易信号

    // 计算ATR用于风险管理
    const atr = this.calculateATR(
      highs, 
      lows, 
      closes, 
      riskParams.atrPeriod || 14
    );

    // 检查最大仓位限制
    const maxPositionPercent = riskParams.maxPositionPercent || 20;
    const maxPositionValue = riskParams.accountValue 
      ? (riskParams.accountValue * maxPositionPercent / 100)
      : Infinity;

    // 计算唐奇安通道上下轨
    for (let i = 0; i < closes.length; i++) {
      const start = Math.max(0, i - period + 1);
      const end = i + 1;

      // 计算period周期内的最高价和最低价
      upband[i] = Math.max(...highs.slice(start, end));
      dnband[i] = Math.min(...lows.slice(start, end));
    }

    // 生成海龟交易信号（增强版，包含风险管理）
    for (let i = 1; i < closes.length; i++) {
      const currentPrice = closes[i];
      const prevPrice = closes[i - 1];
      const prevUpband = upband[i - 1];
      const prevDnband = dnband[i - 1];
      const currentATR = atr[i] || 0;

      // 海龟买入条件：当前收盘价突破前一根K线的period周期最高价
      const buyCond = currentPrice > prevUpband;

      // 海龟卖出条件：当前收盘价跌破前一根K线的period周期最低价
      const sellCond = currentPrice < prevDnband;

      if (buyCond && currentATR > 0) {
        // 计算风险管理信息
        const positionInfo = this.calculatePositionSize(
          riskParams.accountValue || 100000,
          currentATR,
          currentPrice,
          riskParams.riskPercent || 0.02
        );
          
        // 应用最大仓位限制
        if (positionInfo.positionValue > maxPositionValue) {
          positionInfo.positionValue = maxPositionValue;
          positionInfo.shares = Math.floor(maxPositionValue / currentPrice);
          positionInfo.dollarRisk = positionInfo.shares * currentATR;
        }

        const stopLossInfo = this.calculateTurtleStopLoss(
          currentPrice,
          currentATR,
          'long',
          riskParams.atrMultiplier || 2
        );

        signals.push({
          index: i,
          signal: '海龟买入',
          type: 'buy',
          price: currentPrice,
          strength: this.calculateBreakoutStrength(currentPrice, prevUpband, upband[i], dnband[i]),
          confidence: 85,
          reason: `价格突破${period}周期高点 ¥${prevUpband.toFixed(2)}`,
          timestamp: new Date().toISOString(),
          atr: currentATR,
          riskManagement: {
            positionSize: positionInfo,
            stopLoss: stopLossInfo,
            riskReward: {
              risk: stopLossInfo.riskPercent,
              target: ((upband[i] - currentPrice) / currentPrice) * 100
            }
          }
        });
      }

      if (sellCond && currentATR > 0) {
        const positionInfo = this.calculatePositionSize(
          riskParams.accountValue || 100000,
          currentATR,
          currentPrice,
          riskParams.riskPercent || 0.02
        );

        const stopLossInfo = this.calculateTurtleStopLoss(
          currentPrice,
          currentATR,
          'short',
          riskParams.atrMultiplier || 2
        );

        signals.push({
          index: i,
          signal: '海龟卖出',
          type: 'sell',
          price: currentPrice,
          strength: this.calculateBreakoutStrength(prevDnband, currentPrice, upband[i], dnband[i]),
          confidence: 85,
          reason: `价格跌破${period}周期低点 ¥${prevDnband.toFixed(2)}`,
          timestamp: new Date().toISOString(),
          atr: currentATR,
          riskManagement: {
            positionSize: positionInfo,
            stopLoss: stopLossInfo,
            riskReward: {
              risk: stopLossInfo.riskPercent,
              target: ((currentPrice - dnband[i]) / currentPrice) * 100
            }
          }
        });
      }
    }

    return {
      upband,
      dnband,
      signals,
      atr,
      period,
      riskManagement: {
        currentATR: atr[atr.length - 1] || 0,
        volatility: this.calculateVolatility(closes),
        channelWidth: upband.length > 0 ? ((upband[upband.length - 1] - dnband[dnband.length - 1]) / dnband[dnband.length - 1]) * 100 : 0
      }
    };
  }

  /**
   * 计算价格波动率
   * @param {Array} prices - 价格数组
   * @param {number} period - 计算周期，默认20
   * @return {number} 波动率百分比
   */
  calculateVolatility(prices, period = 20) {
    if (!prices || prices.length < period) return 0;

    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }

    const recentReturns = returns.slice(-period);
    const mean = recentReturns.reduce((sum, r) => sum + r, 0) / recentReturns.length;
    const variance = recentReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / recentReturns.length;

    return Math.sqrt(variance) * Math.sqrt(252) * 100; // 年化波动率
  }

  /**
   * 计算突破强度
   * @param {number} price - 当前价格
   * @param {number} breakLevel - 突破位
   * @param {number} upband - 上轨
   * @param {number} dnband - 下轨
   * @return {number} 突破强度 (0-100)
   */
  calculateBreakoutStrength(price, breakLevel, upband, dnband) {
    const channelWidth = upband - dnband;
    if (channelWidth === 0) return 50;

    const breakoutDistance = Math.abs(price - breakLevel);
    const strength = Math.min(100, (breakoutDistance / channelWidth) * 100 + 50);

    return Math.round(strength);
  }

  /**
   * 计算ATR（平均真实波幅）
   * @param {Array} highs - 最高价数组
   * @param {Array} lows - 最低价数组
   * @param {Array} closes - 收盘价数组
   * @param {number} period - 计算周期，默认14
   * @return {Array} ATR值数组
   */
  calculateATR(highs, lows, closes, period = 14) {
    if (!highs || !lows || !closes || highs.length < 2) {
      return [];
    }

    const trueRanges = [];
    const atr = [];

    // 计算真实波幅（True Range）
    for (let i = 1; i < closes.length; i++) {
      const high = highs[i];
      const low = lows[i];
      const prevClose = closes[i - 1];

      const tr1 = high - low;
      const tr2 = Math.abs(high - prevClose);
      const tr3 = Math.abs(low - prevClose);

      trueRanges[i] = Math.max(tr1, tr2, tr3);
    }

    // 计算ATR（使用简单移动平均）
    for (let i = period; i < trueRanges.length; i++) {
      const start = i - period + 1;
      const end = i + 1;
      const avgTR = trueRanges.slice(start, end).reduce((sum, tr) => sum + tr, 0) / period;
      atr[i] = avgTR;
    }

    return atr;
  }

  /**
   * 计算海龟交易的仓位大小
   * @param {number} accountValue - 账户总价值
   * @param {number} atr - 当前ATR值
   * @param {number} price - 当前价格
   * @param {number} riskPercent - 风险百分比，默认2%
   * @return {Object} 仓位信息
   */
  calculatePositionSize(accountValue, atr, price, riskPercent = 0.02) {
    if (!accountValue || !atr || !price || atr === 0 || price === 0) {
      return {
        shares: 0,
        dollarRisk: 0,
        positionValue: 0,
        riskPerShare: atr
      };
    }

    // 海龟交易法则：每个单位的风险 = 1个ATR
    const dollarRisk = accountValue * riskPercent;
    const shares = Math.floor(dollarRisk / atr);
    const positionValue = shares * price;

    return {
      shares,
      dollarRisk,
      positionValue,
      riskPerShare: atr,
      positionPercent: (positionValue / accountValue) * 100
    };
  }

  /**
   * 计算海龟交易的止损位
   * @param {number} entryPrice - 入场价格
   * @param {number} atr - ATR值
   * @param {string} direction - 交易方向 'long' 或 'short'
   * @param {number} atrMultiplier - ATR倍数，默认2
   * @return {Object} 止损信息
   */
  calculateTurtleStopLoss(entryPrice, atr, direction = 'long', atrMultiplier = 2) {
    if (!entryPrice || !atr) {
      return {
        stopPrice: entryPrice,
        stopDistance: 0,
        riskPercent: 0
      };
    }

    let stopPrice;
    if (direction === 'long') {
      stopPrice = entryPrice - (atr * atrMultiplier);
    } else {
      stopPrice = entryPrice + (atr * atrMultiplier);
    }

    const stopDistance = Math.abs(entryPrice - stopPrice);
    const riskPercent = (stopDistance / entryPrice) * 100;

    return {
      stopPrice: Math.max(0, stopPrice),
      stopDistance,
      riskPercent
    };
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

    // 计算海龟交易法则的唐奇安通道
    const donchianChannel = this.calculateDonchianChannel(high, low, close, 20);

    return {
      ak1: ak1Ema,
      ak: akEma,
      stochastic: {
        k: ak1Ema,
        d: akEma
      },
      // 添加海龟交易法则指标
      donchianChannel
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

  /**
   * 计算单均线策略信号
   * @param {Array} prices - 价格数组
   * @param {Array} ma - 均线数组
   * @param {number} period - 均线周期
   * @return {Object} 信号结果
   */
  calculateMASignals(prices, ma, period) {
    if (!prices || !ma || prices.length !== ma.length) {
      return { signals: [], crossovers: [], crossunders: [] };
    }

    const signals = [];
    const crossovers = [];
    const crossunders = [];

    for (let i = 1; i < prices.length; i++) {
      // 检测上穿: 前一根K线收盘价在均线下，当前K线收盘价在均线上
      const crossOver = prices[i-1] < ma[i-1] && prices[i] >= ma[i];
      // 检测下穿: 前一根K线收盘价在均线上，当前K线收盘价在均线下
      const crossUnder = prices[i-1] > ma[i-1] && prices[i] <= ma[i];

      if (crossOver) {
        crossovers.push(i);
        signals.push({
          index: i,
          signal: `MA${period}买入`,
          type: 'buy',
          price: prices[i],
          strength: 70,
          confidence: 65,
          reason: `价格上穿${period}日均线`,
          timestamp: new Date().toISOString()
        });
      }

      if (crossUnder) {
        crossunders.push(i);
        signals.push({
          index: i,
          signal: `MA${period}卖出`, 
          type: 'sell',
          price: prices[i],
          strength: 70,
          confidence: 65,
          reason: `价格下穿${period}日均线`,
          timestamp: new Date().toISOString()
        });
      }
    }

    return {
      signals,
      crossovers,
      crossunders,
      currentPosition: signals.length > 0 ? signals[signals.length-1].type : 'none'
    };
  }
}

module.exports = TechnicalIndicatorsService;
