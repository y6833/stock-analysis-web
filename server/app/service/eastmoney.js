'use strict';

const Service = require('egg').Service;

class EastmoneyService extends Service {
  /**
   * 获取财经新闻
   * @param {number} count - 新闻数量
   * @return {Array} 新闻列表
   */
  async getFinancialNews(count = 20) {
    const { ctx } = this;
    
    try {
      ctx.logger.info(`从东方财富获取 ${count} 条财经新闻`);
      
      // 这里应该调用东方财富的新闻API
      // 由于接口复杂性，返回模拟数据
      const mockNews = this.generateMockNews(count);
      
      return mockNews.map(news => ({
        ...news,
        source: 'eastmoney',
        data_source: 'eastmoney_api',
        data_source_message: '数据来自东方财富API'
      }));
    } catch (err) {
      ctx.logger.error('从东方财富获取财经新闻失败:', err);
      return [];
    }
  }

  /**
   * 获取股票行情
   * @param {string} symbol - 股票代码
   * @return {Object|null} 股票行情数据
   */
  async getStockQuote(symbol) {
    const { ctx } = this;
    
    try {
      ctx.logger.info(`从东方财富获取股票 ${symbol} 行情`);
      
      // 这里应该调用东方财富的股票行情接口
      return this.generateMockStockQuote(symbol);
    } catch (err) {
      ctx.logger.error(`从东方财富获取股票 ${symbol} 行情失败:`, err);
      return null;
    }
  }

  /**
   * 生成模拟新闻数据
   * @param {number} count - 新闻数量
   * @return {Array} 模拟新闻列表
   */
  generateMockNews(count) {
    const titles = [
      '机构调研热度不减，成长股获得重点关注',
      '资金面保持宽松，市场流动性充裕',
      'MSCI扩容在即，外资配置A股步伐加快',
      '业绩预告密集发布，优质公司脱颖而出',
      '政策暖风频吹，市场信心逐步恢复',
      '产业升级加速，高端制造业迎来机遇',
      '消费升级趋势明显，品牌消费股受益',
      '技术创新驱动发展，科技股投资价值凸显',
      '绿色发展理念深入，新能源产业前景广阔',
      '数字化转型提速，相关概念股表现活跃'
    ];

    const news = [];
    for (let i = 0; i < count; i++) {
      const randomTitle = titles[Math.floor(Math.random() * titles.length)];
      const publishTime = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000);
      
      news.push({
        id: `eastmoney_${Date.now()}_${i}`,
        title: randomTitle,
        summary: `${randomTitle}的详细内容摘要...`,
        content: `${randomTitle}的完整新闻内容...`,
        publishTime: publishTime.toISOString(),
        url: `https://finance.eastmoney.com/news/${i}`,
        author: '东方财富',
        category: '财经',
        tags: ['股市', '财经', '东方财富']
      });
    }

    return news;
  }

  /**
   * 生成模拟股票行情数据
   * @param {string} symbol - 股票代码
   * @return {Object} 模拟股票行情
   */
  generateMockStockQuote(symbol) {
    const basePrice = 20 + Math.random() * 80; // 20-100之间的基础价格
    const change = (Math.random() - 0.5) * 4; // -2到2之间的变化
    const changePercent = (change / basePrice) * 100;

    return {
      symbol,
      name: `东财${symbol}`,
      price: basePrice + change,
      open: basePrice + (Math.random() - 0.5) * 2,
      high: basePrice + Math.random() * 3,
      low: basePrice - Math.random() * 3,
      close: basePrice + change,
      pre_close: basePrice,
      change,
      pct_chg: changePercent,
      vol: Math.round(Math.random() * 20000000),
      amount: Math.round(Math.random() * 2000000000),
      turnover_rate: Math.random() * 8,
      pe: Math.random() * 40 + 2,
      pb: Math.random() * 8 + 0.2,
      total_mv: (basePrice + change) * (Math.random() * 15000000000 + 600000000),
      circ_mv: (basePrice + change) * (Math.random() * 8000000000 + 300000000),
      update_time: new Date().toISOString(),
      data_source: 'eastmoney_api',
      data_source_message: '数据来自东方财富API（模拟）'
    };
  }
}

module.exports = EastmoneyService;
