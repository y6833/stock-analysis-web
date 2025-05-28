'use strict';

const Service = require('egg').Service;
const axios = require('axios');

/**
 * 股票服务 - 订单簿相关扩展
 * 1. 获取股票订单簿深度数据
 * 2. 增强行情数据包含订单簿信息
 */

class StockService extends Service {
  /**
   * 获取股票订单簿深度
   * @param {string} stockCode - 股票代码
   * @param {number} depth - 深度级别(默认5档)
   */
  async getStockOrderBook(stockCode, depth = 5) {
    const { ctx } = this;
    try {
      // 获取基础行情数据
      const quote = await this.getStockQuote(stockCode);
      
      // 获取订单簿数据
      const orderBook = await ctx.service.orderBook.getDepth(depth);
      
      return {
        ...quote,
        orderBook
      };
    } catch (err) {
      ctx.logger.error(`获取股票订单簿失败: ${stockCode}`, err);
      throw err;
    }
  }
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
              fromCache: true,
              data_source: 'redis_cache',
              data_source_message: '数据来自Redis缓存'
            };
          } catch (parseErr) {
            ctx.logger.warn('解析 Redis 缓存数据失败:', parseErr);
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
            fromCache: true,
            data_source: 'local_cache',
            data_source_message: '数据来自本地内存缓存'
          };
        }
      }

      // 记录缓存未命中
      await ctx.service.cache.recordCacheMiss(dataSource);
    } catch (cacheErr) {
      ctx.logger.warn('获取缓存数据失败:', cacheErr);
      // 继续尝试从 API 获取
    }

    // 如果缓存中没有数据或已过期，从 API 获取
    try {
      // 调用传入的函数获取数据
      const data = await fetchDataFn();

      // 添加缓存时间和数据来源
      const dataToCache = {
        ...data,
        cacheTime: new Date().toISOString(),
        data_source: 'external_api',
        data_source_message: `数据来自${dataSource.toUpperCase()}外部API`
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
        ctx.logger.warn('保存数据到缓存失败:', cacheErr);
        // 继续返回数据，不影响主流程
      }

      return dataToCache;
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
              fromCache: true,
              data_source: 'redis_cache',
              data_source_message: '数据来自Redis缓存（API调用失败）'
            };
          }
        } else if (global.stockCache && global.stockCache[cacheKey]) {
          ctx.logger.info(`API调用失败，使用内存缓存数据: ${cacheKey}`);

          // 记录缓存命中
          await ctx.service.cache.recordCacheHit(dataSource);

          return {
            ...global.stockCache[cacheKey],
            fromCache: true,
            data_source: 'local_cache',
            data_source_message: '数据来自本地内存缓存（API调用失败）'
          };
        }

        // 如果没有缓存数据，记录缓存未命中
        await ctx.service.cache.recordCacheMiss(dataSource);
      } catch (cacheErr) {
        ctx.logger.warn('获取缓存数据失败:', cacheErr);

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
          data_source: 'external_api',
          data_source_message: `数据来自Tushare API (${apiType})`
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
          data_source: 'external_api',
          data_source_message: `数据来自Tushare API (${apiType})`
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
            return {
              ...parsedData,
              data_source: 'redis_cache',
              data_source_message: '数据来自Redis缓存'
            };
          } catch (parseErr) {
            ctx.logger.warn('解析 Redis 缓存数据失败:', parseErr);
            // Redis 数据解析失败，继续尝试内存缓存
            redisError = true;
          }
        }
      } catch (redisErr) {
        ctx.logger.warn('Redis 获取失败:', redisErr);
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
          return {
            ...cacheData,
            data_source: 'local_cache',
            data_source_message: '数据来自本地内存缓存'
          };
        }
      } catch (memErr) {
        ctx.logger.warn('内存缓存获取失败:', memErr);
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
      // 确定数据来源
      const dataSource = quoteData.data_source || 'external_api';
      const dataSourceMessage = quoteData.data_source_message || '数据来自外部API';

      // 添加缓存时间和数据来源
      const dataToCache = {
        ...quoteData,
        cacheTime: new Date().toISOString(),
        data_source: dataSource,
        data_source_message: dataSourceMessage
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

        // 确定数据来源
        const dataSource = quoteData.data_source || 'external_api';
        const dataSourceMessage = quoteData.data_source_message || '数据来自外部API';

        global.stockCache[stockCode] = {
          ...quoteData,
          cacheTime: new Date().toISOString(),
          data_source: dataSource,
          data_source_message: dataSourceMessage
        };
        ctx.logger.info(`股票 ${stockCode} 行情数据已保存到内存缓存（Redis 失败）`);
      } catch (e) {
        ctx.logger.error('保存到内存缓存也失败:', e);
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

        // 添加数据来源信息
        return {
          data: historyData,
          data_source: 'external_api',
          data_source_message: '数据来自Tushare API (daily)'
        };
      }

      return {
        data: [],
        data_source: 'external_api',
        data_source_message: '数据来自Tushare API (daily)，但未获取到数据'
      };
    }).catch(err => {
      ctx.logger.error('获取股票历史数据失败:', err);
      return {
        data: [],
        data_source: 'error',
        data_source_message: `获取数据失败: ${err.message}`
      };
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
        const stockName = response.data.data.items[0][2]; // 股票名称
        return {
          name: stockName,
          data_source: 'external_api',
          data_source_message: '数据来自Tushare API (stock_basic)'
        };
      }

      return {
        name: stockCode,
        data_source: 'external_api',
        data_source_message: '数据来自Tushare API (stock_basic)，但未获取到数据'
      };
    }).catch(err => {
      ctx.logger.error('获取股票名称失败:', err);
      return {
        name: stockCode,
        data_source: 'error',
        data_source_message: `获取数据失败: ${err.message}`
      };
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

        // 添加数据来源信息
        return {
          data: stocks,
          count: stocks.length,
          data_source: 'external_api',
          data_source_message: '数据来自Tushare API (stock_basic)'
        };
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
      // 返回空数组而不是抛出错误，但添加数据来源信息
      return {
        data: [],
        count: 0,
        data_source: 'error',
        data_source_message: `获取数据失败: ${err.message}`
      };
    });
  }

  // 测试 Redis 连接和数据存储
  async testRedisStorage() {
    const { app, ctx } = this;
    const result = {
      success: false,
      redisAvailable: false,
      testData: null,
      error: null,
      data_source: 'redis_cache',
      data_source_message: 'Redis缓存测试'
    };

    try {
      // 检查 Redis 是否可用
      if (!app.redis) {
        result.error = 'Redis 客户端不可用';
        result.data_source_message = 'Redis缓存不可用';
        return result;
      }

      // 测试 Redis 连接
      try {
        await app.redis.ping();
        result.redisAvailable = true;
      } catch (pingErr) {
        result.error = `Redis 连接测试失败: ${pingErr.message}`;
        result.data_source_message = 'Redis缓存连接失败';
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
        result.data_source_message = 'Redis缓存测试成功';
      } else {
        result.error = '无法从 Redis 读取测试数据';
        result.data_source_message = 'Redis缓存读取失败';
      }

      // 获取所有与股票相关的键
      const stockKeys = await app.redis.keys('stock:*');
      result.existingKeys = stockKeys;

      return result;
    } catch (err) {
      ctx.logger.error('Redis 测试失败:', err);
      result.error = err.message || '未知错误';
      result.data_source_message = `Redis缓存测试失败: ${err.message}`;
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
      error: null,
      data_source: 'redis_cache',
      data_source_message: '手动存储数据到Redis缓存'
    };

    try {
      // 检查 Redis 是否可用
      if (!app.redis) {
        result.error = 'Redis 客户端不可用';
        result.data_source_message = 'Redis缓存不可用';
        return result;
      }

      // 测试 Redis 连接
      try {
        await app.redis.ping();
      } catch (pingErr) {
        result.error = `Redis 连接测试失败: ${pingErr.message}`;
        result.data_source_message = 'Redis缓存连接失败';
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
            cacheTime: new Date().toISOString(),
            data_source: quoteData.data_source || 'external_api',
            data_source_message: quoteData.data_source_message || '数据来自外部API'
          };

          await app.redis.set(quoteKey, JSON.stringify(dataToCache), 'EX', 3600); // 1小时过期
          ctx.logger.info(`股票 ${stockCode} 行情数据已手动保存到 Redis 缓存`);

          // 获取股票历史数据（最近30天）
          const historyData = await this.getStockHistory(
            stockCode,
            this.getDateString(-30), // 30天前
            this.getDateString(0)    // 今天
          );

          let historyCount = 0;
          if (historyData && historyData.data && historyData.data.length > 0) {
            const historyKey = `stock:history:${stockCode}:${this.getDateString(-30)}:${this.getDateString(0)}`;
            await app.redis.set(historyKey, JSON.stringify(historyData), 'EX', 3600); // 1小时过期
            ctx.logger.info(`股票 ${stockCode} 历史数据已手动保存到 Redis 缓存`);
            historyCount = historyData.data.length;
          }

          // 获取股票名称
          const stockNameResult = await this.getStockName(stockCode);
          const stockName = stockNameResult && stockNameResult.name ? stockNameResult.name : stockCode;

          if (stockName) {
            const nameKey = `stock:name:${stockCode}`;
            await app.redis.set(nameKey, JSON.stringify(stockNameResult), 'EX', 86400); // 24小时过期
            ctx.logger.info(`股票 ${stockCode} 名称已手动保存到 Redis 缓存`);
          }

          // 获取所有与该股票相关的键
          const stockKeys = await app.redis.keys(`stock:*:${stockCode}*`);

          result.success = true;
          result.data = {
            quote: quoteData,
            history: historyCount,
            name: stockName,
            keys: stockKeys
          };
          result.data_source_message = '数据已成功存储到Redis缓存';
        } else {
          result.error = `无法获取股票 ${stockCode} 的数据`;
          result.data_source_message = '获取股票数据失败，无法存储到缓存';
        }
      } catch (dataErr) {
        result.error = `获取股票数据失败: ${dataErr.message}`;
        result.data_source_message = `获取股票数据失败: ${dataErr.message}`;
        ctx.logger.error('获取股票数据失败:', dataErr);
      }

      return result;
    } catch (err) {
      ctx.logger.error('存储股票数据到 Redis 失败:', err);
      result.error = err.message || '未知错误';
      result.data_source_message = `存储数据到Redis缓存失败: ${err.message}`;
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
      error: null,
      data_source: 'redis_cache',
      data_source_message: '批量存储数据到Redis缓存'
    };

    try {
      // 检查 Redis 是否可用
      if (!app.redis) {
        result.error = 'Redis 客户端不可用';
        result.data_source_message = 'Redis缓存不可用';
        return result;
      }

      // 测试 Redis 连接
      try {
        await app.redis.ping();
      } catch (pingErr) {
        result.error = `Redis 连接测试失败: ${pingErr.message}`;
        result.data_source_message = 'Redis缓存连接失败';
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
              data_source: stockResult.data_source || 'redis_cache',
              data_source_message: stockResult.data_source_message || '数据已存储到Redis缓存',
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
              data_source: 'error',
              data_source_message: `处理失败: ${err.message}`,
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
      result.data_source_message = `成功存储${result.successCount}/${result.totalStocks}只股票数据到Redis缓存`;

      return result;
    } catch (err) {
      ctx.logger.error('批量存储股票数据到 Redis 失败:', err);
      result.error = err.message || '未知错误';
      result.data_source_message = `批量存储数据到Redis缓存失败: ${err.message}`;
      return result;
    }
  }

  // 获取行业列表
  async getIndustryList() {
    const { app, ctx } = this;
    const cacheKey = 'stock:industry_list';

    return this.withCache(cacheKey, 86400, async () => { // 24小时过期
      try {
        // 使用Tushare API获取行业分类
        const response = await axios.post('http://api.tushare.pro', {
          api_name: 'hs_const',
          token: app.config.tushare.token,
          params: {
            type: 'SW2021',
          },
        });

        if (response.data && response.data.data && response.data.data.items) {
          const industries = response.data.data.items.map(item => ({
            code: item[1],
            name: item[2],
            level: item[3],
            data_source: 'external_api',
            data_source_message: '数据来自Tushare API (hs_const)'
          }));

          return {
            data: industries,
            data_source: 'external_api',
            data_source_message: '数据来自Tushare API (hs_const)'
          };
        }

        return {
          data: [],
          data_source: 'external_api',
          data_source_message: '数据来自Tushare API (hs_const)，但未获取到数据'
        };
      } catch (err) {
        ctx.logger.error('获取行业列表失败:', err);
        // 返回默认行业列表
        return {
          data: [
            { code: 'SW801010', name: '农林牧渔', level: 1 },
            { code: 'SW801020', name: '采掘', level: 1 },
            { code: 'SW801030', name: '化工', level: 1 },
            { code: 'SW801040', name: '钢铁', level: 1 },
            { code: 'SW801050', name: '有色金属', level: 1 },
            { code: 'SW801080', name: '电子', level: 1 },
            { code: 'SW801110', name: '家用电器', level: 1 },
            { code: 'SW801120', name: '食品饮料', level: 1 },
            { code: 'SW801130', name: '纺织服装', level: 1 },
            { code: 'SW801140', name: '轻工制造', level: 1 },
            { code: 'SW801150', name: '医药生物', level: 1 },
            { code: 'SW801160', name: '公用事业', level: 1 },
            { code: 'SW801170', name: '交通运输', level: 1 },
            { code: 'SW801180', name: '房地产', level: 1 },
            { code: 'SW801200', name: '商业贸易', level: 1 },
            { code: 'SW801210', name: '休闲服务', level: 1 },
            { code: 'SW801230', name: '银行', level: 1 },
            { code: 'SW801710', name: '建筑材料', level: 1 },
            { code: 'SW801720', name: '建筑装饰', level: 1 },
            { code: 'SW801730', name: '电气设备', level: 1 },
            { code: 'SW801740', name: '国防军工', level: 1 },
            { code: 'SW801750', name: '计算机', level: 1 },
            { code: 'SW801760', name: '传媒', level: 1 },
            { code: 'SW801770', name: '通信', level: 1 },
            { code: 'SW801780', name: '非银金融', level: 1 },
            { code: 'SW801790', name: '汽车', level: 1 },
            { code: 'SW801880', name: '机械设备', level: 1 }
          ],
          data_source: 'fallback',
          data_source_message: '使用默认行业列表（API调用失败）'
        };
      }
    });
  }

  // 获取热门股票
  async getHotStocks(limit = 50) {
    const { app, ctx } = this;
    const cacheKey = `stock:hot_stocks:${limit}`;

    return this.withCache(cacheKey, 1800, async () => { // 30分钟过期
      try {
        // 使用Tushare API获取热门股票（通过成交量排序）
        const response = await axios.post('http://api.tushare.pro', {
          api_name: 'daily',
          token: app.config.tushare.token,
          params: {
            trade_date: this.getDateString(0),
            limit: limit,
          },
        });

        if (response.data && response.data.data && response.data.data.items) {
          const hotStocks = response.data.data.items
            .filter(item => item[9] > 0) // 过滤掉成交量为0的股票
            .sort((a, b) => b[9] - a[9]) // 按成交量降序排序
            .slice(0, limit);

          // 获取每只股票的订单簿数据
          const stocksWithOrderBook = await Promise.all(
            hotStocks.map(async item => {
              try {
                const orderBook = await ctx.service.orderBook.getDepth(3);
                return {
                  symbol: item[0],
                  name: '', // 需要单独获取股票名称
                  volume: item[9],
                  amount: item[10],
                  price: item[5],
                  change: item[8],
                  orderBook, // 添加订单簿数据
                  data_source: 'external_api',
                  data_source_message: '数据来自Tushare API (daily)'
                };
              } catch (err) {
                ctx.logger.warn(`获取股票 ${item[0]} 订单簿失败:`, err);
                return {
                  symbol: item[0],
                  name: '',
                  volume: item[9],
                  amount: item[10],
                  price: item[5],
                  change: item[8],
                  orderBook: null, // 订单簿获取失败
                  data_source: 'external_api',
                  data_source_message: '数据来自Tushare API (daily)'
                };
              }
            })
          );

          return {
            data: stocksWithOrderBook,
            data_source: 'external_api',
            data_source_message: '数据来自Tushare API (daily)'
          };
        }

        return {
          data: [],
          data_source: 'external_api',
          data_source_message: '数据来自Tushare API (daily)，但未获取到数据'
        };
      } catch (err) {
        ctx.logger.error('获取热门股票失败:', err);
        // 返回默认热门股票列表
        return {
          data: [
            { symbol: '000001.SZ', name: '平安银行' },
            { symbol: '000002.SZ', name: '万科A' },
            { symbol: '000858.SZ', name: '五粮液' },
            { symbol: '000876.SZ', name: '新希望' },
            { symbol: '002415.SZ', name: '海康威视' },
            { symbol: '002594.SZ', name: '比亚迪' },
            { symbol: '300059.SZ', name: '东方财富' },
            { symbol: '300750.SZ', name: '宁德时代' },
            { symbol: '600000.SH', name: '浦发银行' },
            { symbol: '600036.SH', name: '招商银行' },
            { symbol: '600519.SH', name: '贵州茅台' },
            { symbol: '600887.SH', name: '伊利股份' },
            { symbol: '601318.SH', name: '中国平安' },
            { symbol: '601398.SH', name: '工商银行' },
            { symbol: '601939.SH', name: '建设银行' }
          ],
          data_source: 'fallback',
          data_source_message: '使用默认热门股票列表（API调用失败）'
        };
      }
    });
  }

  // 获取指数行情
  async getIndexQuote(indexCode) {
    const { app, ctx } = this;
    const cacheKey = `index:quote:${indexCode}`;

    return this.withCache(cacheKey, 300, async () => { // 5分钟过期
      try {
        // 使用Tushare API获取指数行情
        const response = await axios.post('http://api.tushare.pro', {
          api_name: 'index_daily',
          token: app.config.tushare.token,
          params: {
            ts_code: indexCode,
            trade_date: this.getDateString(0),
          },
        });

        if (response.data && response.data.data && response.data.data.items && response.data.data.items.length > 0) {
          const indexData = response.data.data.items[0];
          const indexName = await this.getIndexName(indexCode);

          const quote = {
            code: indexCode,
            name: indexName.name || indexCode,
            price: indexData[5], // 收盘价
            open: indexData[2],  // 开盘价
            high: indexData[3],  // 最高价
            low: indexData[4],   // 最低价
            volume: indexData[6], // 成交量
            amount: indexData[7], // 成交额
            change: indexData[8], // 涨跌幅
            date: indexData[1],   // 日期
            data_source: 'external_api',
            data_source_message: '数据来自Tushare API (index_daily)'
          };

          return quote;
        }

        throw new Error('未找到指数行情数据');
      } catch (err) {
        ctx.logger.error(`获取指数 ${indexCode} 行情失败:`, err);
        throw err;
      }
    });
  }

  // 获取指数名称
  async getIndexName(indexCode) {
    const { app, ctx } = this;
    const cacheKey = `index:name:${indexCode}`;

    return this.withCache(cacheKey, 86400, async () => { // 24小时过期
      try {
        // 使用Tushare API获取指数基本信息
        const response = await axios.post('http://api.tushare.pro', {
          api_name: 'index_basic',
          token: app.config.tushare.token,
          params: {
            ts_code: indexCode,
          },
        });

        if (response.data && response.data.data && response.data.data.items && response.data.data.items.length > 0) {
          const indexName = response.data.data.items[0][2]; // 指数名称
          return {
            name: indexName,
            data_source: 'external_api',
            data_source_message: '数据来自Tushare API (index_basic)'
          };
        }

        return {
          name: indexCode,
          data_source: 'external_api',
          data_source_message: '数据来自Tushare API (index_basic)，但未获取到数据'
        };
      } catch (err) {
        ctx.logger.error('获取指数名称失败:', err);
        return {
          name: indexCode,
          data_source: 'error',
          data_source_message: `获取数据失败: ${err.message}`
        };
      }
    });
  }

  // 获取用户关注的股票
  async getUserWatchlistStocks() {
    const { ctx } = this;

    try {
      // 从关注列表服务获取所有用户的关注股票
      const watchlistStocks = await ctx.service.watchlist.getAllWatchlistStocks();

      return watchlistStocks.map(stock => ({
        symbol: stock.symbol,
        name: stock.name || stock.symbol,
        data_source: 'database',
        data_source_message: '数据来自用户关注列表'
      }));
    } catch (err) {
      ctx.logger.error('获取用户关注股票失败:', err);
      return [];
    }
  }

  // 获取股票数量统计
  async getStockCount() {
    const { ctx } = this;

    try {
      // 检查 Stock 模型是否存在
      if (ctx.model.Stock) {
        // 使用 Sequelize 模型获取股票数量
        const count = await ctx.model.Stock.count();
        return count;
      } else {
        // 如果模型不存在，尝试直接查询
        const result = await ctx.app.mysql.query('SELECT COUNT(*) as count FROM stocks');
        return result[0]?.count || 0;
      }
    } catch (err) {
      ctx.logger.error('获取股票数量失败:', err);
      // 返回一个默认值，避免阻塞其他功能
      return 0;
    }
  }

  // 获取行业数据
  async getIndustryData(industryCode) {
    const { app, ctx } = this;
    const cacheKey = `industry:data:${industryCode}`;

    return this.withCache(cacheKey, 3600, async () => { // 1小时过期
      try {
        // 使用Tushare API获取行业成分股
        const response = await axios.post('http://api.tushare.pro', {
          api_name: 'index_weight',
          token: app.config.tushare.token,
          params: {
            index_code: industryCode,
            trade_date: this.getDateString(0),
          },
        });

        if (response.data && response.data.data && response.data.data.items) {
          const industryData = {
            code: industryCode,
            stocks: response.data.data.items.map(item => ({
              symbol: item[1],
              weight: item[2],
            })),
            data_source: 'external_api',
            data_source_message: '数据来自Tushare API (index_weight)'
          };

          return industryData;
        }

        return {
          code: industryCode,
          stocks: [],
          data_source: 'external_api',
          data_source_message: '数据来自Tushare API (index_weight)，但未获取到数据'
        };
      } catch (err) {
        ctx.logger.error(`获取行业 ${industryCode} 数据失败:`, err);
        return {
          code: industryCode,
          stocks: [],
          data_source: 'error',
          data_source_message: `获取数据失败: ${err.message}`
        };
      }
    });
  }
}

module.exports = StockService;
