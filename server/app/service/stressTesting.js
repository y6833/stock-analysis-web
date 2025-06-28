'use strict';

const Service = require('egg').Service;

class StressTestingService extends Service {

  /**
   * 执行压力测试
   * @param {number} userId - 用户ID
   * @param {number} portfolioId - 投资组合ID
   * @param {number} scenarioId - 压力测试场景ID
   * @returns {object} 压力测试结果
   */
  async runStressTest(userId, portfolioId, scenarioId) {
    const { ctx } = this;

    try {
      // 1. 获取压力测试场景
      const scenario = await ctx.model.StressTestScenario.findOne({
        where: { id: scenarioId, userId }
      });

      if (!scenario) {
        throw new Error('压力测试场景不存在');
      }

      // 2. 获取投资组合数据
      const portfolioData = await this.getPortfolioData(userId, portfolioId);
      if (!portfolioData || portfolioData.positions.length === 0) {
        throw new Error('投资组合为空或不存在');
      }

      // 3. 根据场景类型执行不同的压力测试
      let testResult;
      switch (scenario.scenarioType) {
      case 'historical':
        testResult = await this.runHistoricalStressTest(portfolioData, scenario);
        break;
      case 'hypothetical':
        testResult = await this.runHypotheticalStressTest(portfolioData, scenario);
        break;
      case 'monte_carlo':
        testResult = await this.runMonteCarloStressTest(portfolioData, scenario);
        break;
      default:
        throw new Error(`不支持的压力测试类型: ${scenario.scenarioType}`);
      }

      // 4. 计算敏感性分析
      const sensitivityAnalysis = await this.calculateSensitivityAnalysis(
        portfolioData,
        scenario
      );

      // 5. 保存测试结果
      const resultRecord = await ctx.model.StressTestResult.create({
        userId,
        portfolioId,
        scenarioId,
        testDate: new Date(),
        portfolioValueBefore: portfolioData.totalValue,
        portfolioValueAfter: testResult.portfolioValueAfter,
        absoluteLoss: testResult.absoluteLoss,
        percentageLoss: testResult.percentageLoss,
        worstCaseLoss: testResult.worstCaseLoss,
        bestCaseGain: testResult.bestCaseGain,
        positionImpacts: testResult.positionImpacts,
        sensitivityAnalysis,
        simulationDetails: testResult.simulationDetails
      });

      return {
        success: true,
        data: {
          id: resultRecord.id,
          scenarioName: scenario.scenarioName,
          scenarioType: scenario.scenarioType,
          portfolioValueBefore: portfolioData.totalValue,
          portfolioValueAfter: testResult.portfolioValueAfter,
          absoluteLoss: testResult.absoluteLoss,
          percentageLoss: testResult.percentageLoss,
          worstCaseLoss: testResult.worstCaseLoss,
          bestCaseGain: testResult.bestCaseGain,
          positionImpacts: testResult.positionImpacts,
          sensitivityAnalysis,
          testDate: resultRecord.testDate
        }
      };

    } catch (error) {
      ctx.logger.error('压力测试执行失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 历史情景压力测试
   */
  async runHistoricalStressTest(portfolioData, scenario) {
    const { ctx } = this;
    const parameters = scenario.scenarioParameters;

    // 获取历史极端事件数据
    const historicalEvents = parameters.historicalEvents || [];
    const results = [];

    for (const event of historicalEvents) {
      // 获取事件期间的市场数据
      const marketData = await this.getHistoricalMarketData(
        event.startDate,
        event.endDate,
        portfolioData.positions
      );

      // 计算投资组合在该历史事件下的表现
      const eventResult = this.calculatePortfolioImpact(portfolioData, marketData);
      results.push({
        eventName: event.name,
        ...eventResult
      });
    }

    // 找出最坏情况
    const worstCase = results.reduce((worst, current) =>
      current.absoluteLoss > worst.absoluteLoss ? current : worst
    );

    // 找出最好情况
    const bestCase = results.reduce((best, current) =>
      current.absoluteLoss < best.absoluteLoss ? current : best
    );

    return {
      portfolioValueAfter: worstCase.portfolioValueAfter,
      absoluteLoss: worstCase.absoluteLoss,
      percentageLoss: worstCase.percentageLoss,
      worstCaseLoss: worstCase.absoluteLoss,
      bestCaseGain: bestCase.absoluteLoss < 0 ? Math.abs(bestCase.absoluteLoss) : 0,
      positionImpacts: worstCase.positionImpacts,
      simulationDetails: {
        type: 'historical',
        eventsAnalyzed: results.length,
        events: results
      }
    };
  }

  /**
   * 假设情景压力测试
   */
  async runHypotheticalStressTest(portfolioData, scenario) {
    const parameters = scenario.scenarioParameters;
    const marketShocks = scenario.marketShocks || {};

    // 应用市场冲击
    const shockedPrices = this.applyMarketShocks(portfolioData, marketShocks);

    // 计算冲击后的投资组合价值
    let portfolioValueAfter = 0;
    const positionImpacts = {};

    portfolioData.positions.forEach(position => {
      const shockedPrice = shockedPrices[position.symbol] || position.currentPrice;
      const newValue = position.quantity * shockedPrice;
      const impact = newValue - position.marketValue;

      portfolioValueAfter += newValue;
      positionImpacts[position.symbol] = {
        originalValue: position.marketValue,
        newValue,
        impact,
        impactPercentage: position.marketValue > 0 ? impact / position.marketValue : 0,
        priceChange: shockedPrice - position.currentPrice,
        priceChangePercentage: (shockedPrice - position.currentPrice) / position.currentPrice
      };
    });

    const absoluteLoss = portfolioData.totalValue - portfolioValueAfter;
    const percentageLoss = absoluteLoss / portfolioData.totalValue;

    return {
      portfolioValueAfter,
      absoluteLoss,
      percentageLoss,
      worstCaseLoss: absoluteLoss,
      bestCaseGain: 0,
      positionImpacts,
      simulationDetails: {
        type: 'hypothetical',
        marketShocks,
        shockedPrices
      }
    };
  }

  /**
   * 蒙特卡洛压力测试
   */
  async runMonteCarloStressTest(portfolioData, scenario) {
    const parameters = scenario.scenarioParameters;
    const simulations = parameters.simulations || 10000;
    const confidenceLevel = parameters.confidenceLevel || 0.05;

    // 获取历史收益率数据用于模拟
    const historicalReturns = await this.getHistoricalReturns(
      portfolioData.positions,
      parameters.lookbackPeriod || 252
    );

    // 计算协方差矩阵
    const covarianceMatrix = this.calculateCovarianceMatrix(historicalReturns);

    // 运行蒙特卡洛模拟
    const simulationResults = [];

    for (let i = 0; i < simulations; i++) {
      const randomReturns = this.generateCorrelatedRandomReturns(
        portfolioData.positions,
        covarianceMatrix
      );

      const portfolioReturn = this.calculatePortfolioReturn(
        portfolioData,
        randomReturns
      );

      const portfolioValueAfter = portfolioData.totalValue * (1 + portfolioReturn);
      const absoluteLoss = portfolioData.totalValue - portfolioValueAfter;

      simulationResults.push({
        portfolioReturn,
        portfolioValueAfter,
        absoluteLoss
      });
    }

    // 排序结果
    simulationResults.sort((a, b) => b.absoluteLoss - a.absoluteLoss);

    // 计算VaR和ES
    const varIndex = Math.floor(simulations * confidenceLevel);
    const worstCaseLoss = simulationResults[varIndex].absoluteLoss;
    const expectedShortfall = simulationResults.slice(0, varIndex + 1)
      .reduce((sum, result) => sum + result.absoluteLoss, 0) / (varIndex + 1);

    // 最好情况
    const bestCase = simulationResults[simulationResults.length - 1];
    const bestCaseGain = bestCase.absoluteLoss < 0 ? Math.abs(bestCase.absoluteLoss) : 0;

    return {
      portfolioValueAfter: simulationResults[varIndex].portfolioValueAfter,
      absoluteLoss: worstCaseLoss,
      percentageLoss: worstCaseLoss / portfolioData.totalValue,
      worstCaseLoss,
      bestCaseGain,
      positionImpacts: this.calculatePositionImpacts(portfolioData, simulationResults[varIndex]),
      simulationDetails: {
        type: 'monte_carlo',
        simulations,
        confidenceLevel,
        expectedShortfall,
        percentiles: this.calculatePercentiles(simulationResults)
      }
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
      let price = null;

      if (ctx.app.redis && typeof ctx.app.redis.get === 'function') {
        price = await ctx.app.redis.get(cacheKey);
      }

      if (!price) {
        // 从API获取最新价格
        const quote = await ctx.service.stock.getStockQuote(stockCode);
        price = quote.current || quote.close || 0;

        // 缓存5分钟
        if (ctx.app.redis && typeof ctx.app.redis.setex === 'function') {
          await ctx.app.redis.setex(cacheKey, 300, price);
        }
      }

      return parseFloat(price);
    } catch (error) {
      ctx.logger.warn(`获取股价失败 ${stockCode}:`, error.message);
      return 0;
    }
  }

  /**
   * 获取历史市场数据
   */
  async getHistoricalMarketData(startDate, endDate, positions) {
    const { ctx } = this;
    const marketData = {};

    for (const position of positions) {
      try {
        const historicalData = await ctx.service.stock.getStockHistory(
          position.symbol,
          startDate.replace(/-/g, ''),
          endDate.replace(/-/g, '')
        );

        if (historicalData && historicalData.data && historicalData.data.length > 0) {
          marketData[position.symbol] = historicalData.data;
        }
      } catch (error) {
        ctx.logger.warn(`获取历史数据失败 ${position.symbol}:`, error.message);
        marketData[position.symbol] = [];
      }
    }

    return marketData;
  }

  /**
   * 计算投资组合在特定市场数据下的影响
   */
  calculatePortfolioImpact(portfolioData, marketData) {
    let portfolioValueAfter = 0;
    const positionImpacts = {};

    portfolioData.positions.forEach(position => {
      const stockData = marketData[position.symbol] || [];

      if (stockData.length > 0) {
        // 计算期间的最大跌幅
        const prices = stockData.map(item => item.close);
        const maxPrice = Math.max(...prices);
        const minPrice = Math.min(...prices);
        const maxDrawdown = (maxPrice - minPrice) / maxPrice;

        // 应用最大跌幅到当前价格
        const stressedPrice = position.currentPrice * (1 - maxDrawdown);
        const newValue = position.quantity * stressedPrice;
        const impact = newValue - position.marketValue;

        portfolioValueAfter += newValue;
        positionImpacts[position.symbol] = {
          originalValue: position.marketValue,
          newValue,
          impact,
          impactPercentage: impact / position.marketValue,
          maxDrawdown,
          stressedPrice
        };
      } else {
        // 如果没有历史数据，假设没有变化
        portfolioValueAfter += position.marketValue;
        positionImpacts[position.symbol] = {
          originalValue: position.marketValue,
          newValue: position.marketValue,
          impact: 0,
          impactPercentage: 0,
          maxDrawdown: 0,
          stressedPrice: position.currentPrice
        };
      }
    });

    const absoluteLoss = portfolioData.totalValue - portfolioValueAfter;
    const percentageLoss = absoluteLoss / portfolioData.totalValue;

    return {
      portfolioValueAfter,
      absoluteLoss,
      percentageLoss,
      positionImpacts
    };
  }

  /**
   * 应用市场冲击
   */
  applyMarketShocks(portfolioData, marketShocks) {
    const shockedPrices = {};

    portfolioData.positions.forEach(position => {
      let shockFactor = 1;

      // 检查是否有针对特定股票的冲击
      if (marketShocks.stocks && marketShocks.stocks[position.symbol]) {
        shockFactor = 1 + marketShocks.stocks[position.symbol];
      }
      // 检查是否有行业冲击
      else if (marketShocks.sectors) {
        // 这里可以根据股票所属行业应用冲击
        // 简化处理，使用市场整体冲击
        shockFactor = 1 + (marketShocks.market || 0);
      }
      // 应用市场整体冲击
      else if (marketShocks.market) {
        shockFactor = 1 + marketShocks.market;
      }

      shockedPrices[position.symbol] = position.currentPrice * shockFactor;
    });

    return shockedPrices;
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
        startDate.setDate(endDate.getDate() - lookbackPeriod - 10);

        const historicalData = await ctx.service.stock.getStockHistory(
          position.symbol,
          startDate.toISOString().split('T')[0].replace(/-/g, ''),
          endDate.toISOString().split('T')[0].replace(/-/g, '')
        );

        if (historicalData && historicalData.data && historicalData.data.length > 1) {
          // 计算日收益率
          const returns = [];
          const prices = historicalData.data.map(item => item.close).reverse();

          for (let i = 1; i < prices.length; i++) {
            const returnRate = (prices[i] - prices[i - 1]) / prices[i - 1];
            returns.push(returnRate);
          }

          historicalReturns[position.symbol] = returns.slice(-lookbackPeriod);
        } else {
          historicalReturns[position.symbol] = [];
        }
      } catch (error) {
        ctx.logger.error(`获取历史收益率失败 ${position.symbol}:`, error);
        historicalReturns[position.symbol] = [];
      }
    }

    return historicalReturns;
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
   * 生成相关的随机收益率
   */
  generateCorrelatedRandomReturns(positions, covarianceMatrix) {
    const randomReturns = {};

    // 简化实现：为每个资产生成独立的随机收益率
    // 实际应用中应使用Cholesky分解等方法生成相关的随机数
    positions.forEach(position => {
      const variance = covarianceMatrix[position.symbol] &&
        covarianceMatrix[position.symbol][position.symbol] || 0.0004; // 默认2%日波动率
      const stdDev = Math.sqrt(variance);
      randomReturns[position.symbol] = this.generateNormalRandom() * stdDev;
    });

    return randomReturns;
  }

  /**
   * 计算投资组合收益率
   */
  calculatePortfolioReturn(portfolioData, randomReturns) {
    let portfolioReturn = 0;

    portfolioData.positions.forEach(position => {
      const stockReturn = randomReturns[position.symbol] || 0;
      portfolioReturn += position.weight * stockReturn;
    });

    return portfolioReturn;
  }

  /**
   * 生成标准正态分布随机数
   */
  generateNormalRandom() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();

    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  /**
   * 计算持仓影响
   */
  calculatePositionImpacts(portfolioData, simulationResult) {
    const positionImpacts = {};

    portfolioData.positions.forEach(position => {
      const impact = position.marketValue * (simulationResult.portfolioReturn * position.weight);
      positionImpacts[position.symbol] = {
        originalValue: position.marketValue,
        impact,
        impactPercentage: impact / position.marketValue
      };
    });

    return positionImpacts;
  }

  /**
   * 计算百分位数
   */
  calculatePercentiles(simulationResults) {
    const percentiles = [1, 5, 10, 25, 50, 75, 90, 95, 99];
    const result = {};

    percentiles.forEach(p => {
      const index = Math.floor(simulationResults.length * (p / 100));
      result[`p${p}`] = simulationResults[index].absoluteLoss;
    });

    return result;
  }

  /**
   * 计算敏感性分析
   */
  async calculateSensitivityAnalysis(portfolioData, scenario) {
    const sensitivity = {};

    // 对每个持仓进行敏感性分析
    for (const position of portfolioData.positions) {
      const shockLevels = [-0.3, -0.2, -0.1, -0.05, 0, 0.05, 0.1, 0.2, 0.3];
      const impacts = [];

      for (const shock of shockLevels) {
        const shockedPrice = position.currentPrice * (1 + shock);
        const newValue = position.quantity * shockedPrice;
        const impact = newValue - position.marketValue;

        impacts.push({
          shock,
          shockedPrice,
          newValue,
          impact,
          impactPercentage: impact / position.marketValue
        });
      }

      sensitivity[position.symbol] = {
        currentPrice: position.currentPrice,
        currentValue: position.marketValue,
        weight: position.weight,
        impacts
      };
    }

    return sensitivity;
  }

  /**
   * 获取压力测试历史记录
   */
  async getStressTestHistory(userId, portfolioId, limit = 30) {
    const { ctx } = this;

    const whereCondition = { userId };
    if (portfolioId) {
      whereCondition.portfolioId = portfolioId;
    }

    const records = await ctx.model.StressTestResult.findAll({
      where: whereCondition,
      order: [['testDate', 'DESC']],
      limit,
      include: [{
        model: ctx.model.StressTestScenario,
        as: 'scenario',
        attributes: ['scenarioName', 'scenarioType']
      }, {
        model: ctx.model.UserPortfolio,
        as: 'portfolio',
        attributes: ['id', 'name']
      }]
    });

    return records.map(record => ({
      id: record.id,
      testDate: record.testDate,
      scenarioName: record.scenario?.scenarioName,
      scenarioType: record.scenario?.scenarioType,
      portfolioName: record.portfolio?.name,
      portfolioValueBefore: record.portfolioValueBefore,
      portfolioValueAfter: record.portfolioValueAfter,
      absoluteLoss: record.absoluteLoss,
      percentageLoss: record.percentageLoss,
      worstCaseLoss: record.worstCaseLoss,
      bestCaseGain: record.bestCaseGain
    }));
  }
}

module.exports = StressTestingService;
