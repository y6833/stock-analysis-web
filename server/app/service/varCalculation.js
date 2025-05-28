'use strict';

const Service = require('egg').Service;

class VarCalculationService extends Service {

  /**
   * 计算投资组合VaR
   * @param {number} userId - 用户ID
   * @param {number} portfolioId - 投资组合ID
   * @param {object} config - 风险配置
   * @returns {object} VaR计算结果
   */
  async calculatePortfolioVaR(userId, portfolioId, config) {
    const { ctx } = this;

    try {
      // 1. 获取投资组合数据
      const portfolioData = await this.getPortfolioData(userId, portfolioId);
      if (!portfolioData || portfolioData.positions.length === 0) {
        throw new Error('投资组合为空或不存在');
      }

      // 2. 获取历史收益率数据
      const historicalReturns = await this.getHistoricalReturns(
        portfolioData.positions,
        config.lookbackPeriod
      );

      // 3. 根据方法计算VaR
      let varResult;
      switch (config.varMethod) {
      case 'historical':
        varResult = await this.calculateHistoricalVaR(
          portfolioData,
          historicalReturns,
          config
        );
        break;
      case 'parametric':
        varResult = await this.calculateParametricVaR(
          portfolioData,
          historicalReturns,
          config
        );
        break;
      case 'monte_carlo':
        varResult = await this.calculateMonteCarloVaR(
          portfolioData,
          historicalReturns,
          config
        );
        break;
      default:
        throw new Error(`不支持的VaR计算方法: ${config.varMethod}`);
      }

      // 4. 计算成分VaR
      const componentVar = await this.calculateComponentVaR(
        portfolioData,
        historicalReturns,
        config
      );

      // 5. 计算其他风险指标
      const riskMetrics = await this.calculateRiskMetrics(
        portfolioData,
        historicalReturns
      );

      // 6. 保存计算结果
      const calculationRecord = await ctx.model.VarCalculation.create({
        userId,
        portfolioId,
        configId: config.id,
        calculationDate: new Date(),
        portfolioValue: portfolioData.totalValue,
        varAbsolute: varResult.varAbsolute,
        varPercentage: varResult.varPercentage,
        expectedShortfall: varResult.expectedShortfall,
        confidenceLevel: config.varConfidenceLevel,
        timeHorizon: config.varTimeHorizon,
        calculationMethod: config.varMethod,
        componentVar,
        riskMetrics,
        calculationDetails: {
          lookbackPeriod: config.lookbackPeriod,
          dataPoints: historicalReturns.length,
          calculationTime: new Date().toISOString()
        }
      });

      return {
        success: true,
        data: {
          id: calculationRecord.id,
          portfolioValue: portfolioData.totalValue,
          varAbsolute: varResult.varAbsolute,
          varPercentage: varResult.varPercentage,
          expectedShortfall: varResult.expectedShortfall,
          confidenceLevel: config.varConfidenceLevel,
          timeHorizon: config.varTimeHorizon,
          method: config.varMethod,
          componentVar,
          riskMetrics,
          calculationDate: calculationRecord.calculationDate
        }
      };

    } catch (error) {
      ctx.logger.error('VaR计算失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 历史模拟法计算VaR
   */
  async calculateHistoricalVaR(portfolioData, historicalReturns, config) {
    // 计算投资组合历史收益率
    const portfolioReturns = this.calculatePortfolioReturns(
      portfolioData,
      historicalReturns
    );

    // 排序收益率
    const sortedReturns = portfolioReturns.sort((a, b) => a - b);

    // 计算VaR分位数
    const varIndex = Math.floor(sortedReturns.length * config.varConfidenceLevel);
    const varPercentage = -sortedReturns[varIndex]; // 负号表示损失
    const varAbsolute = varPercentage * portfolioData.totalValue;

    // 计算期望损失(ES)
    const tailReturns = sortedReturns.slice(0, varIndex + 1);
    const expectedShortfallPercentage = -tailReturns.reduce((sum, ret) => sum + ret, 0) / tailReturns.length;
    const expectedShortfall = expectedShortfallPercentage * portfolioData.totalValue;

    return {
      varAbsolute,
      varPercentage,
      expectedShortfall,
      method: 'historical'
    };
  }

  /**
   * 参数法计算VaR
   */
  async calculateParametricVaR(portfolioData, historicalReturns, config) {
    // 计算投资组合历史收益率
    const portfolioReturns = this.calculatePortfolioReturns(
      portfolioData,
      historicalReturns
    );

    // 计算均值和标准差
    const mean = portfolioReturns.reduce((sum, ret) => sum + ret, 0) / portfolioReturns.length;
    const variance = portfolioReturns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / (portfolioReturns.length - 1);
    const stdDev = Math.sqrt(variance);

    // 获取正态分布分位数 (95%置信度对应1.645)
    const zScore = this.getZScore(1 - config.varConfidenceLevel);

    // 计算VaR
    const varPercentage = -(mean - zScore * stdDev);
    const varAbsolute = varPercentage * portfolioData.totalValue;

    // 计算期望损失(ES) - 对于正态分布的解析解
    const expectedShortfallPercentage = -(mean - stdDev * this.getNormalPDF(zScore) / config.varConfidenceLevel);
    const expectedShortfall = expectedShortfallPercentage * portfolioData.totalValue;

    return {
      varAbsolute,
      varPercentage,
      expectedShortfall,
      method: 'parametric',
      statistics: {
        mean,
        stdDev,
        zScore
      }
    };
  }

  /**
   * 蒙特卡洛模拟法计算VaR
   */
  async calculateMonteCarloVaR(portfolioData, historicalReturns, config) {
    const simulations = config.monteCarloSimulations || 10000;

    // 计算协方差矩阵
    const covarianceMatrix = this.calculateCovarianceMatrix(historicalReturns);

    // 生成随机收益率场景
    const simulatedReturns = this.generateMonteCarloScenarios(
      portfolioData,
      covarianceMatrix,
      simulations
    );

    // 排序模拟结果
    const sortedReturns = simulatedReturns.sort((a, b) => a - b);

    // 计算VaR
    const varIndex = Math.floor(simulations * config.varConfidenceLevel);
    const varPercentage = -sortedReturns[varIndex];
    const varAbsolute = varPercentage * portfolioData.totalValue;

    // 计算期望损失
    const tailReturns = sortedReturns.slice(0, varIndex + 1);
    const expectedShortfallPercentage = -tailReturns.reduce((sum, ret) => sum + ret, 0) / tailReturns.length;
    const expectedShortfall = expectedShortfallPercentage * portfolioData.totalValue;

    return {
      varAbsolute,
      varPercentage,
      expectedShortfall,
      method: 'monte_carlo',
      simulations
    };
  }

  /**
   * 获取投资组合数据
   */
  async getPortfolioData(userId, portfolioId) {
    const { ctx } = this;

    // 获取投资组合基本信息
    const portfolio = await ctx.model.UserPortfolio.findOne({
      where: { id: portfolioId, userId },
      include: [{
        model: ctx.model.PortfolioHolding,
        as: 'holdings'
      }]
    });

    if (!portfolio) {
      return null;
    }

    // 计算总价值和权重
    let totalValue = 0;
    const positions = [];

    for (const holding of portfolio.holdings) {
      // 获取当前价格
      const currentPrice = await this.getCurrentPrice(holding.stockCode);
      const marketValue = holding.quantity * currentPrice;
      totalValue += marketValue;

      positions.push({
        symbol: holding.stockCode,
        name: holding.stockName,
        quantity: holding.quantity,
        averagePrice: holding.averageCost,
        currentPrice,
        marketValue,
        weight: 0 // 稍后计算
      });
    }

    // 计算权重
    positions.forEach(position => {
      position.weight = position.marketValue / totalValue;
    });

    return {
      id: portfolio.id,
      name: portfolio.name,
      totalValue,
      positions
    };
  }

  /**
   * 获取当前股价
   */
  async getCurrentPrice(stockCode) {
    const { ctx } = this;

    try {
      // 尝试从缓存获取
      const cacheKey = `current_price:${stockCode}`;
      let price = await ctx.app.redis.get(cacheKey);

      if (!price) {
        // 从API获取最新价格
        const quote = await ctx.service.stock.getStockQuote(stockCode);
        price = quote.current || quote.close || 0;

        // 缓存5分钟
        await ctx.app.redis.setex(cacheKey, 300, price);
      }

      return parseFloat(price);
    } catch (error) {
      ctx.logger.warn(`获取股价失败 ${stockCode}:`, error.message);
      return 0;
    }
  }

  /**
   * 计算投资组合收益率
   */
  calculatePortfolioReturns(portfolioData, historicalReturns) {
    const portfolioReturns = [];

    // 假设historicalReturns是一个对象，键为股票代码，值为收益率数组
    const maxLength = Math.max(...Object.values(historicalReturns).map(returns => returns.length));

    for (let i = 0; i < maxLength; i++) {
      let portfolioReturn = 0;

      portfolioData.positions.forEach(position => {
        const stockReturns = historicalReturns[position.symbol];
        if (stockReturns && stockReturns[i] !== undefined) {
          portfolioReturn += position.weight * stockReturns[i];
        }
      });

      portfolioReturns.push(portfolioReturn);
    }

    return portfolioReturns;
  }

  /**
   * 获取正态分布分位数
   */
  getZScore(probability) {
    // 简化的正态分布分位数计算
    // 实际应用中应使用更精确的算法
    const zScores = {
      0.90: 1.282,
      0.95: 1.645,
      0.99: 2.326
    };

    return zScores[probability] || 1.645;
  }

  /**
   * 正态分布概率密度函数
   */
  getNormalPDF(z) {
    return Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
  }

  /**
   * 获取历史收益率数据
   */
  async getHistoricalReturns(positions, lookbackPeriod) {
    const { ctx } = this;
    const historicalReturns = {};

    for (const position of positions) {
      try {
        // 获取历史价格数据
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - lookbackPeriod - 10); // 多取一些数据以防节假日

        const historicalData = await ctx.service.stock.getStockHistory(
          position.symbol,
          startDate.toISOString().split('T')[0].replace(/-/g, ''),
          endDate.toISOString().split('T')[0].replace(/-/g, '')
        );

        if (historicalData && historicalData.data && historicalData.data.length > 1) {
          // 计算日收益率
          const returns = [];
          const prices = historicalData.data.map(item => item.close).reverse(); // 按时间正序

          for (let i = 1; i < prices.length; i++) {
            const returnRate = (prices[i] - prices[i - 1]) / prices[i - 1];
            returns.push(returnRate);
          }

          // 只取最近的lookbackPeriod个数据点
          historicalReturns[position.symbol] = returns.slice(-lookbackPeriod);
        } else {
          ctx.logger.warn(`无法获取股票 ${position.symbol} 的历史数据`);
          historicalReturns[position.symbol] = [];
        }
      } catch (error) {
        ctx.logger.error(`获取股票 ${position.symbol} 历史数据失败:`, error);
        historicalReturns[position.symbol] = [];
      }
    }

    return historicalReturns;
  }

  /**
   * 计算成分VaR
   */
  async calculateComponentVaR(portfolioData, historicalReturns, config) {
    const componentVar = {};

    // 计算投资组合总VaR
    const portfolioReturns = this.calculatePortfolioReturns(portfolioData, historicalReturns);
    const sortedReturns = portfolioReturns.sort((a, b) => a - b);
    const varIndex = Math.floor(sortedReturns.length * config.varConfidenceLevel);
    const portfolioVaR = -sortedReturns[varIndex];

    // 计算每个资产的边际VaR和成分VaR
    for (const position of portfolioData.positions) {
      const stockReturns = historicalReturns[position.symbol] || [];

      if (stockReturns.length > 0) {
        // 计算该资产与投资组合的协方差
        const covariance = this.calculateCovariance(stockReturns, portfolioReturns);
        const portfolioVariance = this.calculateVariance(portfolioReturns);

        // 边际VaR = (协方差 / 投资组合标准差) * VaR
        const marginalVaR = portfolioVariance > 0 ?
          (covariance / Math.sqrt(portfolioVariance)) * portfolioVaR : 0;

        // 成分VaR = 权重 * 边际VaR
        const componentVaRValue = position.weight * marginalVaR;

        componentVar[position.symbol] = {
          weight: position.weight,
          marginalVaR,
          componentVaR: componentVaRValue,
          contribution: portfolioVaR > 0 ? componentVaRValue / portfolioVaR : 0
        };
      }
    }

    return componentVar;
  }

  /**
   * 计算风险指标
   */
  async calculateRiskMetrics(portfolioData, historicalReturns) {
    const portfolioReturns = this.calculatePortfolioReturns(portfolioData, historicalReturns);

    if (portfolioReturns.length === 0) {
      return {};
    }

    // 基本统计指标
    const mean = portfolioReturns.reduce((sum, ret) => sum + ret, 0) / portfolioReturns.length;
    const variance = this.calculateVariance(portfolioReturns);
    const stdDev = Math.sqrt(variance);

    // 偏度和峰度
    const skewness = this.calculateSkewness(portfolioReturns, mean, stdDev);
    const kurtosis = this.calculateKurtosis(portfolioReturns, mean, stdDev);

    // 最大回撤
    const maxDrawdown = this.calculateMaxDrawdown(portfolioReturns);

    // 夏普比率 (假设无风险利率为3%)
    const riskFreeRate = 0.03 / 252; // 日化无风险利率
    const sharpeRatio = stdDev > 0 ? (mean - riskFreeRate) / stdDev : 0;

    return {
      mean: mean * 252, // 年化
      volatility: stdDev * Math.sqrt(252), // 年化波动率
      skewness,
      kurtosis,
      maxDrawdown,
      sharpeRatio: sharpeRatio * Math.sqrt(252), // 年化夏普比率
      dataPoints: portfolioReturns.length
    };
  }

  /**
   * 计算协方差
   */
  calculateCovariance(returns1, returns2) {
    if (returns1.length !== returns2.length || returns1.length === 0) {
      return 0;
    }

    const mean1 = returns1.reduce((sum, ret) => sum + ret, 0) / returns1.length;
    const mean2 = returns2.reduce((sum, ret) => sum + ret, 0) / returns2.length;

    let covariance = 0;
    for (let i = 0; i < returns1.length; i++) {
      covariance += (returns1[i] - mean1) * (returns2[i] - mean2);
    }

    return covariance / (returns1.length - 1);
  }

  /**
   * 计算方差
   */
  calculateVariance(returns) {
    if (returns.length === 0) return 0;

    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / (returns.length - 1);

    return variance;
  }

  /**
   * 计算偏度
   */
  calculateSkewness(returns, mean, stdDev) {
    if (returns.length === 0 || stdDev === 0) return 0;

    const skewness = returns.reduce((sum, ret) => {
      return sum + Math.pow((ret - mean) / stdDev, 3);
    }, 0) / returns.length;

    return skewness;
  }

  /**
   * 计算峰度
   */
  calculateKurtosis(returns, mean, stdDev) {
    if (returns.length === 0 || stdDev === 0) return 0;

    const kurtosis = returns.reduce((sum, ret) => {
      return sum + Math.pow((ret - mean) / stdDev, 4);
    }, 0) / returns.length;

    return kurtosis - 3; // 超额峰度
  }

  /**
   * 计算最大回撤
   */
  calculateMaxDrawdown(returns) {
    if (returns.length === 0) return 0;

    let cumulativeReturn = 1;
    let peak = 1;
    let maxDrawdown = 0;

    for (const ret of returns) {
      cumulativeReturn *= (1 + ret);
      peak = Math.max(peak, cumulativeReturn);
      const drawdown = (peak - cumulativeReturn) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    return maxDrawdown;
  }

  /**
   * 计算协方差矩阵
   */
  calculateCovarianceMatrix(historicalReturns) {
    const symbols = Object.keys(historicalReturns);
    const matrix = {};

    symbols.forEach(symbol1 => {
      matrix[symbol1] = {};
      symbols.forEach(symbol2 => {
        matrix[symbol1][symbol2] = this.calculateCovariance(
          historicalReturns[symbol1],
          historicalReturns[symbol2]
        );
      });
    });

    return matrix;
  }

  /**
   * 生成蒙特卡洛场景
   */
  generateMonteCarloScenarios(portfolioData, covarianceMatrix, simulations) {
    const scenarios = [];

    // 简化的蒙特卡洛实现
    // 实际应用中应使用Cholesky分解等更精确的方法
    for (let i = 0; i < simulations; i++) {
      let portfolioReturn = 0;

      portfolioData.positions.forEach(position => {
        // 生成随机收益率 (简化为正态分布)
        const randomReturn = this.generateNormalRandom() * 0.02; // 假设2%的日波动率
        portfolioReturn += position.weight * randomReturn;
      });

      scenarios.push(portfolioReturn);
    }

    return scenarios;
  }

  /**
   * 生成标准正态分布随机数
   */
  generateNormalRandom() {
    // Box-Muller变换
    let u = 0, v = 0;
    while (u === 0) u = Math.random(); // 避免log(0)
    while (v === 0) v = Math.random();

    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  /**
   * 获取VaR计算历史记录
   */
  async getVarHistory(userId, portfolioId, limit = 30) {
    const { ctx } = this;

    const whereCondition = { userId };
    if (portfolioId) {
      whereCondition.portfolioId = portfolioId;
    }

    const records = await ctx.model.VarCalculation.findAll({
      where: whereCondition,
      order: [['calculationDate', 'DESC']],
      limit,
      include: [{
        model: ctx.model.RiskMonitoringConfig,
        as: 'config',
        attributes: ['configName', 'varMethod', 'varConfidenceLevel']
      }]
    });

    return records.map(record => ({
      id: record.id,
      calculationDate: record.calculationDate,
      portfolioValue: record.portfolioValue,
      varAbsolute: record.varAbsolute,
      varPercentage: record.varPercentage,
      expectedShortfall: record.expectedShortfall,
      confidenceLevel: record.confidenceLevel,
      method: record.calculationMethod,
      configName: record.config?.configName
    }));
  }
}

module.exports = VarCalculationService;
