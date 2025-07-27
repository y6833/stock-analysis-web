import { BaseDataService } from '@/core/BaseService'
import type { Stock, StockData, StockQuote, FinancialNews } from '@/types/stock'
import { useToast } from '@/composables/useToast'
import { DataSourceFactory } from './dataSource/DataSourceFactory'
import type { DataSourceType } from './dataSource/DataSourceFactory'
import eventBus from '@/utils/eventBus'
import { dataSourceStateManager } from '@/services/dataSourceStateManager'
import { smartCache } from '@/services/cacheService'
import { CONSTANTS } from '@/constants'
import { Utils } from '@/utils'
import axios from 'axios'
import apiRequest from '@/utils/apiRequest'

// 创建 API 客户端实例
const apiClient = apiRequest.createClient({
  baseUrl: 'http://localhost:7001',
  timeout: 30000,
  retryCount: 3
})

// API基础URL配置
const API_BASE_URL = 'http://localhost:7001'

// 使用统一的数据源状态管理器
let currentDataSourceType = dataSourceStateManager.getCurrentDataSource()
let dataSource = DataSourceFactory.createDataSource(currentDataSourceType)

console.log(`[stockService] 初始化数据源: ${currentDataSourceType}`)

// 更新数据源实例
const updateDataSource = (type: DataSourceType) => {
  const oldType = currentDataSourceType
  currentDataSourceType = type
  dataSource = DataSourceFactory.createDataSource(type)
  console.log(`[stockService] 数据源已更新: ${oldType} -> ${type}`)
}

// 监听数据源变化事件（防止重复监听）
let eventListenerAdded = false
if (!eventListenerAdded) {
  eventBus.on('data-source-changed', (type: DataSourceType) => {
    console.log(`[stockService] 收到数据源变化事件: ${type}`)
    updateDataSource(type)
  })
  eventListenerAdded = true
  console.log('[stockService] 已添加数据源变化事件监听器')
}

const { showToast } = useToast()

/**
 * 股票服务类
 * 继承BaseDataService，提供统一的股票数据访问接口
 */
class StockService extends BaseDataService {
  constructor() {
    super('StockService', {
      enableLoading: true,
      enableCache: true,
      timeout: CONSTANTS.API.TIMEOUT
    })
  }
  /**
   * 获取当前数据源类型
   */
  getCurrentDataSourceType(): DataSourceType {
    return dataSourceStateManager.getCurrentDataSource()
  }

  /**
   * 获取所有可用数据源
   */
  getAvailableDataSources(): DataSourceType[] {
    return DataSourceFactory.getAvailableDataSources()
  }

  /**
   * 获取数据源信息
   */
  getDataSourceInfo(type: DataSourceType) {
    return DataSourceFactory.getDataSourceInfo(type)
  }

  /**
   * 切换数据源
   */
  switchDataSource(type: DataSourceType): boolean {
    try {
      console.log(`[stockService] 切换数据源请求: ${currentDataSourceType} -> ${type}`)

      // 使用统一的状态管理器进行切换
      const success = dataSourceStateManager.switchDataSource(type)

      if (success) {
        // 更新本地数据源实例
        updateDataSource(type)
        showToast(`已切换到${DataSourceFactory.getDataSourceInfo(type).name}`, 'success')
        console.log(`[stockService] 数据源切换成功: ${type}`)
      } else {
        showToast('切换数据源失败', 'error')
        console.error(`[stockService] 数据源切换失败: ${type}`)
      }

      return success
    } catch (error) {
      console.error('[stockService] 切换数据源异常:', error)
      showToast('切换数据源失败', 'error')
      return false
    }
  }

  /**
   * 测试数据源连接
   */
  async testDataSource(
    type: DataSourceType,
    forcedCurrentSource?: DataSourceType
  ): Promise<boolean> {
    try {
      // 重新从localStorage获取当前数据源，确保使用最新的值
      const storedDataSource = localStorage.getItem('preferredDataSource') as DataSourceType

      // 使用传入的当前数据源、localStorage中的值或全局当前数据源（按优先级）
      const effectiveCurrentSource =
        forcedCurrentSource || storedDataSource || currentDataSourceType

      console.log(
        `测试数据源参数 - 请求类型: ${type}, 强制当前源: ${forcedCurrentSource || '无'}, 存储源: ${storedDataSource || '无'
        }, 全局源: ${currentDataSourceType}`
      )
      console.log(`最终使用的当前数据源: ${effectiveCurrentSource}`)

      // 如果要测试的数据源不是当前选择的数据源，则始终跳过测试
      if (type !== effectiveCurrentSource) {
        console.log(`跳过测试非当前数据源: ${type}，当前数据源是: ${effectiveCurrentSource}`)
        // 返回假设的成功结果，避免显示错误消息
        return true
      }

      console.log(`测试数据源连接: ${type}，当前数据源是: ${effectiveCurrentSource}`)

      // 创建一个临时的数据源实例，避免影响当前正在使用的数据源
      const testDataSource = DataSourceFactory.createDataSource(type)

      // 直接调用测试连接方法，避免调用其他可能导致API请求的方法
      // 传递当前数据源参数，确保后端也知道当前选择的数据源
      const response = await axios.get(`${API_BASE_URL}/api/data-source/test`, {
        params: {
          source: type,
          currentSource: effectiveCurrentSource,
        },
      })

      // 检查响应
      const result = response.data && response.data.success

      if (result) {
        showToast(`${testDataSource.getName()}连接测试成功`, 'success')
        console.log(`${testDataSource.getName()}连接测试成功`)
      } else {
        // 只有当测试的是当前数据源或在数据源设置页面时才显示错误消息
        if (type === effectiveCurrentSource || window.location.pathname.includes('/data-source')) {
          showToast(`${testDataSource.getName()}连接测试失败`, 'error')
        }
        console.log(`${testDataSource.getName()}连接测试失败`)
      }
      return result
    } catch (error) {
      console.error(`${type}数据源连接测试失败:`, error)

      // 只有当测试的是当前数据源或在数据源设置页面时才显示错误消息
      if (type === currentDataSourceType || window.location.pathname.includes('/data-source')) {
        showToast(
          `数据源连接测试失败: ${error instanceof Error ? error.message : '未知错误'}`,
          'error'
        )
      }
      return false
    }
  }

  // 清除数据源缓存
  async clearDataSourceCache(type: DataSourceType): Promise<boolean> {
    try {
      // 清除本地存储中的缓存
      const cacheKeys = Object.keys(localStorage).filter(
        (key) => key.startsWith(`${type}_`) || key.includes(`_${type}_`) || key.endsWith(`_${type}`)
      )

      if (cacheKeys.length > 0) {
        cacheKeys.forEach((key) => localStorage.removeItem(key))
        console.log(`已清除${type}数据源的${cacheKeys.length}项本地缓存`)
      }

      // 清除Redis缓存（通过API）
      try {
        // 使用新的数据源专用缓存清除端点
        const response = await axios.delete(`/api/cache/source/${type}`)
        if (response.data && response.data.success) {
          console.log(`已清除${type}数据源的Redis缓存: ${response.data.message}`)
          if (response.data.count) {
            console.log(`清除了${response.data.count}个缓存键`)
          }
        }
      } catch (redisError) {
        console.warn(`清除${type}数据源的Redis缓存失败:`, redisError)
        // 继续执行，不影响本地缓存的清除
      }

      showToast(`已清除${DataSourceFactory.getDataSourceInfo(type).name}的缓存数据`, 'success')

      // 发出缓存清除事件
      eventBus.emit('data-source-cache-cleared', type)

      return true
    } catch (error) {
      console.error(`清除${type}数据源缓存失败:`, error)
      showToast(`清除缓存失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error')
      return false
    }
  }

  // 获取股票列表 - 从数据库获取
  async getStocks(): Promise<
    Stock[] & {
      data_source?: string
      data_source_message?: string
      is_real_time?: boolean
      is_cache?: boolean
      source_type?: DataSourceType
    }
  > {
    const cacheKey = 'stocks_from_database'

    return await smartCache.getOrSet(
      cacheKey,
      async () => {
        try {
          console.log('[StockService] 从后端API获取股票列表（数据库）...')

          // 直接调用后端API获取股票列表
          const response = await axios.get(`${API_BASE_URL}/api/stocks`)

          if (response.data && response.data.data) {
            const stocks = response.data.data

            // 添加数据源信息
            const result = [...stocks] as Stock[] & {
              data_source?: string
              data_source_message?: string
              is_real_time?: boolean
              is_cache?: boolean
              source_type?: DataSourceType
            }

            // 添加数据源信息
            result.data_source = response.data.data_source || 'database'
            result.data_source_message = response.data.data_source_message || '数据来自数据库'
            result.is_real_time = false // 数据库数据不是实时的
            result.is_cache = false
            result.source_type = 'database' as DataSourceType

            console.log(`[StockService] 从数据库获取股票列表成功，共 ${stocks.length} 条数据`)
            console.log(`[StockService] 数据源: ${result.data_source}`)

            return result
          } else {
            throw new Error('后端API返回数据格式错误')
          }
        } catch (error) {
          console.error('[StockService] 从数据库获取股票列表失败:', error)

          // 如果后端API失败，尝试使用外部数据源作为备用
          console.log('[StockService] 数据库获取失败，尝试使用外部数据源作为备用...')

          try {
            // 获取所有可用的数据源
            const availableSources = DataSourceFactory.getAvailableDataSources()

            // 尝试第一个可用的数据源
            for (const sourceType of availableSources) {
              try {
                console.log(`[StockService] 尝试使用 ${sourceType} 数据源获取股票列表...`)
                const tempDataSource = DataSourceFactory.createDataSource(sourceType)
                const stocks = await tempDataSource.getStocks({ sourceType })

                // 获取数据源信息
                const sourceInfo = DataSourceFactory.getDataSourceInfo(sourceType)

                // 添加数据源信息
                const result = [...stocks] as Stock[] & {
                  data_source?: string
                  data_source_message?: string
                  is_real_time?: boolean
                  is_cache?: boolean
                  source_type?: DataSourceType
                }

                // 添加数据源信息
                result.data_source = sourceInfo.name
                result.data_source_message = `数据库获取失败，使用${sourceInfo.name}作为备用数据源`
                result.is_real_time = true
                result.is_cache = false
                result.source_type = sourceType

                console.log(`[StockService] 使用 ${sourceType} 备用数据源获取股票列表成功`)
                showToast(`数据库获取失败，已使用 ${sourceInfo.name} 作为备用数据源`, 'warning')

                return result
              } catch (sourceError) {
                console.error(`[StockService] ${sourceType} 数据源获取股票列表失败:`, sourceError)
                // 继续尝试下一个数据源
              }
            }

            // 所有数据源都失败
            console.error('[StockService] 所有数据源获取股票列表均失败')
            showToast('无法获取股票列表，所有数据源均失败，请检查网络连接或稍后再试', 'error')

            // 返回空数组而不是抛出错误，避免阻塞应用
            return [] as Stock[] & {
              data_source?: string
              data_source_message?: string
              is_real_time?: boolean
              is_cache?: boolean
              source_type?: DataSourceType
            }
          } catch (fallbackError) {
            console.error('[StockService] 备用数据源也失败:', fallbackError)
            showToast('获取股票列表失败，请稍后再试', 'error')

            // 返回空数组
            return [] as Stock[] & {
              data_source?: string
              data_source_message?: string
              is_real_time?: boolean
              is_cache?: boolean
              source_type?: DataSourceType
            }
          }
        }
      },
      {
        expiry: 60 * 60 * 1000, // 1小时缓存，因为数据库数据相对稳定
        version: '2.0', // 更新版本号，清除旧缓存
        tags: ['stocks', 'database']
      }
    )
  }

  // 获取股票图表数据（优化版本，使用缓存系统）
  async getStockChartData(symbol: string, days: number = 30): Promise<StockData & { source_type?: DataSourceType }> {
    try {
      console.log(`获取股票 ${symbol} 的图表数据，天数: ${days}`)

      // 计算日期范围
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const formatDate = (date: Date) => {
        return date.toISOString().split('T')[0].replace(/-/g, '')
      }

      const startDateStr = formatDate(startDate)
      const endDateStr = formatDate(endDate)

      // 调用后端API获取缓存数据
      console.log(`[StockService] 调用API: /api/stocks/${symbol}/history`, {
        start_date: startDateStr,
        end_date: endDateStr,
        cache_priority: 2
      })

      // 使用axios直接调用，避免apiRequest包装器的问题
      const response = await axios.get(`${API_BASE_URL}/api/stocks/${symbol}/history`, {
        params: {
          start_date: startDateStr,
          end_date: endDateStr,
          cache_priority: 2 // 搜索历史优先级
        }
      })

      console.log(`[StockService] API响应:`, {
        status: response.status,
        backendSuccess: response.data?.success,
        dataLength: response.data?.data?.length || 0,
        source: response.data?.data_source,
        responseData: response.data
      })

      // 检查HTTP状态码
      if (response.status !== 200) {
        throw new Error(`HTTP请求失败: ${response.status} ${response.statusText}`)
      }

      // 检查后端响应是否成功
      if (response.data && response.data.success && response.data.data && response.data.data.length > 0) {
        const historyData = response.data.data
        console.log(`[StockService] 开始处理历史数据，共 ${historyData.length} 条记录`)

        // 转换数据格式为图表组件期望的格式
        const dates: string[] = []
        const prices: number[] = []
        const opens: number[] = []
        const highs: number[] = []
        const lows: number[] = []
        const closes: number[] = []
        const volumes: number[] = []

        // 按日期升序排序（最早的在前面）
        const sortedData = historyData.sort((a: any, b: any) => {
          return a.trade_date.localeCompare(b.trade_date)
        })

        sortedData.forEach((item: any) => {
          if (item.trade_date && item.close) {
            // 格式化日期为 YYYY-MM-DD
            const dateStr = item.trade_date
            const formattedDate = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`

            dates.push(formattedDate)
            prices.push(parseFloat(item.close) || 0)
            opens.push(parseFloat(item.open) || parseFloat(item.close) || 0)
            highs.push(parseFloat(item.high) || parseFloat(item.close) || 0)
            lows.push(parseFloat(item.low) || parseFloat(item.close) || 0)
            closes.push(parseFloat(item.close) || 0)
            volumes.push(parseFloat(item.vol) || 0)
          }
        })

        if (dates.length > 0) {
          const stockData: StockData = {
            symbol,
            dates,
            prices,
            opens,
            highs,
            lows,
            closes,
            volumes,
            high: Math.max(...highs),
            low: Math.min(...lows),
            open: opens[0] || 0,
            close: closes[closes.length - 1] || 0
          }

          console.log(`[StockService] 成功获取股票 ${symbol} 图表数据，共 ${dates.length} 条记录`, {
            dates: dates.length,
            prices: prices.length,
            opens: opens.length,
            closes: closes.length,
            highs: highs.length,
            lows: lows.length,
            volumes: volumes.length,
            sampleDate: dates[0],
            samplePrice: prices[0]
          })
          return { ...stockData, source_type: 'cache' as DataSourceType }
        } else {
          console.warn(`[StockService] 处理后的数据为空`)
        }
      } else {
        console.warn(`[StockService] 后端响应无效或无数据:`, {
          hasData: !!response.data,
          backendSuccess: response.data?.success,
          dataLength: response.data?.data?.length || 0,
          backendMessage: response.data?.message,
          fullResponseData: response.data
        })
      }

      // 如果缓存数据获取失败，回退到原有方法
      console.log(`[StockService] 缓存数据获取失败，回退到原有数据源获取股票 ${symbol} 数据`)
      return await this.getStockData(symbol)

    } catch (error) {
      console.error(`[StockService] 获取股票 ${symbol} 图表数据失败:`, error)
      // 回退到原有方法
      console.log(`[StockService] 回退到原有数据源获取股票 ${symbol} 数据`)
      return await this.getStockData(symbol)
    }
  }

  // 获取单个股票数据
  async getStockData(symbol: string): Promise<StockData & { source_type?: DataSourceType }> {
    // 获取所有可用的数据源
    const availableSources = DataSourceFactory.getAvailableDataSources()

    // 首先尝试当前选择的数据源
    try {
      const data = await dataSource.getStockData(symbol, { sourceType: currentDataSourceType })
      // 添加数据源类型
      console.log(`使用 ${currentDataSourceType} 数据源获取股票${symbol}数据成功`)
      return { ...data, source_type: currentDataSourceType }
    } catch (error) {
      console.error(`${dataSource.getName()}获取股票${symbol}数据失败:`, error)

      // 当前数据源失败，尝试其他数据源
      console.log(`尝试使用其他数据源获取股票${symbol}数据...`)

      // 过滤掉当前数据源，只尝试其他数据源
      const otherSources = availableSources.filter((source) => source !== currentDataSourceType)

      // 依次尝试其他数据源
      for (const sourceType of otherSources) {
        try {
          console.log(`尝试使用 ${sourceType} 数据源获取股票${symbol}数据...`)
          const tempDataSource = DataSourceFactory.createDataSource(sourceType)
          const data = await tempDataSource.getStockData(symbol, { sourceType })

          console.log(`使用 ${sourceType} 数据源获取股票${symbol}数据成功`)
          showToast(
            `当前数据源获取失败，已使用 ${DataSourceFactory.getDataSourceInfo(sourceType).name
            } 获取数据`,
            'info'
          )

          return { ...data, source_type: sourceType }
        } catch (sourceError) {
          console.error(`${sourceType} 数据源获取股票${symbol}数据失败:`, sourceError)
          // 继续尝试下一个数据源
        }
      }

      // 所有数据源都失败，返回示例数据作为最后的fallback
      console.error(`所有数据源获取股票${symbol}数据均失败，使用示例数据`)
      showToast(
        `无法获取${symbol}的历史数据，显示示例数据。请检查网络连接或稍后再试。`,
        'warning'
      )

      // 返回示例图表数据而不是抛出错误
      return this.generateSampleChartData(symbol)
    }
  }

  // 搜索股票
  async searchStocks(query: string): Promise<(Stock & { source_type?: DataSourceType })[]> {
    try {
      // 优先使用数据库搜索API
      console.log(`使用数据库搜索股票: ${query}`)
      const response = await fetch(`${API_BASE_URL}/api/stocks/search?keyword=${encodeURIComponent(query)}`)

      if (!response.ok) {
        throw new Error(`数据库搜索API请求失败: ${response.status}`)
      }

      const data = await response.json()

      if (data.success && Array.isArray(data.data)) {
        console.log(`数据库搜索成功，找到 ${data.data.length} 条结果`)
        return data.data.map((stock: any) => ({
          ...stock,
          source_type: 'database' as DataSourceType
        }))
      } else {
        throw new Error(data.message || '数据库搜索失败')
      }
    } catch (error) {
      console.error('数据库搜索失败，尝试使用外部数据源:', error)

      // 数据库搜索失败，回退到外部数据源
      const availableSources = DataSourceFactory.getAvailableDataSources()

      // 首先尝试当前选择的数据源
      try {
        const results = await dataSource.searchStocks(query, { sourceType: currentDataSourceType })
        // 添加数据源类型
        console.log(`使用 ${currentDataSourceType} 数据源搜索股票成功`)
        return results.map((stock) => ({ ...stock, source_type: currentDataSourceType }))
      } catch (dataSourceError) {
        console.error(`${dataSource.getName()}搜索股票失败:`, dataSourceError)

        // 当前数据源失败，尝试其他数据源
        console.log(`尝试使用其他数据源搜索股票...`)

        // 过滤掉当前数据源，只尝试其他数据源
        const otherSources = availableSources.filter((source) => source !== currentDataSourceType)

        // 依次尝试其他数据源
        for (const sourceType of otherSources) {
          try {
            console.log(`尝试使用 ${sourceType} 数据源搜索股票...`)
            const tempDataSource = DataSourceFactory.createDataSource(sourceType)
            const results = await tempDataSource.searchStocks(query, { sourceType })

            console.log(`使用 ${sourceType} 数据源搜索股票成功`)
            showToast(
              `数据库搜索失败，已使用 ${DataSourceFactory.getDataSourceInfo(sourceType).name
              } 搜索股票`,
              'info'
            )

            return results.map((stock) => ({ ...stock, source_type: sourceType }))
          } catch (sourceError) {
            console.error(`${sourceType} 数据源搜索股票失败:`, sourceError)
            // 继续尝试下一个数据源
          }
        }

        // 所有数据源都失败，返回错误信息
        console.error(`所有数据源搜索股票均失败`)
        showToast(`无法搜索股票。数据库和所有外部数据源均无法提供数据，请检查网络连接或稍后再试。`, 'error')

        // 抛出错误，让调用者处理
        throw new Error(`无法搜索股票，所有数据源均失败`)
      }
    }
  }

  // 获取股票实时行情
  async getStockQuote(
    symbol: string,
    forceRefresh = false
  ): Promise<StockQuote & { source_type?: DataSourceType }> {
    try {
      // 获取当前数据源
      const currentSource = dataSourceStateManager.getCurrentDataSource()
      console.log(`使用 ${currentSource} 数据源获取股票${symbol}行情`)

      // 直接调用后端API，传递数据源参数
      const response = await axios.get(`${API_BASE_URL}/api/stocks/${symbol}/quote`, {
        params: {
          source: currentSource
        },
        headers: {
          'X-Data-Source': currentSource
        }
      })

      if (response.data) {
        console.log(`使用 ${currentSource} 数据源获取股票${symbol}行情成功`)

        // 确保数据完整性，补充缺失的字段
        const rawData = response.data
        const processedData = {
          symbol: symbol,
          name: rawData.name || `股票${symbol}`,
          price: rawData.price || 0,
          open: rawData.open || rawData.price || 0,
          high: rawData.high || rawData.price || 0,
          low: rawData.low || rawData.price || 0,
          close: rawData.close || rawData.price || 0,
          pre_close: rawData.pre_close || (rawData.price - (rawData.change || 0)) || 0,
          change: rawData.change || 0,
          pct_chg: rawData.pct_chg || (rawData.change && rawData.price ? (rawData.change / (rawData.price - rawData.change)) * 100 : 0),
          vol: rawData.volume || rawData.vol || 0,
          amount: rawData.amount || 0,
          turnover_rate: rawData.turnover_rate || rawData.turnover || 0,
          pe: rawData.pe || 0,
          pb: rawData.pb || 0,
          total_mv: rawData.total_mv || 0,
          circ_mv: rawData.circ_mv || 0,
          update_time: rawData.update_time || rawData.date || new Date().toISOString(),
          data_source: rawData.data_source || currentSource,
          data_source_message: rawData.data_source_message || '',
          source_type: currentSource
        }

        console.log(`处理后的股票${symbol}数据:`, processedData)
        return processedData
      } else {
        throw new Error('获取到的股票行情数据为空')
      }
    } catch (error) {
      console.error(`获取股票${symbol}行情失败:`, error)

      // 直接返回示例数据，避免复杂的数据源切换逻辑
      console.warn(`后端API调用失败，直接返回股票${symbol}的示例数据`)
      showToast(
        `无法获取${symbol}的实时行情，显示示例数据`,
        'warning'
      )

      return this.generateSampleQuote(symbol)
    }
  }

  // 获取仪表盘设置（代理到 dashboardService）
  async getDashboardSettings() {
    const { dashboardService } = await import('@/services/dashboardService')
    return dashboardService.getDashboardSettings()
  }

  // 保存仪表盘设置（代理到 dashboardService）
  async saveDashboardSettings(settings: any) {
    const { dashboardService } = await import('@/services/dashboardService')
    return dashboardService.saveDashboardSettings(settings)
  }

  // 获取财经新闻
  async getFinancialNews(
    count: number = 5,
    forceRefresh = false
  ): Promise<(FinancialNews & { source_type?: DataSourceType; data_source?: string })[]> {
    // 获取所有可用的数据源
    const availableSources = DataSourceFactory.getAvailableDataSources()

    // 首先尝试当前选择的数据源
    try {
      const news = await dataSource.getFinancialNews(count, {
        sourceType: currentDataSourceType,
        forceRefresh,
      })
      // 添加数据源类型
      console.log(`使用 ${currentDataSourceType} 数据源获取财经新闻成功`)
      return news.map((item) => ({
        ...item,
        source_type: currentDataSourceType,
        data_source: item.data_source || currentDataSourceType,
      }))
    } catch (error) {
      console.error(`${dataSource.getName()}获取财经新闻失败:`, error)

      // 当前数据源失败，尝试其他数据源
      console.log(`尝试使用其他数据源获取财经新闻...`)

      // 过滤掉当前数据源，只尝试其他数据源
      const otherSources = availableSources.filter((source) => source !== currentDataSourceType)

      // 依次尝试其他数据源
      for (const sourceType of otherSources) {
        try {
          console.log(`尝试使用 ${sourceType} 数据源获取财经新闻...`)
          const tempDataSource = DataSourceFactory.createDataSource(sourceType)
          const news = await tempDataSource.getFinancialNews(count, {
            sourceType,
            forceRefresh,
          })

          console.log(`使用 ${sourceType} 数据源获取财经新闻成功`)
          showToast(
            `当前数据源获取失败，已使用 ${DataSourceFactory.getDataSourceInfo(sourceType).name
            } 获取新闻`,
            'info'
          )

          return news.map((item) => ({
            ...item,
            source_type: sourceType,
            data_source: item.data_source || sourceType,
          }))
        } catch (sourceError) {
          console.error(`${sourceType} 数据源获取财经新闻失败:`, sourceError)
          // 继续尝试下一个数据源
        }
      }

      // 尝试使用模拟数据
      try {
        console.log(`所有数据源获取失败，使用模拟财经新闻数据...`)

        // 不使用模拟数据，直接抛出错误
        throw new Error('无法获取财经新闻数据，请检查数据源配置或网络连接')
      } catch (mockError) {
        console.error(`生成模拟财经新闻数据失败:`, mockError)
      }

      // 所有数据源和模拟数据都失败，返回错误信息
      console.error(`所有数据源获取财经新闻均失败`)
      showToast(`无法获取财经新闻。所有数据源均无法提供数据，请检查网络连接或稍后再试。`, 'error')

      // 抛出错误，让调用者处理
      throw new Error(`无法获取财经新闻，所有数据源均失败`)
    }
  }

  // 获取热门股票
  async getHotStocks(limit: number = 50): Promise<Stock[]> {
    const cacheKey = `hot_stocks_${limit}`

    return await smartCache.getOrSet(
      cacheKey,
      async () => {
        try {
          console.log('[StockService] 从后端API获取热门股票...')

          // 调用后端API获取热门股票
          const response = await axios.get(`${API_BASE_URL}/api/stocks/hot-stocks`, {
            params: { limit }
          })

          if (response.data && response.data.success) {
            console.log(`[StockService] 获取热门股票成功，共 ${response.data.data.length} 只`)
            return response.data.data.map((stock: any) => ({
              symbol: stock.symbol,
              tsCode: stock.tsCode || stock.symbol,
              name: stock.name,
              area: stock.area,
              industry: stock.industry,
              market: stock.market,
              listDate: stock.listDate,
              price: stock.price,
              change: stock.change,
              volume: stock.volume,
              amount: stock.amount,
              data_source: response.data.data_source,
              data_source_message: response.data.data_source_message
            }))
          } else {
            throw new Error(response.data?.message || '获取热门股票失败')
          }
        } catch (error) {
          console.error('[StockService] 获取热门股票失败:', error)

          // 返回默认热门股票列表
          console.log('[StockService] 使用默认热门股票列表')
          return [
            { symbol: '000001.SZ', name: '平安银行', market: 'SZ', industry: '银行' },
            { symbol: '600036.SH', name: '招商银行', market: 'SH', industry: '银行' },
            { symbol: '601318.SH', name: '中国平安', market: 'SH', industry: '保险' },
            { symbol: '000858.SZ', name: '五粮液', market: 'SZ', industry: '白酒' },
            { symbol: '600519.SH', name: '贵州茅台', market: 'SH', industry: '白酒' },
            { symbol: '000002.SZ', name: '万科A', market: 'SZ', industry: '房地产' },
            { symbol: '002415.SZ', name: '海康威视', market: 'SZ', industry: '电子' },
            { symbol: '002594.SZ', name: '比亚迪', market: 'SZ', industry: '汽车' },
            { symbol: '300059.SZ', name: '东方财富', market: 'SZ', industry: '软件服务' },
            { symbol: '300750.SZ', name: '宁德时代', market: 'SZ', industry: '电池' }
          ] as Stock[]
        }
      },
      {
        expiry: 30 * 60 * 1000, // 30分钟缓存
        version: '1.0',
        tags: ['stocks', 'hot']
      }
    )
  }

  // 获取涨停股票
  async getLimitUpStocks(limit: number = 50): Promise<Stock[]> {
    const cacheKey = `limit_up_stocks_${limit}`

    return await smartCache.getOrSet(
      cacheKey,
      async () => {
        try {
          console.log('[StockService] 从后端API获取涨停股票...')

          // 调用后端API获取涨停股票
          const response = await axios.get(`${API_BASE_URL}/api/stocks/limit-up`, {
            params: { limit }
          })

          if (response.data && response.data.success) {
            console.log(`[StockService] 获取涨停股票成功，共 ${response.data.data.length} 只`)
            return response.data.data.map((stock: any) => ({
              symbol: stock.symbol,
              tsCode: stock.tsCode || stock.symbol,
              name: stock.name,
              area: stock.area,
              industry: stock.industry,
              market: stock.market,
              listDate: stock.listDate,
              price: stock.price,
              change: stock.change,
              changePercent: stock.changePercent || 10.0, // 涨停通常是10%
              volume: stock.volume,
              amount: stock.amount,
              data_source: response.data.data_source,
              data_source_message: response.data.data_source_message
            }))
          } else {
            throw new Error(response.data?.message || '获取涨停股票失败')
          }
        } catch (error) {
          console.error('[StockService] 获取涨停股票失败:', error)
          return []
        }
      },
      {
        expiry: 5 * 60 * 1000, // 5分钟缓存，涨停数据更新较快
        version: '1.0',
        tags: ['stocks', 'limit-up']
      }
    )
  }

  // ===== 新增的综合股票信息API =====

  // 获取股票基本信息（使用现有的股票详情API）
  async getStockBasicInfo(symbol: string) {
    try {
      // 使用现有的股票详情API
      const response = await axios.get(`${API_BASE_URL}/api/v1/stocks/${symbol}`)
      return response.data
    } catch (error) {
      console.error('获取股票基本信息失败:', error)
      if (import.meta.env.DEV) {
        const { mockStockService } = await import('./mockStockService')
        return await mockStockService.getStockBasicInfo(symbol)
      }
      throw error
    }
  }

  // 获取技术指标（使用现有的技术指标API）
  async getTechnicalIndicators(symbol: string) {
    try {
      console.log(`[stockService] 获取技术指标: ${symbol}`)
      // 使用v1版本的API路径，这是GET请求
      const response = await axios.get(`${API_BASE_URL}/api/v1/stocks/${symbol}/indicators`)
      console.log(`[stockService] 技术指标API响应:`, response.data)
      return response.data
    } catch (error) {
      console.error('获取技术指标失败:', error)
      if (import.meta.env.DEV) {
        const { mockStockService } = await import('./mockStockService')
        return await mockStockService.getTechnicalIndicators(symbol)
      }
      throw error
    }
  }

  // 获取财务数据（暂时使用mock数据，因为后端没有专门的财务API）
  async getFinancialData(symbol: string) {
    try {
      // 后端暂时没有专门的财务数据API，直接使用mock数据
      if (import.meta.env.DEV) {
        const { mockStockService } = await import('./mockStockService')
        return await mockStockService.getFinancialData(symbol)
      }
      // 生产环境可以尝试从股票详情中获取部分财务信息
      const response = await axios.get(`${API_BASE_URL}/api/v1/stocks/${symbol}`)
      return response.data
    } catch (error) {
      console.error('获取财务数据失败:', error)
      if (import.meta.env.DEV) {
        const { mockStockService } = await import('./mockStockService')
        return await mockStockService.getFinancialData(symbol)
      }
      throw error
    }
  }

  // 获取K线数据（使用现有的历史数据API）
  async getKlineData(symbol: string, period: string = '1d') {
    try {
      // 使用现有的历史数据API，转换period参数
      const endDate = new Date().toISOString().split('T')[0].replace(/-/g, '')
      const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0].replace(/-/g, '')

      const response = await axios.get(`${API_BASE_URL}/api/v1/stocks/${symbol}/history`, {
        params: {
          start_date: startDate,
          end_date: endDate
        }
      })
      return response.data
    } catch (error) {
      console.error('获取K线数据失败:', error)
      if (import.meta.env.DEV) {
        const { mockStockService } = await import('./mockStockService')
        return await mockStockService.getKlineData(symbol, period)
      }
      throw error
    }
  }

  // 获取分时数据（使用现有的股票报价API）
  async getTimeData(symbol: string) {
    try {
      console.log(`[stockService] 获取分时数据: ${symbol}`)
      // 使用v1版本的API路径
      const response = await axios.get(`${API_BASE_URL}/api/v1/stocks/${symbol}/quote`)
      console.log(`[stockService] 分时数据API响应:`, response.data)
      return response.data
    } catch (error) {
      console.error('获取分时数据失败:', error)
      if (import.meta.env.DEV) {
        const { mockStockService } = await import('./mockStockService')
        return await mockStockService.getTimeData(symbol)
      }
      throw error
    }
  }

  // 获取成交明细（暂时使用mock数据）
  async getTransactionDetails(symbol: string) {
    try {
      // 后端暂时没有成交明细API，使用mock数据
      if (import.meta.env.DEV) {
        const { mockStockService } = await import('./mockStockService')
        return await mockStockService.getTransactionDetails(symbol)
      }
      // 生产环境返回空数据或基本信息
      return { transactions: [], symbol }
    } catch (error) {
      console.error('获取成交明细失败:', error)
      if (import.meta.env.DEV) {
        const { mockStockService } = await import('./mockStockService')
        return await mockStockService.getTransactionDetails(symbol)
      }
      throw error
    }
  }

  // 获取资金流向（暂时使用mock数据）
  async getMoneyFlow(symbol: string) {
    try {
      // 后端暂时没有资金流向API，使用mock数据
      if (import.meta.env.DEV) {
        const { mockStockService } = await import('./mockStockService')
        return await mockStockService.getMoneyFlow(symbol)
      }
      // 生产环境返回空数据或基本信息
      return { moneyFlow: [], symbol }
    } catch (error) {
      console.error('获取资金流向失败:', error)
      if (import.meta.env.DEV) {
        const { mockStockService } = await import('./mockStockService')
        return await mockStockService.getMoneyFlow(symbol)
      }
      throw error
    }
  }

  // 获取买卖盘（暂时使用mock数据）
  async getOrderBook(symbol: string) {
    try {
      // 后端暂时没有买卖盘API，使用mock数据
      if (import.meta.env.DEV) {
        const { mockStockService } = await import('./mockStockService')
        return await mockStockService.getOrderBook(symbol)
      }
      // 生产环境返回空数据或基本信息
      return { orderBook: { bids: [], asks: [] }, symbol }
    } catch (error) {
      console.error('获取买卖盘失败:', error)
      if (import.meta.env.DEV) {
        const { mockStockService } = await import('./mockStockService')
        return await mockStockService.getOrderBook(symbol)
      }
      throw error
    }
  }

  // 获取跌停股票
  async getLimitDownStocks(limit: number = 50): Promise<Stock[]> {
    const cacheKey = `limit_down_stocks_${limit}`

    return await smartCache.getOrSet(
      cacheKey,
      async () => {
        try {
          console.log('[StockService] 从后端API获取跌停股票...')

          // 调用后端API获取跌停股票
          const response = await axios.get(`${API_BASE_URL}/api/stocks/limit-down`, {
            params: { limit }
          })

          if (response.data && response.data.success) {
            console.log(`[StockService] 获取跌停股票成功，共 ${response.data.data.length} 只`)
            return response.data.data.map((stock: any) => ({
              symbol: stock.symbol,
              tsCode: stock.tsCode || stock.symbol,
              name: stock.name,
              area: stock.area,
              industry: stock.industry,
              market: stock.market,
              listDate: stock.listDate,
              price: stock.price,
              change: stock.change,
              changePercent: stock.changePercent || -10.0, // 跌停通常是-10%
              volume: stock.volume,
              amount: stock.amount,
              data_source: response.data.data_source,
              data_source_message: response.data.data_source_message
            }))
          } else {
            throw new Error(response.data?.message || '获取跌停股票失败')
          }
        } catch (error) {
          console.error('[StockService] 获取跌停股票失败:', error)
          return []
        }
      },
      {
        expiry: 5 * 60 * 1000, // 5分钟缓存，跌停数据更新较快
        version: '1.0',
        tags: ['stocks', 'limit-down']
      }
    )
  }

  // 获取技术分析数据
  async getTechnicalAnalysis(): Promise<any> {
    try {
      console.log('[StockService] 获取技术分析数据...')

      // 由于后端API不存在，返回模拟数据结构
      console.warn('[StockService] 后端技术分析API不存在，返回模拟数据结构')

      return {
        stocks: [
          {
            symbol: '000001.SZ',
            name: '平安银行',
            indicators: {
              rsi: 65.2,
              macd: 0.15,
              ma5: 12.5,
              ma20: 12.8,
              ma60: 13.1,
              volume: 1000000,
              kdj_k: 72.3,
              kdj_d: 68.9,
              kdj_j: 79.1,
              boll_upper: 13.2,
              boll_middle: 12.8,
              boll_lower: 12.4,
              signal: '买入'
            }
          },
          {
            symbol: '000002.SZ',
            name: '万科A',
            indicators: {
              rsi: 45.8,
              macd: -0.08,
              ma5: 18.2,
              ma20: 18.5,
              ma60: 18.8,
              volume: 800000,
              kdj_k: 42.1,
              kdj_d: 45.6,
              kdj_j: 35.1,
              boll_upper: 19.1,
              boll_middle: 18.5,
              boll_lower: 17.9,
              signal: '观望'
            }
          },
          {
            symbol: '600036.SH',
            name: '招商银行',
            indicators: {
              rsi: 58.3,
              macd: 0.22,
              ma5: 36.1,
              ma20: 35.8,
              ma60: 35.2,
              volume: 1200000,
              kdj_k: 61.7,
              kdj_d: 59.4,
              kdj_j: 66.3,
              boll_upper: 37.2,
              boll_middle: 36.0,
              boll_lower: 34.8,
              signal: '买入'
            }
          }
        ],
        timestamp: new Date().toISOString(),
        note: '技术分析API暂不可用，显示示例数据'
      }
    } catch (error) {
      console.error('[StockService] 获取技术分析数据失败:', error)
      return {
        stocks: [],
        timestamp: new Date().toISOString(),
        error: '获取技术分析数据失败'
      }
    }
  }

  // 生成示例图表数据
  private generateSampleChartData(symbol: string): StockData & { source_type?: DataSourceType } {
    console.log(`[StockService] 生成股票 ${symbol} 的示例图表数据`)

    // 生成30天的示例数据
    const days = 30
    const dates: string[] = []
    const opens: number[] = []
    const highs: number[] = []
    const lows: number[] = []
    const closes: number[] = []
    const prices: number[] = []
    const volumes: number[] = []

    // 根据股票代码生成相对稳定的基础价格
    const hash = symbol.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0)
      return a & a
    }, 0)

    let basePrice = Math.abs(hash % 100) + 10 // 10-110之间的基础价格

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      dates.push(date.toISOString().split('T')[0])

      // 生成价格波动
      const volatility = 0.05 // 5%的波动率
      const change = (Math.random() - 0.5) * 2 * volatility * basePrice
      const open = basePrice
      const close = Math.max(basePrice + change, basePrice * 0.5) // 确保价格不会太低
      const high = Math.max(open, close) * (1 + Math.random() * 0.02) // 最高价
      const low = Math.min(open, close) * (1 - Math.random() * 0.02) // 最低价
      const volume = Math.floor(Math.random() * 1000000) + 100000 // 成交量

      opens.push(Number(open.toFixed(2)))
      highs.push(Number(high.toFixed(2)))
      lows.push(Number(low.toFixed(2)))
      closes.push(Number(close.toFixed(2)))
      prices.push(Number(close.toFixed(2)))
      volumes.push(volume)

      basePrice = close // 下一天的基础价格
    }

    console.log(`[StockService] 生成的示例数据包含 ${dates.length} 天的数据`)

    return {
      symbol,
      dates,
      opens,
      highs,
      lows,
      closes,
      prices,
      volumes,
      open: opens[0],
      high: Math.max(...highs),
      low: Math.min(...lows),
      close: closes[closes.length - 1],
      source_type: 'sample' as DataSourceType
    }
  }

  // 生成示例股票行情数据
  private generateSampleQuote(symbol: string): any {
    // 根据股票代码生成相对稳定的示例数据
    const hash = symbol.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0)
      return a & a
    }, 0)

    const basePrice = Math.abs(hash % 100) + 10 // 10-110之间的基础价格
    const change = (Math.abs(hash % 200) - 100) / 100 // -1到1之间的变化
    const changePercent = (change / basePrice) * 100

    // 获取股票名称（如果有的话）
    const stockNames: { [key: string]: string } = {
      '000001.SZ': '平安银行',
      '000002.SZ': '万科A',
      '600036.SH': '招商银行',
      '600519.SH': '贵州茅台',
      '000858.SZ': '五粮液',
      '002343': '慈文传媒',
      '002343.SZ': '慈文传媒',
      '000001': '平安银行',
      '000002': '万科A',
      '600036': '招商银行',
      '600519': '贵州茅台',
      '000858': '五粮液',
      '300059.SZ': '东方财富',
      '300059': '东方财富',
      '002415.SZ': '海康威视',
      '002415': '海康威视',
      '000063.SZ': '中兴通讯',
      '000063': '中兴通讯',
      '002594.SZ': '比亚迪',
      '002594': '比亚迪',
      '300750.SZ': '宁德时代',
      '300750': '宁德时代'
    }

    const name = stockNames[symbol] || stockNames[symbol + '.SZ'] || stockNames[symbol + '.SH'] || `股票${symbol}`

    const currentPrice = Number((basePrice + change).toFixed(2))
    const openPrice = Number((basePrice + (Math.abs(hash % 100) - 50) / 100).toFixed(2))
    const highPrice = Number((basePrice + change + Math.abs(hash % 5) / 10).toFixed(2))
    const lowPrice = Number((basePrice + change - Math.abs(hash % 5) / 10).toFixed(2))
    const closePrice = Number(basePrice.toFixed(2))
    const preClose = Number((basePrice - change).toFixed(2))

    return {
      symbol: symbol,
      name: name,
      price: currentPrice,
      open: openPrice,
      high: highPrice,
      low: lowPrice,
      close: closePrice,
      pre_close: preClose,
      change: Number(change.toFixed(2)),
      pct_chg: Number(changePercent.toFixed(2)),
      vol: Math.abs(hash % 10000000) + 100000,
      amount: Math.abs(hash % 100000000) + 1000000,
      turnover_rate: Number(((Math.abs(hash % 500) + 50) / 100).toFixed(2)),
      pe: Number(((Math.abs(hash % 50) + 5) / 2).toFixed(1)),
      pb: Number(((Math.abs(hash % 20) + 5) / 10).toFixed(2)),
      total_mv: Math.abs(hash % 1000000000) + 10000000,
      circ_mv: Math.abs(hash % 500000000) + 5000000,
      update_time: new Date().toISOString(),
      data_source: 'sample',
      data_source_message: '示例数据 - 后端API不可用',
      source_type: 'sample' as any
    }
  }

  // 获取实时行情数据
  async getRealtimeQuotes(): Promise<any[]> {
    try {
      console.log('[StockService] 获取实时行情数据...')

      // 返回一些示例实时行情数据
      console.warn('[StockService] 使用示例实时行情数据')

      return [
        {
          symbol: '000001.SZ',
          name: '平安银行',
          price: 12.45,
          change: 0.15,
          changePercent: 1.22,
          volume: 1500000,
          amount: 18675000,
          high: 12.58,
          low: 12.30,
          open: 12.35,
          close: 12.30,
          turnover: 2.34,
          pe: 5.8,
          pb: 0.65,
          timestamp: new Date().toISOString()
        },
        {
          symbol: '000002.SZ',
          name: '万科A',
          price: 18.25,
          change: -0.08,
          changePercent: -0.44,
          volume: 980000,
          amount: 17885000,
          high: 18.45,
          low: 18.15,
          open: 18.33,
          close: 18.33,
          turnover: 1.87,
          pe: 8.2,
          pb: 0.89,
          timestamp: new Date().toISOString()
        },
        {
          symbol: '600036.SH',
          name: '招商银行',
          price: 36.20,
          change: 0.70,
          changePercent: 1.97,
          volume: 1200000,
          amount: 43440000,
          high: 36.45,
          low: 35.80,
          open: 35.95,
          close: 35.50,
          turnover: 1.45,
          pe: 6.2,
          pb: 0.78,
          timestamp: new Date().toISOString()
        },
        {
          symbol: '600519.SH',
          name: '贵州茅台',
          price: 1685.50,
          change: 12.30,
          changePercent: 0.74,
          volume: 45000,
          amount: 75825000,
          high: 1698.00,
          low: 1675.20,
          open: 1680.00,
          close: 1673.20,
          turnover: 0.36,
          pe: 28.5,
          pb: 8.9,
          timestamp: new Date().toISOString()
        },
        {
          symbol: '000858.SZ',
          name: '五粮液',
          price: 128.45,
          change: -1.25,
          changePercent: -0.96,
          volume: 320000,
          amount: 41104000,
          high: 130.20,
          low: 127.80,
          open: 129.70,
          close: 129.70,
          turnover: 1.02,
          pe: 18.7,
          pb: 3.2,
          timestamp: new Date().toISOString()
        }
      ]
    } catch (error) {
      console.error('[StockService] 获取实时行情数据失败:', error)
      return []
    }
  }
}

// 创建并导出股票服务实例
export const stockService = new StockService()
