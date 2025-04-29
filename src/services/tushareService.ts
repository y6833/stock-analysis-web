import axios from 'axios'
import type { Stock, StockData, StockQuote, FinancialNews } from '@/types/stock'
import { getAuthHeaders } from '@/utils/auth'

// Tushare API 配置
// 使用本地代理服务器避免 CORS 问题
const TUSHARE_API_URL = '/api/tushare'
const TOKEN = '983b25aa025eee598034c4741dc776dd73356ddc53ddcffbb180cf61'

// 调试模式 - 开启可以看到更多日志
const DEBUG_MODE = true

// API调用控制
// 控制是否允许调用Tushare API
// 只有在以下情况下允许调用：
// 1. 用户登录成功后
// 2. 用户点击刷新按钮时
// 3. 在API测试模块中
// 4. 在切换数据源模块中
let allowApiCall = false

// 当前页面路径
let currentPath = window.location.pathname

// 缓存配置
const STOCK_BASIC_CACHE_KEY = 'tushare_stock_basic_cache'
const STOCK_DAILY_CACHE_PREFIX = 'tushare_stock_daily_'
const STOCK_QUOTE_CACHE_PREFIX = 'tushare_stock_quote_'
const INDEX_CACHE_PREFIX = 'tushare_index_'
const SECTOR_LIST_CACHE_KEY = 'tushare_sector_list_cache'
const NEWS_CACHE_KEY = 'tushare_news_cache'

const CACHE_EXPIRE_MS = 24 * 60 * 60 * 1000 // 24小时
const QUOTE_CACHE_EXPIRE_MS = 5 * 60 * 1000 // 5分钟
const NEWS_CACHE_EXPIRE_MS = 30 * 60 * 1000 // 30分钟

// API请求限制相关参数
const API_RATE_LIMIT = 60 * 1000 // 每分钟只能请求一次
const API_RETRY_COUNT = 3 // 重试次数

// 记录最后一次请求时间
const lastRequestTime: Record<string, number> = {}

// 日志函数
function log(...args: any[]) {
  if (DEBUG_MODE) {
    console.log(...args)
  }
}

function logError(...args: any[]) {
  console.error(...args) // 错误始终输出
}

// 等待函数
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// 检查是否可以发送请求
async function checkRateLimit(api_name: string): Promise<void> {
  const now = Date.now()
  const lastTime = lastRequestTime[api_name] || 0
  const timeSinceLastRequest = now - lastTime

  if (timeSinceLastRequest < API_RATE_LIMIT) {
    const waitTime = API_RATE_LIMIT - timeSinceLastRequest
    log(`请求频率限制，等待 ${waitTime}ms 后再请求 ${api_name}`)
    await sleep(waitTime)
  }

  // 更新最后请求时间
  lastRequestTime[api_name] = Date.now()
}

// 检查是否允许API调用
function checkApiCallAllowed(): boolean {
  // 检查当前路径是否为API测试页面或数据源切换页面
  const isApiTestPage = currentPath.includes('/tushare-test') || currentPath.includes('/api-test')
  const isDataSourcePage = currentPath.includes('/data-source')

  // 如果是API测试页面或数据源切换页面，始终允许调用
  if (isApiTestPage || isDataSourcePage) {
    return true
  }

  // 否则，根据allowApiCall标志决定
  return allowApiCall
}

// 设置允许API调用
export function setAllowApiCall(allow: boolean): void {
  allowApiCall = allow
  log(`API调用权限已${allow ? '开启' : '关闭'}`)
}

// 更新当前路径
export function updateCurrentPath(path: string): void {
  currentPath = path
  log(`当前路径已更新为: ${path}`)
}

// Tushare API 请求函数
async function tushareRequest(
  api_name: string,
  params: any = {},
  retryCount = 0,
  dataSource: string = 'tushare'
): Promise<any> {
  try {
    // 检查是否允许API调用
    if (!checkApiCallAllowed()) {
      log(
        `API调用被限制: ${api_name}。只有在登录成功后、点击刷新按钮时、API测试页面或数据源切换页面才允许调用。`
      )
      throw new Error('API调用被限制，请在允许的场景下使用')
    }

    // 检查请求频率限制
    await checkRateLimit(api_name)

    // 获取当前数据源类型（如果未指定）
    if (dataSource === 'tushare') {
      // 从本地存储获取当前数据源类型
      const savedSource = localStorage.getItem('preferredDataSource')
      if (savedSource) {
        dataSource = savedSource
      }
    }

    log(`正在请求 ${dataSource.toUpperCase()} API: ${api_name}，参数:`, params)
    log(`请求URL: ${TUSHARE_API_URL}`)

    const requestData = {
      api_name,
      token: TOKEN,
      params,
      data_source: dataSource, // 添加数据源参数
    }

    log('请求数据:', JSON.stringify(requestData))

    // 添加force_api参数，根据allowApiCall决定是否强制使用API
    const requestWithForce = {
      ...requestData,
      force_api: allowApiCall,
    }

    log('添加force_api参数:', allowApiCall)

    const response = await axios.post(TUSHARE_API_URL, requestWithForce, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/plain, */*',
      },
      timeout: 15000, // 15秒超时
    })

    log(`响应状态码: ${response.status}`)
    log('响应头信息:', response.headers)

    if (!response.data) {
      logError(`Tushare API ${api_name} 请求返回空响应`)
      throw new Error('服务器返回空响应')
    }

    log('响应数据:', response.data)

    if (response.data.code === 0) {
      // 记录数据来源信息
      const dataSource = response.data.data_source || 'Tushare API'
      const dataSourceMessage = response.data.data_source_message || '数据来源未知'
      const isRealTime = response.data.is_real_time || false
      const isCache = response.data.cache || false

      log(`Tushare API ${api_name} 请求成功，获取到 ${response.data.data.items.length} 条数据`)
      log(
        `数据来源: ${dataSource}, ${dataSourceMessage}, 实时数据: ${isRealTime}, 缓存: ${isCache}`
      )

      return {
        fields: response.data.data.fields,
        items: response.data.data.items,
        data_source: dataSource,
        data_source_message: dataSourceMessage,
        is_real_time: isRealTime,
        is_cache: isCache,
      }
    } else {
      // 如果是频率限制错误，尝试重试
      if (
        response.data.code === 40101 &&
        response.data.msg.includes('每分钟最多访问') &&
        retryCount < API_RETRY_COUNT
      ) {
        const waitTime = API_RATE_LIMIT
        logError(`频率限制错误，等待 ${waitTime}ms 后重试 (${retryCount + 1}/${API_RETRY_COUNT})`)
        await sleep(waitTime)
        return tushareRequest(api_name, params, retryCount + 1)
      }

      logError(`Tushare API ${api_name} 请求返回错误:`, response.data)
      throw new Error(response.data.msg || '请求失败')
    }
  } catch (error: any) {
    // 如果是超时错误或网络错误，尝试重试
    if (
      (error.code === 'ECONNABORTED' ||
        error.message.includes('timeout') ||
        error.message.includes('Network Error')) &&
      retryCount < API_RETRY_COUNT
    ) {
      const waitTime = 2000 * (retryCount + 1) // 按指数退避等待
      logError(`连接超时或网络错误，${waitTime}ms 后重试 (${retryCount + 1}/${API_RETRY_COUNT})`)
      await sleep(waitTime)
      return tushareRequest(api_name, params, retryCount + 1)
    }

    if (error.response) {
      // 服务器返回了错误状态码
      logError(
        `Tushare API ${api_name} 请求错误 - 状态码: ${error.response.status}`,
        error.response.data
      )
    } else if (error.request) {
      // 请求已发送但没有收到响应
      logError(`Tushare API ${api_name} 请求错误 - 无响应:`, error.request)
    } else {
      // 请求设置时发生错误
      logError(`Tushare API ${api_name} 请求错误:`, error.message)
    }
    throw error
  }
}

// 将 Tushare 数据转换为应用所需格式
function convertStockList(data: any): Stock[] {
  const { fields, items } = data
  const symbolIndex = fields.indexOf('ts_code')
  const nameIndex = fields.indexOf('name')
  const marketIndex =
    fields.indexOf('market') !== -1 ? fields.indexOf('market') : fields.indexOf('exchange')
  const industryIndex = fields.indexOf('industry')

  return items.map((item: any) => ({
    symbol: item[symbolIndex],
    name: item[nameIndex],
    market: item[marketIndex] !== undefined ? item[marketIndex] : '未知',
    industry:
      industryIndex !== -1 && item[industryIndex] !== undefined ? item[industryIndex] : '未知',
  }))
}

function convertStockData(symbol: string, data: any): StockData {
  const { fields, items } = data
  const dateIndex = fields.indexOf('trade_date')
  const openIndex = fields.indexOf('open')
  const closeIndex = fields.indexOf('close')
  const highIndex = fields.indexOf('high')
  const lowIndex = fields.indexOf('low')
  const volumeIndex = fields.indexOf('vol')

  // 按日期排序（从旧到新）
  const sortedItems = [...items].sort((a, b) => {
    return a[dateIndex].localeCompare(b[dateIndex])
  })

  const dates = sortedItems.map((item) => {
    // 将 YYYYMMDD 格式转换为 YYYY-MM-DD
    const dateStr = item[dateIndex].toString()
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
  })

  const prices = sortedItems.map((item) => parseFloat(item[closeIndex]))
  const volumes = sortedItems.map((item) => parseFloat(item[volumeIndex]))
  const highs = sortedItems.map((item) => parseFloat(item[highIndex]))
  const lows = sortedItems.map((item) => parseFloat(item[lowIndex]))
  const opens = sortedItems.map((item) => parseFloat(item[openIndex]))

  return {
    symbol,
    dates,
    prices,
    volumes,
    high: Math.max(...highs),
    low: Math.min(...lows),
    open: opens[0],
    close: prices[prices.length - 1],
  }
}

// 缓存相关函数
function getCachedData(key: string, expireMs: number = CACHE_EXPIRE_MS): any | null {
  const cached = localStorage.getItem(key)
  if (!cached) return null

  try {
    const { data, timestamp } = JSON.parse(cached)
    const isExpired = Date.now() - timestamp > expireMs
    if (isExpired) {
      log(`缓存数据已过期: ${key}`)
      return null
    }
    log(`从缓存获取数据: ${key}`)
    return data
  } catch (e) {
    logError(`解析缓存数据失败 (${key}):`, e)
    return null
  }
}

function cacheData(key: string, data: any, expireMs: number = CACHE_EXPIRE_MS): void {
  try {
    const cacheData = {
      data,
      timestamp: Date.now(),
    }
    localStorage.setItem(key, JSON.stringify(cacheData))
    log(`数据已缓存: ${key}`)
  } catch (e) {
    logError(`缓存数据失败 (${key}):`, e)
  }
}

// 特定缓存函数
function getCachedStockBasic(): Stock[] | null {
  return getCachedData(STOCK_BASIC_CACHE_KEY, CACHE_EXPIRE_MS)
}

function cacheStockBasic(data: Stock[]): void {
  cacheData(STOCK_BASIC_CACHE_KEY, data, CACHE_EXPIRE_MS)
}

function getCachedStockDaily(symbol: string): StockData | null {
  return getCachedData(`${STOCK_DAILY_CACHE_PREFIX}${symbol}`, CACHE_EXPIRE_MS)
}

function cacheStockDaily(symbol: string, data: StockData): void {
  cacheData(`${STOCK_DAILY_CACHE_PREFIX}${symbol}`, data, CACHE_EXPIRE_MS)
}

function getCachedStockQuote(symbol: string): StockQuote | null {
  return getCachedData(`${STOCK_QUOTE_CACHE_PREFIX}${symbol}`, QUOTE_CACHE_EXPIRE_MS)
}

function cacheStockQuote(symbol: string, data: StockQuote): void {
  cacheData(`${STOCK_QUOTE_CACHE_PREFIX}${symbol}`, data, QUOTE_CACHE_EXPIRE_MS)
}

function getCachedNews(): FinancialNews[] | null {
  return getCachedData(NEWS_CACHE_KEY, NEWS_CACHE_EXPIRE_MS)
}

function cacheNews(data: FinancialNews[]): void {
  cacheData(NEWS_CACHE_KEY, data, NEWS_CACHE_EXPIRE_MS)
}

function getCachedSectorList(): any[] | null {
  return getCachedData(SECTOR_LIST_CACHE_KEY, CACHE_EXPIRE_MS)
}

function cacheSectorList(data: any[]): void {
  cacheData(SECTOR_LIST_CACHE_KEY, data, CACHE_EXPIRE_MS)
}

// Tushare 服务
export const tushareService = {
  // API调用控制
  setAllowApiCall,
  updateCurrentPath,

  // 获取股票列表
  async getStocks(): Promise<Stock[]> {
    try {
      // 获取当前数据源类型
      const currentDataSource = localStorage.getItem('preferredDataSource') || 'tushare'

      // 尝试从缓存获取
      const cachedData = getCachedStockBasic()
      if (cachedData) {
        log(`从缓存获取股票基础数据 (数据源: ${currentDataSource})`)
        return cachedData
      }

      // 使用新的后端接口获取股票基本信息
      log(`从后端获取股票基本信息 (数据源: ${currentDataSource})`)
      const response = await axios.get(`${TUSHARE_API_URL}/stock-basic`, {
        params: { data_source: currentDataSource },
      })

      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        const stocks = response.data.data.map((item: any) => ({
          symbol: item.ts_code,
          name: item.name,
          market: item.market || (item.ts_code.includes('SH') ? '上海' : '深圳'),
          industry: item.industry || '未知',
        }))

        // 缓存数据
        cacheStockBasic(stocks)

        log(`成功获取 ${stocks.length} 条股票基本信息 (来源: ${response.data.source})`)
        return stocks
      } else {
        throw new Error(response.data?.message || '获取股票列表失败')
      }
    } catch (error) {
      // 如果后端接口失败，尝试使用原来的方法
      try {
        log('后端接口失败，尝试使用原来的方法获取股票列表')
        // 获取当前数据源类型
        const currentDataSource = localStorage.getItem('preferredDataSource') || 'tushare'

        const data = await tushareRequest(
          'stock_basic',
          {
            exchange: '',
            list_status: 'L',
            fields: 'ts_code,name,industry,market,list_date',
          },
          0,
          currentDataSource
        )
        const stocks = convertStockList(data)
        cacheStockBasic(stocks)
        return stocks
      } catch (fallbackError) {
        logError('获取股票列表失败:', error)
        logError('原来的方法也失败:', fallbackError)
        return []
      }
    }
  },

  // 获取单个股票数据
  async getStockData(symbol: string, days = 90, forceRefresh = false): Promise<StockData> {
    try {
      // 如果不强制刷新，尝试从缓存获取
      if (!forceRefresh) {
        const cachedData = getCachedStockDaily(symbol)
        if (cachedData) {
          log(`使用缓存的股票数据: ${symbol}`)
          return cachedData
        }
      }

      // 限制最大查询范围为90天
      if (days > 90) {
        log('请求时间范围超过90天，已自动调整为90天')
        days = 90
      }

      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      // 验证日期有效性
      if (startDate > endDate) {
        throw new Error('开始日期不能晚于结束日期')
      }

      const formatDate = (date: Date) => {
        return date.toISOString().split('T')[0].replace(/-/g, '')
      }

      log(`请求股票数据: ${symbol}, 时间范围: ${formatDate(startDate)} 至 ${formatDate(endDate)}`)

      // 获取当前数据源类型
      const currentDataSource = localStorage.getItem('preferredDataSource') || 'tushare'

      const data = await tushareRequest(
        'daily',
        {
          ts_code: symbol,
          start_date: formatDate(startDate),
          end_date: formatDate(endDate),
        },
        0,
        currentDataSource
      )

      if (!data || !data.items || data.items.length === 0) {
        throw new Error('未获取到有效数据，请检查时间范围或股票代码')
      }

      const stockData = convertStockData(symbol, data)

      // 缓存数据
      cacheStockDaily(symbol, stockData)

      return stockData
    } catch (error) {
      logError(`获取股票 ${symbol} 数据失败:`, error)
      throw error
    }
  },

  // 搜索股票
  async searchStocks(query: string): Promise<Stock[]> {
    try {
      // 先获取所有股票
      const allStocks = await this.getStocks()

      // 在本地过滤
      return allStocks.filter(
        (stock) =>
          stock.symbol.toLowerCase().includes(query.toLowerCase()) ||
          stock.name.toLowerCase().includes(query.toLowerCase())
      )
    } catch (error) {
      console.error('搜索股票失败:', error)
      return []
    }
  },

  // 获取股票实时行情
  async getStockQuote(symbol: string, forceRefresh = false): Promise<StockQuote> {
    try {
      // 如果不强制刷新，尝试从缓存获取
      if (!forceRefresh) {
        const cachedQuote = getCachedStockQuote(symbol)
        if (cachedQuote) {
          log(`使用缓存的股票行情: ${symbol}`)
          return cachedQuote
        }
      }

      // 获取当前日期
      const today = new Date()
      const formatDate = (date: Date) => {
        return date.toISOString().split('T')[0].replace(/-/g, '')
      }

      // 获取当前数据源类型
      const currentDataSource = localStorage.getItem('preferredDataSource') || 'tushare'

      // 获取最近交易日数据
      const data = await tushareRequest(
        'daily',
        {
          ts_code: symbol,
          start_date: formatDate(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)), // 7天前
          end_date: formatDate(today),
        },
        0,
        currentDataSource
      )

      if (!data || !data.items || data.items.length === 0) {
        throw new Error('未获取到有效行情数据')
      }

      // 获取最新一天的数据
      const { fields, items } = data
      const latestData = items[0] // 假设数据是按日期降序排列的

      const dateIndex = fields.indexOf('trade_date')
      const openIndex = fields.indexOf('open')
      const closeIndex = fields.indexOf('close')
      const highIndex = fields.indexOf('high')
      const lowIndex = fields.indexOf('low')
      const preCloseIndex = fields.indexOf('pre_close')
      const changeIndex = fields.indexOf('change')
      const pctChgIndex = fields.indexOf('pct_chg')
      const volIndex = fields.indexOf('vol')
      const amountIndex = fields.indexOf('amount')

      // 获取股票基本信息
      const stockInfo = await this.getStockBySymbol(symbol)

      const stockQuote: StockQuote = {
        symbol,
        name: stockInfo?.name || '未知',
        price: parseFloat(latestData[closeIndex]),
        open: parseFloat(latestData[openIndex]),
        high: parseFloat(latestData[highIndex]),
        low: parseFloat(latestData[lowIndex]),
        close: parseFloat(latestData[closeIndex]),
        pre_close: parseFloat(latestData[preCloseIndex] || latestData[closeIndex]),
        change: changeIndex !== -1 ? parseFloat(latestData[changeIndex]) : 0,
        pct_chg: pctChgIndex !== -1 ? parseFloat(latestData[pctChgIndex]) : 0,
        vol: parseFloat(latestData[volIndex]),
        amount: parseFloat(latestData[amountIndex]),
        update_time: new Date().toISOString(),
      }

      // 缓存数据
      cacheStockQuote(symbol, stockQuote)

      return stockQuote
    } catch (error) {
      logError(`获取股票 ${symbol} 行情失败:`, error)
      throw error
    }
  },

  // 获取单个股票信息
  async getStockBySymbol(symbol: string): Promise<Stock | null> {
    try {
      // 先获取所有股票
      const allStocks = await this.getStocks()

      // 查找匹配的股票
      const stock = allStocks.find((s) => s.symbol === symbol)
      return stock || null
    } catch (error) {
      console.error(`获取股票 ${symbol} 信息失败:`, error)
      return null
    }
  },

  // 获取指数信息
  async getIndexInfo(indexCode: string, forceRefresh = false): Promise<any> {
    try {
      // 定义缓存键
      const cacheKey = `${INDEX_CACHE_PREFIX}info_${indexCode}`

      // 如果不强制刷新，尝试从缓存获取
      if (!forceRefresh) {
        const cachedData = getCachedData(cacheKey, CACHE_EXPIRE_MS)
        if (cachedData) {
          log(`使用缓存的指数信息: ${indexCode}`)
          return cachedData
        }
      }

      // 使用模拟数据，避免频繁API调用
      log(`使用模拟数据代替API调用: ${indexCode}`)

      // 模拟指数基本信息
      const mockIndexInfo: Record<string, any> = {
        '000001.SH': {
          code: '000001.SH',
          name: '上证指数',
          market: 'SZSE',
          publisher: '上海证券交易所',
          category: '综合指数',
          components: 1800,
        },
        '399001.SZ': {
          code: '399001.SZ',
          name: '深证成指',
          market: 'SZSE',
          publisher: '深圳证券交易所',
          category: '综合指数',
          components: 500,
        },
        '399006.SZ': {
          code: '399006.SZ',
          name: '创业板指',
          market: 'SZSE',
          publisher: '深圳证券交易所',
          category: '综合指数',
          components: 100,
        },
        '000016.SH': {
          code: '000016.SH',
          name: '上证50',
          market: 'SSE',
          publisher: '上海证券交易所',
          category: '规模指数',
          components: 50,
        },
        '000300.SH': {
          code: '000300.SH',
          name: '沪深300',
          market: 'SSE',
          publisher: '中证指数有限公司',
          category: '规模指数',
          components: 300,
        },
        '000905.SH': {
          code: '000905.SH',
          name: '中证500',
          market: 'SSE',
          publisher: '中证指数有限公司',
          category: '规模指数',
          components: 500,
        },
      }

      // 获取指定指数的信息，如果不存在则返回默认值
      const indexInfo = mockIndexInfo[indexCode] || {
        code: indexCode,
        name: `指数${indexCode}`,
        market: '未知',
        publisher: '未知',
        category: '未知',
        components: 0,
      }

      // 缓存数据
      cacheData(cacheKey, indexInfo, CACHE_EXPIRE_MS)

      return indexInfo

      /* 原始API调用代码，暂时注释掉
      // 获取指数基本信息
      const data = await tushareRequest('index_basic', {
        ts_code: indexCode,
        fields:
          'ts_code,name,market,publisher,category,base_date,base_point,list_date,weight_rule,desc,exp_date',
      })

      if (!data || !data.items || data.items.length === 0) {
        throw new Error(`未获取到指数 ${indexCode} 的基本信息`)
      }

      const { fields, items } = data
      const indexData = items[0]

      const nameIndex = fields.indexOf('name')
      const marketIndex = fields.indexOf('market')
      const publisherIndex = fields.indexOf('publisher')
      const categoryIndex = fields.indexOf('category')

      const indexInfo = {
        code: indexCode,
        name: indexData[nameIndex],
        market: indexData[marketIndex],
        publisher: indexData[publisherIndex],
        category: indexData[categoryIndex],
        components: 0, // 暂时无法获取成分股数量
      }

      // 缓存数据
      cacheData(cacheKey, indexInfo, CACHE_EXPIRE_MS)

      return indexInfo
      */
    } catch (error) {
      console.error(`获取指数 ${indexCode} 信息失败:`, error)
      return null
    }
  },

  // 获取指数行情
  async getIndexQuote(indexCode: string, forceRefresh = false): Promise<any> {
    try {
      // 定义缓存键
      const cacheKey = `${INDEX_CACHE_PREFIX}quote_${indexCode}`

      // 如果不强制刷新，尝试从缓存获取
      if (!forceRefresh) {
        const cachedData = getCachedData(cacheKey, QUOTE_CACHE_EXPIRE_MS)
        if (cachedData) {
          log(`使用缓存的指数行情: ${indexCode}`)
          return cachedData
        }
      }

      // 使用模拟数据，避免频繁API调用
      log(`使用模拟数据代替API调用: ${indexCode}`)

      // 模拟指数行情基础数据
      const baseValues: Record<string, number> = {
        '000001.SH': 3000,
        '399001.SZ': 10000,
        '399006.SZ': 2000,
        '000016.SH': 3000,
        '000300.SH': 4000,
        '000905.SH': 6000,
      }

      // 获取基础价格，如果没有预设则使用随机值
      const baseValue = baseValues[indexCode] || 2000 + Math.random() * 3000

      // 生成随机变动
      const change = Math.random() * 40 - 20 // -20 到 +20 的随机变动
      const close = baseValue + change
      const pctChg = (change / baseValue) * 100

      // 生成其他数据
      const open = close - Math.random() * 10
      const high = close + Math.random() * 15
      const low = close - Math.random() * 15
      const vol = Math.round(Math.random() * 100000000000)
      const amount = Math.round(Math.random() * 500000000000)

      // 构建行情数据
      const quoteData = {
        close,
        open,
        high,
        low,
        pre_close: baseValue,
        change,
        pct_chg: pctChg,
        vol,
        amount,
      }

      // 缓存数据
      cacheData(cacheKey, quoteData, QUOTE_CACHE_EXPIRE_MS)

      return quoteData

      /* 原始API调用代码，暂时注释掉
      // 获取当前日期
      const today = new Date()
      const formatDate = (date: Date) => {
        return date.toISOString().split('T')[0].replace(/-/g, '')
      }

      // 获取最近交易日数据
      const data = await tushareRequest('index_daily', {
        ts_code: indexCode,
        start_date: formatDate(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)), // 7天前
        end_date: formatDate(today),
      })

      if (!data || !data.items || data.items.length === 0) {
        throw new Error(`未获取到指数 ${indexCode} 的行情数据`)
      }

      // 获取最新一天的数据
      const { fields, items } = data
      const latestData = items[0] // 假设数据是按日期降序排列的

      const closeIndex = fields.indexOf('close')
      const openIndex = fields.indexOf('open')
      const highIndex = fields.indexOf('high')
      const lowIndex = fields.indexOf('low')
      const preCloseIndex = fields.indexOf('pre_close')
      const changeIndex = fields.indexOf('change')
      const pctChgIndex = fields.indexOf('pct_chg')
      const volIndex = fields.indexOf('vol')
      const amountIndex = fields.indexOf('amount')

      const quoteData = {
        close: parseFloat(latestData[closeIndex]),
        open: parseFloat(latestData[openIndex]),
        high: parseFloat(latestData[highIndex]),
        low: parseFloat(latestData[lowIndex]),
        pre_close: parseFloat(latestData[preCloseIndex] || latestData[closeIndex]),
        change: changeIndex !== -1 ? parseFloat(latestData[changeIndex]) : 0,
        pct_chg: pctChgIndex !== -1 ? parseFloat(latestData[pctChgIndex]) : 0,
        vol: parseFloat(latestData[volIndex]),
        amount: parseFloat(latestData[amountIndex]),
      }

      // 缓存数据
      cacheData(cacheKey, quoteData, QUOTE_CACHE_EXPIRE_MS)

      return quoteData
      */
    } catch (error) {
      console.error(`获取指数 ${indexCode} 行情失败:`, error)
      return null
    }
  },

  // 获取行业板块列表
  async getSectorList(forceRefresh = false): Promise<any[]> {
    try {
      // 如果不强制刷新，尝试从缓存获取
      if (!forceRefresh) {
        const cachedData = getCachedSectorList()
        if (cachedData) {
          log(`使用缓存的行业板块列表`)
          return cachedData
        }
      }

      // 使用模拟数据，避免频繁API调用
      log(`使用模拟数据代替API调用: 行业板块列表`)

      // 模拟行业板块列表
      const mockSectors = [
        { code: '801010', name: '农林牧渔' },
        { code: '801020', name: '采掘' },
        { code: '801030', name: '化工' },
        { code: '801040', name: '钢铁' },
        { code: '801050', name: '有色金属' },
        { code: '801080', name: '电子' },
        { code: '801110', name: '家用电器' },
        { code: '801120', name: '食品饮料' },
        { code: '801130', name: '纺织服装' },
        { code: '801150', name: '医药生物' },
        { code: '801160', name: '公用事业' },
        { code: '801170', name: '交通运输' },
        { code: '801180', name: '房地产' },
        { code: '801200', name: '商业贸易' },
        { code: '801210', name: '休闲服务' },
        { code: '801230', name: '综合' },
        { code: '801710', name: '建筑材料' },
        { code: '801720', name: '建筑装饰' },
        { code: '801730', name: '电气设备' },
        { code: '801740', name: '国防军工' },
        { code: '801750', name: '计算机' },
        { code: '801760', name: '传媒' },
        { code: '801770', name: '通信' },
        { code: '801780', name: '银行' },
        { code: '801790', name: '非银金融' },
        { code: '801880', name: '汽车' },
        { code: '801890', name: '机械设备' },
      ]

      // 缓存数据
      cacheSectorList(mockSectors)

      return mockSectors

      /* 原始API调用代码，暂时注释掉
      // 获取行业板块列表
      const data = await tushareRequest('index_classify', {
        level: 'L1',
        src: 'SW', // 申万行业分类
      })

      if (!data || !data.items || data.items.length === 0) {
        throw new Error('未获取到行业板块列表')
      }

      const { fields, items } = data
      const indexCodeIndex = fields.indexOf('index_code')
      const indexNameIndex = fields.indexOf('industry_name')

      const sectorList = items.map((item: any) => ({
        code: item[indexCodeIndex],
        name: item[indexNameIndex],
      }))

      // 缓存数据
      cacheSectorList(sectorList)

      return sectorList
      */
    } catch (error) {
      console.error('获取行业板块列表失败:', error)
      return []
    }
  },

  // 获取行业板块行情
  async getSectorQuote(sectorCode: string, forceRefresh = false): Promise<any> {
    try {
      // 定义缓存键
      const CACHE_KEY = `sector_quote_${sectorCode}`
      const CACHE_EXPIRY = 5 * 60 * 1000 // 5分钟缓存

      // 如果不强制刷新，尝试从缓存获取
      if (!forceRefresh) {
        try {
          const cachedData = localStorage.getItem(CACHE_KEY)
          if (cachedData) {
            const { data, timestamp } = JSON.parse(cachedData)
            const now = new Date().getTime()

            // 检查缓存是否过期
            if (now - timestamp < CACHE_EXPIRY) {
              log(`使用缓存的行业板块行情: ${sectorCode}`)
              return data
            }
          }
        } catch (cacheError) {
          console.warn('读取缓存数据失败:', cacheError)
        }
      }

      // 由于Tushare没有直接提供行业板块行情，这里模拟一个
      const quoteData = {
        change: Math.random() * 2 - 1,
        pct_chg: Math.random() * 3 - 1.5,
        vol: Math.round(Math.random() * 20000000000),
        amount: Math.round(Math.random() * 100000000000),
      }

      // 缓存数据
      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            data: quoteData,
            timestamp: new Date().getTime(),
          })
        )
      } catch (cacheError) {
        console.warn('缓存行业板块行情数据失败:', cacheError)
      }

      return quoteData
    } catch (error) {
      console.error(`获取行业板块 ${sectorCode} 行情失败:`, error)
      return null
    }
  },

  // 获取行业内领涨/领跌股票
  async getSectorLeadingStocks(
    sectorCode: string,
    type: 'up' | 'down',
    count: number = 5
  ): Promise<any[]> {
    try {
      // 由于Tushare没有直接提供行业内领涨/领跌股票，这里模拟一些
      const upStocks = [
        { symbol: '600519.SH', name: '贵州茅台', changePercent: Math.random() * 5 },
        { symbol: '000858.SZ', name: '五粮液', changePercent: Math.random() * 4.5 },
        { symbol: '601318.SH', name: '中国平安', changePercent: Math.random() * 4 },
        { symbol: '600036.SH', name: '招商银行', changePercent: Math.random() * 3.5 },
        { symbol: '000333.SZ', name: '美的集团', changePercent: Math.random() * 3 },
      ]

      const downStocks = [
        { symbol: '601398.SH', name: '工商银行', changePercent: Math.random() * -3 },
        { symbol: '601288.SH', name: '农业银行', changePercent: Math.random() * -2.5 },
        { symbol: '600887.SH', name: '伊利股份', changePercent: Math.random() * -2 },
        { symbol: '000568.SZ', name: '泸州老窖', changePercent: Math.random() * -1.5 },
        { symbol: '600276.SH', name: '恒瑞医药', changePercent: Math.random() * -1 },
      ]

      return type === 'up' ? upStocks.slice(0, count) : downStocks.slice(0, count)
    } catch (error) {
      console.error(`获取行业 ${sectorCode} ${type === 'up' ? '领涨' : '领跌'}股票失败:`, error)
      return []
    }
  },

  // 获取市场宽度数据
  async getMarketBreadth(forceRefresh = false): Promise<any> {
    try {
      // 定义缓存键
      const CACHE_KEY = 'market_breadth_data'
      const CACHE_EXPIRY = 5 * 60 * 1000 // 5分钟缓存

      // 如果不强制刷新，尝试从缓存获取
      if (!forceRefresh) {
        try {
          const cachedData = localStorage.getItem(CACHE_KEY)
          if (cachedData) {
            const { data, timestamp } = JSON.parse(cachedData)
            const now = new Date().getTime()

            // 检查缓存是否过期
            if (now - timestamp < CACHE_EXPIRY) {
              log('使用缓存的市场宽度数据')
              return data
            }
          }
        } catch (cacheError) {
          console.warn('读取缓存数据失败:', cacheError)
        }
      }

      // 由于Tushare没有直接提供市场宽度数据，这里模拟一个
      const totalStocks = 4000
      const upCount = Math.round(Math.random() * totalStocks * 0.6)
      const downCount = Math.round(Math.random() * totalStocks * 0.4)
      const unchangedCount = totalStocks - upCount - downCount

      const totalVolume = Math.round(Math.random() * 500000000000)
      const upVolume = Math.round(totalVolume * (upCount / totalStocks) * (1 + Math.random() * 0.3))
      const downVolume = totalVolume - upVolume

      const breadthData = {
        up_count: upCount,
        down_count: downCount,
        unchanged_count: unchangedCount,
        new_high: Math.round(Math.random() * 100),
        new_low: Math.round(Math.random() * 50),
        up_vol: upVolume,
        down_vol: downVolume,
      }

      // 缓存数据
      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            data: breadthData,
            timestamp: new Date().getTime(),
          })
        )
      } catch (cacheError) {
        console.warn('缓存市场宽度数据失败:', cacheError)
      }

      return breadthData
    } catch (error) {
      console.error('获取市场宽度数据失败:', error)
      return null
    }
  },

  // 获取财经新闻
  async getFinancialNews(count: number = 5, forceRefresh = false): Promise<FinancialNews[]> {
    try {
      // 如果不强制刷新，尝试从缓存获取
      if (!forceRefresh) {
        const cachedNews = getCachedNews()
        if (cachedNews) {
          log(`使用缓存的财经新闻`)
          return cachedNews.slice(0, count)
        }
      }

      // 由于Tushare没有直接提供财经新闻，这里模拟一些
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
          content: '今日A股市场，科技板块表现强势，全线上涨。其中，半导体行业领涨，多只个股涨停。',
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

      // 缓存新闻数据
      cacheNews(shuffledNews)

      // 返回指定数量的新闻
      return shuffledNews.slice(0, count)
    } catch (error) {
      logError('获取财经新闻失败:', error)
      return []
    }
  },
}
