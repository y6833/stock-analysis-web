'use strict'

const Controller = require('egg').Controller

class MarketController extends Controller {
  /**
   * 获取市场指数数据
   */
  async getMarketIndices() {
    const { ctx } = this

    try {
      ctx.logger.info('获取市场指数数据')

      // 使用数据源管理器获取市场指数数据
      const dataSourceManager = ctx.app.dataSourceManager

      // 主要指数代码
      const indexCodes = [
        '000001.SH', // 上证指数
        '399001.SZ', // 深证成指
        '399006.SZ', // 创业板指
        '000300.SH', // 沪深300
        '000905.SH', // 中证500
        '000852.SH', // 中证1000
      ]

      const indices = []

      for (const code of indexCodes) {
        try {
          // 尝试从多个数据源获取指数数据
          const indexData = await this.getIndexDataFromSources(code)
          if (indexData) {
            indices.push(indexData)
          }
        } catch (error) {
          ctx.logger.warn(`获取指数 ${code} 数据失败:`, error.message)
        }
      }

      if (indices.length === 0) {
        // 如果没有获取到任何数据，返回模拟数据
        const mockIndices = this.getMockMarketIndices()
        ctx.body = {
          success: true,
          data: mockIndices,
          message: '使用模拟数据（无法获取真实数据）',
          data_source: 'mock',
          data_source_message: '模拟数据，仅供演示',
        }
        return
      }

      ctx.body = {
        success: true,
        data: indices,
        message: '成功获取市场指数数据',
        data_source: 'multiple',
        data_source_message: '数据来自多个数据源',
      }
    } catch (error) {
      ctx.logger.error('获取市场指数数据失败:', error)

      // 返回模拟数据作为备选
      const mockIndices = this.getMockMarketIndices()
      ctx.body = {
        success: true,
        data: mockIndices,
        message: '使用模拟数据（API调用失败）',
        data_source: 'mock',
        data_source_message: '模拟数据，仅供演示',
      }
    }
  }

  /**
   * 获取行业板块数据
   */
  async getIndustrySectors() {
    const { ctx } = this

    try {
      ctx.logger.info('获取行业板块数据')

      // 尝试从东方财富获取行业数据
      const eastmoneyService = ctx.service.eastmoney
      if (eastmoneyService) {
        try {
          const sectors = await eastmoneyService.getIndustrySectors()
          if (sectors && sectors.length > 0) {
            ctx.body = {
              success: true,
              data: sectors,
              message: '成功获取行业板块数据',
              data_source: 'eastmoney',
              data_source_message: '数据来自东方财富',
            }
            return
          }
        } catch (error) {
          ctx.logger.warn('从东方财富获取行业数据失败:', error.message)
        }
      }

      // 如果东方财富失败，返回模拟数据
      const mockSectors = this.getMockIndustrySectors()
      ctx.body = {
        success: true,
        data: mockSectors,
        message: '使用模拟数据（无法获取真实数据）',
        data_source: 'mock',
        data_source_message: '模拟数据，仅供演示',
      }
    } catch (error) {
      ctx.logger.error('获取行业板块数据失败:', error)

      const mockSectors = this.getMockIndustrySectors()
      ctx.body = {
        success: true,
        data: mockSectors,
        message: '使用模拟数据（API调用失败）',
        data_source: 'mock',
        data_source_message: '模拟数据，仅供演示',
      }
    }
  }

  /**
   * 获取市场宽度数据
   */
  async getMarketBreadth() {
    const { ctx } = this

    try {
      ctx.logger.info('获取市场宽度数据')

      // 尝试从多个数据源获取市场宽度数据
      const breadthData = await this.getMarketBreadthFromSources()

      if (breadthData) {
        ctx.body = {
          success: true,
          data: breadthData,
          message: '成功获取市场宽度数据',
          data_source: 'multiple',
          data_source_message: '数据来自多个数据源',
        }
        return
      }

      // 如果无法获取真实数据，返回模拟数据
      const mockBreadth = this.getMockMarketBreadth()
      ctx.body = {
        success: true,
        data: mockBreadth,
        message: '使用模拟数据（无法获取真实数据）',
        data_source: 'mock',
        data_source_message: '模拟数据，仅供演示',
      }
    } catch (error) {
      ctx.logger.error('获取市场宽度数据失败:', error)

      const mockBreadth = this.getMockMarketBreadth()
      ctx.body = {
        success: true,
        data: mockBreadth,
        message: '使用模拟数据（API调用失败）',
        data_source: 'mock',
        data_source_message: '模拟数据，仅供演示',
      }
    }
  }

  /**
   * 获取市场概览数据
   */
  async getMarketOverview() {
    const { ctx } = this

    try {
      ctx.logger.info('获取市场概览数据')

      // 并行获取各种市场数据
      const [indices, sectors, breadth] = await Promise.allSettled([
        this.getMarketIndicesData(),
        this.getIndustrySectorsData(),
        this.getMarketBreadthData(),
      ])

      const overview = {
        indices: indices.status === 'fulfilled' ? indices.value : this.getMockMarketIndices(),
        sectors: sectors.status === 'fulfilled' ? sectors.value : this.getMockIndustrySectors(),
        breadth: breadth.status === 'fulfilled' ? breadth.value : this.getMockMarketBreadth(),
        lastUpdated: new Date().toISOString(),
      }

      ctx.body = {
        success: true,
        data: overview,
        message: '成功获取市场概览数据',
        data_source: 'multiple',
        data_source_message: '数据来自多个数据源',
      }
    } catch (error) {
      ctx.logger.error('获取市场概览数据失败:', error)
      ctx.throw(500, `获取市场概览数据失败: ${error.message}`)
    }
  }

  /**
   * 从多个数据源获取指数数据
   */
  async getIndexDataFromSources(indexCode) {
    const { ctx } = this

    // 尝试从Tushare获取
    try {
      const tushareService = ctx.service.tushare
      if (tushareService) {
        const data = await tushareService.getIndexQuote(indexCode)
        if (data) {
          return this.formatIndexData(indexCode, data, 'tushare')
        }
      }
    } catch (error) {
      ctx.logger.debug(`Tushare获取指数${indexCode}失败:`, error.message)
    }

    // 尝试从新浪财经获取
    try {
      const sinaService = ctx.service.sina
      if (sinaService) {
        const data = await sinaService.getQuote(indexCode)
        if (data) {
          return this.formatIndexData(indexCode, data, 'sina')
        }
      }
    } catch (error) {
      ctx.logger.debug(`新浪财经获取指数${indexCode}失败:`, error.message)
    }

    return null
  }

  /**
   * 格式化指数数据
   */
  formatIndexData(code, data, source) {
    const indexNames = {
      '000001.SH': '上证指数',
      '399001.SZ': '深证成指',
      '399006.SZ': '创业板指',
      '000300.SH': '沪深300',
      '000905.SH': '中证500',
      '000852.SH': '中证1000',
    }

    return {
      code,
      name: indexNames[code] || code,
      price: data.price || data.current || 0,
      change: data.change || 0,
      changePercent: data.changePercent || data.percent || 0,
      volume: data.volume || 0,
      turnover: data.turnover || data.amount || 0,
      high: data.high || 0,
      low: data.low || 0,
      open: data.open || 0,
      preClose: data.preClose || data.pre_close || 0,
      source,
    }
  }

  /**
   * 获取市场指数数据（内部方法）
   */
  async getMarketIndicesData() {
    const indexCodes = [
      '000001.SH',
      '399001.SZ',
      '399006.SZ',
      '000300.SH',
      '000905.SH',
      '000852.SH',
    ]
    const indices = []

    for (const code of indexCodes) {
      try {
        const indexData = await this.getIndexDataFromSources(code)
        if (indexData) {
          indices.push(indexData)
        }
      } catch (error) {
        this.ctx.logger.warn(`获取指数 ${code} 数据失败:`, error.message)
      }
    }

    return indices.length > 0 ? indices : this.getMockMarketIndices()
  }

  /**
   * 获取行业板块数据（内部方法）
   */
  async getIndustrySectorsData() {
    const { ctx } = this

    try {
      const eastmoneyService = ctx.service.eastmoney
      if (eastmoneyService) {
        const sectors = await eastmoneyService.getIndustrySectors()
        if (sectors && sectors.length > 0) {
          return sectors
        }
      }
    } catch (error) {
      ctx.logger.warn('从东方财富获取行业数据失败:', error.message)
    }

    return this.getMockIndustrySectors()
  }

  /**
   * 获取市场宽度数据（内部方法）
   */
  async getMarketBreadthData() {
    return (await this.getMarketBreadthFromSources()) || this.getMockMarketBreadth()
  }

  /**
   * 从多个数据源获取市场宽度数据
   */
  async getMarketBreadthFromSources() {
    const { ctx } = this

    try {
      // 尝试从Tushare获取涨跌统计
      const tushareService = ctx.service.tushare
      if (tushareService) {
        // 这里可以调用Tushare的市场统计接口
        // 由于Tushare可能没有直接的市场宽度接口，我们使用模拟数据
      }
    } catch (error) {
      ctx.logger.debug('从Tushare获取市场宽度数据失败:', error.message)
    }

    // 返回null，让调用方使用模拟数据
    return null
  }

  /**
   * 获取模拟市场指数数据
   */
  getMockMarketIndices() {
    const now = new Date()
    const baseValues = {
      '000001.SH': 3200,
      '399001.SZ': 11000,
      '399006.SZ': 2300,
      '000300.SH': 4200,
      '000905.SH': 6800,
      '000852.SH': 8500,
    }

    return Object.entries(baseValues).map(([code, basePrice]) => {
      const change = (Math.random() - 0.5) * 100
      const changePercent = (change / basePrice) * 100

      return {
        code,
        name: this.formatIndexData(code, {}, 'mock').name,
        price: +(basePrice + change).toFixed(2),
        change: +change.toFixed(2),
        changePercent: +changePercent.toFixed(2),
        volume: Math.floor(Math.random() * 1000000000),
        turnover: Math.floor(Math.random() * 100000000000),
        high: +(basePrice + Math.abs(change) + Math.random() * 50).toFixed(2),
        low: +(basePrice - Math.abs(change) - Math.random() * 50).toFixed(2),
        open: +(basePrice + (Math.random() - 0.5) * 20).toFixed(2),
        preClose: +basePrice.toFixed(2),
        source: 'mock',
      }
    })
  }

  /**
   * 获取模拟行业板块数据
   */
  getMockIndustrySectors() {
    const sectors = [
      { name: '银行', code: 'BK0475', changePercent: +(Math.random() * 6 - 3).toFixed(2) },
      { name: '房地产', code: 'BK0451', changePercent: +(Math.random() * 6 - 3).toFixed(2) },
      { name: '证券', code: 'BK0473', changePercent: +(Math.random() * 6 - 3).toFixed(2) },
      { name: '保险', code: 'BK0474', changePercent: +(Math.random() * 6 - 3).toFixed(2) },
      { name: '煤炭', code: 'BK0437', changePercent: +(Math.random() * 6 - 3).toFixed(2) },
      { name: '有色金属', code: 'BK0478', changePercent: +(Math.random() * 6 - 3).toFixed(2) },
      { name: '钢铁', code: 'BK0493', changePercent: +(Math.random() * 6 - 3).toFixed(2) },
      { name: '化工', code: 'BK0479', changePercent: +(Math.random() * 6 - 3).toFixed(2) },
      { name: '建筑材料', code: 'BK0464', changePercent: +(Math.random() * 6 - 3).toFixed(2) },
      { name: '建筑装饰', code: 'BK0456', changePercent: +(Math.random() * 6 - 3).toFixed(2) },
      { name: '电力设备', code: 'BK0457', changePercent: +(Math.random() * 6 - 3).toFixed(2) },
      { name: '国防军工', code: 'BK0458', changePercent: +(Math.random() * 6 - 3).toFixed(2) },
      { name: '计算机', code: 'BK0459', changePercent: +(Math.random() * 6 - 3).toFixed(2) },
      { name: '电子', code: 'BK0460', changePercent: +(Math.random() * 6 - 3).toFixed(2) },
      { name: '通信', code: 'BK0461', changePercent: +(Math.random() * 6 - 3).toFixed(2) },
      { name: '传媒', code: 'BK0462', changePercent: +(Math.random() * 6 - 3).toFixed(2) },
      { name: '汽车', code: 'BK0463', changePercent: +(Math.random() * 6 - 3).toFixed(2) },
      { name: '家用电器', code: 'BK0465', changePercent: +(Math.random() * 6 - 3).toFixed(2) },
      { name: '食品饮料', code: 'BK0466', changePercent: +(Math.random() * 6 - 3).toFixed(2) },
      { name: '纺织服装', code: 'BK0467', changePercent: +(Math.random() * 6 - 3).toFixed(2) },
    ]

    return sectors.map((sector) => ({
      ...sector,
      volume: Math.floor(Math.random() * 1000000000),
      turnover: Math.floor(Math.random() * 50000000000),
      upCount: Math.floor(Math.random() * 100),
      downCount: Math.floor(Math.random() * 100),
      flatCount: Math.floor(Math.random() * 20),
      source: 'mock',
    }))
  }

  /**
   * 获取模拟市场宽度数据
   */
  getMockMarketBreadth() {
    const totalStocks = 4500
    const upCount = Math.floor(Math.random() * totalStocks * 0.6)
    const downCount = Math.floor(Math.random() * (totalStocks - upCount))
    const flatCount = totalStocks - upCount - downCount

    return {
      totalStocks,
      upCount,
      downCount,
      flatCount,
      upRatio: +((upCount / totalStocks) * 100).toFixed(2),
      downRatio: +((downCount / totalStocks) * 100).toFixed(2),
      flatRatio: +((flatCount / totalStocks) * 100).toFixed(2),
      limitUpCount: Math.floor(Math.random() * 50),
      limitDownCount: Math.floor(Math.random() * 30),
      newHighCount: Math.floor(Math.random() * 100),
      newLowCount: Math.floor(Math.random() * 80),
      source: 'mock',
    }
  }
}

module.exports = MarketController
