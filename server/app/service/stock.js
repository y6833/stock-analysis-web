'use strict';

const Service = require('egg').Service;
const axios = require('axios');

class StockService extends Service {
  // 获取股票实时行情
  async getStockQuote(stockCode) {
    const { app } = this;

    try {
      // 由于禁用了 Redis，我们不再从缓存获取
      // const cacheKey = `stock:quote:${stockCode}`;
      // const cachedQuote = await app.redis.get(cacheKey);
      //
      // if (cachedQuote) {
      //   return JSON.parse(cachedQuote);
      // }

      // 使用Tushare API获取实时行情
      // 首先尝试使用 daily_basic 接口获取最新交易日数据
      const response = await axios.post('http://api.tushare.pro', {
        api_name: 'daily_basic',
        token: app.config.tushare.token,
        params: {
          ts_code: stockCode,
          trade_date: this.getDateString(0), // 今天
        },
      });

      // 如果今天没有数据，尝试获取最近一个交易日的数据
      if (!response.data || !response.data.data || !response.data.data.items || response.data.data.items.length === 0) {
        const fallbackResponse = await axios.post('http://api.tushare.pro', {
          api_name: 'daily',
          token: app.config.tushare.token,
          params: {
            ts_code: stockCode,
            start_date: this.getDateString(-10), // 10天前
            end_date: this.getDateString(0),     // 今天
            limit: 1,                           // 只获取最新的一条记录
          },
        });

        return this.processStockData(fallbackResponse, stockCode, 'daily');
      }

      return this.processStockData(response, stockCode, 'daily_basic');
    } catch (err) {
      this.ctx.logger.error('获取股票行情失败:', err);
      // 返回模拟数据
      return this.getSimulatedQuote(stockCode);
    }
  }

  // 处理股票数据
  async processStockData(response, stockCode, apiType) {
    if (response.data && response.data.data && response.data.data.items && response.data.data.items.length > 0) {
      const latestData = response.data.data.items[0];
      const stockName = await this.getStockName(stockCode);

      let quote;

      if (apiType === 'daily_basic') {
        // daily_basic 接口返回的数据结构
        quote = {
          code: stockCode,
          name: stockName,
          price: latestData[2], // 收盘价
          open: null,           // daily_basic 不包含开盘价
          high: null,           // daily_basic 不包含最高价
          low: null,            // daily_basic 不包含最低价
          volume: latestData[9], // 成交量
          amount: null,         // daily_basic 不包含成交额
          change: latestData[8], // 涨跌幅
          date: latestData[1],   // 交易日期
          pe: latestData[3],     // 市盈率
          pb: latestData[5],     // 市净率
          total_mv: latestData[12], // 总市值
        };
      } else {
        // daily 接口返回的数据结构
        quote = {
          code: stockCode,
          name: stockName,
          price: latestData[5], // 收盘价
          open: latestData[2],  // 开盘价
          high: latestData[3],  // 最高价
          low: latestData[4],   // 最低价
          volume: latestData[9], // 成交量
          amount: latestData[10], // 成交额
          change: latestData[8], // 涨跌幅
          date: latestData[1],   // 日期
        };
      }

      return quote;
    }

    // 如果没有获取到数据，返回模拟数据
    return this.getSimulatedQuote(stockCode);
  }

  // 获取模拟行情数据
  async getSimulatedQuote(stockCode) {
    const stockName = await this.getStockName(stockCode);

    // 根据股票代码生成一个伪随机但相对稳定的基础价格
    // 这样同一个股票每次生成的价格会在一个相对稳定的范围内
    const codeSum = stockCode.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const basePrice = (codeSum % 100) + 10; // 10-110 之间的基础价格

    // 添加一点随机波动，但不会偏离太多
    const randomFactor = 0.05; // 5% 的随机波动
    const price = parseFloat((basePrice * (1 - randomFactor + Math.random() * randomFactor * 2)).toFixed(2));

    // 生成其他价格数据
    const open = parseFloat((price * (0.98 + Math.random() * 0.04)).toFixed(2));
    const high = parseFloat((Math.max(price, open) * (1 + Math.random() * 0.02)).toFixed(2));
    const low = parseFloat((Math.min(price, open) * (0.98 + Math.random() * 0.02)).toFixed(2));
    const change = parseFloat(((price / open - 1) * 100).toFixed(2));

    return {
      code: stockCode,
      name: stockName,
      price,
      open,
      high,
      low,
      volume: Math.floor(Math.random() * 10000000),
      amount: Math.floor(Math.random() * 100000000),
      change,
      date: this.getDateString(0),
      simulated: true, // 标记为模拟数据
      pe: parseFloat((Math.random() * 30 + 5).toFixed(2)), // 模拟市盈率
      pb: parseFloat((Math.random() * 5 + 1).toFixed(2)),  // 模拟市净率
      total_mv: Math.floor(Math.random() * 1000000000000)  // 模拟总市值
    };
  }

  // 获取股票历史数据
  async getStockHistory(stockCode, startDate, endDate) {
    const { app } = this;

    try {
      // 由于禁用了 Redis，我们不再从缓存获取
      // const cacheKey = `stock:history:${stockCode}:${startDate}:${endDate}`;
      // const cachedHistory = await app.redis.get(cacheKey);
      //
      // if (cachedHistory) {
      //   return JSON.parse(cachedHistory);
      // }

      // 使用Tushare API获取历史数据
      const response = await axios.post('http://api.tushare.pro', {
        api_name: 'daily',
        token: app.config.tushare.token,
        params: {
          ts_code: stockCode,
          start_date: startDate,
          end_date: endDate,
        },
      });

      if (response.data && response.data.data && response.data.data.items) {
        const historyData = response.data.data.items.map(item => ({
          date: item[1],
          open: item[2],
          high: item[3],
          low: item[4],
          close: item[5],
          volume: item[9],
          amount: item[10],
          change: item[8],
        }));

        // 由于禁用了 Redis，我们不再缓存结果
        // await app.redis.set(cacheKey, JSON.stringify(historyData), 'EX', 3600);

        return historyData;
      }

      return [];
    } catch (err) {
      this.ctx.logger.error('获取股票历史数据失败:', err);
      return [];
    }
  }

  // 获取股票名称
  async getStockName(stockCode) {
    const { app } = this;

    // 由于禁用了 Redis，我们不再从缓存获取
    // const cacheKey = `stock:name:${stockCode}`;
    // const cachedName = await app.redis.get(cacheKey);
    // if (cachedName) return cachedName;

    try {
      // 使用Tushare API获取股票基本信息
      const response = await axios.post('http://api.tushare.pro', {
        api_name: 'stock_basic',
        token: app.config.tushare.token,
        params: {
          ts_code: stockCode,
        },
      });

      if (response.data && response.data.data && response.data.data.items && response.data.data.items.length > 0) {
        const stockName = response.data.data.items[0][2]; // 股票名称

        // 由于禁用了 Redis，我们不再缓存结果
        // await app.redis.set(cacheKey, stockName, 'EX', 86400);

        return stockName;
      }

      return stockCode;
    } catch (err) {
      this.ctx.logger.error('获取股票名称失败:', err);
      return stockCode;
    }
  }

  // 获取日期字符串 (offset: 0表示今天, -1表示昨天, 1表示明天)
  getDateString(offset = 0) {
    const date = new Date();
    date.setDate(date.getDate() + offset);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}${month}${day}`;
  }
}

module.exports = StockService;
