'use strict';

const Controller = require('egg').Controller;
const axios = require('axios');

class MoneyFlowController extends Controller {
  
  /**
   * 获取沪深港通资金流向
   */
  async getHsgtFlow() {
    const { ctx, app } = this;
    
    try {
      const { trade_date, start_date, end_date } = ctx.request.body;
      
      // 构建请求参数
      const params = {};
      if (trade_date) {
        params.trade_date = trade_date;
      } else {
        params.start_date = start_date || this.getDateString(-30); // 默认30天前
        params.end_date = end_date || this.getDateString(0); // 默认今天
      }
      
      ctx.logger.info(`获取沪深港通资金流向: ${JSON.stringify(params)}`);
      
      const response = await axios.post('http://api.tushare.pro', {
        api_name: 'moneyflow_hsgt',
        token: app.config.tushare.token,
        params,
      });
      
      if (response.data && response.data.data && response.data.data.items) {
        const items = response.data.data.items;
        const fields = response.data.data.fields;
        
        const data = items.map(item => {
          const record = {};
          fields.forEach((field, index) => {
            record[field] = item[index];
          });
          return record;
        });
        
        ctx.body = {
          success: true,
          data,
          message: `成功获取${data.length}条沪深港通资金流向数据`,
          data_source: 'tushare',
          data_source_message: '数据来自Tushare API (moneyflow_hsgt)'
        };
      } else {
        ctx.body = {
          success: false,
          message: 'Tushare API返回数据格式异常',
          data_source: 'tushare',
          data_source_message: 'API响应格式不正确'
        };
      }
      
    } catch (error) {
      ctx.logger.error('获取沪深港通资金流向失败:', error);
      
      let errorMessage = error.message;
      if (error.response && error.response.data) {
        errorMessage = error.response.data.msg || error.message;
      }
      
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `获取沪深港通资金流向失败: ${errorMessage}`,
        error: errorMessage,
        data_source: 'tushare',
        data_source_message: 'Tushare API调用失败'
      };
    }
  }
  
  /**
   * 获取个股资金流向
   */
  async getStockFlow() {
    const { ctx, app } = this;
    
    try {
      const { ts_code, trade_date, start_date, end_date } = ctx.request.body;
      
      if (!ts_code && !trade_date && !start_date) {
        ctx.body = {
          success: false,
          message: '请提供股票代码或交易日期参数'
        };
        return;
      }
      
      // 构建请求参数
      const params = {};
      if (ts_code) params.ts_code = ts_code;
      if (trade_date) {
        params.trade_date = trade_date;
      } else {
        params.start_date = start_date || this.getDateString(-7); // 默认7天前
        params.end_date = end_date || this.getDateString(0); // 默认今天
      }
      
      ctx.logger.info(`获取个股资金流向: ${JSON.stringify(params)}`);
      
      const response = await axios.post('http://api.tushare.pro', {
        api_name: 'moneyflow',
        token: app.config.tushare.token,
        params,
      });
      
      if (response.data && response.data.data && response.data.data.items) {
        const items = response.data.data.items;
        const fields = response.data.data.fields;
        
        const data = items.map(item => {
          const record = {};
          fields.forEach((field, index) => {
            record[field] = item[index];
          });
          return record;
        });
        
        ctx.body = {
          success: true,
          data,
          message: `成功获取${data.length}条个股资金流向数据`,
          data_source: 'tushare',
          data_source_message: '数据来自Tushare API (moneyflow)'
        };
      } else {
        ctx.body = {
          success: false,
          message: 'Tushare API返回数据格式异常',
          data_source: 'tushare',
          data_source_message: 'API响应格式不正确'
        };
      }
      
    } catch (error) {
      ctx.logger.error('获取个股资金流向失败:', error);
      
      let errorMessage = error.message;
      if (error.response && error.response.data) {
        errorMessage = error.response.data.msg || error.message;
      }
      
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `获取个股资金流向失败: ${errorMessage}`,
        error: errorMessage,
        data_source: 'tushare',
        data_source_message: 'Tushare API调用失败'
      };
    }
  }
  
  /**
   * 获取市场资金流向概览
   */
  async getMarketFlow() {
    const { ctx } = this;
    
    try {
      // 获取沪深港通资金流向
      const hsgtData = await this.getHsgtFlowData();
      
      // 获取热门股票资金流向
      const hotStocks = ['000001.SZ', '000002.SZ', '600036.SH', '600519.SH', '000858.SZ'];
      const stockFlowData = await this.getStockFlowData(hotStocks);
      
      ctx.body = {
        success: true,
        data: {
          hsgt: hsgtData,
          stocks: stockFlowData,
          summary: this.calculateFlowSummary(hsgtData, stockFlowData)
        },
        message: '成功获取市场资金流向概览',
        data_source: 'tushare',
        data_source_message: '数据来自Tushare API综合分析'
      };
      
    } catch (error) {
      ctx.logger.error('获取市场资金流向概览失败:', error);
      
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `获取市场资金流向概览失败: ${error.message}`,
        error: error.message,
        data_source: 'tushare',
        data_source_message: 'Tushare API调用失败'
      };
    }
  }
  
  /**
   * 获取沪深港通资金流向数据（内部方法）
   */
  async getHsgtFlowData() {
    const { app } = this;
    
    const response = await axios.post('http://api.tushare.pro', {
      api_name: 'moneyflow_hsgt',
      token: app.config.tushare.token,
      params: {
        start_date: this.getDateString(-7),
        end_date: this.getDateString(0),
      },
    });
    
    if (response.data && response.data.data && response.data.data.items) {
      const items = response.data.data.items;
      const fields = response.data.data.fields;
      
      return items.map(item => {
        const record = {};
        fields.forEach((field, index) => {
          record[field] = item[index];
        });
        return record;
      });
    }
    
    return [];
  }
  
  /**
   * 获取股票资金流向数据（内部方法）
   */
  async getStockFlowData(stockCodes) {
    const { app } = this;
    const results = [];
    
    for (const code of stockCodes) {
      try {
        const response = await axios.post('http://api.tushare.pro', {
          api_name: 'moneyflow',
          token: app.config.tushare.token,
          params: {
            ts_code: code,
            trade_date: this.getDateString(0),
          },
        });
        
        if (response.data && response.data.data && response.data.data.items) {
          const items = response.data.data.items;
          const fields = response.data.data.fields;
          
          if (items.length > 0) {
            const record = {};
            fields.forEach((field, index) => {
              record[field] = items[0][index];
            });
            results.push(record);
          }
        }
      } catch (error) {
        this.ctx.logger.warn(`获取股票${code}资金流向失败:`, error.message);
      }
    }
    
    return results;
  }
  
  /**
   * 计算资金流向汇总
   */
  calculateFlowSummary(hsgtData, stockData) {
    const summary = {
      total_north_money: 0,
      total_south_money: 0,
      total_stock_net_flow: 0,
      active_stocks: stockData.length,
      trend: 'neutral'
    };
    
    // 计算沪深港通资金流向汇总
    if (hsgtData.length > 0) {
      const latest = hsgtData[0];
      summary.total_north_money = latest.north_money || 0;
      summary.total_south_money = latest.south_money || 0;
    }
    
    // 计算个股资金流向汇总
    stockData.forEach(stock => {
      summary.total_stock_net_flow += stock.net_mf_amount || 0;
    });
    
    // 判断市场趋势
    const totalFlow = summary.total_north_money + summary.total_stock_net_flow;
    if (totalFlow > 1000) {
      summary.trend = 'bullish';
    } else if (totalFlow < -1000) {
      summary.trend = 'bearish';
    }
    
    return summary;
  }
  
  /**
   * 获取日期字符串
   */
  getDateString(daysOffset = 0) {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date.toISOString().split('T')[0].replace(/-/g, '');
  }
}

module.exports = MoneyFlowController;
