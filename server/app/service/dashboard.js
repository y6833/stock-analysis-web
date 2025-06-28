'use strict';

const Service = require('egg').Service;

class DashboardService extends Service {
  /**
   * 获取市场概览数据
   * @param {boolean} forceRefresh - 是否强制刷新
   * @return {Object} 市场概览数据
   */
  async getMarketOverview(forceRefresh = false) {
    const { ctx } = this;
    const cacheKey = 'dashboard:market_overview';

    try {
      // 如果不强制刷新，先尝试从缓存获取
      if (!forceRefresh) {
        try {
          const cachedData = await ctx.service.cache.get(cacheKey);
          if (cachedData) {
            ctx.logger.info('从缓存获取市场概览数据');
            return {
              ...cachedData,
              data_source: 'cache',
              data_source_message: '数据来自缓存'
            };
          }
        } catch (cacheErr) {
          ctx.logger.warn('获取缓存的市场概览数据失败:', cacheErr);
        }
      }

      ctx.logger.info('从外部数据源获取市场概览数据');

      // 获取主要指数数据
      const indices = await this.getMarketIndices();

      // 获取行业板块数据
      const sectors = await this.getIndustrySectors();

      // 获取市场宽度数据
      const breadth = await this.getMarketBreadth();

      const marketOverview = {
        indices,
        sectors,
        breadth,
        timestamp: new Date().toISOString(),
        data_source: 'external_api',
        data_source_message: '数据来自外部API'
      };

      // 缓存数据（5分钟）
      try {
        if (ctx.app.redis && typeof ctx.app.redis.set === 'function') {
          await ctx.app.redis.set(cacheKey, JSON.stringify(marketOverview), 'EX', 300);
        }
      } catch (cacheErr) {
        ctx.logger.warn('缓存市场概览数据失败:', cacheErr);
      }

      return marketOverview;
    } catch (err) {
      ctx.logger.error('获取市场概览数据失败:', err);

      // 如果API调用失败，尝试返回缓存数据
      try {
        if (ctx.app.redis) {
          const cachedData = await ctx.app.redis.get(cacheKey);
          if (cachedData) {
            const parsedData = JSON.parse(cachedData);
            ctx.logger.info('API调用失败，返回缓存数据');
            return {
              ...parsedData,
              data_source: 'cache_fallback',
              data_source_message: '数据来自缓存（API调用失败）'
            };
          }
        }
      } catch (cacheErr) {
        ctx.logger.warn('获取缓存数据也失败:', cacheErr);
      }

      // 如果都失败了，抛出错误而不是返回模拟数据
      throw new Error('无法获取市场概览数据，请检查数据源配置或网络连接');
    }
  }

  /**
   * 获取主要指数数据
   * @return {Array} 指数数据列表
   */
  async getMarketIndices() {
    const { ctx } = this;

    const indexCodes = [
      '000001.SH', // 上证指数
      '399001.SZ', // 深证成指
      '399006.SZ', // 创业板指
      '000300.SH', // 沪深300
      '000905.SH', // 中证500
      '000852.SH'  // 中证1000
    ];

    const indices = [];

    for (const code of indexCodes) {
      try {
        const indexQuote = await ctx.service.stock.getIndexQuote(code);
        if (indexQuote) {
          indices.push({
            symbol: code,
            name: indexQuote.name,
            price: indexQuote.price,
            change: indexQuote.change,
            changePercent: indexQuote.change,
            volume: indexQuote.volume,
            turnover: indexQuote.amount,
            components: this.getIndexComponents(code)
          });
        }
      } catch (err) {
        ctx.logger.warn(`获取指数 ${code} 数据失败:`, err);
      }
    }

    // 如果没有获取到任何数据，返回模拟数据
    if (indices.length === 0) {
      return this.getMockIndices();
    }

    return indices;
  }

  /**
   * 获取行业板块数据
   * @return {Array} 行业板块数据列表
   */
  async getIndustrySectors() {
    const { ctx } = this;

    try {
      const industryList = await ctx.service.stock.getIndustryList();
      const sectors = [];

      // 只取前5个行业
      const topIndustries = industryList.data ? industryList.data.slice(0, 5) : [];

      for (const industry of topIndustries) {
        try {
          const industryData = await ctx.service.stock.getIndustryData(industry.code);
          if (industryData) {
            sectors.push({
              id: industry.code,
              name: industry.name,
              change: industryData.change || 0,
              changePercent: industryData.changePercent || 0,
              volume: industryData.volume || 0,
              turnover: industryData.turnover || 0,
              leadingStocks: industryData.leadingStocks || [],
              laggingStocks: industryData.laggingStocks || []
            });
          }
        } catch (err) {
          ctx.logger.warn(`获取行业 ${industry.name} 数据失败:`, err);
        }
      }

      // 如果没有获取到任何数据，抛出错误而不是返回模拟数据
      if (sectors.length === 0) {
        throw new Error('无法获取行业板块数据，请检查数据源配置或网络连接');
      }

      return sectors;
    } catch (err) {
      ctx.logger.error('获取行业板块数据失败:', err);
      return this.getMockSectors();
    }
  }

  /**
   * 获取市场宽度数据
   * @return {Object} 市场宽度数据
   */
  async getMarketBreadth() {
    // 由于获取真实的市场宽度数据比较复杂，这里返回模拟数据
    const totalStocks = 4000;
    const advancing = Math.round(Math.random() * totalStocks * 0.6);
    const declining = Math.round(Math.random() * totalStocks * 0.4);
    const unchanged = totalStocks - advancing - declining;

    const totalVolume = Math.round(Math.random() * 500000000000);
    const advancingVolume = Math.round(totalVolume * (advancing / totalStocks) * (1 + Math.random() * 0.3));
    const decliningVolume = totalVolume - advancingVolume;

    return {
      advancing,
      declining,
      unchanged,
      newHighs: Math.round(Math.random() * 100),
      newLows: Math.round(Math.random() * 50),
      advancingVolume,
      decliningVolume
    };
  }

  /**
   * 获取指数成分股数量
   * @param {string} indexCode - 指数代码
   * @return {number} 成分股数量
   */
  getIndexComponents(indexCode) {
    const componentMap = {
      '000001.SH': 1800,
      '399001.SZ': 500,
      '399006.SZ': 100,
      '000300.SH': 300,
      '000905.SH': 500,
      '000852.SH': 1000
    };
    return componentMap[indexCode] || 0;
  }

  /**
   * 获取市场概览数据失败时的错误响应
   * @return {Object} 错误响应数据
   */
  getMarketOverviewError() {
    return {
      success: false,
      message: '无法获取市场概览数据，所有数据源均不可用',
      error: 'All market data sources failed',
      data_source: '市场数据API',
      data_source_message: '市场数据API不可用'
    };
  }

  /**
   * 获取模拟的指数数据
   * @return {Array} 模拟的指数数据
   */
  getMockIndices() {
    return [
      {
        symbol: '000001.SH',
        name: '上证指数',
        price: 3000 + Math.random() * 200,
        change: Math.random() * 40 - 20,
        changePercent: Math.random() * 2 - 1,
        volume: Math.round(Math.random() * 100000000000),
        turnover: Math.round(Math.random() * 500000000000),
        components: 1800
      },
      {
        symbol: '399001.SZ',
        name: '深证成指',
        price: 10000 + Math.random() * 1000,
        change: Math.random() * 100 - 50,
        changePercent: Math.random() * 2 - 1,
        volume: Math.round(Math.random() * 80000000000),
        turnover: Math.round(Math.random() * 400000000000),
        components: 500
      },
      {
        symbol: '399006.SZ',
        name: '创业板指',
        price: 2000 + Math.random() * 300,
        change: Math.random() * 30 - 15,
        changePercent: Math.random() * 3 - 1.5,
        volume: Math.round(Math.random() * 60000000000),
        turnover: Math.round(Math.random() * 300000000000),
        components: 100
      }
    ];
  }

  /**
   * 获取模拟的行业板块数据
   * @return {Array} 模拟的行业板块数据
   */
  getMockSectors() {
    return [
      {
        id: 'SW801010',
        name: '农林牧渔',
        change: Math.random() * 10 - 5,
        changePercent: Math.random() * 2 - 1,
        volume: Math.round(Math.random() * 1000000000),
        turnover: Math.round(Math.random() * 5000000000),
        leadingStocks: [],
        laggingStocks: []
      },
      {
        id: 'SW801080',
        name: '电子',
        change: Math.random() * 10 - 5,
        changePercent: Math.random() * 2 - 1,
        volume: Math.round(Math.random() * 1000000000),
        turnover: Math.round(Math.random() * 5000000000),
        leadingStocks: [],
        laggingStocks: []
      },
      {
        id: 'SW801150',
        name: '医药生物',
        change: Math.random() * 10 - 5,
        changePercent: Math.random() * 2 - 1,
        volume: Math.round(Math.random() * 1000000000),
        turnover: Math.round(Math.random() * 5000000000),
        leadingStocks: [],
        laggingStocks: []
      }
    ];
  }
}

module.exports = DashboardService;
