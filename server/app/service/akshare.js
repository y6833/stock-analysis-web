'use strict'

const Service = require('egg').Service

class AkshareService extends Service {
  /**
   * 获取财经新闻
   * @param {number} count - 新闻数量
   * @return {Array} 新闻列表
   */
  async getFinancialNews(count = 20) {
    const { ctx } = this

    try {
      ctx.logger.info(`从 AkShare 获取 ${count} 条财经新闻`)

      // 调用真实的 AkShare API
      const response = await ctx.curl('https://api.akshare.xyz/news/financial', {
        method: 'GET',
        dataType: 'json',
        timeout: 10000,
        data: {
          limit: count,
        },
      })

      if (response.data && response.data.success) {
        return response.data.data.map((news) => ({
          ...news,
          source: 'akshare',
          data_source: 'akshare_api',
          data_source_message: '数据来自AkShare API',
        }))
      }

      // 如果API调用失败，抛出错误
      throw new Error('AkShare API调用失败，无法获取财经新闻')
    } catch (err) {
      ctx.logger.error('从 AkShare 获取财经新闻失败:', err)
      throw new Error(`获取财经新闻失败: ${err.message}`)
    }
  }

  /**
   * 获取股票行情
   * @param {string} symbol - 股票代码
   * @return {Object|null} 股票行情数据
   */
  async getStockQuote(symbol) {
    const { ctx } = this

    try {
      ctx.logger.info(`从 AkShare 获取股票 ${symbol} 行情`)

      // 调用真实的 AkShare API
      const response = await ctx.curl('https://api.akshare.xyz/stock/quote', {
        method: 'GET',
        dataType: 'json',
        timeout: 10000,
        data: {
          symbol: symbol,
        },
      })

      if (response.data && response.data.success) {
        return response.data.data
      }

      // 如果API调用失败，抛出错误
      throw new Error(`AkShare API调用失败，无法获取股票${symbol}行情`)
    } catch (err) {
      ctx.logger.error(`从 AkShare 获取股票 ${symbol} 行情失败:`, err)
      throw new Error(`获取股票行情失败: ${err.message}`)
    }
  }

  /**
   * 获取市场概览数据
   * @return {Object|null} 市场概览数据
   */
  async getMarketOverview() {
    const { ctx } = this

    try {
      ctx.logger.info('从 AkShare 获取市场概览数据')

      // 调用真实的 AkShare API
      const response = await ctx.curl('https://api.akshare.xyz/market/overview', {
        method: 'GET',
        dataType: 'json',
        timeout: 10000,
      })

      if (response.data && response.data.success) {
        return response.data.data
      }

      // 如果API调用失败，抛出错误
      throw new Error('AkShare API调用失败，无法获取市场概览数据')
    } catch (err) {
      ctx.logger.error('从 AkShare 获取市场概览数据失败:', err)
      throw new Error(`获取市场概览数据失败: ${err.message}`)
    }
  }

  /**
   * 获取股票历史数据
   * @param {string} symbol - 股票代码
   * @param {string} period - 周期 (daily, weekly, monthly)
   * @param {number} count - 数据条数
   * @return {Array} 历史数据
   */
  async getStockHistory(symbol, period = 'daily', count = 100) {
    const { ctx } = this

    try {
      ctx.logger.info(`从 AkShare 获取股票 ${symbol} 历史数据`)

      // 调用真实的 AkShare API
      const response = await ctx.curl('https://api.akshare.xyz/stock/history', {
        method: 'GET',
        dataType: 'json',
        timeout: 10000,
        data: {
          symbol: symbol,
          period: period,
          limit: count,
        },
      })

      if (response.data && response.data.success) {
        return response.data.data
      }

      // 如果API调用失败，抛出错误
      throw new Error(`AkShare API调用失败，无法获取股票${symbol}历史数据`)
    } catch (err) {
      ctx.logger.error(`从 AkShare 获取股票 ${symbol} 历史数据失败:`, err)
      throw new Error(`获取股票历史数据失败: ${err.message}`)
    }
  }

  /**
   * 获取行业板块数据
   * @return {Array} 行业板块数据
   */
  async getSectorData() {
    const { ctx } = this

    try {
      ctx.logger.info('从 AkShare 获取行业板块数据')

      // 调用真实的 AkShare API
      const response = await ctx.curl('https://api.akshare.xyz/sector/data', {
        method: 'GET',
        dataType: 'json',
        timeout: 10000,
      })

      if (response.data && response.data.success) {
        return response.data.data
      }

      // 如果API调用失败，抛出错误
      throw new Error('AkShare API调用失败，无法获取行业板块数据')
    } catch (err) {
      ctx.logger.error('从 AkShare 获取行业板块数据失败:', err)
      throw new Error(`获取行业板块数据失败: ${err.message}`)
    }
  }

  /**
   * 测试 AkShare 连接
   * @return {boolean} 连接状态
   */
  async testConnection() {
    const { ctx } = this

    try {
      ctx.logger.info('测试 AkShare 连接')

      const response = await ctx.curl('https://api.akshare.xyz/health', {
        method: 'GET',
        dataType: 'json',
        timeout: 5000,
      })

      return response.data && response.data.success
    } catch (err) {
      ctx.logger.error('AkShare 连接测试失败:', err)
      return false
    }
  }
}

module.exports = AkshareService
