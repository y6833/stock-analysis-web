'use strict';

const Controller = require('egg').Controller;
const axios = require('axios');

class YahooFinanceController extends Controller {
  // 测试连接
  async test() {
    const { ctx } = this;
    
    try {
      // Yahoo Finance API已经不再免费提供，使用替代方案
      // 尝试访问Yahoo Finance网站来测试连接
      const testUrls = [
        'https://query1.finance.yahoo.com/v8/finance/chart/AAPL',
        'https://finance.yahoo.com/quote/AAPL',
        'https://query2.finance.yahoo.com/v1/finance/search?q=AAPL'
      ];
      
      let lastError = null;
      
      for (const url of testUrls) {
        try {
          const response = await axios.get(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              'Accept': 'application/json, text/plain, */*',
              'Accept-Language': 'en-US,en;q=0.9',
              'Referer': 'https://finance.yahoo.com/'
            },
            timeout: 15000
          });
          
          if (response.status === 200) {
            ctx.body = {
              success: true,
              message: 'Yahoo Finance连接成功',
              activeEndpoint: url,
              note: 'Yahoo Finance API访问受限，建议使用其他数据源'
            };
            return;
          }
        } catch (error) {
          lastError = error;
          console.warn(`Yahoo Finance端点 ${url} 测试失败:`, error.message);
          continue;
        }
      }
      
      // 所有端点都失败
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: 'Yahoo Finance API连接失败',
        error: lastError?.message || '未知错误',
        recommendation: '建议使用腾讯财经增强版或Alpha Vantage替代',
        testedEndpoints: testUrls
      };
      
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: 'Yahoo Finance API连接测试异常',
        error: error.message,
        recommendation: '建议使用其他数据源'
      };
    }
  }
  
  // 获取股票行情
  async quote() {
    const { ctx } = this;
    const { symbol } = ctx.query;
    
    ctx.status = 501;
    ctx.body = {
      success: false,
      message: 'Yahoo Finance API功能暂未实现',
      recommendation: '请使用腾讯财经增强版或Alpha Vantage数据源'
    };
  }
  
  // 获取股票列表
  async stockList() {
    const { ctx } = this;
    
    ctx.status = 501;
    ctx.body = {
      success: false,
      message: 'Yahoo Finance API功能暂未实现',
      recommendation: '请使用腾讯财经增强版或Alpha Vantage数据源'
    };
  }
  
  // 搜索股票
  async search() {
    const { ctx } = this;
    
    ctx.status = 501;
    ctx.body = {
      success: false,
      message: 'Yahoo Finance API功能暂未实现',
      recommendation: '请使用腾讯财经增强版或Alpha Vantage数据源'
    };
  }
  
  // 获取历史数据
  async history() {
    const { ctx } = this;
    
    ctx.status = 501;
    ctx.body = {
      success: false,
      message: 'Yahoo Finance API功能暂未实现',
      recommendation: '请使用腾讯财经增强版或Alpha Vantage数据源'
    };
  }
  
  // 获取新闻
  async news() {
    const { ctx } = this;
    
    ctx.status = 501;
    ctx.body = {
      success: false,
      message: 'Yahoo Finance API功能暂未实现',
      recommendation: '请使用腾讯财经增强版或Alpha Vantage数据源'
    };
  }
}

module.exports = YahooFinanceController;
