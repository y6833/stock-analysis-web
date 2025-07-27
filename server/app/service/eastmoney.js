'use strict'

const Service = require('egg').Service

class EastmoneyService extends Service {
  /**
   * 获取财经新闻
   * @param {number} count - 新闻数量
   * @return {Array} 新闻列表
   */
  async getFinancialNews(count = 20) {
    const { ctx } = this

    try {
      ctx.logger.info(`从东方财富获取 ${count} 条财经新闻`)

      // 由于真实API需要配置，暂时返回模拟数据
      const mockNews = this.generateMockNews(count)

      return mockNews.map((news) => ({
        ...news,
        source: 'eastmoney',
        data_source: 'eastmoney_mock',
        data_source_message: '模拟数据，仅供演示',
      }))
    } catch (err) {
      ctx.logger.error('从东方财富获取财经新闻失败:', err)
      return this.generateMockNews(count).map((news) => ({
        ...news,
        source: 'eastmoney',
        data_source: 'eastmoney_fallback',
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
      '沪深两市成交额突破万亿，市场活跃度提升',
      '北交所新股上市首日表现亮眼，投资者关注度高',
      '机构调研热度不减，成长股获重点关注',
      'ETF资金流入加速，被动投资受青睐',
      '可转债市场表现活跃，转股溢价率下降',
      '期货市场波动加剧，商品价格分化明显',
      '债券市场收益率震荡，流动性保持合理充裕',
      '外汇市场运行平稳，跨境资金流动有序',
      '保险资金配置调整，权益投资比例提升',
      '私募基金规模持续增长，投资策略多元化',
      '公募基金发行回暖，权益类产品受关注',
      '银行理财产品净值化转型加速推进',
      '信托行业转型发展，服务实体经济能力增强',
      '券商业绩分化明显，头部效应凸显',
      '期货公司业务创新，服务产业客户能力提升',
    ]

    const news = []
    for (let i = 0; i < Math.min(count, newsTemplates.length); i++) {
      const randomIndex = Math.floor(Math.random() * newsTemplates.length)
      const title = newsTemplates[randomIndex]

      news.push({
        title,
        time: this.getRandomTime(),
        url: `https://finance.eastmoney.com/news/${Date.now()}_${i}.html`,
        important: Math.random() > 0.8,
        content: `${title}。市场分析人士认为，这一趋势将对相关板块产生重要影响，建议投资者保持关注。`,
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
    const randomMinutes = Math.floor(Math.random() * 120)
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
      ctx.logger.info(`从东方财富获取股票 ${symbol} 行情`)

      // 模拟数据已移除 - 抛出错误
      throw new Error(`东方财富股票行情API尚未实现，无法获取股票${symbol}的数据`)
    } catch (err) {
      ctx.logger.error(`从东方财富获取股票 ${symbol} 行情失败:`, err)
      return null
    }
  }

  /**
   * 获取行业板块数据
   * @return {Array} 行业板块列表
   */
  async getIndustrySectors() {
    const { ctx } = this

    try {
      ctx.logger.info('从东方财富获取行业板块数据')

      // 这里应该调用东方财富的行业板块API
      // 由于真实API需要配置，暂时返回模拟数据
      const sectors = [
        { name: '银行', code: 'BK0475', changePercent: +(Math.random() * 6 - 3).toFixed(2) },
        { name: '房地产', code: 'BK0451', changePercent: +(Math.random() * 6 - 3).toFixed(2) },
        { name: '证券', code: 'BK0473', changePercent: +(Math.random() * 6 - 3).toFixed(2) },
        { name: '保险', code: 'BK0474', changePercent: +(Math.random() * 6 - 3).toFixed(2) },
        { name: '煤炭', code: 'BK0437', changePercent: +(Math.random() * 6 - 3).toFixed(2) },
        { name: '有色金属', code: 'BK0478', changePercent: +(Math.random() * 6 - 3).toFixed(2) },
        { name: '钢铁', code: 'BK0493', changePercent: +(Math.random() * 6 - 3).toFixed(2) },
        { name: '化工', code: 'BK0479', changePercent: +(Math.random() * 6 - 3).toFixed(2) },
        { name: '建筑材料', code: 'BK0464', changePercent: +(Math.random() * 6 - 3).toFixed(2) },
        { name: '建筑装饰', code: 'BK0456', changePercent: +(Math.random() * 6 - 3).toFixed(2) },
        { name: '电力设备', code: 'BK0457', changePercent: +(Math.random() * 6 - 3).toFixed(2) },
        { name: '国防军工', code: 'BK0458', changePercent: +(Math.random() * 6 - 3).toFixed(2) },
        { name: '计算机', code: 'BK0459', changePercent: +(Math.random() * 6 - 3).toFixed(2) },
        { name: '电子', code: 'BK0460', changePercent: +(Math.random() * 6 - 3).toFixed(2) },
        { name: '通信', code: 'BK0461', changePercent: +(Math.random() * 6 - 3).toFixed(2) },
        { name: '传媒', code: 'BK0462', changePercent: +(Math.random() * 6 - 3).toFixed(2) },
        { name: '汽车', code: 'BK0463', changePercent: +(Math.random() * 6 - 3).toFixed(2) },
        { name: '家用电器', code: 'BK0465', changePercent: +(Math.random() * 6 - 3).toFixed(2) },
        { name: '食品饮料', code: 'BK0466', changePercent: +(Math.random() * 6 - 3).toFixed(2) },
        { name: '纺织服装', code: 'BK0467', changePercent: +(Math.random() * 6 - 3).toFixed(2) },
      ]

      return sectors.map((sector) => ({
        ...sector,
        volume: Math.floor(Math.random() * 1000000000),
        turnover: Math.floor(Math.random() * 50000000000),
        upCount: Math.floor(Math.random() * 100),
        downCount: Math.floor(Math.random() * 100),
        flatCount: Math.floor(Math.random() * 20),
        source: 'eastmoney',
      }))
    } catch (err) {
      ctx.logger.error('从东方财富获取行业板块数据失败:', err)
      return []
    }
  }
}

module.exports = EastmoneyService
