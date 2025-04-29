'use strict';

const Service = require('egg').Service;

class DataService extends Service {
  /**
   * 刷新所有数据
   * 从外部API获取最新数据并更新缓存
   * @param {Object} options - 刷新选项
   * @param {number} options.userId - 用户ID
   * @param {boolean} options.forceApi - 是否强制使用API
   * @param {string} options.dataSource - 数据源名称
   * @return {Object} 刷新结果
   */
  async refreshAllData(options = {}) {
    const { ctx, app } = this;
    const { userId, forceApi = false, dataSource = 'tushare' } = options;

    const result = {
      success: true,
      refreshed: [],
      errors: [],
    };

    try {
      // 1. 刷新股票基本信息
      try {
        await ctx.service.stock.updateStockBasic(dataSource);
        result.refreshed.push('stock_basic');
      } catch (error) {
        ctx.logger.error(`刷新股票基本信息失败 (${dataSource}):`, error);
        result.errors.push({
          type: 'stock_basic',
          message: error.message,
          dataSource
        });
      }

      // 2. 刷新指数数据
      try {
        await ctx.service.stock.updateIndexData(dataSource);
        result.refreshed.push('index_data');
      } catch (error) {
        ctx.logger.error(`刷新指数数据失败 (${dataSource}):`, error);
        result.errors.push({
          type: 'index_data',
          message: error.message,
          dataSource
        });
      }

      // 3. 刷新行业数据
      try {
        await ctx.service.stock.updateIndustryData(dataSource);
        result.refreshed.push('industry_data');
      } catch (error) {
        ctx.logger.error(`刷新行业数据失败 (${dataSource}):`, error);
        result.errors.push({
          type: 'industry_data',
          message: error.message,
          dataSource
        });
      }

      // 4. 刷新用户关注的股票数据
      if (userId) {
        try {
          const watchlist = await ctx.service.watchlist.getUserWatchlist(userId);
          if (watchlist && watchlist.length > 0) {
            for (const stock of watchlist) {
              try {
                await ctx.service.stock.getStockQuote(stock.symbol, true, dataSource);
              } catch (stockError) {
                ctx.logger.warn(`刷新股票 ${stock.symbol} 行情失败 (${dataSource}):`, stockError);
              }
            }
            result.refreshed.push('watchlist_data');
          }
        } catch (error) {
          ctx.logger.error(`刷新用户关注股票数据失败 (${dataSource}):`, error);
          result.errors.push({
            type: 'watchlist_data',
            message: error.message,
            dataSource
          });
        }
      }

      // 5. 刷新财经新闻
      try {
        await ctx.service.news.refreshFinancialNews(dataSource);
        result.refreshed.push('financial_news');
      } catch (error) {
        ctx.logger.error(`刷新财经新闻失败 (${dataSource}):`, error);
        result.errors.push({
          type: 'financial_news',
          message: error.message,
          dataSource
        });
      }

      // 6. 预热热门股票数据缓存
      try {
        await ctx.service.cache.initStockDataCache(dataSource);
        result.refreshed.push('cache_preheating');
      } catch (error) {
        ctx.logger.error(`预热数据缓存失败 (${dataSource}):`, error);
        result.errors.push({
          type: 'cache_preheating',
          message: error.message,
          dataSource
        });
      }

      return result;
    } catch (error) {
      ctx.logger.error(`刷新所有数据失败 (${dataSource}):`, error);

      // 添加数据源信息到错误对象
      error.dataSource = dataSource;
      error.dataSourceMessage = `刷新${dataSource}数据源数据失败`;

      throw error;
    }
  }
}

module.exports = DataService;
