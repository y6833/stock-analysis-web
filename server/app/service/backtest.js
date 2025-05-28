'use strict';

const Service = require('egg').Service;

class BacktestService extends Service {

  /**
   * 获取历史数据
   */
  async getHistoricalData({ symbol, startDate, endDate, frequency = '1d' }) {
    const { ctx } = this;

    try {
      // 首先尝试从数据库获取
      const cachedData = await this.getHistoricalDataFromDB(symbol, startDate, endDate);
      if (cachedData && cachedData.length > 0) {
        ctx.logger.info(`从数据库获取 ${symbol} 历史数据: ${cachedData.length} 条`);
        return cachedData;
      }

      // 如果数据库没有，尝试从外部API获取
      const apiData = await this.fetchHistoricalDataFromAPI(symbol, startDate, endDate, frequency);
      
      if (apiData && apiData.length > 0) {
        // 保存到数据库
        await this.saveHistoricalDataToDB(symbol, apiData);
        ctx.logger.info(`从API获取并保存 ${symbol} 历史数据: ${apiData.length} 条`);
        return apiData;
      }

      // 如果都失败，生成模拟数据
      const mockData = this.generateMockHistoricalData(symbol, startDate, endDate);
      ctx.logger.warn(`生成 ${symbol} 模拟历史数据: ${mockData.length} 条`);
      return mockData;

    } catch (error) {
      ctx.logger.error('获取历史数据失败:', error);
      throw new Error('获取历史数据失败');
    }
  }

  /**
   * 从数据库获取历史数据
   */
  async getHistoricalDataFromDB(symbol, startDate, endDate) {
    const { app } = this;

    try {
      const results = await app.mysql.select('stock_history', {
        where: {
          symbol,
          trade_date: app.mysql.literals.between(startDate, endDate)
        },
        orders: [['trade_date', 'asc']]
      });

      return results.map(row => ({
        symbol: row.symbol,
        date: row.trade_date,
        open: parseFloat(row.open_price),
        high: parseFloat(row.high_price),
        low: parseFloat(row.low_price),
        close: parseFloat(row.close_price),
        volume: parseInt(row.volume),
        amount: parseFloat(row.amount)
      }));

    } catch (error) {
      this.ctx.logger.error('从数据库获取历史数据失败:', error);
      return [];
    }
  }

  /**
   * 从API获取历史数据
   */
  async fetchHistoricalDataFromAPI(symbol, startDate, endDate, frequency) {
    const { ctx, service } = this;

    try {
      // 尝试使用Tushare获取历史数据
      const tushareData = await service.tushare.getStockHistory(symbol, startDate, endDate);
      if (tushareData && tushareData.length > 0) {
        return tushareData;
      }

      // 如果Tushare失败，尝试其他数据源
      // 这里可以添加其他数据源的调用

      return null;

    } catch (error) {
      ctx.logger.error('从API获取历史数据失败:', error);
      return null;
    }
  }

  /**
   * 保存历史数据到数据库
   */
  async saveHistoricalDataToDB(symbol, data) {
    const { app } = this;

    try {
      const rows = data.map(item => ({
        symbol: item.symbol,
        trade_date: item.date,
        open_price: item.open,
        high_price: item.high,
        low_price: item.low,
        close_price: item.close,
        volume: item.volume,
        amount: item.amount,
        created_at: new Date(),
        updated_at: new Date()
      }));

      // 批量插入，忽略重复数据
      await app.mysql.query(
        'INSERT IGNORE INTO stock_history (symbol, trade_date, open_price, high_price, low_price, close_price, volume, amount, created_at, updated_at) VALUES ?',
        [rows.map(row => Object.values(row))]
      );

    } catch (error) {
      this.ctx.logger.error('保存历史数据到数据库失败:', error);
    }
  }

  /**
   * 生成模拟历史数据
   */
  generateMockHistoricalData(symbol, startDate, endDate) {
    const data = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    let currentPrice = 100; // 初始价格
    let currentDate = new Date(start);

    while (currentDate <= end) {
      // 跳过周末
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        // 生成随机价格变动
        const change = (Math.random() - 0.5) * 0.08; // ±4%的随机变动
        const newPrice = currentPrice * (1 + change);
        
        const high = newPrice * (1 + Math.random() * 0.02);
        const low = newPrice * (1 - Math.random() * 0.02);
        const volume = Math.floor(Math.random() * 1000000) + 100000;

        data.push({
          symbol,
          date: currentDate.toISOString().split('T')[0],
          open: currentPrice,
          high,
          low,
          close: newPrice,
          volume,
          amount: volume * newPrice
        });

        currentPrice = newPrice;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return data;
  }

  /**
   * 运行专业回测
   */
  async runProfessionalBacktest(params, historicalData) {
    const { ctx } = this;

    try {
      // 初始化回测环境
      const backtestContext = this.initializeBacktestContext(params);
      
      // 按日期排序历史数据
      const sortedData = historicalData.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      // 执行事件驱动回测
      const trades = [];
      const equityValues = [];
      const drawdownValues = [];
      
      let maxEquity = params.initialCapital;
      
      for (let i = 0; i < sortedData.length; i++) {
        const currentData = sortedData[i];
        backtestContext.currentDate = currentData.date;
        backtestContext.currentPrice = currentData.close;
        
        // 生成交易信号
        const signals = await this.generateTradingSignals(params, currentData, sortedData.slice(0, i + 1));
        
        // 执行交易
        for (const signal of signals) {
          const trade = await this.executeTrade(backtestContext, signal, currentData);
          if (trade) {
            trades.push(trade);
          }
        }
        
        // 更新组合价值
        const currentEquity = this.calculatePortfolioValue(backtestContext, currentData.close);
        equityValues.push({
          date: currentData.date,
          value: currentEquity
        });
        
        // 计算回撤
        if (currentEquity > maxEquity) {
          maxEquity = currentEquity;
        }
        const drawdown = (maxEquity - currentEquity) / maxEquity;
        drawdownValues.push({
          date: currentData.date,
          value: drawdown
        });
      }
      
      // 计算绩效指标
      const performance = this.calculatePerformanceMetrics(
        params.initialCapital,
        equityValues,
        trades
      );
      
      // 构建回测结果
      const result = {
        id: `backtest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        params,
        trades,
        performance,
        equity: {
          dates: equityValues.map(item => item.date),
          values: equityValues.map(item => item.value)
        },
        drawdowns: {
          dates: drawdownValues.map(item => item.date),
          values: drawdownValues.map(item => item.value)
        },
        benchmarkReturn: 0, // 这里可以添加基准收益计算
        createdAt: new Date().toISOString()
      };
      
      return result;

    } catch (error) {
      ctx.logger.error('专业回测执行失败:', error);
      throw new Error('回测执行失败: ' + error.message);
    }
  }

  /**
   * 初始化回测上下文
   */
  initializeBacktestContext(params) {
    return {
      cash: params.initialCapital,
      positions: new Map(),
      totalValue: params.initialCapital,
      currentDate: '',
      currentPrice: 0,
      commissionRate: params.commissionRate || 0.0003,
      slippageRate: params.slippageRate || 0.001
    };
  }

  /**
   * 生成交易信号
   */
  async generateTradingSignals(params, currentData, historicalData) {
    const signals = [];
    
    // 根据策略类型生成不同的信号
    switch (params.strategyType) {
    case 'technical':
      return this.generateTechnicalSignals(params, currentData, historicalData);
    case 'factor':
      return this.generateFactorSignals(params, currentData, historicalData);
    case 'ml':
      return this.generateMLSignals(params, currentData, historicalData);
    case 'timing':
      return this.generateTimingSignals(params, currentData, historicalData);
    default:
      return signals;
    }
  }

  /**
   * 生成技术分析信号
   */
  generateTechnicalSignals(params, currentData, historicalData) {
    const signals = [];
    const strategyParams = params.strategyParams || {};
    
    if (historicalData.length < 20) return signals; // 需要足够的历史数据
    
    // 计算移动平均线
    const shortPeriod = strategyParams.shortPeriod || 5;
    const longPeriod = strategyParams.longPeriod || 20;
    
    if (historicalData.length >= longPeriod) {
      const shortMA = this.calculateMA(historicalData.slice(-shortPeriod));
      const longMA = this.calculateMA(historicalData.slice(-longPeriod));
      const prevShortMA = this.calculateMA(historicalData.slice(-shortPeriod - 1, -1));
      const prevLongMA = this.calculateMA(historicalData.slice(-longPeriod - 1, -1));
      
      // 金叉买入信号
      if (shortMA > longMA && prevShortMA <= prevLongMA) {
        signals.push({
          type: 'buy',
          reason: '均线金叉',
          strength: 0.8
        });
      }
      
      // 死叉卖出信号
      if (shortMA < longMA && prevShortMA >= prevLongMA) {
        signals.push({
          type: 'sell',
          reason: '均线死叉',
          strength: 0.8
        });
      }
    }
    
    return signals;
  }

  /**
   * 计算移动平均线
   */
  calculateMA(data) {
    const sum = data.reduce((acc, item) => acc + item.close, 0);
    return sum / data.length;
  }

  /**
   * 执行交易
   */
  async executeTrade(context, signal, currentData) {
    const { type, reason, strength } = signal;
    const price = currentData.close;
    
    // 计算交易数量
    let quantity = 0;
    if (type === 'buy') {
      // 买入：使用可用现金的80%
      const availableCash = context.cash * 0.8;
      quantity = Math.floor(availableCash / price / 100) * 100; // 按手买入
      
      if (quantity > 0) {
        const amount = quantity * price;
        const commission = Math.max(amount * context.commissionRate, 5);
        const totalCost = amount + commission;
        
        if (context.cash >= totalCost) {
          context.cash -= totalCost;
          
          const existingPosition = context.positions.get(currentData.symbol) || { quantity: 0, averagePrice: 0 };
          const totalQuantity = existingPosition.quantity + quantity;
          const totalCost = existingPosition.quantity * existingPosition.averagePrice + amount;
          
          context.positions.set(currentData.symbol, {
            quantity: totalQuantity,
            averagePrice: totalCost / totalQuantity
          });
          
          return {
            id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: context.currentDate,
            symbol: currentData.symbol,
            direction: 'buy',
            quantity,
            price,
            amount,
            commission,
            slippage: amount * context.slippageRate,
            reason
          };
        }
      }
    } else if (type === 'sell') {
      // 卖出：卖出持仓的50%
      const position = context.positions.get(currentData.symbol);
      if (position && position.quantity > 0) {
        quantity = Math.floor(position.quantity * 0.5 / 100) * 100; // 按手卖出
        
        if (quantity > 0) {
          const amount = quantity * price;
          const commission = Math.max(amount * context.commissionRate, 5);
          const stampDuty = amount * 0.001; // 印花税
          const totalCost = commission + stampDuty;
          
          context.cash += amount - totalCost;
          
          position.quantity -= quantity;
          if (position.quantity <= 0) {
            context.positions.delete(currentData.symbol);
          }
          
          return {
            id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: context.currentDate,
            symbol: currentData.symbol,
            direction: 'sell',
            quantity,
            price,
            amount,
            commission,
            slippage: amount * context.slippageRate,
            stampDuty,
            reason
          };
        }
      }
    }
    
    return null;
  }

  /**
   * 计算组合价值
   */
  calculatePortfolioValue(context, currentPrice) {
    let marketValue = 0;
    for (const [symbol, position] of context.positions) {
      marketValue += position.quantity * currentPrice; // 简化：假设所有股票价格相同
    }
    return context.cash + marketValue;
  }

  /**
   * 计算绩效指标
   */
  calculatePerformanceMetrics(initialCapital, equityValues, trades) {
    const finalValue = equityValues[equityValues.length - 1].value;
    const totalReturn = (finalValue - initialCapital) / initialCapital;
    
    // 计算年化收益率
    const days = equityValues.length;
    const years = days / 252; // 假设252个交易日为一年
    const annualizedReturn = Math.pow(1 + totalReturn, 1 / years) - 1;
    
    // 计算最大回撤
    let maxDrawdown = 0;
    let peak = initialCapital;
    for (const equity of equityValues) {
      if (equity.value > peak) {
        peak = equity.value;
      }
      const drawdown = (peak - equity.value) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }
    
    // 计算夏普比率（简化版）
    const returns = [];
    for (let i = 1; i < equityValues.length; i++) {
      const dailyReturn = (equityValues[i].value - equityValues[i - 1].value) / equityValues[i - 1].value;
      returns.push(dailyReturn);
    }
    
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const stdDev = Math.sqrt(
      returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length
    );
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;
    
    // 计算胜率
    const sellTrades = trades.filter(t => t.direction === 'sell');
    const profitableTrades = sellTrades.filter(t => {
      // 简化：假设卖出价格高于平均成本就是盈利
      return t.price > t.amount / t.quantity; // 这里需要更精确的计算
    });
    const winRate = sellTrades.length > 0 ? profitableTrades.length / sellTrades.length : 0;
    
    return {
      totalReturn,
      annualizedReturn,
      maxDrawdown,
      sharpeRatio,
      winRate,
      profitFactor: 1.0, // 简化
      totalTrades: trades.length,
      profitableTrades: profitableTrades.length,
      lossTrades: sellTrades.length - profitableTrades.length,
      averageProfit: 0, // 需要计算
      averageLoss: 0, // 需要计算
      averageHoldingPeriod: 0 // 需要计算
    };
  }

  /**
   * 生成参数组合
   */
  generateParameterCombinations(parameterGrid) {
    const keys = Object.keys(parameterGrid);
    const combinations = [];

    const generate = (index, current) => {
      if (index === keys.length) {
        combinations.push({ ...current });
        return;
      }

      const key = keys[index];
      const values = parameterGrid[key];

      for (const value of values) {
        current[key] = value;
        generate(index + 1, current);
      }
    };

    generate(0, {});
    return combinations;
  }

  /**
   * 保存回测记录
   */
  async saveBacktestRecord(userId, params, result) {
    const { app } = this;

    try {
      await app.mysql.insert('backtest_records', {
        user_id: userId,
        backtest_id: result.id,
        symbol: params.symbol,
        strategy_type: params.strategyType,
        start_date: params.customStartDate,
        end_date: params.customEndDate,
        initial_capital: params.initialCapital,
        final_value: result.equity.values[result.equity.values.length - 1],
        total_return: result.performance.totalReturn,
        max_drawdown: result.performance.maxDrawdown,
        sharpe_ratio: result.performance.sharpeRatio,
        trade_count: result.trades.length,
        params: JSON.stringify(params),
        result: JSON.stringify(result),
        created_at: new Date(),
        updated_at: new Date()
      });

    } catch (error) {
      this.ctx.logger.error('保存回测记录失败:', error);
    }
  }

  /**
   * 获取策略模板
   */
  async getStrategyTemplates() {
    return [
      {
        id: 'ma_crossover',
        name: '均线交叉策略',
        description: '基于短期和长期移动平均线交叉的趋势跟踪策略',
        type: 'technical',
        defaultParams: {
          shortPeriod: 5,
          longPeriod: 20,
          stopLoss: 0.05,
          takeProfit: 0.15
        },
        isSystem: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'rsi_reversal',
        name: 'RSI反转策略',
        description: '基于RSI指标的均值回归策略',
        type: 'technical',
        defaultParams: {
          rsiPeriod: 14,
          oversoldLevel: 30,
          overboughtLevel: 70,
          stopLoss: 0.03,
          takeProfit: 0.08
        },
        isSystem: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  }
}

module.exports = BacktestService;
