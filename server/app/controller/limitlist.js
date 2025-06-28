'use strict';

const Controller = require('egg').Controller;
const axios = require('axios');

class LimitListController extends Controller {

  /**
   * 获取涨停股票列表
   */
  async getLimitUpList() {
    const { ctx, app } = this;

    try {
      const { trade_date, start_date, end_date, exchange, limit } = ctx.request.body;

      // 构建请求参数
      const params = {
        limit_type: 'U' // U表示涨停
      };

      if (trade_date) {
        params.trade_date = trade_date;
      } else {
        params.trade_date = this.getDateString(0); // 默认今天
      }

      if (start_date) params.start_date = start_date;
      if (end_date) params.end_date = end_date;
      if (exchange) params.exchange = exchange;

      ctx.logger.info(`获取涨停股票列表: ${JSON.stringify(params)}`);

      const response = await axios.post('http://api.tushare.pro', {
        api_name: 'limit_list_d',
        token: app.config.tushare.token,
        params,
      });

      // 输出调试信息
      ctx.logger.info(`Tushare API响应: ${JSON.stringify(response.data)}`);

      if (response.data && response.data.data && response.data.data.items) {
        const items = response.data.data.items;
        const fields = response.data.data.fields;

        let data = items.map(item => {
          const record = {};
          fields.forEach((field, index) => {
            record[field] = item[index];
          });
          return record;
        });

        // 限制返回数量
        if (limit && limit > 0) {
          data = data.slice(0, limit);
        }

        ctx.body = {
          success: true,
          data,
          message: `成功获取${data.length}只涨停股票`,
          data_source: 'tushare',
          data_source_message: '数据来自Tushare API (limit_list_d)'
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
      ctx.logger.error('获取涨停股票列表失败:', error);

      let errorMessage = error.message;
      if (error.response && error.response.data) {
        errorMessage = error.response.data.msg || error.message;
      }

      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `获取涨停股票列表失败: ${errorMessage}`,
        error: errorMessage,
        data_source: 'tushare',
        data_source_message: 'Tushare API调用失败'
      };
    }
  }

  /**
   * 获取跌停股票列表
   */
  async getLimitDownList() {
    const { ctx, app } = this;

    try {
      const { trade_date, start_date, end_date, exchange, limit } = ctx.request.body;

      // 构建请求参数
      const params = {
        limit_type: 'D' // D表示跌停
      };

      if (trade_date) {
        params.trade_date = trade_date;
      } else {
        params.trade_date = this.getDateString(0); // 默认今天
      }

      if (start_date) params.start_date = start_date;
      if (end_date) params.end_date = end_date;
      if (exchange) params.exchange = exchange;

      ctx.logger.info(`获取跌停股票列表: ${JSON.stringify(params)}`);

      const response = await axios.post('http://api.tushare.pro', {
        api_name: 'limit_list_d',
        token: app.config.tushare.token,
        params,
      });

      if (response.data && response.data.data && response.data.data.items) {
        const items = response.data.data.items;
        const fields = response.data.data.fields;

        let data = items.map(item => {
          const record = {};
          fields.forEach((field, index) => {
            record[field] = item[index];
          });
          return record;
        });

        // 限制返回数量
        if (limit && limit > 0) {
          data = data.slice(0, limit);
        }

        ctx.body = {
          success: true,
          data,
          message: `成功获取${data.length}只跌停股票`,
          data_source: 'tushare',
          data_source_message: '数据来自Tushare API (limit_list_d)'
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
      ctx.logger.error('获取跌停股票列表失败:', error);

      let errorMessage = error.message;
      if (error.response && error.response.data) {
        errorMessage = error.response.data.msg || error.message;
      }

      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `获取跌停股票列表失败: ${errorMessage}`,
        error: errorMessage,
        data_source: 'tushare',
        data_source_message: 'Tushare API调用失败'
      };
    }
  }

  /**
   * 获取炸板股票列表
   */
  async getZhaBanList() {
    const { ctx, app } = this;

    try {
      const { trade_date, start_date, end_date, exchange, limit } = ctx.request.body;

      // 构建请求参数
      const params = {
        limit_type: 'Z' // Z表示炸板
      };

      if (trade_date) {
        params.trade_date = trade_date;
      } else {
        params.trade_date = this.getDateString(0); // 默认今天
      }

      if (start_date) params.start_date = start_date;
      if (end_date) params.end_date = end_date;
      if (exchange) params.exchange = exchange;

      ctx.logger.info(`获取炸板股票列表: ${JSON.stringify(params)}`);

      const response = await axios.post('http://api.tushare.pro', {
        api_name: 'limit_list_d',
        token: app.config.tushare.token,
        params,
      });

      if (response.data && response.data.data && response.data.data.items) {
        const items = response.data.data.items;
        const fields = response.data.data.fields;

        let data = items.map(item => {
          const record = {};
          fields.forEach((field, index) => {
            record[field] = item[index];
          });
          return record;
        });

        // 限制返回数量
        if (limit && limit > 0) {
          data = data.slice(0, limit);
        }

        ctx.body = {
          success: true,
          data,
          message: `成功获取${data.length}只炸板股票`,
          data_source: 'tushare',
          data_source_message: '数据来自Tushare API (limit_list_d)'
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
      ctx.logger.error('获取炸板股票列表失败:', error);

      let errorMessage = error.message;
      if (error.response && error.response.data) {
        errorMessage = error.response.data.msg || error.message;
      }

      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `获取炸板股票列表失败: ${errorMessage}`,
        error: errorMessage,
        data_source: 'tushare',
        data_source_message: 'Tushare API调用失败'
      };
    }
  }

  /**
   * 获取涨跌停综合数据
   */
  async getLimitOverview() {
    const { ctx } = this;

    try {
      const trade_date = ctx.query.trade_date || this.getDateString(0);

      // 并行获取涨停、跌停、炸板数据
      const [limitUpData, limitDownData, zhaBanData] = await Promise.allSettled([
        this.getLimitData('U', trade_date),
        this.getLimitData('D', trade_date),
        this.getLimitData('Z', trade_date)
      ]);

      const result = {
        trade_date,
        limit_up: limitUpData.status === 'fulfilled' ? limitUpData.value : [],
        limit_down: limitDownData.status === 'fulfilled' ? limitDownData.value : [],
        zha_ban: zhaBanData.status === 'fulfilled' ? zhaBanData.value : [],
        summary: {
          limit_up_count: limitUpData.status === 'fulfilled' ? limitUpData.value.length : 0,
          limit_down_count: limitDownData.status === 'fulfilled' ? limitDownData.value.length : 0,
          zha_ban_count: zhaBanData.status === 'fulfilled' ? zhaBanData.value.length : 0
        }
      };

      ctx.body = {
        success: true,
        data: result,
        message: '成功获取涨跌停综合数据',
        data_source: 'tushare',
        data_source_message: '数据来自Tushare API综合分析'
      };

    } catch (error) {
      ctx.logger.error('获取涨跌停综合数据失败:', error);

      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `获取涨跌停综合数据失败: ${error.message}`,
        error: error.message,
        data_source: 'tushare',
        data_source_message: 'Tushare API调用失败'
      };
    }
  }

  /**
   * 获取指定类型的涨跌停数据（内部方法）
   */
  async getLimitData(limitType, tradeDate) {
    const { app } = this;

    const response = await axios.post('http://api.tushare.pro', {
      api_name: 'limit_list_d',
      token: app.config.tushare.token,
      params: {
        trade_date: tradeDate,
        limit_type: limitType,
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
   * 获取日期字符串
   */
  getDateString(daysOffset = 0) {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date.toISOString().split('T')[0].replace(/-/g, '');
  }
}

module.exports = LimitListController;
