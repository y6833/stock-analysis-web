'use strict'

const { Controller } = require('egg')
const axios = require('axios')

/**
 * 股票预测控制器
 * 代理到 Python Flask API (Kronos 预测服务)
 */
class PredictController extends Controller {
  /**
   * 获取股票预测结果
   * GET /api/predict?symbol=000070
   */
  async getPrediction() {
    const { ctx } = this
    const { symbol } = ctx.query

    if (!symbol) {
      ctx.status = 400
      ctx.body = {
        error: '缺少股票代码 symbol',
      }
      return
    }

    try {
      // 尝试连接到 Python Flask API (默认端口 5001)
      const pythonApiUrl = process.env.PYTHON_API_URL || 'http://localhost:5001'
      
      ctx.logger.info(`请求股票预测: ${symbol}, Python API: ${pythonApiUrl}`)
      
      const response = await axios.get(`${pythonApiUrl}/api/predict`, {
        params: { symbol },
        timeout: 30000, // 30秒超时
      })

      ctx.body = response.data
    } catch (error) {
      ctx.logger.error('预测请求失败:', error.message)
      
      // 如果 Python API 不可用，返回友好的错误信息或降级方案
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        ctx.logger.warn(`Python 预测服务不可用 (${error.code})，返回降级响应`)
        
        // 降级方案：返回提示信息，而不是错误
        ctx.status = 200
        ctx.body = {
          symbol,
          prediction: {
            message: '预测服务暂时不可用',
            note: 'Python 预测服务未启动。请启动 Python Flask API (server/predict_api.py) 以使用完整预测功能。',
            status: 'service_unavailable',
            // 提供一些示例数据结构，方便前端显示
            example: {
              date: [new Date().toISOString().split('T')[0]],
              predicted_price: ['N/A'],
              confidence: ['N/A'],
            }
          },
          serviceAvailable: false,
        }
        return
      } else if (error.response) {
        // Python API 返回了错误响应
        ctx.status = error.response.status || 500
        ctx.body = error.response.data || {
          error: '预测服务返回错误',
          message: error.message,
        }
      } else {
        // 其他错误
        ctx.status = 500
        ctx.body = {
          error: '预测请求失败',
          message: error.message,
        }
      }
    }
  }
}

module.exports = PredictController

