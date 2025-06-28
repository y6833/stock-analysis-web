import axios from 'axios'
import type { Stock, StockData, StockQuote, FinancialNews } from '@/types/stock'
import { useToast } from '@/composables/useToast'
import { DataSourceFactory } from './dataSource/DataSourceFactory'
import type { DataSourceType } from './dataSource/DataSourceFactory'
import eventBus from '@/utils/eventBus'
import { dataSourceStateManager } from '@/services/dataSourceStateManager'
import { smartCache } from '@/services/cacheService'

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

// 股票服务
export const stockService = {
  // 获取当前数据源类型
  getCurrentDataSourceType: () => dataSourceStateManager.getCurrentDataSource(),

  // 获取所有可用数据源
  getAvailableDataSources: () => DataSourceFactory.getAvailableDataSources(),

  // 获取数据源信息
  getDataSourceInfo: (type: DataSourceType) => DataSourceFactory.getDataSourceInfo(type),

  // 切换数据源
  switchDataSource: (type: DataSourceType): boolean => {
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
  },

  // 测试数据源连接
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
      const response = await axios.get('/api/data-source/test', {
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
  },

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
  },

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
          const response = await axios.get('/api/stocks')

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
  },

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

      // 所有数据源都失败，返回错误信息
      console.error(`所有数据源获取股票${symbol}数据均失败`)
      showToast(
        `无法获取${symbol}的历史数据。所有数据源均无法提供数据，请检查网络连接或稍后再试。`,
        'error'
      )

      // 抛出错误，让调用者处理
      throw new Error(`无法获取${symbol}的历史数据，所有数据源均失败`)
    }
  },

  // 搜索股票
  async searchStocks(query: string): Promise<(Stock & { source_type?: DataSourceType })[]> {
    // 获取所有可用的数据源
    const availableSources = DataSourceFactory.getAvailableDataSources()

    // 首先尝试当前选择的数据源
    try {
      const results = await dataSource.searchStocks(query, { sourceType: currentDataSourceType })
      // 添加数据源类型
      console.log(`使用 ${currentDataSourceType} 数据源搜索股票成功`)
      return results.map((stock) => ({ ...stock, source_type: currentDataSourceType }))
    } catch (error) {
      console.error(`${dataSource.getName()}搜索股票失败:`, error)

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
            `当前数据源获取失败，已使用 ${DataSourceFactory.getDataSourceInfo(sourceType).name
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
      showToast(`无法搜索股票。所有数据源均无法提供数据，请检查网络连接或稍后再试。`, 'error')

      // 抛出错误，让调用者处理
      throw new Error(`无法搜索股票，所有数据源均失败`)
    }
  },

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
      const response = await axios.get(`/api/stocks/${symbol}/quote`, {
        params: {
          source: currentSource
        },
        headers: {
          'X-Data-Source': currentSource
        }
      })

      if (response.data) {
        console.log(`使用 ${currentSource} 数据源获取股票${symbol}行情成功`)
        return {
          ...response.data,
          source_type: currentSource,
          symbol: symbol
        }
      } else {
        throw new Error('获取到的股票行情数据为空')
      }
    } catch (error) {
      console.error(`获取股票${symbol}行情失败:`, error)

      // 如果是网络错误或后端错误，尝试使用前端数据源作为备份
      console.log(`后端API调用失败，尝试使用前端数据源获取股票${symbol}行情...`)

      try {
        // 获取所有可用的数据源
        const availableSources = DataSourceFactory.getAvailableDataSources()

        // 首先尝试当前选择的数据源
        const quote = await dataSource.getStockQuote(symbol, {
          sourceType: currentDataSourceType,
          forceRefresh,
        })
        // 添加数据源类型
        console.log(`使用前端 ${currentDataSourceType} 数据源获取股票${symbol}行情成功`)
        return { ...quote, source_type: currentDataSourceType }
      } catch (frontendError) {
        console.error(`前端数据源也失败:`, frontendError)

        // 当前数据源失败，尝试其他数据源
        console.log(`尝试使用其他前端数据源获取股票${symbol}行情...`)

        // 获取所有可用的数据源
        const availableSources = DataSourceFactory.getAvailableDataSources()
        // 过滤掉当前数据源，只尝试其他数据源
        const otherSources = availableSources.filter((source) => source !== currentDataSourceType)

        // 依次尝试其他数据源
        for (const sourceType of otherSources) {
          try {
            console.log(`尝试使用 ${sourceType} 数据源获取股票${symbol}行情...`)
            const tempDataSource = DataSourceFactory.createDataSource(sourceType)
            const quote = await tempDataSource.getStockQuote(symbol, {
              sourceType,
              forceRefresh,
            })

            console.log(`使用 ${sourceType} 数据源获取股票${symbol}行情成功`)
            showToast(
              `当前数据源获取失败，已使用 ${DataSourceFactory.getDataSourceInfo(sourceType).name
              } 获取行情`,
              'info'
            )

            return { ...quote, source_type: sourceType }
          } catch (sourceError) {
            console.error(`${sourceType} 数据源获取股票${symbol}行情失败:`, sourceError)
            // 继续尝试下一个数据源
          }
        }
        // 所有数据源和模拟数据都失败，返回错误信息
        console.error(`所有数据源获取股票${symbol}行情均失败`)
        showToast(
          `无法获取${symbol}的实时行情。所有数据源均无法提供数据，请检查网络连接或稍后再试。`,
          'error'
        )

        // 抛出错误，让调用者处理
        throw new Error(`无法获取${symbol}的实时行情，所有数据源均失败`)
      }
    }
  },

  // 获取仪表盘设置（代理到 dashboardService）
  async getDashboardSettings() {
    const { dashboardService } = await import('@/services/dashboardService')
    return dashboardService.getDashboardSettings()
  },

  // 保存仪表盘设置（代理到 dashboardService）
  async saveDashboardSettings(settings: any) {
    const { dashboardService } = await import('@/services/dashboardService')
    return dashboardService.saveDashboardSettings(settings)
  },

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
  },
}
