'use strict';

const Controller = require('egg').Controller;
const axios = require('axios');

class JuheController extends Controller {
  // 测试连接
  async test() {
    const { ctx } = this;

    try {
      // 检查聚合数据API配置
      const apiKey = process.env.JUHE_API_KEY;

      if (!apiKey) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '聚合数据API Key未配置',
          error: '请在环境变量中设置 JUHE_API_KEY',
          configHelp: {
            step1: '访问 https://www.juhe.cn/ 注册账号',
            step2: '申请股票数据API服务',
            step3: '在环境变量中设置 JUHE_API_KEY=your_api_key',
            step4: '重启服务器'
          }
        };
        return;
      }

      // 测试聚合数据API连接
      try {
        // 根据聚合数据官方文档的正确API端点
        const testEndpoints = [
          {
            url: 'http://web.juhe.cn/finance/stock/hs',
            params: { gid: 'sh000001', key: apiKey },
            description: '沪深股市接口'
          },
          {
            url: 'http://web.juhe.cn/finance/stock/hk',
            params: { num: '00700', key: apiKey },
            description: '香港股市接口'
          },
          {
            url: 'http://web.juhe.cn/finance/stock/usa',
            params: { gid: 'AAPL', key: apiKey },
            description: '美国股市接口'
          }
        ];

        let lastError = null;

        for (const endpoint of testEndpoints) {
          try {
            const response = await axios.get(endpoint.url, {
              params: endpoint.params,
              headers: {
                'User-Agent': 'HappyStockMarket/1.0',
                'Accept': 'application/json'
              },
              timeout: 10000
            });

            if (response.status === 200) {
              const data = response.data;

              if (data.error_code === 0) {
                ctx.body = {
                  success: true,
                  message: '聚合数据API连接成功',
                  apiStatus: 'active',
                  activeEndpoint: endpoint.url,
                  endpointDescription: endpoint.description,
                  remainingCalls: data.reason || '正常',
                  sampleData: data.result ? '有数据返回' : '无数据'
                };
                return; // 成功后直接返回
              } else {
                lastError = {
                  endpoint: endpoint.url,
                  error: data.reason || '未知错误',
                  errorCode: data.error_code,
                  description: endpoint.description
                };
                console.warn(`聚合数据端点 ${endpoint.url} 失败:`, data);
                continue; // 尝试下一个端点
              }
            } else {
              lastError = {
                endpoint: endpoint.url,
                error: `HTTP ${response.status}`,
                httpStatus: response.status
              };
              continue;
            }
          } catch (endpointError) {
            lastError = {
              endpoint: endpoint.url,
              error: endpointError.message,
              code: endpointError.code
            };
            console.warn(`聚合数据端点 ${endpoint.url} 异常:`, endpointError.message);
            continue;
          }
        }

        // 所有端点都失败
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '聚合数据API所有端点均调用失败',
          lastError: lastError,
          suggestion: lastError?.errorCode === 10012 ?
            '请检查API Key是否正确' :
            '请检查API配置或联系聚合数据客服',
          testedEndpoints: testEndpoints.map(e => e.url)
        };

      } catch (apiError) {
        ctx.status = 500;
        ctx.body = {
          success: false,
          message: '聚合数据API连接失败',
          error: apiError.message,
          suggestion: '请检查网络连接和API配置'
        };
      }

    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '聚合数据API连接测试异常',
        error: error.message
      };
    }
  }

  // 获取股票行情
  async quote() {
    const { ctx } = this;
    const { symbol } = ctx.query;

    if (!symbol) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '缺少股票代码参数'
      };
      return;
    }

    const apiKey = process.env.JUHE_API_KEY;
    if (!apiKey) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '聚合数据API Key未配置'
      };
      return;
    }

    try {
      // 根据股票代码判断使用哪个API
      let apiUrl = 'http://web.juhe.cn/finance/stock/hs';
      let params = { gid: symbol, key: apiKey };

      // 判断股票类型
      if (symbol.toLowerCase().includes('hk') || /^\d{5}$/.test(symbol)) {
        // 香港股票
        apiUrl = 'http://web.juhe.cn/finance/stock/hk';
        params = { num: symbol.replace(/^hk/i, ''), key: apiKey };
      } else if (/^[A-Z]+$/.test(symbol)) {
        // 美国股票
        apiUrl = 'http://web.juhe.cn/finance/stock/usa';
        params = { gid: symbol, key: apiKey };
      }

      const response = await axios.get(apiUrl, {
        params: params,
        timeout: 10000
      });

      if (response.data.error_code === 0) {
        ctx.body = {
          success: true,
          data: response.data.result,
          message: '获取股票行情成功',
          market: apiUrl.includes('/hk') ? '香港' : apiUrl.includes('/usa') ? '美国' : '沪深'
        };
      } else {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: response.data.reason || '获取股票行情失败',
          errorCode: response.data.error_code
        };
      }
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '获取股票行情失败',
        error: error.message
      };
    }
  }

  // 获取股票列表
  async stockList() {
    const { ctx } = this;

    ctx.status = 501;
    ctx.body = {
      success: false,
      message: '聚合数据不提供股票列表API',
      recommendation: '请使用其他数据源获取股票列表'
    };
  }

  // 搜索股票
  async search() {
    const { ctx } = this;

    ctx.status = 501;
    ctx.body = {
      success: false,
      message: '聚合数据不提供股票搜索API',
      recommendation: '请使用其他数据源进行股票搜索'
    };
  }

  // 获取历史数据
  async history() {
    const { ctx } = this;

    ctx.status = 501;
    ctx.body = {
      success: false,
      message: '聚合数据不提供历史数据API',
      recommendation: '请使用网易财经增强版获取历史数据'
    };
  }

  // 获取新闻
  async news() {
    const { ctx } = this;

    ctx.status = 501;
    ctx.body = {
      success: false,
      message: '聚合数据不提供新闻API',
      recommendation: '请使用其他数据源获取财经新闻'
    };
  }
}

module.exports = JuheController;
