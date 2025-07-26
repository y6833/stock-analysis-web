'use strict'

const axios = require('axios')

class StockDailyCacheService {
  constructor(ctx) {
    this.ctx = ctx
    this.app = ctx.app
  }

  /**
   * 获取股票日线数据（优先从缓存读取）
   * @param {string} tsCode 股票代码
   * @param {string} startDate 开始日期 YYYYMMDD
   * @param {string} endDate 结束日期 YYYYMMDD
   * @param {number} cachePriority 缓存优先级
   * @returns {Promise<Array>} 日线数据数组
   */
  async getDailyData(tsCode, startDate = null, endDate = null, cachePriority = 3) {
    const { ctx, app } = this
    
    try {
      // 1. 先从缓存表查询
      const cachedData = await this.getCachedData(tsCode, startDate, endDate)
      
      // 2. 如果缓存数据完整，直接返回
      if (this.isCacheComplete(cachedData, startDate, endDate)) {
        ctx.logger.info(`从缓存获取股票 ${tsCode} 日线数据，共 ${cachedData.length} 条`)
        return this.formatCachedData(cachedData)
      }
      
      // 3. 缓存不完整，从API获取并更新缓存
      ctx.logger.info(`缓存数据不完整，从API获取股票 ${tsCode} 日线数据`)
      const apiData = await this.fetchFromAPI(tsCode, startDate, endDate)
      
      // 4. 更新缓存
      if (apiData && apiData.length > 0) {
        await this.updateCache(tsCode, apiData, cachePriority)
      }
      
      return apiData
    } catch (error) {
      ctx.logger.error(`获取股票 ${tsCode} 日线数据失败:`, error)
      
      // 发生错误时，尝试返回缓存中的数据
      const fallbackData = await this.getCachedData(tsCode, startDate, endDate)
      if (fallbackData && fallbackData.length > 0) {
        ctx.logger.warn(`API调用失败，返回缓存数据，共 ${fallbackData.length} 条`)
        return this.formatCachedData(fallbackData)
      }
      
      throw error
    }
  }

  /**
   * 从缓存表获取数据
   */
  async getCachedData(tsCode, startDate, endDate) {
    const { app } = this
    
    const whereCondition = {
      ts_code: tsCode,
      is_active: true
    }
    
    if (startDate) {
      whereCondition.trade_date = {
        [app.Sequelize.Op.gte]: startDate
      }
    }
    
    if (endDate) {
      if (whereCondition.trade_date) {
        whereCondition.trade_date[app.Sequelize.Op.lte] = endDate
      } else {
        whereCondition.trade_date = {
          [app.Sequelize.Op.lte]: endDate
        }
      }
    }
    
    return await app.model.StockDailyData.findAll({
      where: whereCondition,
      order: [['trade_date', 'ASC']],
      raw: true
    })
  }

  /**
   * 检查缓存数据是否完整
   */
  isCacheComplete(cachedData, startDate, endDate) {
    if (!cachedData || cachedData.length === 0) {
      return false
    }
    
    // 简单检查：如果没有指定日期范围，认为有数据就是完整的
    if (!startDate && !endDate) {
      return true
    }
    
    // 检查日期范围覆盖
    const dates = cachedData.map(item => item.trade_date).sort()
    const firstDate = dates[0]
    const lastDate = dates[dates.length - 1]
    
    if (startDate && firstDate > startDate) {
      return false
    }
    
    if (endDate && lastDate < endDate) {
      return false
    }
    
    return true
  }

  /**
   * 从Tushare API获取数据
   */
  async fetchFromAPI(tsCode, startDate, endDate) {
    const { ctx, app } = this
    
    const token = (app.config && app.config.tushare && app.config.tushare.token) || 'demo_token'
    
    const params = {
      ts_code: tsCode
    }
    
    if (startDate) params.start_date = startDate
    if (endDate) params.end_date = endDate
    
    const response = await axios.post('http://api.tushare.pro', {
      api_name: 'daily',
      token: token,
      params: params,
      fields: 'ts_code,trade_date,open,high,low,close,pre_close,change,pct_chg,vol,amount,turnover_rate,turnover_rate_f,volume_ratio,pe,pe_ttm,pb,ps,ps_ttm,dv_ratio,dv_ttm,total_share,float_share,free_share,total_mv,circ_mv'
    })
    
    if (response.data && response.data.code === 0 && response.data.data && response.data.data.items) {
      return this.formatAPIData(response.data.data.items, response.data.data.fields)
    }
    
    throw new Error(`Tushare API返回错误: ${response.data ? response.data.msg : '未知错误'}`)
  }

  /**
   * 格式化API返回的数据
   */
  formatAPIData(items, fields) {
    if (!items || !fields) return []
    
    return items.map(item => {
      const data = {}
      fields.forEach((field, index) => {
        data[field] = item[index]
      })
      return data
    })
  }

  /**
   * 格式化缓存数据
   */
  formatCachedData(cachedData) {
    return cachedData.map(item => ({
      ts_code: item.ts_code,
      trade_date: item.trade_date,
      open: parseFloat(item.open) || null,
      high: parseFloat(item.high) || null,
      low: parseFloat(item.low) || null,
      close: parseFloat(item.close) || null,
      pre_close: parseFloat(item.pre_close) || null,
      change: parseFloat(item.change) || null,
      pct_chg: parseFloat(item.pct_chg) || null,
      vol: parseFloat(item.vol) || null,
      amount: parseFloat(item.amount) || null,
      turnover_rate: parseFloat(item.turnover_rate) || null,
      turnover_rate_f: parseFloat(item.turnover_rate_f) || null,
      volume_ratio: parseFloat(item.volume_ratio) || null,
      pe: parseFloat(item.pe) || null,
      pe_ttm: parseFloat(item.pe_ttm) || null,
      pb: parseFloat(item.pb) || null,
      ps: parseFloat(item.ps) || null,
      ps_ttm: parseFloat(item.ps_ttm) || null,
      dv_ratio: parseFloat(item.dv_ratio) || null,
      dv_ttm: parseFloat(item.dv_ttm) || null,
      total_share: parseFloat(item.total_share) || null,
      float_share: parseFloat(item.float_share) || null,
      free_share: parseFloat(item.free_share) || null,
      total_mv: parseFloat(item.total_mv) || null,
      circ_mv: parseFloat(item.circ_mv) || null
    }))
  }

  /**
   * 更新缓存数据
   */
  async updateCache(tsCode, apiData, cachePriority) {
    const { app } = this
    
    for (const item of apiData) {
      try {
        await app.model.StockDailyData.upsert({
          ts_code: item.ts_code,
          trade_date: item.trade_date,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          pre_close: item.pre_close,
          change: item.change,
          pct_chg: item.pct_chg,
          vol: item.vol,
          amount: item.amount,
          turnover_rate: item.turnover_rate,
          turnover_rate_f: item.turnover_rate_f,
          volume_ratio: item.volume_ratio,
          pe: item.pe,
          pe_ttm: item.pe_ttm,
          pb: item.pb,
          ps: item.ps,
          ps_ttm: item.ps_ttm,
          dv_ratio: item.dv_ratio,
          dv_ttm: item.dv_ttm,
          total_share: item.total_share,
          float_share: item.float_share,
          free_share: item.free_share,
          total_mv: item.total_mv,
          circ_mv: item.circ_mv,
          data_source: 'tushare',
          cache_priority: cachePriority,
          is_active: true,
          last_updated: new Date()
        })
      } catch (error) {
        this.ctx.logger.error(`更新缓存失败 ${tsCode} ${item.trade_date}:`, error)
      }
    }
  }
}

module.exports = StockDailyCacheService
