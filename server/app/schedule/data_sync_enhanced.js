'use strict';

const Subscription = require('egg').Subscription;

/**
 * 增强版数据同步任务
 * 支持多数据源、增量同步、错误重试等功能
 */
class DataSyncEnhancedTask extends Subscription {
  static get schedule() {
    return {
      cron: '0 */5 * * * *', // 每5分钟执行一次
      type: 'all',
      immediate: false,
    };
  }

  async subscribe() {
    const { ctx, app } = this;

    try {
      ctx.logger.info('开始执行增强版数据同步任务');

      // 并行执行多个同步任务
      await Promise.allSettled([
        this.syncStockQuotes(),
        this.syncIndexData(),
        this.syncIndustryData(),
        this.syncFinancialNews(),
        this.syncMarketData(),
      ]);

      // 清理过期缓存
      await this.cleanupExpiredCache();

      // 更新数据统计
      await this.updateDataStatistics();

      ctx.logger.info('增强版数据同步任务完成');

    } catch (error) {
      ctx.logger.error('增强版数据同步任务失败:', error);

      // 发送告警通知
      await this.sendAlertNotification(error);
    }
  }

  /**
   * 同步股票实时行情
   */
  async syncStockQuotes() {
    const { ctx } = this;

    try {
      ctx.logger.info('开始同步股票实时行情');

      // 获取需要同步的股票列表（热门股票、用户关注股票等）
      const stocksToSync = await this.getStocksToSync();

      // 分批处理，避免API限制
      const batchSize = 20;
      const batches = this.chunkArray(stocksToSync, batchSize);

      let successCount = 0;
      let errorCount = 0;

      for (const batch of batches) {
        const batchPromises = batch.map(async (stock) => {
          try {
            // 使用数据源管理器获取行情数据
            const quote = await ctx.service.stock.getStockQuote(stock.symbol);

            // 保存到缓存
            await ctx.service.stock.saveStockQuoteToCache(stock.symbol, quote);

            // 临时禁用ClickHouse保存
            // TODO: 安装ClickHouse依赖后启用
            /*
            // 如果启用了ClickHouse，同时保存到时序数据库
            if (ctx.service.clickhouse) {
              await this.saveQuoteToClickHouse(stock.symbol, quote);
            }
            */

            successCount++;

          } catch (error) {
            ctx.logger.warn(`同步股票 ${stock.symbol} 行情失败:`, error);
            errorCount++;
          }
        });

        await Promise.allSettled(batchPromises);

        // 批次间延迟，避免API限制
        if (batches.indexOf(batch) < batches.length - 1) {
          await this.delay(1000);
        }
      }

      ctx.logger.info(`股票行情同步完成: 成功 ${successCount}, 失败 ${errorCount}`);

    } catch (error) {
      ctx.logger.error('同步股票行情失败:', error);
      throw error;
    }
  }

  /**
   * 同步指数数据
   */
  async syncIndexData() {
    const { ctx } = this;

    try {
      ctx.logger.info('开始同步指数数据');

      const indexCodes = [
        '000001.SH', // 上证指数
        '399001.SZ', // 深证成指
        '399006.SZ', // 创业板指
        '000300.SH', // 沪深300
        '000905.SH', // 中证500
        '000852.SH', // 中证1000
      ];

      const indexPromises = indexCodes.map(async (code) => {
        try {
          const indexData = await ctx.service.stock.getIndexQuote(code);
          await ctx.service.cache.set(`index:${code}`, indexData, 300); // 5分钟缓存

          // 临时禁用ClickHouse保存
          // TODO: 安装ClickHouse依赖后启用
          /*
          // 保存到ClickHouse
          if (ctx.service.clickhouse) {
            await this.saveIndexToClickHouse(code, indexData);
          }
          */

        } catch (error) {
          ctx.logger.warn(`同步指数 ${code} 失败:`, error);
        }
      });

      await Promise.allSettled(indexPromises);

      ctx.logger.info('指数数据同步完成');

    } catch (error) {
      ctx.logger.error('同步指数数据失败:', error);
      throw error;
    }
  }

  /**
   * 同步行业数据
   */
  async syncIndustryData() {
    const { ctx } = this;

    try {
      ctx.logger.info('开始同步行业数据');

      // 获取行业列表
      const industries = await ctx.service.stock.getIndustryList();

      // 确保 industries 是数组
      if (!Array.isArray(industries)) {
        ctx.logger.warn('行业列表不是数组格式:', industries);
        return;
      }

      // 同步每个行业的数据
      const industryPromises = industries.slice(0, 10).map(async (industry) => {
        try {
          const industryData = await ctx.service.stock.getIndustryData(industry.code);

          // 使用 Redis 直接设置缓存
          if (ctx.app.redis) {
            await ctx.app.redis.set(`industry:${industry.code}`, JSON.stringify(industryData), 'EX', 600);
          }

        } catch (error) {
          ctx.logger.warn(`同步行业 ${industry.name} 失败:`, error);
        }
      });

      await Promise.allSettled(industryPromises);

      ctx.logger.info('行业数据同步完成');

    } catch (error) {
      ctx.logger.error('同步行业数据失败:', error);
      throw error;
    }
  }

  /**
   * 同步财经新闻
   */
  async syncFinancialNews() {
    const { ctx } = this;

    try {
      ctx.logger.info('开始同步财经新闻');

      // 从多个数据源获取新闻
      const newsPromises = [
        this.syncNewsFromSource('akshare'),
        this.syncNewsFromSource('sina'),
        this.syncNewsFromSource('eastmoney'),
      ];

      const newsResults = await Promise.allSettled(newsPromises);

      // 合并去重新闻
      const allNews = [];
      newsResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          allNews.push(...result.value);
        }
      });

      // 去重并排序
      const uniqueNews = this.deduplicateNews(allNews);
      uniqueNews.sort((a, b) => new Date(b.publishTime) - new Date(a.publishTime));

      // 保存到缓存
      await ctx.service.cache.set('financial_news', uniqueNews.slice(0, 100), 900); // 15分钟缓存

      ctx.logger.info(`财经新闻同步完成: ${uniqueNews.length} 条`);

    } catch (error) {
      ctx.logger.error('同步财经新闻失败:', error);
      throw error;
    }
  }

  /**
   * 同步市场数据
   */
  async syncMarketData() {
    const { ctx } = this;

    try {
      ctx.logger.info('开始同步市场数据');

      // 同步市场概览数据
      const marketOverview = await ctx.service.dashboard.getMarketOverview(true);
      if (ctx.app.redis) {
        await ctx.app.redis.set('market_overview', JSON.stringify(marketOverview), 'EX', 300);
      }

      // 同步涨跌停数据
      try {
        const limitData = await this.syncLimitData();
        if (ctx.app.redis) {
          await ctx.app.redis.set('limit_data', JSON.stringify(limitData), 'EX', 300);
        }
      } catch (error) {
        ctx.logger.warn('同步涨跌停数据失败:', error);
      }

      // 同步资金流向数据
      try {
        const moneyFlowData = await this.syncMoneyFlowData();
        if (ctx.app.redis) {
          await ctx.app.redis.set('money_flow', JSON.stringify(moneyFlowData), 'EX', 600);
        }
      } catch (error) {
        ctx.logger.warn('同步资金流向数据失败:', error);
      }

      ctx.logger.info('市场数据同步完成');

    } catch (error) {
      ctx.logger.error('同步市场数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取需要同步的股票列表
   */
  async getStocksToSync() {
    const { ctx } = this;

    try {
      // 获取热门股票
      const hotStocks = await ctx.service.stock.getHotStocks(50);

      // 获取用户关注的股票
      const watchlistStocks = await ctx.service.stock.getUserWatchlistStocks();

      // 获取持仓股票
      const portfolioStocks = await ctx.service.portfolio.getAllPortfolioStocks();

      // 确保所有数据都是数组
      const safeHotStocks = Array.isArray(hotStocks) ? hotStocks : [];
      const safeWatchlistStocks = Array.isArray(watchlistStocks) ? watchlistStocks : [];
      const safePortfolioStocks = Array.isArray(portfolioStocks) ? portfolioStocks : [];

      // 合并去重
      const allStocks = [...safeHotStocks, ...safeWatchlistStocks, ...safePortfolioStocks];
      const uniqueStocks = this.deduplicateStocks(allStocks);

      return uniqueStocks;

    } catch (error) {
      ctx.logger.error('获取同步股票列表失败:', error);
      return [];
    }
  }

  /**
   * 同步涨跌停数据
   */
  async syncLimitData() {
    const { ctx } = this;

    try {
      // 获取涨停股票
      const limitUpStocks = await ctx.service.stock.getLimitUpStocks();

      // 获取跌停股票
      const limitDownStocks = await ctx.service.stock.getLimitDownStocks();

      return {
        limitUp: Array.isArray(limitUpStocks) ? limitUpStocks : [],
        limitDown: Array.isArray(limitDownStocks) ? limitDownStocks : [],
        updateTime: new Date(),
      };
    } catch (error) {
      ctx.logger.warn('获取涨跌停数据失败:', error);
      return {
        limitUp: [],
        limitDown: [],
        updateTime: new Date(),
      };
    }
  }

  /**
   * 同步资金流向数据
   */
  async syncMoneyFlowData() {
    const { ctx } = this;

    try {
      // 获取主力资金流向
      const moneyFlow = await ctx.service.stock.getMoneyFlow();

      return {
        data: Array.isArray(moneyFlow) ? moneyFlow : [],
        updateTime: new Date(),
      };
    } catch (error) {
      ctx.logger.warn('获取资金流向数据失败:', error);
      return {
        data: [],
        updateTime: new Date(),
      };
    }
  }

  /**
   * 从指定数据源同步新闻
   */
  async syncNewsFromSource(source) {
    const { ctx } = this;

    try {
      let news = [];

      switch (source) {
      case 'akshare':
        news = await ctx.service.akshare.getFinancialNews(20);
        break;
      case 'sina':
        news = await ctx.service.sina.getFinancialNews(20);
        break;
      case 'eastmoney':
        news = await ctx.service.eastmoney.getFinancialNews(20);
        break;
      }

      return news.map(item => ({ ...item, source }));

    } catch (error) {
      ctx.logger.warn(`从 ${source} 同步新闻失败:`, error);
      return [];
    }
  }

  /**
   * 保存行情数据到ClickHouse
   */
  async saveQuoteToClickHouse(symbol, quote) {
    const { ctx } = this;

    try {
      const data = {
        symbol,
        datetime: new Date(),
        open: quote.open,
        high: quote.high,
        low: quote.low,
        close: quote.price,
        volume: quote.volume,
        amount: quote.turnover,
        data_source: quote.dataSource || 'unknown'
      };

      await ctx.service.clickhouse.insertMinuteData([data]);

    } catch (error) {
      ctx.logger.warn(`保存 ${symbol} 行情到ClickHouse失败:`, error);
    }
  }

  /**
   * 清理过期缓存
   */
  async cleanupExpiredCache() {
    const { ctx } = this;

    try {
      // 清理Redis过期键
      if (ctx.app.redis) {
        const expiredKeys = await ctx.app.redis.keys('*:expired:*');
        if (expiredKeys.length > 0) {
          await ctx.app.redis.del(...expiredKeys);
          ctx.logger.info(`清理了 ${expiredKeys.length} 个过期缓存键`);
        }
      }

    } catch (error) {
      ctx.logger.warn('清理过期缓存失败:', error);
    }
  }

  /**
   * 更新数据统计
   */
  async updateDataStatistics() {
    const { ctx } = this;

    try {
      const stats = {
        lastSyncTime: new Date(),
        stockCount: await this.getStockCount(),
        cacheHitRate: await this.getCacheHitRate(),
        apiCallCount: await this.getApiCallCount(),
      };

      if (ctx.app.redis) {
        await ctx.app.redis.set('data_statistics', JSON.stringify(stats), 'EX', 3600);
      }

    } catch (error) {
      ctx.logger.warn('更新数据统计失败:', error);
    }
  }

  /**
   * 发送告警通知
   */
  async sendAlertNotification(error) {
    const { ctx } = this;

    try {
      // 这里可以集成邮件、短信、钉钉等通知方式
      ctx.logger.error('数据同步任务异常，需要人工介入:', error);

      // 记录到数据库
      await ctx.service.logs.recordError('data_sync', error.message, {
        stack: error.stack,
        timestamp: new Date(),
      });

    } catch (notifyError) {
      ctx.logger.error('发送告警通知失败:', notifyError);
    }
  }

  /**
   * 工具方法：数组分块
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * 工具方法：延迟
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 工具方法：新闻去重
   */
  deduplicateNews(news) {
    const seen = new Set();
    return news.filter(item => {
      const key = `${item.title}_${item.publishTime}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * 工具方法：股票去重
   */
  deduplicateStocks(stocks) {
    const seen = new Set();
    return stocks.filter(stock => {
      if (seen.has(stock.symbol)) {
        return false;
      }
      seen.add(stock.symbol);
      return true;
    });
  }

  /**
   * 获取股票数量统计
   */
  async getStockCount() {
    const { ctx } = this;
    try {
      return await ctx.service.stock.getStockCount();
    } catch (error) {
      return 0;
    }
  }

  /**
   * 获取缓存命中率
   */
  async getCacheHitRate() {
    const { ctx } = this;
    try {
      return await ctx.service.cache.getCacheHitRate();
    } catch (error) {
      return 0;
    }
  }

  /**
   * 获取API调用次数
   */
  async getApiCallCount() {
    const { ctx } = this;
    try {
      return await ctx.service.cache.getApiCallCount();
    } catch (error) {
      return 0;
    }
  }
}

module.exports = DataSyncEnhancedTask;
