'use strict';

const Controller = require('egg').Controller;
const axios = require('axios');

class ZhituController extends Controller {
  // 测试连接
  async test() {
    const { ctx } = this;

    try {
      // 检查智兔数服API配置
      const apiKey = process.env.ZHITU_API_KEY;

      if (!apiKey) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '智兔数服API Key未配置',
          error: '请在环境变量中设置 ZHITU_API_KEY',
          configHelp: {
            step1: '访问 https://www.zhitudata.com/ 注册账号',
            step2: '申请股票数据API服务',
            step3: '在环境变量中设置 ZHITU_API_KEY=your_api_key',
            step4: '重启服务器'
          }
        };
        return;
      }

      // 测试智兔数服API连接
      try {
        // 根据智兔数服官方文档的正确API端点
        const testEndpoints = [
          {
            url: 'https://api.zhituapi.com/hs/gs/gsjj/000001',
            params: { token: apiKey },
            description: '公司简介接口'
          },
          {
            url: 'https://api.zhituapi.com/hs/real/time/000001',
            params: { token: apiKey },
            description: '实时交易数据'
          },
          {
            url: 'https://api.zhituapi.com/hs/list/all',
            params: { token: apiKey },
            description: '股票列表接口'
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

              // 智兔数服API成功时直接返回数据，无错误码
              if (data && (Array.isArray(data) || typeof data === 'object')) {
                // 检查是否是错误响应
                if (typeof data === 'string' && data.includes('error')) {
                  lastError = {
                    endpoint: endpoint.url,
                    error: data,
                    description: endpoint.description
                  };
                  console.warn(`智兔数服端点 ${endpoint.url} 失败:`, data);
                  continue;
                }

                ctx.body = {
                  success: true,
                  message: '智兔数服API连接成功',
                  apiStatus: 'active',
                  activeEndpoint: endpoint.url,
                  endpointDescription: endpoint.description,
                  sampleData: Array.isArray(data) ?
                    `返回${data.length}条记录` :
                    `返回${Object.keys(data).length}个字段`
                };
                return; // 成功后直接返回
              } else {
                lastError = {
                  endpoint: endpoint.url,
                  error: '响应数据格式异常',
                  responseType: typeof data,
                  description: endpoint.description
                };
                continue;
              }
            } else {
              lastError = {
                endpoint: endpoint.url,
                error: `HTTP ${response.status}`,
                httpStatus: response.status,
                description: endpoint.description
              };
              continue;
            }
          } catch (endpointError) {
            lastError = {
              endpoint: endpoint.url,
              error: endpointError.message,
              code: endpointError.code
            };
            console.warn(`智兔数服端点 ${endpoint.url} 异常:`, endpointError.message);
            continue;
          }
        }

        // 所有端点都失败
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '智兔数服API所有端点均调用失败',
          lastError: lastError,
          suggestion: lastError?.errorCode === 1001 ?
            '请检查API Key是否正确' :
            '请检查API配置或联系智兔数服客服',
          testedEndpoints: testEndpoints.map(e => e.url),
          configHelp: {
            note: '智兔数服API可能需要特定的参数格式',
            documentation: 'https://www.zhitudata.com/docs'
          }
        };

      } catch (apiError) {
        ctx.status = 500;
        ctx.body = {
          success: false,
          message: '智兔数服API连接失败',
          error: apiError.message,
          suggestion: '请检查网络连接和API配置'
        };
      }

    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '智兔数服API连接测试异常',
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

    const apiKey = process.env.ZHITU_API_KEY;
    if (!apiKey) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '智兔数服API Key未配置'
      };
      return;
    }

    try {
      const response = await axios.get(`https://api.zhituapi.com/hs/real/time/${symbol}`, {
        params: {
          token: apiKey
        },
        timeout: 10000
      });

      if (response.status === 200 && response.data) {
        ctx.body = {
          success: true,
          data: response.data,
          message: '获取股票行情成功'
        };
      } else {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '获取股票行情失败'
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

    const apiKey = process.env.ZHITU_API_KEY;
    if (!apiKey) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '智兔数服API Key未配置'
      };
      return;
    }

    try {
      const response = await axios.get('https://api.zhituapi.com/hs/list/all', {
        params: {
          token: apiKey
        },
        timeout: 15000
      });

      if (response.status === 200 && response.data) {
        ctx.body = {
          success: true,
          data: response.data,
          message: '获取股票列表成功',
          count: Array.isArray(response.data) ? response.data.length : 0
        };
      } else {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '获取股票列表失败'
        };
      }
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '获取股票列表失败',
        error: error.message
      };
    }
  }

  // 搜索股票
  async search() {
    const { ctx } = this;
    const { keyword } = ctx.query;

    if (!keyword) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '缺少搜索关键词'
      };
      return;
    }

    const apiKey = process.env.ZHITU_API_KEY;
    if (!apiKey) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '智兔数服API Key未配置'
      };
      return;
    }

    try {
      const response = await axios.get('https://api.zhitudata.com/stock/search', {
        params: {
          token: apiKey,
          keyword: keyword
        },
        timeout: 10000
      });

      if (response.data.code === 0) {
        ctx.body = {
          success: true,
          data: response.data.data,
          message: '搜索股票成功'
        };
      } else {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: response.data.msg || '搜索股票失败'
        };
      }
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '搜索股票失败',
        error: error.message
      };
    }
  }

  // 获取历史数据
  async history() {
    const { ctx } = this;
    const { symbol, period = 'day', start_date, end_date } = ctx.query;

    if (!symbol) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '缺少股票代码参数'
      };
      return;
    }

    const apiKey = process.env.ZHITU_API_KEY;
    if (!apiKey) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '智兔数服API Key未配置'
      };
      return;
    }

    try {
      // 智兔数服的历史数据接口
      const response = await axios.get(`https://api.zhituapi.com/hs/latest/${symbol}`, {
        params: {
          token: apiKey,
          start: start_date,
          end: end_date
        },
        timeout: 15000
      });

      if (response.status === 200 && response.data) {
        ctx.body = {
          success: true,
          data: response.data,
          message: '获取历史数据成功',
          count: Array.isArray(response.data) ? response.data.length : 0
        };
      } else {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '获取历史数据失败'
        };
      }
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '获取历史数据失败',
        error: error.message
      };
    }
  }

  // 获取新闻
  async news() {
    const { ctx } = this;

    ctx.status = 501;
    ctx.body = {
      success: false,
      message: '智兔数服暂不提供新闻API',
      recommendation: '请使用其他数据源获取财经新闻'
    };
  }
}

module.exports = ZhituController;
