'use strict'

const Service = require('egg').Service

/**
 * 内部行情调用 — 避免服务端 HTTP 自调用 localhost:7001
 */
class InternalQuoteService extends Service {
  /**
   * @param {'sina'|'eastmoney'|'alphavantage'|'alltick'} source
   * @param {string} symbol
   * @return {Promise<{ success: boolean, data?: object, message?: string }>}
   */
  async fetchQuote(source, symbol) {
    const ctx = this.app.createAnonymousContext()
    const normalized = String(source || '').toLowerCase()

    switch (normalized) {
      case 'sina':
        ctx.query = { symbol }
        await this.app.controller.sina.quote.call(ctx)
        break
      case 'eastmoney':
        ctx.query = { symbol }
        await this.app.controller.eastmoney.quote.call(ctx)
        break
      case 'alphavantage':
        ctx.query = { symbol }
        await this.app.controller.alphavantage.quote.call(ctx)
        break
      case 'alltick':
        ctx.request.body = { symbol }
        await this.app.controller.alltick.getQuote.call(ctx)
        break
      default:
        return { success: false, message: `未知数据源: ${source}` }
    }

    return ctx.body || { success: false, message: '无响应' }
  }

  /**
   * 从行情响应中提取有效价格
   * @param {object} response
   * @return {number|null}
   */
  extractPrice(response) {
    if (!response || !response.success || !response.data) return null
    const price = parseFloat(response.data.price)
    if (Number.isFinite(price) && price > 0 && price !== 100) return price
    return null
  }
}

module.exports = InternalQuoteService
