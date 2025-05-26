import axios from 'axios'
import type { Stock, StockData, StockQuote, FinancialNews } from '@/types/stock'
import { useToast } from '@/composables/useToast'
import { DataSourceFactory } from './dataSource/DataSourceFactory'
import type { DataSourceType } from './dataSource/DataSourceFactory'
import eventBus from '@/utils/eventBus'

// 从本地存储获取当前数据源类型
const getCurrentDataSourceType = (): DataSourceType => {
  const savedSource = localStorage.getItem('preferredDataSource')

  // 如果localStorage中有值，使用该值
  if (
    savedSource &&
    ['tushare', 'sina', 'eastmoney', 'akshare', 'netease', 'tencent', 'yahoo'].includes(savedSource)
  ) {
    console.log(`从localStorage获取数据源类型: ${savedSource}`)
    return savedSource as DataSourceType
  }

  // 如果localStorage中没有值或值无效，设置默认值为eastmoney并保存
  console.log('localStorage中没有有效的数据源类型，使用默认值: eastmoney')
  localStorage.setItem('preferredDataSource', 'eastmoney')
  return 'eastmoney'
}

// 初始化数据源
let currentDataSourceType = getCurrentDataSourceType()
let dataSource = DataSourceFactory.createDataSource(currentDataSourceType)

// 确保localStorage中的值与当前数据源类型一致
localStorage.setItem('preferredDataSource', currentDataSourceType)

// 更新数据源实例
const updateDataSource = (type: DataSourceType) => {
  currentDataSourceType = type
  dataSource = DataSourceFactory.createDataSource(type)
  console.log(`数据源已更新为: ${type}`)
}

// 监听数据源变化事件
eventBus.on('data-source-changed', (type: DataSourceType) => {
  updateDataSource(type)
})

const { showToast } = useToast()

// 股票服务
export const stockService = {
  // 获取当前数据源类型
  getCurrentDataSourceType: () => currentDataSourceType,

  // 获取所有可用数据源
  getAvailableDataSources: () => DataSourceFactory.getAvailableDataSources(),

  // 获取数据源信息
  getDataSourceInfo: (type: DataSourceType) => DataSourceFactory.getDataSourceInfo(type),

  // 切换数据源
  switchDataSource: (type: DataSourceType): boolean => {
    try {
      console.log(`切换数据源: 从 ${currentDataSourceType} 到 ${type}`)

      // 检查是否是当前数据源
      if (type === currentDataSourceType) {
        showToast(`已经是${DataSourceFactory.getDataSourceInfo(type).name}，无需切换`, 'info')
        return true
      }

      // 更新数据源实例
      updateDataSource(type)

      // 保存到本地存储
      localStorage.setItem('preferredDataSource', type)
      console.log(`已保存数据源设置到localStorage: ${type}`)

      // 记录切换时间
      localStorage.setItem('last_source_switch_time', Date.now().toString())

      // 确认localStorage中的值已正确设置
      const storedValue = localStorage.getItem('preferredDataSource')
      console.log(`确认localStorage中的数据源设置: ${storedValue}`)

      // 如果localStorage中的值与期望的不一致，尝试再次设置
      if (storedValue !== type) {
        console.warn(`localStorage中的数据源设置不一致，再次尝试设置: ${storedValue} != ${type}`)
        localStorage.setItem('preferredDataSource', type)
        // 再次确认
        const recheck = localStorage.getItem('preferredDataSource')
        console.log(`再次确认localStorage中的数据源设置: ${recheck}`)
      }

      // 发出数据源切换事件
      eventBus.emit('data-source-changed', type)

      showToast(`已切换到${DataSourceFactory.getDataSourceInfo(type).name}`, 'success')

      return true
    } catch (error) {
      console.error('切换数据源失败:', error)
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
        `测试数据源参数 - 请求类型: ${type}, 强制当前源: ${forcedCurrentSource || '无'}, 存储源: ${
          storedDataSource || '无'
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
      if (type === effectiveCurrentSource || window.location.pathname.includes('/data-source')) {
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

  // 获取股票列表
  async getStocks(): Promise<
    Stock[] & {
      data_source?: string
      data_source_message?: string
      is_real_time?: boolean
      is_cache?: boolean
      source_type?: DataSourceType
    }
  > {
    // 获取所有可用的数据源
    const availableSources = DataSourceFactory.getAvailableDataSources()

    // 首先尝试当前选择的数据源
    try {
      // 获取数据源信息
      const sourceInfo = DataSourceFactory.getDataSourceInfo(currentDataSourceType)

      // 获取股票列表，传递数据源类型
      const stocks = await dataSource.getStocks({ sourceType: currentDataSourceType })

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
      result.data_source_message = `数据来自${sourceInfo.name}`
      result.is_real_time = true
      result.is_cache = false
      result.source_type = currentDataSourceType

      console.log(`使用 ${currentDataSourceType} 数据源获取股票列表成功`)
      return result
    } catch (error) {
      console.error(`${dataSource.getName()}获取股票列表失败:`, error)

      // 当前数据源失败，尝试其他数据源
      console.log(`尝试使用其他数据源获取股票列表...`)

      // 过滤掉当前数据源，只尝试其他数据源
      const otherSources = availableSources.filter((source) => source !== currentDataSourceType)

      // 依次尝试其他数据源
      for (const sourceType of otherSources) {
        try {
          console.log(`尝试使用 ${sourceType} 数据源获取股票列表...`)
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
          result.data_source_message = `数据来自${sourceInfo.name}`
          result.is_real_time = true
          result.is_cache = false
          result.source_type = sourceType

          console.log(`使用 ${sourceType} 数据源获取股票列表成功`)
          showToast(`当前数据源获取失败，已使用 ${sourceInfo.name} 获取股票列表`, 'info')

          return result
        } catch (sourceError) {
          console.error(`${sourceType} 数据源获取股票列表失败:`, sourceError)
          // 继续尝试下一个数据源
        }
      }

      // 所有数据源都失败，返回错误信息
      console.error(`所有数据源获取股票列表均失败`)
      showToast(`无法获取股票列表。所有数据源均无法提供数据，请检查网络连接或稍后再试。`, 'error')

      // 抛出错误，让调用者处理
      throw new Error(`无法获取股票列表，所有数据源均失败`)
    }
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
            `当前数据源获取失败，已使用 ${
              DataSourceFactory.getDataSourceInfo(sourceType).name
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
            `当前数据源获取失败，已使用 ${
              DataSourceFactory.getDataSourceInfo(sourceType).name
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
    // 获取所有可用的数据源
    const availableSources = DataSourceFactory.getAvailableDataSources()

    // 首先尝试当前选择的数据源
    try {
      const quote = await dataSource.getStockQuote(symbol, {
        sourceType: currentDataSourceType,
        forceRefresh,
      })
      // 添加数据源类型
      console.log(`使用 ${currentDataSourceType} 数据源获取股票${symbol}行情成功`)
      return { ...quote, source_type: currentDataSourceType }
    } catch (error) {
      console.error(`${dataSource.getName()}获取股票${symbol}行情失败:`, error)

      // 当前数据源失败，尝试其他数据源
      console.log(`尝试使用其他数据源获取股票${symbol}行情...`)

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
            `当前数据源获取失败，已使用 ${
              DataSourceFactory.getDataSourceInfo(sourceType).name
            } 获取行情`,
            'info'
          )

          return { ...quote, source_type: sourceType }
        } catch (sourceError) {
          console.error(`${sourceType} 数据源获取股票${symbol}行情失败:`, sourceError)
          // 继续尝试下一个数据源
        }
      }

      // 尝试使用模拟数据
      try {
        console.log(`所有数据源获取失败，尝试使用模拟数据...`)

        // 检查是否有模拟数据生成函数
        if (typeof dataSource.generateMockStockQuote === 'function') {
          const mockQuote = await dataSource.generateMockStockQuote(symbol)
          console.log(`使用模拟数据获取股票${symbol}行情成功`)
          showToast(`使用模拟数据显示${symbol}的行情`, 'warning')
          return { ...mockQuote, source_type: 'mock' }
        }

        // 如果当前数据源没有模拟数据生成函数，尝试其他数据源的模拟数据
        for (const sourceType of otherSources) {
          const tempDataSource = DataSourceFactory.createDataSource(sourceType)
          if (typeof tempDataSource.generateMockStockQuote === 'function') {
            const mockQuote = await tempDataSource.generateMockStockQuote(symbol)
            console.log(`使用${sourceType}的模拟数据获取股票${symbol}行情成功`)
            showToast(`使用模拟数据显示${symbol}的行情`, 'warning')
            return { ...mockQuote, source_type: 'mock' }
          }
        }
      } catch (mockError) {
        console.error(`生成模拟数据失败:`, mockError)
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
            `当前数据源获取失败，已使用 ${
              DataSourceFactory.getDataSourceInfo(sourceType).name
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

        // 生成模拟新闻数据
        const mockNews: FinancialNews[] = [
          {
            title: '央行宣布降准0.5个百分点，释放长期资金约1万亿元',
            time: '10分钟前',
            source: '财经日报',
            url: '#',
            important: true,
            content:
              '中国人民银行今日宣布，决定于下周一起下调金融机构存款准备金率0.5个百分点，预计将释放长期资金约1万亿元。',
          },
          {
            title: '科技板块全线上涨，半导体行业领涨',
            time: '30分钟前',
            source: '证券时报',
            url: '#',
            important: false,
            content:
              '今日A股市场，科技板块表现强势，全线上涨。其中，半导体行业领涨，多只个股涨停。',
          },
          {
            title: '多家券商上调A股目标位，看好下半年行情',
            time: '1小时前',
            source: '上海证券报',
            url: '#',
            important: false,
            content: '近日，多家券商发布研报，上调A股目标位，普遍看好下半年市场行情。',
          },
          {
            title: '外资连续三日净流入，北向资金今日净买入超50亿',
            time: '2小时前',
            source: '中国证券报',
            url: '#',
            important: false,
            content:
              '据统计数据显示，外资已连续三个交易日净流入A股市场，今日北向资金净买入超过50亿元。',
          },
          {
            title: '新能源汽车销量创新高，相关概念股受关注',
            time: '3小时前',
            source: '第一财经',
            url: '#',
            important: false,
            content:
              '据中国汽车工业协会最新数据，上月我国新能源汽车销量再创历史新高，同比增长超过50%。',
          },
          {
            title: '国常会：进一步扩大内需，促进消费持续恢复',
            time: '4小时前',
            source: '新华社',
            url: '#',
            important: true,
            content: '国务院常务会议今日召开，会议强调要进一步扩大内需，促进消费持续恢复和升级。',
          },
          {
            title: '两部门：加大对先进制造业支持力度，优化融资环境',
            time: '5小时前',
            source: '经济参考报',
            url: '#',
            important: false,
            content: '财政部、工信部联合发文，要求加大对先进制造业的支持力度，优化融资环境。',
          },
        ]

        // 随机打乱新闻顺序
        const shuffledNews = [...mockNews].sort(() => Math.random() - 0.5)

        // 返回指定数量的新闻
        const result = shuffledNews.slice(0, count).map((item) => ({
          ...item,
          source_type: 'mock',
          data_source: 'mock',
        }))

        console.log(`成功生成 ${result.length} 条模拟财经新闻`)
        showToast(`使用模拟数据显示财经新闻`, 'warning')

        return result
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
