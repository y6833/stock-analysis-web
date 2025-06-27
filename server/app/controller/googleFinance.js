'use strict';

const Controller = require('egg').Controller;

class GoogleFinanceController extends Controller {
  // 测试连接
  async test() {
    const { ctx } = this;
    
    try {
      // Google Finance API已经废弃，不再提供公开API
      ctx.status = 410; // Gone
      ctx.body = {
        success: false,
        message: 'Google Finance API已废弃',
        error: 'Google Finance API已于2018年停止服务',
        recommendation: '建议使用Alpha Vantage、腾讯财经增强版或其他替代数据源',
        alternatives: [
          'Alpha Vantage - 官方API，支持全球市场',
          '腾讯财经增强版 - 免费稳定，专注A股',
          '网易财经增强版 - 历史数据专家'
        ]
      };
      
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: 'Google Finance API连接测试异常',
        error: error.message,
        recommendation: '建议使用其他数据源'
      };
    }
  }
  
  // 获取股票行情
  async quote() {
    const { ctx } = this;
    
    ctx.status = 410;
    ctx.body = {
      success: false,
      message: 'Google Finance API已废弃',
      recommendation: '请使用Alpha Vantage或腾讯财经增强版数据源'
    };
  }
  
  // 获取股票列表
  async stockList() {
    const { ctx } = this;
    
    ctx.status = 410;
    ctx.body = {
      success: false,
      message: 'Google Finance API已废弃',
      recommendation: '请使用Alpha Vantage或腾讯财经增强版数据源'
    };
  }
  
  // 搜索股票
  async search() {
    const { ctx } = this;
    
    ctx.status = 410;
    ctx.body = {
      success: false,
      message: 'Google Finance API已废弃',
      recommendation: '请使用Alpha Vantage或腾讯财经增强版数据源'
    };
  }
  
  // 获取历史数据
  async history() {
    const { ctx } = this;
    
    ctx.status = 410;
    ctx.body = {
      success: false,
      message: 'Google Finance API已废弃',
      recommendation: '请使用Alpha Vantage或腾讯财经增强版数据源'
    };
  }
  
  // 获取新闻
  async news() {
    const { ctx } = this;
    
    ctx.status = 410;
    ctx.body = {
      success: false,
      message: 'Google Finance API已废弃',
      recommendation: '请使用Alpha Vantage或腾讯财经增强版数据源'
    };
  }
}

module.exports = GoogleFinanceController;
