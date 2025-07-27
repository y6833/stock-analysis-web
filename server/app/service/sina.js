'use strict'

const Service = require('egg').Service

class SinaService extends Service {
  /**
   * 获取财经新闻
   * @param {number} count - 新闻数量
   * @return {Array} 新闻列表
   */
  async getFinancialNews(count = 20) {
    const { ctx } = this

    try {
      ctx.logger.info(`从新浪财经获取 ${count} 条财经新闻`)

      // 由于真实API需要配置，暂时返回模拟数据
      const mockNews = this.generateMockNews(count)

      return mockNews.map((news) => ({
        ...news,
        source: 'sina',
        data_source: 'sina_mock',
        data_source_message: '模拟数据，仅供演示',
      }))
    } catch (err) {
      ctx.logger.error('从新浪财经获取财经新闻失败:', err)
      return this.generateMockNews(count).map((news) => ({
        ...news,
        source: 'sina',
        data_source: 'sina_fallback',
        data_source_message: '备用模拟数据',
      }))
    }
  }

  /**
   * 生成模拟新闻数据
   * @param {number} count - 新闻数量
   * @return {Array} 模拟新闻列表
   */
  generateMockNews(count = 20) {
    const newsTemplates = [
      '央行发布最新货币政策报告，维持稳健货币政策基调',
      'A股三大指数集体收涨，创业板指涨超2%',
      '科技股表现强劲，半导体板块领涨',
      '房地产政策持续优化，多地出台支持措施',
      '新能源汽车销量再创新高，产业链受益',
      '银行股集体上涨，金融板块表现亮眼',
      '消费板块回暖明显，白酒股领涨',
      '医药生物板块震荡上行，创新药概念活跃',
      '基建投资加码，建筑建材板块受关注',
      '外资持续流入A股，北向资金净买入',
      '上市公司三季报披露完毕，业绩分化明显',
      '监管层释放积极信号，市场信心提升',
      '人民币汇率保持稳定，外贸数据向好',
      '数字经济发展提速，相关概念股受追捧',
      '绿色金融政策支持，环保板块获关注',
    ]

    const news = []
    for (let i = 0; i < Math.min(count, newsTemplates.length); i++) {
      const randomIndex = Math.floor(Math.random() * newsTemplates.length)
      const title = newsTemplates[randomIndex]

      news.push({
        title,
        time: this.getRandomTime(),
        url: `https://finance.sina.com.cn/news/${Date.now()}_${i}.html`,
        important: Math.random() > 0.7,
        content: `${title}。据悉，相关政策将对市场产生积极影响，投资者需密切关注后续发展。`,
      })
    }

    return news
  }

  /**
   * 生成随机时间
   * @return {string} 时间字符串
   */
  getRandomTime() {
    const now = new Date()
    const randomMinutes = Math.floor(Math.random() * 60)
    const randomTime = new Date(now.getTime() - randomMinutes * 60 * 1000)

    const hours = randomTime.getHours().toString().padStart(2, '0')
    const minutes = randomTime.getMinutes().toString().padStart(2, '0')

    return `${hours}:${minutes}`
  }

  /**
   * 获取股票行情
   * @param {string} symbol - 股票代码
   * @return {Object|null} 股票行情数据
   */
  async getStockQuote(symbol) {
    const { ctx } = this

    try {
      ctx.logger.info(`从新浪财经获取股票 ${symbol} 行情`)

      // 调用真实的新浪财经API
      const response = await ctx.curl('https://api.sina.com.cn/stock/quote', {
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
      throw new Error(`新浪财经API调用失败，无法获取股票${symbol}行情`)
    } catch (err) {
      ctx.logger.error(`从新浪财经获取股票 ${symbol} 行情失败:`, err)
      throw new Error(`获取股票行情失败: ${err.message}`)
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
      ctx.logger.info(`从新浪财经获取股票 ${symbol} 历史数据`)

      // 调用真实的新浪财经API
      const response = await ctx.curl('https://api.sina.com.cn/stock/history', {
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
      throw new Error(`新浪财经API调用失败，无法获取股票${symbol}历史数据`)
    } catch (err) {
      ctx.logger.error(`从新浪财经获取股票 ${symbol} 历史数据失败:`, err)
      throw new Error(`获取股票历史数据失败: ${err.message}`)
    }
  }

  /**
   * 获取市场指数数据
   * @return {Array} 指数数据
   */
  async getMarketIndices() {
    const { ctx } = this

    try {
      ctx.logger.info('从新浪财经获取市场指数数据')

      // 调用真实的新浪财经API
      const response = await ctx.curl('https://api.sina.com.cn/market/indices', {
        method: 'GET',
        dataType: 'json',
        timeout: 10000,
      })

      if (response.data && response.data.success) {
        return response.data.data
      }

      // 如果API调用失败，抛出错误
      throw new Error('新浪财经API调用失败，无法获取市场指数数据')
    } catch (err) {
      ctx.logger.error('从新浪财经获取市场指数数据失败:', err)
      throw new Error(`获取市场指数数据失败: ${err.message}`)
    }
  }

  /**
   * 测试新浪财经连接
   * @return {boolean} 连接状态
   */
  async testConnection() {
    const { ctx } = this

    try {
      ctx.logger.info('测试新浪财经连接')

      const response = await ctx.curl('https://api.sina.com.cn/health', {
        method: 'GET',
        dataType: 'json',
        timeout: 5000,
      })

      return response.data && response.data.success
    } catch (err) {
      ctx.logger.error('新浪财经连接测试失败:', err)
      return false
    }
  }
}

module.exports = SinaService
