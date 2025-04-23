import axios from 'axios'
import type { Stock, StockData } from '@/types/stock'

// Tushare API 配置
const TUSHARE_API_URL = 'https://api.tushare.pro'
const TOKEN = '983b25aa025eee598034c4741dc776dd73356ddc53ddcffbb180cf61'

// 调试模式 - 开启可以看到更多日志
const DEBUG_MODE = true

// 缓存配置
const STOCK_BASIC_CACHE_KEY = 'tushare_stock_basic_cache'
const CACHE_EXPIRE_MS = 24 * 60 * 60 * 1000 // 24小时

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

// Tushare API 请求函数
async function tushareRequest(api_name: string, params: any = {}, retryCount = 0): Promise<any> {
  try {
    // 检查请求频率限制
    await checkRateLimit(api_name)

    log(`正在请求 Tushare API: ${api_name}，参数:`, params)
    log(`请求URL: ${TUSHARE_API_URL}`)

    const requestData = {
      api_name,
      token: TOKEN,
      params,
    }

    log('请求数据:', JSON.stringify(requestData))

    const response = await axios.post(TUSHARE_API_URL, requestData, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/plain, */*',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
        Referer: 'http://localhost:5173/',
        'sec-ch-ua': '"Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
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
      log(`Tushare API ${api_name} 请求成功，获取到 ${response.data.data.items.length} 条数据`)
      return {
        fields: response.data.data.fields,
        items: response.data.data.items,
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
        error.response.data,
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
function getCachedStockBasic(): Stock[] | null {
  const cached = localStorage.getItem(STOCK_BASIC_CACHE_KEY)
  if (!cached) return null

  try {
    const { data, timestamp } = JSON.parse(cached)
    const isExpired = Date.now() - timestamp > CACHE_EXPIRE_MS
    return isExpired ? null : data
  } catch (e) {
    logError('解析缓存数据失败:', e)
    return null
  }
}

function cacheStockBasic(data: Stock[]): void {
  try {
    const cacheData = {
      data,
      timestamp: Date.now()
    }
    localStorage.setItem(STOCK_BASIC_CACHE_KEY, JSON.stringify(cacheData))
    log('股票基础数据已缓存')
  } catch (e) {
    logError('缓存股票基础数据失败:', e)
  }
}

// Tushare 服务
export const tushareService = {
  // 获取股票列表
  async getStocks(): Promise<Stock[]> {
    // 尝试从缓存获取
    const cachedData = getCachedStockBasic()
    if (cachedData) {
      log('从缓存获取股票基础数据')
      return cachedData
    }

    try {
      const data = await tushareRequest('stock_basic', {
        exchange: '',
        list_status: 'L',
        fields: 'ts_code,name,industry,market,list_date',
      })
      const stocks = convertStockList(data)
      cacheStockBasic(stocks)
      return stocks
    } catch (error) {
      logError('获取股票列表失败:', error)
      return []
    }
  },

  // 获取单个股票数据
  async getStockData(symbol: string, days = 90): Promise<StockData> {
    try {
      // 限制最大查询范围为90天
      if (days > 90) {
        console.warn('请求时间范围超过90天，已自动调整为90天')
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

      console.log(`请求股票数据: ${symbol}, 时间范围: ${formatDate(startDate)} 至 ${formatDate(endDate)}`)

      const data = await tushareRequest('daily', {
        ts_code: symbol,
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
      })

      if (!data || !data.items || data.items.length === 0) {
        throw new Error('未获取到有效数据，请检查时间范围或股票代码')
      }

      return convertStockData(symbol, data)
    } catch (error) {
      console.error(`获取股票 ${symbol} 数据失败:`, error)
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
          stock.name.toLowerCase().includes(query.toLowerCase()),
      )
    } catch (error) {
      console.error('搜索股票失败:', error)
      return []
    }
  },
}
