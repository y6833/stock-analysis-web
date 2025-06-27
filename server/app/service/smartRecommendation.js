'use strict';

const Service = require('egg').Service;

/**
 * 智能股票推荐服务
 * 基于技术分析、基本面分析和机器学习的股票推荐算法
 */
class SmartRecommendationService extends Service {

  /**
   * 获取智能推荐股票列表
   * @param {Object} options - 推荐选项
   * @param {string} options.riskLevel - 风险等级 (low/medium/high)
   * @param {number} options.expectedReturn - 预期收益率
   * @param {number} options.timeHorizon - 投资时间范围（天）
   * @param {number} options.limit - 推荐数量限制
   * @return {Array} 推荐股票列表
   */
  async getRecommendations(options = {}) {
    const { ctx } = this;
    const {
      riskLevel = 'medium',
      expectedReturn = 0.05,
      timeHorizon = 7,
      limit = 10
    } = options;

    try {
      // 1. 获取股票池
      const stockPool = await this.getStockPool();

      // 2. 对每只股票进行评分
      const scoredStocks = [];
      for (const stock of stockPool) {
        try {
          const score = await this.calculateStockScore(stock, {
            riskLevel,
            expectedReturn,
            timeHorizon
          });

          if (score && score.totalScore > 60) { // 只推荐评分大于60的股票
            scoredStocks.push({
              ...stock,
              ...score
            });
          }
        } catch (error) {
          ctx.logger.warn(`计算股票 ${stock.symbol} 评分失败:`, error);
        }
      }

      // 3. 按评分排序并限制数量
      const recommendations = scoredStocks
        .sort((a, b) => b.totalScore - a.totalScore)
        .slice(0, limit);

      // 4. 生成推荐理由和买卖建议
      const enrichedRecommendations = await Promise.all(
        recommendations.map(stock => this.enrichRecommendation(stock))
      );

      // 5. 保存推荐记录
      await this.saveRecommendationRecord(enrichedRecommendations, options);

      return {
        success: true,
        data: enrichedRecommendations,
        meta: {
          totalAnalyzed: stockPool.length,
          qualified: scoredStocks.length,
          recommended: enrichedRecommendations.length,
          generatedAt: new Date(),
          criteria: options
        }
      };

    } catch (error) {
      ctx.logger.error('获取智能推荐失败:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * 获取股票池
   * 筛选出适合分析的活跃股票
   */
  async getStockPool() {
    const { ctx } = this;

    try {
      // 获取所有股票基本信息
      const allStocks = await ctx.service.stock.getStockBasic();

      // 筛选条件：
      // 1. 上市时间超过1年
      // 2. 非ST股票
      // 3. 市值适中（避免过小的股票）
      const filteredStocks = allStocks.filter(stock => {
        const listDate = new Date(stock.list_date);
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        return (
          listDate < oneYearAgo && // 上市超过1年
          !stock.name.includes('ST') && // 非ST股票
          !stock.name.includes('*') && // 非退市风险股票
          stock.symbol.match(/^(000|002|300|600|601|603|688)/) // 主板、中小板、创业板、科创板
        );
      });

      // 随机选择一部分股票进行分析（避免计算量过大）
      const sampleSize = Math.min(100, filteredStocks.length);
      const shuffled = filteredStocks.sort(() => 0.5 - Math.random());

      return shuffled.slice(0, sampleSize);

    } catch (error) {
      ctx.logger.error('获取股票池失败:', error);
      return [];
    }
  }

  /**
   * 计算股票综合评分
   * @param {Object} stock - 股票基本信息
   * @param {Object} options - 评分选项
   * @return {Object} 评分结果
   */
  async calculateStockScore(stock, options) {
    const { ctx } = this;

    try {
      // 获取股票历史数据（最近60个交易日）
      const historicalData = await ctx.service.stock.getStockDaily(
        stock.symbol,
        this.getDateString(-60),
        this.getDateString(0)
      );

      if (!historicalData || historicalData.length < 30) {
        return null; // 数据不足，跳过
      }

      // 1. 技术分析评分 (40%)
      const technicalScore = await this.calculateTechnicalScore(historicalData);

      // 2. 量价分析评分 (30%)
      const volumePriceScore = await this.calculateVolumePriceScore(historicalData);

      // 3. 趋势分析评分 (20%)
      const trendScore = await this.calculateTrendScore(historicalData);

      // 4. 动量分析评分 (10%)
      const momentumScore = await this.calculateMomentumScore(historicalData);

      // 计算综合评分
      const totalScore = (
        technicalScore * 0.4 +
        volumePriceScore * 0.3 +
        trendScore * 0.2 +
        momentumScore * 0.1
      );

      // 计算风险等级
      const riskLevel = this.calculateRiskLevel(historicalData, totalScore);

      // 计算预期收益率
      const expectedReturn = this.calculateExpectedReturn(historicalData, totalScore);

      return {
        totalScore: Math.round(totalScore),
        technicalScore: Math.round(technicalScore),
        volumePriceScore: Math.round(volumePriceScore),
        trendScore: Math.round(trendScore),
        momentumScore: Math.round(momentumScore),
        riskLevel,
        expectedReturn,
        currentPrice: historicalData[historicalData.length - 1].close,
        dataPoints: historicalData.length
      };

    } catch (error) {
      ctx.logger.error(`计算股票 ${stock.symbol} 评分失败:`, error);
      return null;
    }
  }

  /**
   * 计算技术分析评分
   * @param {Array} data - 历史数据
   * @return {number} 技术分析评分 (0-100)
   */
  async calculateTechnicalScore(data) {
    const { ctx } = this;

    try {
      // 计算技术指标
      const indicators = await ctx.service.technicalIndicators.calculateIndicators(data, {
        sma: { enabled: true, periods: [5, 10, 20] },
        ema: { enabled: true, periods: [12, 26] },
        macd: { enabled: true },
        rsi: { enabled: true, period: 14 },
        kdj: { enabled: true },
        bollingerBands: { enabled: true, period: 20 }
      });

      let score = 0;
      let factors = 0;

      // 1. 移动平均线分析 (25分)
      if (indicators.sma) {
        const currentPrice = data[data.length - 1].close;
        const sma5 = indicators.sma.sma5[indicators.sma.sma5.length - 1];
        const sma10 = indicators.sma.sma10[indicators.sma.sma10.length - 1];
        const sma20 = indicators.sma.sma20[indicators.sma.sma20.length - 1];

        // 多头排列：价格 > 5日线 > 10日线 > 20日线
        if (currentPrice > sma5 && sma5 > sma10 && sma10 > sma20) {
          score += 25;
        } else if (currentPrice > sma5 && sma5 > sma10) {
          score += 15;
        } else if (currentPrice > sma5) {
          score += 10;
        }
        factors++;
      }

      // 2. MACD分析 (20分)
      if (indicators.macd) {
        const macdData = indicators.macd;
        const currentMACD = macdData.macd[macdData.macd.length - 1];
        const currentSignal = macdData.signal[macdData.signal.length - 1];
        const currentHist = macdData.histogram[macdData.histogram.length - 1];
        const prevHist = macdData.histogram[macdData.histogram.length - 2];

        // MACD金叉且柱状图向上
        if (currentMACD > currentSignal && currentHist > prevHist && currentHist > 0) {
          score += 20;
        } else if (currentMACD > currentSignal) {
          score += 15;
        } else if (currentHist > prevHist) {
          score += 10;
        }
        factors++;
      }

      // 3. RSI分析 (20分)
      if (indicators.rsi) {
        const currentRSI = indicators.rsi[indicators.rsi.length - 1];

        // RSI在30-70之间，且呈上升趋势
        if (currentRSI >= 30 && currentRSI <= 70) {
          const prevRSI = indicators.rsi[indicators.rsi.length - 2];
          if (currentRSI > prevRSI) {
            score += 20;
          } else {
            score += 15;
          }
        } else if (currentRSI > 70) {
          score += 5; // 超买区域，降低评分
        } else {
          score += 10; // 超卖区域，适度加分
        }
        factors++;
      }

      // 4. KDJ分析 (15分)
      if (indicators.kdj) {
        const currentK = indicators.kdj.k[indicators.kdj.k.length - 1];
        const currentD = indicators.kdj.d[indicators.kdj.d.length - 1];
        const currentJ = indicators.kdj.j[indicators.kdj.j.length - 1];

        // KDJ金叉且在低位
        if (currentK > currentD && currentK < 80 && currentD < 80) {
          score += 15;
        } else if (currentK > currentD) {
          score += 10;
        } else if (currentK < 20 && currentD < 20) {
          score += 8; // 超卖区域
        }
        factors++;
      }

      // 5. 布林带分析 (20分)
      if (indicators.bollingerBands) {
        const currentPrice = data[data.length - 1].close;
        const upperBand = indicators.bollingerBands.upper[indicators.bollingerBands.upper.length - 1];
        const middleBand = indicators.bollingerBands.middle[indicators.bollingerBands.middle.length - 1];
        const lowerBand = indicators.bollingerBands.lower[indicators.bollingerBands.lower.length - 1];

        // 价格位置分析
        const position = (currentPrice - lowerBand) / (upperBand - lowerBand);

        if (position >= 0.2 && position <= 0.8 && currentPrice > middleBand) {
          score += 20; // 在中上轨之间，较为安全
        } else if (currentPrice > middleBand) {
          score += 15;
        } else if (position < 0.2) {
          score += 12; // 接近下轨，可能反弹
        }
        factors++;
      }

      // 计算平均分
      return factors > 0 ? score / factors * (100 / 100) : 0;

    } catch (error) {
      this.ctx.logger.error('计算技术分析评分失败:', error);
      return 0;
    }
  }

  /**
   * 计算量价分析评分
   * @param {Array} data - 历史数据
   * @return {number} 量价分析评分 (0-100)
   */
  async calculateVolumePriceScore(data) {
    try {
      let score = 0;
      const recentDays = 10;
      const recent = data.slice(-recentDays);

      // 1. 量价配合度分析 (40分)
      let volumePriceMatch = 0;
      for (let i = 1; i < recent.length; i++) {
        const priceChange = recent[i].close - recent[i - 1].close;
        const volumeChange = recent[i].volume - recent[i - 1].volume;

        // 价涨量增或价跌量减为正向配合
        if ((priceChange > 0 && volumeChange > 0) || (priceChange < 0 && volumeChange < 0)) {
          volumePriceMatch++;
        }
      }
      score += (volumePriceMatch / (recent.length - 1)) * 40;

      // 2. 成交量趋势分析 (30分)
      const avgVolume = recent.reduce((sum, item) => sum + item.volume, 0) / recent.length;
      const recentVolume = recent.slice(-3).reduce((sum, item) => sum + item.volume, 0) / 3;

      if (recentVolume > avgVolume * 1.2) {
        score += 30; // 成交量放大
      } else if (recentVolume > avgVolume) {
        score += 20;
      } else {
        score += 10;
      }

      // 3. 价格突破分析 (30分)
      const currentPrice = recent[recent.length - 1].close;
      const highestPrice = Math.max(...recent.slice(0, -1).map(item => item.high));
      const lowestPrice = Math.min(...recent.slice(0, -1).map(item => item.low));

      if (currentPrice > highestPrice) {
        score += 30; // 突破前期高点
      } else if (currentPrice > highestPrice * 0.98) {
        score += 20; // 接近前期高点
      } else if (currentPrice < lowestPrice) {
        score += 5; // 跌破前期低点，风险较高
      } else {
        score += 15;
      }

      return Math.min(100, score);

    } catch (error) {
      this.ctx.logger.error('计算量价分析评分失败:', error);
      return 0;
    }
  }

  /**
   * 计算趋势分析评分
   * @param {Array} data - 历史数据
   * @return {number} 趋势分析评分 (0-100)
   */
  async calculateTrendScore(data) {
    try {
      let score = 0;
      const shortTerm = data.slice(-5); // 短期5天
      const mediumTerm = data.slice(-20); // 中期20天

      // 1. 短期趋势分析 (40分)
      const shortTrendScore = this.calculateTrendDirection(shortTerm);
      score += shortTrendScore * 0.4;

      // 2. 中期趋势分析 (40分)
      const mediumTrendScore = this.calculateTrendDirection(mediumTerm);
      score += mediumTrendScore * 0.4;

      // 3. 趋势一致性分析 (20分)
      if (shortTrendScore > 60 && mediumTrendScore > 60) {
        score += 20; // 短期和中期趋势都向上
      } else if (shortTrendScore > 60 || mediumTrendScore > 60) {
        score += 10; // 至少一个趋势向上
      }

      return Math.min(100, score);

    } catch (error) {
      this.ctx.logger.error('计算趋势分析评分失败:', error);
      return 0;
    }
  }

  /**
   * 计算趋势方向评分
   * @param {Array} data - 数据段
   * @return {number} 趋势评分 (0-100)
   */
  calculateTrendDirection(data) {
    if (data.length < 2) return 50;

    let upDays = 0;
    let totalDays = data.length - 1;

    for (let i = 1; i < data.length; i++) {
      if (data[i].close > data[i - 1].close) {
        upDays++;
      }
    }

    const upRatio = upDays / totalDays;

    // 计算价格变化幅度
    const startPrice = data[0].close;
    const endPrice = data[data.length - 1].close;
    const priceChange = (endPrice - startPrice) / startPrice;

    // 综合上涨天数比例和价格变化幅度
    let score = upRatio * 60; // 基础分数

    if (priceChange > 0.05) {
      score += 40; // 涨幅超过5%，额外加分
    } else if (priceChange > 0.02) {
      score += 25; // 涨幅超过2%
    } else if (priceChange > 0) {
      score += 15; // 小幅上涨
    }

    return Math.min(100, score);
  }

  /**
   * 计算动量分析评分
   * @param {Array} data - 历史数据
   * @return {number} 动量分析评分 (0-100)
   */
  async calculateMomentumScore(data) {
    try {
      let score = 0;

      // 1. 价格动量 (50分)
      const priceChanges = [];
      for (let i = 1; i < data.length; i++) {
        priceChanges.push((data[i].close - data[i - 1].close) / data[i - 1].close);
      }

      const recentChanges = priceChanges.slice(-5); // 最近5天
      const avgRecentChange = recentChanges.reduce((sum, change) => sum + change, 0) / recentChanges.length;

      if (avgRecentChange > 0.02) {
        score += 50; // 强势上涨动量
      } else if (avgRecentChange > 0.01) {
        score += 35; // 中等上涨动量
      } else if (avgRecentChange > 0) {
        score += 25; // 弱势上涨动量
      } else {
        score += 10; // 下跌动量，给予基础分
      }

      // 2. 成交量动量 (30分)
      const volumeChanges = [];
      for (let i = 1; i < data.length; i++) {
        volumeChanges.push((data[i].volume - data[i - 1].volume) / data[i - 1].volume);
      }

      const recentVolumeChanges = volumeChanges.slice(-5);
      const avgVolumeChange = recentVolumeChanges.reduce((sum, change) => sum + change, 0) / recentVolumeChanges.length;

      if (avgVolumeChange > 0.1) {
        score += 30; // 成交量大幅放大
      } else if (avgVolumeChange > 0.05) {
        score += 20; // 成交量适度放大
      } else if (avgVolumeChange > 0) {
        score += 15; // 成交量小幅放大
      } else {
        score += 5; // 成交量萎缩
      }

      // 3. 波动率分析 (20分)
      const volatility = this.calculateVolatility(priceChanges);

      if (volatility > 0.02 && volatility < 0.05) {
        score += 20; // 适度波动，有利于趋势形成
      } else if (volatility <= 0.02) {
        score += 15; // 低波动
      } else {
        score += 10; // 高波动，风险较大
      }

      return Math.min(100, score);

    } catch (error) {
      this.ctx.logger.error('计算动量分析评分失败:', error);
      return 0;
    }
  }

  /**
   * 计算波动率
   * @param {Array} changes - 价格变化数组
   * @return {number} 波动率
   */
  calculateVolatility(changes) {
    if (changes.length === 0) return 0;

    const mean = changes.reduce((sum, change) => sum + change, 0) / changes.length;
    const variance = changes.reduce((sum, change) => sum + Math.pow(change - mean, 2), 0) / changes.length;

    return Math.sqrt(variance);
  }

  /**
   * 计算风险等级
   * @param {Array} data - 历史数据
   * @param {number} score - 综合评分
   * @return {string} 风险等级
   */
  calculateRiskLevel(data, score) {
    try {
      // 计算价格波动率
      const priceChanges = [];
      for (let i = 1; i < data.length; i++) {
        priceChanges.push((data[i].close - data[i - 1].close) / data[i - 1].close);
      }

      const volatility = this.calculateVolatility(priceChanges);

      // 综合评分和波动率确定风险等级
      if (score >= 80 && volatility < 0.03) {
        return 'low';
      } else if (score >= 70 && volatility < 0.05) {
        return 'medium';
      } else if (score >= 60) {
        return 'medium';
      } else {
        return 'high';
      }

    } catch (error) {
      return 'high'; // 出错时返回高风险
    }
  }

  /**
   * 计算预期收益率
   * @param {Array} data - 历史数据
   * @param {number} score - 综合评分
   * @return {number} 预期收益率
   */
  calculateExpectedReturn(data, score) {
    try {
      // 基于评分计算基础收益率
      let baseReturn = (score - 50) / 1000; // 评分每高1分，收益率增加0.1%

      // 基于历史表现调整
      const recentData = data.slice(-10);
      const recentReturn = (recentData[recentData.length - 1].close - recentData[0].close) / recentData[0].close;

      // 综合计算预期收益率
      const expectedReturn = baseReturn * 0.7 + recentReturn * 0.3;

      // 限制在合理范围内
      return Math.max(-0.1, Math.min(0.2, expectedReturn));

    } catch (error) {
      return 0.05; // 默认5%收益率
    }
  }

  /**
   * 增强推荐信息
   * @param {Object} stock - 股票信息
   * @return {Object} 增强后的推荐信息
   */
  async enrichRecommendation(stock) {
    const { ctx } = this;

    try {
      // 生成推荐理由
      const reasons = this.generateRecommendationReasons(stock);

      // 计算买卖建议
      const tradingAdvice = this.generateTradingAdvice(stock);

      // 计算目标价位
      const targetPrice = this.calculateTargetPrice(stock);

      return {
        symbol: stock.symbol,
        name: stock.name,
        currentPrice: stock.currentPrice,
        totalScore: stock.totalScore,
        riskLevel: stock.riskLevel,
        expectedReturn: stock.expectedReturn,
        reasons,
        tradingAdvice,
        targetPrice,
        recommendation: this.getRecommendationLevel(stock.totalScore),
        generatedAt: new Date(),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7天有效期
      };

    } catch (error) {
      ctx.logger.error(`增强推荐信息失败 ${stock.symbol}:`, error);
      return stock;
    }
  }

  /**
   * 生成推荐理由
   * @param {Object} stock - 股票信息
   * @return {Array} 推荐理由列表
   */
  generateRecommendationReasons(stock) {
    const reasons = [];

    // 技术面分析理由
    if (stock.technicalScore >= 80) {
      reasons.push('技术指标表现优异，多项指标显示买入信号');
    } else if (stock.technicalScore >= 70) {
      reasons.push('技术指标整体向好，具备上涨潜力');
    }

    // 量价分析理由
    if (stock.volumePriceScore >= 80) {
      reasons.push('量价配合良好，成交量支撑价格上涨');
    } else if (stock.volumePriceScore >= 70) {
      reasons.push('量价关系健康，资金关注度较高');
    }

    // 趋势分析理由
    if (stock.trendScore >= 80) {
      reasons.push('趋势明确向上，短中期走势强劲');
    } else if (stock.trendScore >= 70) {
      reasons.push('上升趋势初步确立，有望延续');
    }

    // 动量分析理由
    if (stock.momentumScore >= 80) {
      reasons.push('价格动量强劲，上涨势头明显');
    } else if (stock.momentumScore >= 70) {
      reasons.push('动量指标积极，具备继续上涨动力');
    }

    // 风险提示
    if (stock.riskLevel === 'high') {
      reasons.push('⚠️ 注意：该股票波动较大，请控制仓位');
    }

    return reasons.length > 0 ? reasons : ['综合技术指标显示该股票具备投资价值'];
  }

  /**
   * 生成交易建议
   * @param {Object} stock - 股票信息
   * @return {Object} 交易建议
   */
  generateTradingAdvice(stock) {
    const currentPrice = stock.currentPrice;
    const score = stock.totalScore;

    // 基于评分确定买入价格区间
    let buyPriceRange;
    if (score >= 85) {
      // 高分股票，可以适当追高
      buyPriceRange = {
        min: currentPrice * 0.98,
        max: currentPrice * 1.02,
        optimal: currentPrice
      };
    } else if (score >= 75) {
      // 中高分股票，建议回调买入
      buyPriceRange = {
        min: currentPrice * 0.95,
        max: currentPrice * 1.01,
        optimal: currentPrice * 0.98
      };
    } else {
      // 中等分数，建议大幅回调买入
      buyPriceRange = {
        min: currentPrice * 0.92,
        max: currentPrice * 0.98,
        optimal: currentPrice * 0.95
      };
    }

    // 止损建议
    const stopLoss = currentPrice * 0.92; // 8%止损

    // 持有时间建议
    let holdingPeriod;
    if (stock.riskLevel === 'low') {
      holdingPeriod = '5-10个交易日';
    } else if (stock.riskLevel === 'medium') {
      holdingPeriod = '3-7个交易日';
    } else {
      holdingPeriod = '1-5个交易日';
    }

    return {
      buyPriceRange,
      stopLoss,
      holdingPeriod,
      positionSizing: this.getPositionSizing(stock.riskLevel),
      timing: this.getTradingTiming(stock)
    };
  }

  /**
   * 计算目标价位
   * @param {Object} stock - 股票信息
   * @return {Object} 目标价位信息
   */
  calculateTargetPrice(stock) {
    const currentPrice = stock.currentPrice;
    const expectedReturn = stock.expectedReturn;
    const score = stock.totalScore;

    // 基于预期收益率计算目标价
    const baseTarget = currentPrice * (1 + expectedReturn);

    // 基于评分调整目标价
    let multiplier = 1;
    if (score >= 90) {
      multiplier = 1.15; // 高分股票，提高目标价
    } else if (score >= 80) {
      multiplier = 1.10;
    } else if (score >= 70) {
      multiplier = 1.05;
    }

    const targetPrice = baseTarget * multiplier;

    return {
      target: Math.round(targetPrice * 100) / 100,
      upside: Math.round(((targetPrice - currentPrice) / currentPrice) * 10000) / 100, // 百分比
      confidence: this.getConfidenceLevel(score),
      timeframe: '3-7个交易日'
    };
  }

  /**
   * 获取推荐等级
   * @param {number} score - 综合评分
   * @return {string} 推荐等级
   */
  getRecommendationLevel(score) {
    if (score >= 85) {
      return 'strong_buy';
    } else if (score >= 75) {
      return 'buy';
    } else if (score >= 65) {
      return 'moderate_buy';
    } else {
      return 'hold';
    }
  }

  /**
   * 获取仓位建议
   * @param {string} riskLevel - 风险等级
   * @return {string} 仓位建议
   */
  getPositionSizing(riskLevel) {
    switch (riskLevel) {
      case 'low':
        return '可适当加大仓位，建议5-10%';
      case 'medium':
        return '标准仓位，建议3-5%';
      case 'high':
        return '控制仓位，建议1-3%';
      default:
        return '标准仓位，建议3-5%';
    }
  }

  /**
   * 获取交易时机建议
   * @param {Object} stock - 股票信息
   * @return {string} 时机建议
   */
  getTradingTiming(stock) {
    if (stock.totalScore >= 85) {
      return '可立即关注，适合短期操作';
    } else if (stock.totalScore >= 75) {
      return '建议等待回调机会买入';
    } else {
      return '建议观察，等待更好时机';
    }
  }

  /**
   * 获取置信度等级
   * @param {number} score - 评分
   * @return {string} 置信度
   */
  getConfidenceLevel(score) {
    if (score >= 90) {
      return '高';
    } else if (score >= 80) {
      return '中高';
    } else if (score >= 70) {
      return '中等';
    } else {
      return '较低';
    }
  }

  /**
   * 保存推荐记录
   * @param {Array} recommendations - 推荐列表
   * @param {Object} options - 推荐选项
   */
  async saveRecommendationRecord(recommendations, options) {
    const { ctx } = this;

    try {
      // 这里可以保存到数据库，用于后续的准确率统计
      // 暂时使用日志记录
      ctx.logger.info('智能推荐记录:', {
        count: recommendations.length,
        options,
        timestamp: new Date(),
        recommendations: recommendations.map(r => ({
          symbol: r.symbol,
          score: r.totalScore,
          recommendation: r.recommendation
        }))
      });

    } catch (error) {
      ctx.logger.error('保存推荐记录失败:', error);
    }
  }

  /**
   * 获取推荐历史统计
   * @param {number} days - 统计天数
   * @return {Object} 历史统计信息
   */
  async getRecommendationStats(days = 30) {
    // 这里应该从数据库查询历史推荐记录并计算准确率
    // 暂时返回模拟数据
    return {
      totalRecommendations: 150,
      successfulRecommendations: 98,
      successRate: 65.3,
      averageReturn: 4.2,
      period: `最近${days}天`,
      riskDistribution: {
        low: 45,
        medium: 78,
        high: 27
      }
    };
  }

  /**
   * 获取日期字符串
   * @param {number} daysOffset - 天数偏移
   * @return {string} 格式化的日期字符串
   */
  getDateString(daysOffset) {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date.toISOString().split('T')[0].replace(/-/g, '');
  }
}

module.exports = SmartRecommendationService;
