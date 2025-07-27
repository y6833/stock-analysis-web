'use strict'

const Service = require('egg').Service

class DashboardService extends Service {
  /**
   * 获取市场概览数据
   */
  async getMarketOverview() {
    const { ctx } = this

    try {
      ctx.logger.info('获取市场概览数据')

      // 调用真实的市场数据API
      const response = await ctx.curl('https://api.market.com/overview', {
        method: 'GET',
        dataType: 'json',
        timeout: 10000,
      })

      if (response.data && response.data.success) {
        return response.data.data
      }

      // 如果API调用失败，抛出错误
      throw new Error('市场数据API调用失败，无法获取市场概览数据')
    } catch (err) {
      ctx.logger.error('获取市场概览数据失败:', err)
      throw new Error(`获取市场概览数据失败: ${err.message}`)
    }
  }

  /**
   * 获取市场指数数据
   */
  async getMarketIndices() {
    const { ctx } = this

    try {
      ctx.logger.info('获取市场指数数据')

      // 调用真实的市场指数API
      const response = await ctx.curl('https://api.market.com/indices', {
        method: 'GET',
        dataType: 'json',
        timeout: 10000,
      })

      if (response.data && response.data.success) {
        return response.data.data
      }

      // 如果API调用失败，抛出错误
      throw new Error('市场指数API调用失败，无法获取指数数据')
    } catch (err) {
      ctx.logger.error('获取市场指数数据失败:', err)
      throw new Error(`获取市场指数数据失败: ${err.message}`)
    }
  }

  /**
   * 获取行业板块数据
   */
  async getSectorData() {
    const { ctx } = this

    try {
      ctx.logger.info('获取行业板块数据')

      // 调用真实的行业板块API
      const response = await ctx.curl('https://api.market.com/sectors', {
        method: 'GET',
        dataType: 'json',
        timeout: 10000,
      })

      if (response.data && response.data.success) {
        return response.data.data
      }

      // 如果API调用失败，抛出错误
      throw new Error('行业板块API调用失败，无法获取板块数据')
    } catch (err) {
      ctx.logger.error('获取行业板块数据失败:', err)
      throw new Error(`获取行业板块数据失败: ${err.message}`)
    }
  }

  /**
   * 获取市场宽度数据
   */
  async getMarketBreadth() {
    const { ctx } = this

    try {
      ctx.logger.info('获取市场宽度数据')

      // 调用真实的市场宽度API
      const response = await ctx.curl('https://api.market.com/breadth', {
        method: 'GET',
        dataType: 'json',
        timeout: 10000,
      })

      if (response.data && response.data.success) {
        return response.data.data
      }

      // 如果API调用失败，抛出错误
      throw new Error('市场宽度API调用失败，无法获取宽度数据')
    } catch (err) {
      ctx.logger.error('获取市场宽度数据失败:', err)
      throw new Error(`获取市场宽度数据失败: ${err.message}`)
    }
  }

  /**
   * 获取用户仪表板设置
   */
  async getUserDashboardSettings(userId) {
    const { ctx } = this

    try {
      ctx.logger.info(`获取用户 ${userId} 的仪表板设置`)

      // 从数据库获取用户设置
      const settings = await ctx.model.UserDashboardSettings.findOne({
        where: { userId },
      })

      if (settings) {
        return settings.dataValues
      }

      // 如果没有设置，返回默认设置
      return this.getDefaultDashboardSettings()
    } catch (err) {
      ctx.logger.error('获取用户仪表板设置失败:', err)
      throw new Error(`获取用户仪表板设置失败: ${err.message}`)
    }
  }

  /**
   * 保存用户仪表板设置
   */
  async saveUserDashboardSettings(userId, settings) {
    const { ctx } = this

    try {
      ctx.logger.info(`保存用户 ${userId} 的仪表板设置`)

      // 保存到数据库
      await ctx.model.UserDashboardSettings.upsert({
        userId,
        settings: JSON.stringify(settings),
        updatedAt: new Date(),
      })

      return { success: true }
    } catch (err) {
      ctx.logger.error('保存用户仪表板设置失败:', err)
      throw new Error(`保存用户仪表板设置失败: ${err.message}`)
    }
  }

  /**
   * 获取默认仪表板设置
   */
  getDefaultDashboardSettings() {
    return {
      layout: [
        { id: 'market-overview', type: 'market-overview', position: { x: 0, y: 0, w: 12, h: 4 } },
        {
          id: 'portfolio-summary',
          type: 'portfolio-summary',
          position: { x: 0, y: 4, w: 6, h: 4 },
        },
        { id: 'watchlist', type: 'watchlist', position: { x: 6, y: 4, w: 6, h: 4 } },
        { id: 'news-feed', type: 'news-feed', position: { x: 0, y: 8, w: 12, h: 4 } },
      ],
      theme: 'light',
      refreshInterval: 30000,
    }
  }

  /**
   * 测试市场数据API连接
   */
  async testMarketDataConnection() {
    const { ctx } = this

    try {
      ctx.logger.info('测试市场数据API连接')

      const response = await ctx.curl('https://api.market.com/health', {
        method: 'GET',
        dataType: 'json',
        timeout: 5000,
      })

      return response.data && response.data.success
    } catch (err) {
      ctx.logger.error('市场数据API连接测试失败:', err)
      return false
    }
  }
}

module.exports = DashboardService
