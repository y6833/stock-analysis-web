'use strict';

const Service = require('egg').Service;
const axios = require('axios');

class StockService extends Service {
  // 通用的缓存包装器，用于包装任何 API 调用并自动缓存结果
  async withCache(cacheKey, ttl, fetchDataFn) {
    const { app, ctx } = this;

    // 提取数据源名称
    const dataSource = cacheKey.split(':')[0] || 'tushare';

    // 首先尝试从缓存获取数据
    try {
      if (app.redis) {
        const cachedData = await app.redis.get(cacheKey);
        if (cachedData) {
          try {
            const parsedData = JSON.parse(cachedData);
            ctx.logger.info(`从 Redis 缓存获取数据成功: ${cacheKey}`);

            // 记录缓存命中
            await ctx.service.cache.recordCacheHit(dataSource);

            return {
              ...parsedData,
              fromCache: true
            };
          } catch (parseErr) {
            ctx.logger.warn(`解析 Redis 缓存数据失败:`, parseErr);
            // 继续尝试从 API 获取
          }
        }
      } else if (global.stockCache && global.stockCache[cacheKey]) {
        // 如果 Redis 不可用，尝试从内存缓存获取
        const cacheData = global.stockCache[cacheKey];
        const cacheTime = new Date(cacheData.cacheTime || 0);
        const now = new Date();
        const cacheAge = now.getTime() - cacheTime.getTime();

        // 检查缓存是否过期
        if (cacheAge < ttl * 1000) {
          ctx.logger.info(`从内存缓存获取数据成功: ${cacheKey}`);

          // 记录缓存命中
          await ctx.service.cache.recordCacheHit(dataSource);

          return {
            ...cacheData,
            fromCache: true
          };
        }
      }

      // 记录缓存未命中
      await ctx.service.cache.recordCacheMiss(dataSource);
    } catch (cacheErr) {
      ctx.logger.warn(`获取缓存数据失败:`, cacheErr);
      // 继续尝试从 API 获取
    }

    // 如果缓存中没有数据或已过期，从 API 获取
    try {
      // 调用传入的函数获取数据
      const data = await fetchDataFn();

      // 添加缓存时间
      const dataToCache = {
        ...data,
        cacheTime: new Date().toISOString()
      };

      // 保存到 Redis 缓存
      try {
        if (app.redis) {
          await app.redis.set(cacheKey, JSON.stringify(dataToCache), 'EX', ttl);
          ctx.logger.info(`数据已保存到 Redis 缓存: ${cacheKey}`);
        }

        // 同时保存到内存缓存作为备份
        if (!global.stockCache) {
          global.stockCache = {};
        }
        global.stockCache[cacheKey] = dataToCache;
      } catch (cacheErr) {
        ctx.logger.warn(`保存数据到缓存失败:`, cacheErr);
        // 继续返回数据，不影响主流程
      }

      return data;
    } catch (err) {
      ctx.logger.error(`获取数据失败: ${cacheKey}`, err);

      // 再次尝试从缓存获取（可能第一次尝试时缓存还未准备好）
      try {
        if (app.redis) {
          const cachedData = await app.redis.get(cacheKey);
          if (cachedData) {
            const parsedData = JSON.parse(cachedData);
            ctx.logger.info(`API调用失败，使用缓存数据: ${cacheKey}`);

            // 记录缓存命中
            await ctx.service.cache.recordCacheHit(dataSource);

            return {
              ...parsedData,
              fromCache: true
            };
          }
        } else if (global.stockCache && global.stockCache[cacheKey]) {
          ctx.logger.info(`API调用失败，使用内存缓存数据: ${cacheKey}`);

          // 记录缓存命中
          await ctx.service.cache.recordCacheHit(dataSource);

          return {
            ...global.stockCache[cacheKey],
            fromCache: true
          };
        }

        // 如果没有缓存数据，记录缓存未命中
        await ctx.service.cache.recordCacheMiss(dataSource);
      } catch (cacheErr) {
        ctx.logger.warn(`获取缓存数据失败:`, cacheErr);

        // 记录缓存未命中
        await ctx.service.cache.recordCacheMiss(dataSource);
      }

      // 如果没有缓存数据，抛出错误
      throw err;
    }
  }

  // 获取股票实时行情
  async getStockQuote(stockCode) {
    const { app, ctx } = this;
    const cacheKey = `stock:quote:${stockCode}`;

    // 使用缓存包装器
    return this.withCache(cacheKey, 3600, async () => {
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
    });
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

    // 如果没有获取到数据，抛出错误
    throw new Error('未找到股票行情数据');
  }

  // 获取股票缓存数据 (如果有)
  async getCachedStockQuote(stockCode) {
    const { app, ctx } = this;
    const cacheKey = `stock:quote:${stockCode}`;
    let redisError = false;

    // 尝试从 Redis 获取缓存数据
    if (app.redis) {
      try {
        const cachedData = await app.redis.get(cacheKey);
        if (cachedData) {
          try {
            const parsedData = JSON.parse(cachedData);
            ctx.logger.info(`从 Redis 缓存获取股票 ${stockCode} 行情数据成功`);
            return parsedData;
          } catch (parseErr) {
            ctx.logger.warn(`解析 Redis 缓存数据失败:`, parseErr);
            // Redis 数据解析失败，继续尝试内存缓存
            redisError = true;
          }
        }
      } catch (redisErr) {
        ctx.logger.warn(`Redis 获取失败:`, redisErr);
        redisError = true;
        // Redis 出错，继续尝试内存缓存
      }
    } else {
      redisError = true;
      ctx.logger.info('Redis 不可用，使用内存缓存');
    }

    // 如果 Redis 不可用或出错，尝试从内存缓存获取
    if (redisError) {
      try {
        const cacheData = this.getLocalCache(stockCode);
        if (cacheData) {
          ctx.logger.info(`从内存缓存获取股票 ${stockCode} 行情数据成功`);
          return cacheData;
        }
      } catch (memErr) {
        ctx.logger.warn(`内存缓存获取失败:`, memErr);
      }
    }

    return null;
  }

  // 从内存缓存中获取数据 (作为 Redis 的备份)
  getLocalCache(stockCode) {
    // 使用全局变量作为简单的内存缓存
    if (!global.stockCache) {
      global.stockCache = {};
    }

    const cache = global.stockCache[stockCode];
    if (!cache) return null;

    // 检查缓存是否过期（1小时）
    const cacheTime = new Date(cache.cacheTime || 0);
    const now = new Date();
    const cacheAge = now.getTime() - cacheTime.getTime();
    const cacheExpiry = 60 * 60 * 1000; // 1小时

    if (cacheAge < cacheExpiry) {
      return cache;
    }

    // 缓存已过期，删除它
    delete global.stockCache[stockCode];
    return null;
  }

  // 保存股票数据到缓存
  async saveStockQuoteToCache(stockCode, quoteData) {
    const { app, ctx } = this;
    const cacheKey = `stock:quote:${stockCode}`;

    try {
      // 添加缓存时间
      const dataToCache = {
        ...quoteData,
        cacheTime: new Date().toISOString()
      };

      // 保存到 Redis 缓存
      if (app.redis) {
        await app.redis.set(cacheKey, JSON.stringify(dataToCache), 'EX', 3600); // 1小时过期
        ctx.logger.info(`股票 ${stockCode} 行情数据已保存到 Redis 缓存`);
      }

      // 同时保存到内存缓存作为备份
      if (!global.stockCache) {
        global.stockCache = {};
      }
      global.stockCache[stockCode] = dataToCache;

    } catch (err) {
      ctx.logger.warn(`保存股票 ${stockCode} 行情数据到 Redis 缓存失败:`, err);

      // 如果 Redis 保存失败，只保存到内存缓存
      try {
        if (!global.stockCache) {
          global.stockCache = {};
        }
        global.stockCache[stockCode] = {
          ...quoteData,
          cacheTime: new Date().toISOString()
        };
        ctx.logger.info(`股票 ${stockCode} 行情数据已保存到内存缓存（Redis 失败）`);
      } catch (e) {
        ctx.logger.error(`保存到内存缓存也失败:`, e);
      }
    }
  }

  // 获取股票历史数据
  async getStockHistory(stockCode, startDate, endDate) {
    const { app, ctx } = this;
    const cacheKey = `stock:history:${stockCode}:${startDate}:${endDate}`;

    // 使用缓存包装器
    return this.withCache(cacheKey, 3600, async () => {
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

        return historyData;
      }

      return [];
    }).catch(err => {
      ctx.logger.error('获取股票历史数据失败:', err);
      return []; // 返回空数组而不是抛出错误
    });
  }

  // 获取股票名称
  async getStockName(stockCode) {
    const { app, ctx } = this;
    const cacheKey = `stock:name:${stockCode}`;

    // 使用缓存包装器
    return this.withCache(cacheKey, 86400, async () => { // 24小时过期
      // 使用Tushare API获取股票基本信息
      const response = await axios.post('http://api.tushare.pro', {
        api_name: 'stock_basic',
        token: app.config.tushare.token,
        params: {
          ts_code: stockCode,
        },
      });

      if (response.data && response.data.data && response.data.data.items && response.data.data.items.length > 0) {
        return response.data.data.items[0][2]; // 股票名称
      }

      return stockCode;
    }).catch(err => {
      ctx.logger.error('获取股票名称失败:', err);
      return stockCode; // 返回股票代码作为名称
    });
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

  // 获取股票列表
  async getStockList() {
    const { app, ctx } = this;
    const cacheKey = 'stock:list';

    // 使用缓存包装器
    return this.withCache(cacheKey, 86400, async () => { // 24小时过期
      try {
        ctx.logger.info('开始获取股票列表...');
        ctx.logger.info(`使用 Tushare API: ${app.config.tushare.api_url}`);
        ctx.logger.info(`Token 是否设置: ${app.config.tushare.token ? '是' : '否'}`);

        // 构建请求数据
        const requestData = {
          api_name: 'stock_basic',
          token: app.config.tushare.token,
          params: {
            exchange: '',
            list_status: 'L',
            fields: 'ts_code,symbol,name,area,industry,list_date',
          },
        };

        ctx.logger.info(`请求数据: ${JSON.stringify(requestData)}`);

        // 使用Tushare API获取股票列表
        const response = await axios.post(app.config.tushare.api_url || 'http://api.tushare.pro', requestData, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
          },
          timeout: 30000 // 30秒超时
        });

        ctx.logger.info(`响应状态码: ${response.status}`);

        // 检查响应数据
        if (!response.data) {
          ctx.logger.error('Tushare API 响应数据为空');
          throw new Error('获取股票列表失败: 响应数据为空');
        }

        if (response.data.code !== 0) {
          ctx.logger.error(`Tushare API 返回错误码: ${response.data.code}, 错误信息: ${response.data.msg || '未知错误'}`);
          throw new Error(`获取股票列表失败: ${response.data.msg || '未知错误'}`);
        }

        if (!response.data.data || !response.data.data.items) {
          ctx.logger.error('Tushare API 响应数据格式不正确');
          throw new Error('获取股票列表失败: 响应数据格式不正确');
        }

        const { fields, items } = response.data.data;
        ctx.logger.info(`获取到 ${items.length} 条股票数据`);

        const tsCodeIndex = fields.indexOf('ts_code');
        const nameIndex = fields.indexOf('name');
        const industryIndex = fields.indexOf('industry');

        if (tsCodeIndex === -1 || nameIndex === -1) {
          ctx.logger.error(`字段索引错误: ts_code=${tsCodeIndex}, name=${nameIndex}, industry=${industryIndex}`);
          throw new Error('获取股票列表失败: 响应数据字段不完整');
        }

        // 转换为应用所需格式
        const stocks = items.map(item => ({
          symbol: item[tsCodeIndex],
          name: item[nameIndex],
          industry: industryIndex !== -1 && item[industryIndex] ? item[industryIndex] : '未知',
        }));

        ctx.logger.info(`股票列表处理完成，共 ${stocks.length} 条数据`);
        return stocks;
      } catch (error) {
        ctx.logger.error('获取股票列表过程中发生错误:', error);

        if (error.response) {
          ctx.logger.error(`HTTP 错误: ${error.response.status}`);
          ctx.logger.error(`响应数据: ${JSON.stringify(error.response.data)}`);
        } else if (error.request) {
          ctx.logger.error('未收到响应，可能是网络问题或服务器超时');
        }

        throw new Error(`获取股票列表失败: ${error.message}`);
      }
    }).catch(err => {
      ctx.logger.error('获取股票列表失败:', err);
      return []; // 返回空数组而不是抛出错误
    });
  }

  // 测试 Redis 连接和数据存储
  async testRedisStorage() {
    const { app, ctx } = this;
    const result = {
      success: false,
      redisAvailable: false,
      testData: null,
      error: null
    };

    try {
      // 检查 Redis 是否可用
      if (!app.redis) {
        result.error = 'Redis 客户端不可用';
        return result;
      }

      // 测试 Redis 连接
      try {
        await app.redis.ping();
        result.redisAvailable = true;
      } catch (pingErr) {
        result.error = `Redis 连接测试失败: ${pingErr.message}`;
        return result;
      }

      // 生成测试数据
      const testData = {
        id: 'test-' + Date.now(),
        name: 'Redis 测试数据',
        timestamp: new Date().toISOString(),
        randomValue: Math.random().toFixed(4)
      };

      // 存储测试数据到 Redis
      const testKey = 'stock:test:redis-connection';
      await app.redis.set(testKey, JSON.stringify(testData), 'EX', 300); // 5分钟过期

      // 从 Redis 读取测试数据
      const storedData = await app.redis.get(testKey);
      if (storedData) {
        result.testData = JSON.parse(storedData);
        result.success = true;
      } else {
        result.error = '无法从 Redis 读取测试数据';
      }

      // 获取所有与股票相关的键
      const stockKeys = await app.redis.keys('stock:*');
      result.existingKeys = stockKeys;

      return result;
    } catch (err) {
      ctx.logger.error('Redis 测试失败:', err);
      result.error = err.message || '未知错误';
      return result;
    }
  }

  // 主动存储股票数据到 Redis
  async storeStockDataToRedis(stockCode) {
    const { app, ctx } = this;
    const result = {
      success: false,
      stockCode,
      data: null,
      error: null
    };

    try {
      // 检查 Redis 是否可用
      if (!app.redis) {
        result.error = 'Redis 客户端不可用';
        return result;
      }

      // 测试 Redis 连接
      try {
        await app.redis.ping();
      } catch (pingErr) {
        result.error = `Redis 连接测试失败: ${pingErr.message}`;
        return result;
      }

      // 获取股票数据
      try {
        // 获取股票实时行情
        const quoteData = await this.getStockQuote(stockCode);
        if (quoteData) {
          // 手动存储到 Redis
          const quoteKey = `stock:quote:${stockCode}`;
          const dataToCache = {
            ...quoteData,
            cacheTime: new Date().toISOString()
          };

          await app.redis.set(quoteKey, JSON.stringify(dataToCache), 'EX', 3600); // 1小时过期
          ctx.logger.info(`股票 ${stockCode} 行情数据已手动保存到 Redis 缓存`);

          // 获取股票历史数据（最近30天）
          const historyData = await this.getStockHistory(
            stockCode,
            this.getDateString(-30), // 30天前
            this.getDateString(0)    // 今天
          );

          if (historyData && historyData.length > 0) {
            const historyKey = `stock:history:${stockCode}:${this.getDateString(-30)}:${this.getDateString(0)}`;
            await app.redis.set(historyKey, JSON.stringify(historyData), 'EX', 3600); // 1小时过期
            ctx.logger.info(`股票 ${stockCode} 历史数据已手动保存到 Redis 缓存`);
          }

          // 获取股票名称
          const stockName = await this.getStockName(stockCode);
          if (stockName) {
            const nameKey = `stock:name:${stockCode}`;
            await app.redis.set(nameKey, stockName, 'EX', 86400); // 24小时过期
            ctx.logger.info(`股票 ${stockCode} 名称已手动保存到 Redis 缓存`);
          }

          // 获取所有与该股票相关的键
          const stockKeys = await app.redis.keys(`stock:*:${stockCode}*`);

          result.success = true;
          result.data = {
            quote: quoteData,
            history: historyData ? historyData.length : 0,
            name: stockName,
            keys: stockKeys
          };
        } else {
          result.error = `无法获取股票 ${stockCode} 的数据`;
        }
      } catch (dataErr) {
        result.error = `获取股票数据失败: ${dataErr.message}`;
        ctx.logger.error('获取股票数据失败:', dataErr);
      }

      return result;
    } catch (err) {
      ctx.logger.error('存储股票数据到 Redis 失败:', err);
      result.error = err.message || '未知错误';
      return result;
    }
  }

  // 批量存储多只股票数据到 Redis
  async storeAllStocksToRedis(stockCodes) {
    const { app, ctx } = this;
    const result = {
      success: false,
      totalStocks: stockCodes.length,
      successCount: 0,
      failedCount: 0,
      processedStocks: [],
      error: null
    };

    try {
      // 检查 Redis 是否可用
      if (!app.redis) {
        result.error = 'Redis 客户端不可用';
        return result;
      }

      // 测试 Redis 连接
      try {
        await app.redis.ping();
      } catch (pingErr) {
        result.error = `Redis 连接测试失败: ${pingErr.message}`;
        return result;
      }

      // 批量处理股票
      const startTime = Date.now();

      // 限制并发请求数量，避免请求过多导致API限流
      const concurrentLimit = 5;
      const chunks = [];

      // 将股票代码分成多个小组，每组最多 concurrentLimit 个
      for (let i = 0; i < stockCodes.length; i += concurrentLimit) {
        chunks.push(stockCodes.slice(i, i + concurrentLimit));
      }

      // 逐组处理股票
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkPromises = chunk.map(async (stockCode) => {
          try {
            // 获取并存储股票数据
            const stockResult = await this.storeStockDataToRedis(stockCode);

            return {
              stockCode,
              success: stockResult.success,
              error: stockResult.error,
              data: stockResult.success ? {
                name: stockResult.data.name,
                historyCount: stockResult.data.history
              } : null
            };
          } catch (err) {
            ctx.logger.error(`处理股票 ${stockCode} 时出错:`, err);
            return {
              stockCode,
              success: false,
              error: err.message || '未知错误',
              data: null
            };
          }
        });

        // 等待当前组的所有请求完成
        const chunkResults = await Promise.all(chunkPromises);

        // 更新结果
        chunkResults.forEach(stockResult => {
          result.processedStocks.push(stockResult);
          if (stockResult.success) {
            result.successCount++;
          } else {
            result.failedCount++;
          }
        });

        // 每组处理完后稍微暂停一下，避免请求过于频繁
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const endTime = Date.now();
      const totalTime = (endTime - startTime) / 1000;

      result.success = true;
      result.totalTime = totalTime;
      result.averageTimePerStock = totalTime / stockCodes.length;

      return result;
    } catch (err) {
      ctx.logger.error('批量存储股票数据到 Redis 失败:', err);
      result.error = err.message || '未知错误';
      return result;
    }
  }
}

module.exports = StockService;
