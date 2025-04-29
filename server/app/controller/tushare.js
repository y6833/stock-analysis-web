'use strict';

const Controller = require('egg').Controller;
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

class TushareController extends Controller {
  // 测试 Tushare API 连接
  async test() {
    const { ctx } = this;

    // 获取数据源参数
    const dataSource = ctx.query.data_source || 'tushare';

    // 如果不是测试 Tushare 数据源，则返回模拟成功结果
    if (dataSource !== 'tushare') {
      this.ctx.logger.info(`跳过 Tushare API 连接测试，当前数据源是: ${dataSource}`);

      ctx.body = {
        success: true,
        message: `跳过 Tushare API 连接测试，当前数据源是: ${dataSource}`,
        data: null,
        data_source: dataSource,
        skipped: true
      };
      return;
    }

    try {
      this.ctx.logger.info('执行 Tushare API 连接测试');

      // 执行 Python 脚本测试连接
      const result = await this.execPythonScript('test_connection');

      ctx.body = {
        success: result.success,
        message: result.message,
        data: result.data,
        data_source: 'tushare'
      };
    } catch (error) {
      this.ctx.logger.error(`Tushare API 连接测试失败: ${error.message}`);

      ctx.status = 500;
      ctx.body = {
        success: false,
        message: 'Tushare API 连接测试失败',
        error: error.message,
        data_source: 'tushare'
      };
    }
  }

  // 更新股票基本信息到数据库
  async updateStockBasic() {
    const { ctx } = this;

    try {
      // 执行 Python 脚本更新数据库
      const result = await this.execPythonScript('update_stock_basic');

      ctx.body = {
        success: result.success,
        message: result.message,
        data: result.data
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '更新股票基本信息失败',
        error: error.message
      };
    }
  }

  // 获取股票基本信息
  async getStockBasic() {
    const { ctx } = this;

    try {
      // 执行 Python 脚本获取股票基本信息
      const result = await this.execPythonScript('get_stock_basic');

      // 检查结果类型
      if (result.type === 'warning') {
        // 如果是警告，返回 200 状态码，但标记为不成功
        ctx.body = {
          success: false,
          message: result.message,
          warning: result.error, // 使用 warning 字段而不是 error
          type: 'warning',
          data_source: 'database',
          data_source_message: '数据库操作警告'
        };
      } else if (result.success) {
        // 成功情况
        const dataSource = result.source || 'database';
        let dataSourceMessage = '';

        // 根据数据来源设置消息
        if (dataSource === 'database') {
          dataSourceMessage = '数据来自数据库';
        } else if (dataSource === 'api') {
          dataSourceMessage = '数据来自Tushare API';
        } else if (dataSource === 'cache') {
          dataSourceMessage = '数据来自缓存';
        } else {
          dataSourceMessage = `数据来自${dataSource}`;
        }

        ctx.body = {
          success: true,
          message: result.message,
          data: result.data,
          source: result.source,
          data_source: dataSource,
          data_source_message: dataSourceMessage
        };
      } else {
        // 失败但不是错误的情况（例如数据库中没有数据）
        ctx.body = {
          success: false,
          message: result.message,
          type: 'info', // 使用 info 类型表示这是一个信息性消息
          data_source: 'unknown',
          data_source_message: '未能确定数据来源'
        };
      }
    } catch (error) {
      // 真正的错误情况
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '获取股票基本信息失败',
        error: error.message,
        type: 'error', // 明确标记为错误
        data_source: 'error',
        data_source_message: `获取数据失败: ${error.message}`
      };
    }
  }

  // 代理 Tushare API 请求
  async proxy() {
    const { ctx } = this;
    const { api_name, params, token, force_api = false, data_source = 'tushare' } = ctx.request.body;

    if (!api_name) {
      ctx.status = 400;
      ctx.body = {
        code: 400,
        msg: '缺少 api_name 参数'
      };
      return;
    }

    try {
      this.ctx.logger.info(`代理 ${data_source} API 请求: ${api_name}, 强制API: ${force_api}`);

      // 检查是否应该从缓存获取数据
      if (!force_api) {
        // 尝试从Redis缓存获取数据，使用数据源作为前缀
        const cacheKey = `${data_source}:${api_name}:${JSON.stringify(params || {})}`;
        const cachedData = await ctx.app.redis.get(cacheKey);

        if (cachedData) {
          try {
            const parsedData = JSON.parse(cachedData);
            this.ctx.logger.info(`从缓存获取数据: ${data_source}:${api_name}`);

            // 记录缓存命中
            ctx.service.cacheStats.recordHit(data_source, api_name);

            // 添加明确的数据来源信息
            const dataSourceName = "Redis缓存";
            const cacheTime = parsedData.cache_time || new Date().toISOString();
            const timeDiff = Math.round((new Date() - new Date(cacheTime)) / 1000 / 60); // 分钟

            // 检查缓存是否接近过期（超过80%的过期时间）
            const cacheExpire = 60 * 60; // 1小时（秒）
            const cacheAgeSeconds = Math.round((new Date() - new Date(cacheTime)) / 1000);
            const cacheExpiryPercentage = (cacheAgeSeconds / cacheExpire) * 100;
            const isNearExpiry = cacheExpiryPercentage > 80;

            ctx.body = {
              ...parsedData,
              cache: true,
              cache_time: cacheTime,
              cache_age: cacheAgeSeconds,
              cache_expiry_percentage: cacheExpiryPercentage.toFixed(2),
              is_near_expiry: isNearExpiry,
              data_source: dataSourceName,
              data_source_type: data_source,
              data_source_message: `数据来自${dataSourceName}，最后更新于${timeDiff}分钟前`,
              is_real_time: false
            };

            // 检查是否启用自动刷新缓存（默认禁用）
            const enableAutoRefresh = ctx.app.config.tushare && ctx.app.config.tushare.enableAutoRefresh === true;

            // 如果缓存接近过期且启用了自动刷新，在后台异步刷新缓存
            if (enableAutoRefresh && isNearExpiry && !ctx.app.cacheRefreshing) {
              this.ctx.logger.info(`自动刷新缓存已启用，准备刷新: ${data_source}:${api_name}`);
              ctx.app.cacheRefreshing = true;

              // 构建请求 URL 和数据（在闭包内部定义，避免引用外部变量）
              const refreshUrl = 'http://api.tushare.pro';
              const refreshData = {
                api_name,
                token: token || '983b25aa025eee598034c4741dc776dd73356ddc53ddcffbb180cf61',
                params: params || {},
                data_source
              };

              // 异步刷新缓存
              setTimeout(async () => {
                try {
                  this.ctx.logger.info(`缓存接近过期，异步刷新: ${data_source}:${api_name}`);

                  // 发送请求到 Tushare API
                  const refreshResponse = await ctx.curl(refreshUrl, {
                    method: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify(refreshData),
                    dataType: 'json',
                    timeout: 30000 // 30秒超时
                  });

                  if (refreshResponse.status === 200 && refreshResponse.data && refreshResponse.data.code === 0) {
                    // 更新缓存
                    const dataToCache = {
                      ...refreshResponse.data,
                      cache_time: new Date().toISOString(),
                      data_source_type: data_source
                    };

                    await ctx.app.redis.set(cacheKey, JSON.stringify(dataToCache), 'EX', cacheExpire);
                    this.ctx.logger.info(`缓存已异步刷新: ${data_source}:${api_name}`);
                  }
                } catch (refreshError) {
                  this.ctx.logger.warn(`异步刷新缓存失败: ${refreshError.message}`);
                } finally {
                  ctx.app.cacheRefreshing = false;
                }
              }, 0);
            } else if (isNearExpiry) {
              this.ctx.logger.info(`缓存接近过期，但自动刷新已禁用: ${data_source}:${api_name}`);
            }

            return;
          } catch (parseError) {
            this.ctx.logger.warn(`解析缓存数据失败: ${parseError.message}`);
            // 记录错误
            ctx.service.cacheStats.recordError(data_source, api_name, parseError);
            // 继续执行，从API获取数据
          }
        } else {
          // 记录缓存未命中
          ctx.service.cacheStats.recordMiss(data_source, api_name);
        }
      }

      // 构建请求 URL
      const tushareUrl = 'http://api.tushare.pro';

      // 构建请求数据
      const requestData = {
        api_name,
        token: token || '983b25aa025eee598034c4741dc776dd73356ddc53ddcffbb180cf61', // 使用提供的 token 或默认 token
        params: params || {}
      };

      // 记录API调用
      ctx.service.cacheStats.recordApiCall(data_source, api_name);

      // 发送请求到 Tushare API
      const response = await ctx.curl(tushareUrl, {
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(requestData),
        dataType: 'json',
        timeout: 30000 // 30秒超时
      });

      // 检查响应状态
      if (response.status !== 200) {
        // 记录错误
        ctx.service.cacheStats.recordError(data_source, api_name, new Error(`HTTP ${response.status}`));

        ctx.status = response.status;
        ctx.body = {
          code: response.status,
          msg: `${data_source} API 请求失败: HTTP ${response.status}`
        };
        return;
      }

      // 如果请求成功，将数据缓存到 Redis
      if (response.data && response.data.code === 0) {
        try {
          const cacheKey = `${data_source}:${api_name}:${JSON.stringify(params || {})}`;
          const dataToCache = {
            ...response.data,
            cache_time: new Date().toISOString(),
            data_source_type: data_source
          };

          // 缓存数据，设置过期时间（默认1小时）
          const cacheExpire = 60 * 60; // 1小时
          await ctx.app.redis.set(cacheKey, JSON.stringify(dataToCache), 'EX', cacheExpire);
          this.ctx.logger.info(`数据已缓存: ${data_source}:${api_name}, 过期时间: ${cacheExpire}秒`);
        } catch (cacheError) {
          this.ctx.logger.warn(`缓存数据失败: ${cacheError.message}`);
          // 继续执行，不影响返回结果
        }
      }

      // 返回 API 的响应，添加明确的数据来源信息
      const dataSourceName = data_source === 'tushare' ? 'Tushare API' : `${data_source.toUpperCase()} API`;

      ctx.body = {
        ...response.data,
        cache: false,
        api_time: new Date().toISOString(),
        data_source: dataSourceName,
        data_source_type: data_source,
        data_source_message: `数据来自${dataSourceName}实时查询，最新数据`,
        is_real_time: true
      };
    } catch (error) {
      this.ctx.logger.error(`代理 ${data_source} API 请求失败: ${error.message}`);

      // 记录错误
      ctx.service.cacheStats.recordError(data_source, api_name, error);

      ctx.status = 500;
      ctx.body = {
        code: 500,
        msg: `代理 ${data_source} API 请求失败: ${error.message}`
      };
    }
  }

  // 执行 Python 脚本
  async execPythonScript(action, ...args) {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(this.app.baseDir, 'scripts', 'tushare_api.py');

      // 检查脚本文件是否存在
      if (!fs.existsSync(scriptPath)) {
        reject(new Error(`Python 脚本文件不存在: ${scriptPath}`));
        return;
      }

      // 构建命令
      const command = `python "${scriptPath}" ${action} ${args.join(' ')}`;

      // 执行命令
      exec(command, {
        maxBuffer: 1024 * 1024 * 10,
        encoding: 'utf8',  // 确保使用 UTF-8 编码
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }  // 设置 Python 输出编码
      }, (error, stdout, stderr) => {
        if (error) {
          this.ctx.logger.error(`执行 Python 脚本失败: ${error.message}`);
          this.ctx.logger.error(`命令: ${command}`);
          this.ctx.logger.error(`标准错误: ${stderr}`);
          reject(error);
          return;
        }

        if (stderr) {
          this.ctx.logger.warn(`Python 脚本警告: ${stderr}`);
        }

        try {
          // 去除 BOM 和其他不可见字符
          const cleanedOutput = stdout.trim().replace(/^\uFEFF/, '');

          // 尝试提取最后一个 JSON 对象
          const jsonObjects = cleanedOutput.match(/{[\s\S]*?}/g);
          if (jsonObjects && jsonObjects.length > 0) {
            // 使用最后一个 JSON 对象，这通常是最终结果
            const lastJson = jsonObjects[jsonObjects.length - 1];
            const result = JSON.parse(lastJson);
            resolve(result);
            return;
          }

          // 如果没有找到 JSON 对象，尝试直接解析
          const result = JSON.parse(cleanedOutput);
          resolve(result);
        } catch (e) {
          this.ctx.logger.warn(`解析 Python 脚本输出失败: ${e.message}`); // 改为警告级别
          this.ctx.logger.warn(`输出内容: ${stdout}`); // 改为警告级别

          // 尝试从输出中提取最后一个 JSON 对象
          try {
            const jsonObjects = stdout.match(/{[\s\S]*?}/g);
            if (jsonObjects && jsonObjects.length > 0) {
              // 使用最后一个 JSON 对象，这通常是最终结果
              const lastJson = jsonObjects[jsonObjects.length - 1];
              const result = JSON.parse(lastJson);
              resolve(result);
              return;
            }

            // 如果没有找到 JSON 对象，尝试提取任何 JSON 对象
            const jsonMatch = stdout.match(/{[\s\S]*}/);
            if (jsonMatch) {
              const extractedJson = jsonMatch[0];
              const result = JSON.parse(extractedJson);
              resolve(result);
              return;
            }
          } catch (extractError) {
            this.ctx.logger.warn(`尝试提取 JSON 失败: ${extractError.message}`); // 改为警告级别
          }

          // 如果所有尝试都失败，返回一个友好的错误对象
          resolve({
            success: false,
            message: '解析 Python 脚本输出失败',
            error: e.message,
            type: 'warning' // 添加类型字段，表示这是一个警告而不是错误
          });
        }
      });
    });
  }
}

module.exports = TushareController;
