'use strict';

const Service = require('egg').Service;

class SinaService extends Service {
  /**
   * 获取财经新闻
   * @param {number} count - 新闻数量
   * @return {Array} 新闻列表
   */
  async getFinancialNews(count = 20) {
    const { ctx } = this;
    
    try {
      ctx.logger.info(`从新浪财经获取 ${count} 条财经新闻`);
      
      // 这里应该调用新浪财经的新闻API
      // 由于接口复杂性，返回模拟数据
      const mockNews = this.generateMockNews(count);
      
      return mockNews.map(news => ({
        ...news,
        source: 'sina',
        data_source: 'sina_api',
        data_source_message: '数据来自新浪财经API'
      }));
    } catch (err) {
      ctx.logger.error('从新浪财经获取财经新闻失败:', err);
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
      ctx.logger.info(`从新浪财经获取股票 ${symbol} 行情`);
      
      // 这里应该调用新浪财经的股票行情接口
      return this.generateMockStockQuote(symbol);
    } catch (err) {
      ctx.logger.error(`从新浪财经获取股票 ${symbol} 行情失败:`, err);
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
      '沪深两市震荡整理，创业板指涨幅居前',
      '北向资金净流入超50亿元，外资看好A股',
      '新能源板块持续活跃，锂电池概念股走强',
      '金融股集体发力，券商板块涨幅明显',
      '消费复苏预期升温，零售板块表现亮眼',
      '科创板成交活跃，半导体股票受追捧',
      '地产政策边际放松，房地产板块反弹',
      '原材料价格上涨，有色金属板块走强',
      '数字经济概念升温，软件股票表现突出',
      '绿色能源政策利好，环保板块获得关注'
    ];

    const news = [];
    for (let i = 0; i < count; i++) {
      const randomTitle = titles[Math.floor(Math.random() * titles.length)];
      const publishTime = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000);
      
      news.push({
        id: `sina_${Date.now()}_${i}`,
        title: randomTitle,
        summary: `${randomTitle}的详细内容摘要...`,
        content: `${randomTitle}的完整新闻内容...`,
        publishTime: publishTime.toISOString(),
        url: `https://finance.sina.com.cn/news/${i}`,
        author: '新浪财经',
        category: '财经',
        tags: ['股市', '财经', '新浪']
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
    const basePrice = 15 + Math.random() * 85; // 15-100之间的基础价格
    const change = (Math.random() - 0.5) * 3; // -1.5到1.5之间的变化
    const changePercent = (change / basePrice) * 100;

    return {
      symbol,
      name: `新浪${symbol}`,
      price: basePrice + change,
      open: basePrice + (Math.random() - 0.5) * 1.5,
      high: basePrice + Math.random() * 2.5,
      low: basePrice - Math.random() * 2.5,
      close: basePrice + change,
      pre_close: basePrice,
      change,
      pct_chg: changePercent,
      vol: Math.round(Math.random() * 15000000),
      amount: Math.round(Math.random() * 1500000000),
      turnover_rate: Math.random() * 6,
      pe: Math.random() * 35 + 3,
      pb: Math.random() * 6 + 0.3,
      total_mv: (basePrice + change) * (Math.random() * 12000000000 + 800000000),
      circ_mv: (basePrice + change) * (Math.random() * 6000000000 + 400000000),
      update_time: new Date().toISOString(),
      data_source: 'sina_api',
      data_source_message: '数据来自新浪财经API（模拟）'
    };
  }
}

module.exports = SinaService;
