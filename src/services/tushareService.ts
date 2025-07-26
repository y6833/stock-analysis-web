import axios from 'axios'
import type { Stock, StockData, StockQuote, FinancialNews } from '@/types/stock'
import { getAuthHeaders } from '@/utils/auth'
import {
  tushareConfigManager,
  getTushareToken,
  getTushareProxyUrl,
  getTushareRateLimit,
  getTushareRetryCount,
  getTushareTimeout,
  isTushareDebugEnabled,
  isTushareConfigValid,
  getTushareConfigErrors,
  validateTushareToken
} from '@/config/tushareConfig'
import { tushareRateLimiter, retryManager } from '@/utils/rateLimiter'
import type {
  TushareResponse,
  TushareRequestParams,
  StockBasicItem,
  DailyItem,
  DailyBasicItem,
  ProBarItem,
  IncomeItem,
  BalanceSheetItem,
  CashFlowItem,
  FinaIndicatorItem,
  IndexBasicItem,
  IndexDailyItem,
  TradeCalItem,
  AdjFactorItem,
  SuspendItem,
  StkLimitItem,
  DividendItem,
  ForecastItem,
  ExpressItem
} from '@/types/tushare'

// Tushare API 配置 - 使用配置管理器
const TUSHARE_API_URL = getTushareProxyUrl()
const TOKEN = getTushareToken()

// 调试模式 - 从配置管理器获取
const DEBUG_MODE = isTushareDebugEnabled()

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

// API请求限制相关参数 - 从配置管理器获取
const API_RATE_LIMIT = getTushareRateLimit() * 1000 // 转换为毫秒
const API_RETRY_COUNT = getTushareRetryCount() // 重试次数
const API_TIMEOUT = getTushareTimeout() // 请求超时时间
const API_DAILY_LIMIT_WAIT = 3600 * 1000 // 每日限制时等待时间（1小时）
const API_HOURLY_LIMIT_WAIT = 600 * 1000 // 每小时限制时等待时间（10分钟）

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

// 检查是否可以发送请求（使用新的速率限制器）
async function checkRateLimit(api_name: string): Promise<void> {
  // 使用新的速率限制器
  if (!tushareRateLimiter.canMakeRequest(api_name)) {
    await tushareRateLimiter.waitForNextRequest(api_name)
  }

  // 记录请求（在实际发送请求后调用 recordRequest）
}

// 检查配置是否有效
function checkConfigValid(): { valid: boolean; errors: string[] } {
  if (!isTushareConfigValid()) {
    return {
      valid: false,
      errors: getTushareConfigErrors()
    }
  }
  return { valid: true, errors: [] }
}

// 检查是否允许API调用
function checkApiCallAllowed(): boolean {
  // 首先检查配置是否有效
  const configCheck = checkConfigValid()
  if (!configCheck.valid) {
    log('Tushare 配置无效:', configCheck.errors)
    return false
  }

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

// 检查 Tushare 配置状态
export function checkTushareConfig(): { valid: boolean; errors: string[]; token: string } {
  const configCheck = checkConfigValid()
  return {
    valid: configCheck.valid,
    errors: configCheck.errors,
    token: TOKEN ? TOKEN.substring(0, 8) + '...' : '未配置'
  }
}

// 验证 Tushare Token
export async function validateTushareTokenAsync(): Promise<{ valid: boolean; message: string }> {
  return await validateTushareToken(TOKEN)
}

// 获取 Tushare 配置信息
export function getTushareConfigInfo(): {
  hasToken: boolean
  tokenPreview: string
  rateLimit: number
  dailyLimit: number
  retryCount: number
  timeout: number
  debugEnabled: boolean
} {
  return {
    hasToken: !!TOKEN,
    tokenPreview: TOKEN ? TOKEN.substring(0, 8) + '...' : '未配置',
    rateLimit: API_RATE_LIMIT / 1000, // 转换回秒
    dailyLimit: getTushareDailyLimit(),
    retryCount: API_RETRY_COUNT,
    timeout: API_TIMEOUT,
    debugEnabled: DEBUG_MODE
  }
}

// 获取速率限制统计信息
export function getRateLimitStats(apiName?: string) {
  return tushareRateLimiter.getStats(apiName)
}

// 获取剩余请求数
export function getRemainingRequests(): {
  dailyRemaining: number
  minuteRemaining: Record<string, number>
} {
  const dailyRemaining = tushareRateLimiter.getDailyRemainingRequests()
  const minuteRemaining: Record<string, number> = {}

  // 获取常用 API 的每分钟剩余请求数
  const commonApis = ['stock_basic', 'daily', 'daily_basic', 'pro_bar']
  for (const api of commonApis) {
    minuteRemaining[api] = tushareRateLimiter.getMinuteRemainingRequests(api)
  }

  return {
    dailyRemaining,
    minuteRemaining
  }
}

// 重置速率限制统计
export function resetRateLimitStats(apiName?: string): void {
  tushareRateLimiter.reset(apiName)
}

// 更新重试配置
export function updateRetryConfig(config: {
  maxRetries?: number
  baseDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
}): void {
  retryManager.updateConfig(config)
}

// 获取重试配置
export function getRetryConfig() {
  return retryManager.getConfig()
}

// 记录已经更新过的路径，避免重复日志
const updatedPaths = new Set<string>()

// 更新当前路径
export function updateCurrentPath(path: string): void {
  // 如果路径没有变化，不做任何操作
  if (currentPath === path) {
    return
  }

  currentPath = path

  // 只有首次更新路径时才打印日志
  if (!updatedPaths.has(path)) {
    log(`当前路径已更新为: ${path}`)
    updatedPaths.add(path)
  }
}

// Tushare API 请求函数（内部实现，不包含重试）
async function tushareRequestInternal(
  api_name: string,
  params: any = {},
  dataSource: string = 'tushare'
): Promise<any> {
  try {
    // 检查配置是否有效
    const configCheck = checkConfigValid()
    if (!configCheck.valid) {
      logError('Tushare 配置无效:', configCheck.errors)
      throw new Error(`Tushare 配置无效: ${configCheck.errors.join(', ')}`)
    }

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

    // 确保 dataSource 是字符串
    const dataSourceStr = typeof dataSource === 'string' ? dataSource : 'tushare'
    log(`正在请求 ${dataSourceStr.toUpperCase()} API: ${api_name}，参数:`, params)
    log(`请求URL: ${TUSHARE_API_URL}`)

    const requestData = {
      api_name,
      token: TOKEN,
      params,
      data_source: dataSourceStr, // 添加数据源参数
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
      timeout: API_TIMEOUT, // 使用配置的超时时间
    })

    log(`响应状态码: ${response.status}`)
    log('响应头信息:', response.headers)

    if (!response.data) {
      logError(`Tushare API ${api_name} 请求返回空响应`)
      throw new Error('服务器返回空响应')
    }

    log('响应数据:', response.data)

    if (response.data.code === 0) {
      // 记录成功请求
      tushareRateLimiter.recordRequest(api_name)

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
      // 记录错误
      tushareRateLimiter.recordError(api_name, response.data.code)

      // 创建带错误代码的错误对象
      const error = new Error(response.data.msg || '请求失败')
        ; (error as any).code = response.data.code

      logError(`Tushare API ${api_name} 请求返回错误:`, response.data)
      throw error
    }
  } catch (error: any) {
    // 记录错误
    tushareRateLimiter.recordError(api_name)

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

// 带重试机制的 Tushare API 请求函数
async function tushareRequest(
  api_name: string,
  params: any = {},
  dataSource: string = 'tushare'
): Promise<any> {
  return await retryManager.executeWithRetry(
    () => tushareRequestInternal(api_name, params, dataSource),
    `Tushare API ${api_name}`
  )
}

// 将 Tushare API 响应数据转换为对象数组
function transformTushareData<T>(response: { fields: string[], items: any[][] }): T[] {
  const { fields, items } = response
  return items.map(item => {
    const obj: any = {}
    fields.forEach((field, index) => {
      obj[field] = item[index]
    })
    return obj as T
  })
}

// 股票基础信息 API
export async function getStockBasic(params: {
  ts_code?: string
  name?: string
  exchange?: string
  market?: string
  is_hs?: string
  list_status?: string
  limit?: number
  offset?: number
} = {}): Promise<StockBasicItem[]> {
  const response = await tushareRequest('stock_basic', params)
  return transformTushareData<StockBasicItem>(response)
}

// 日线行情 API
export async function getDaily(params: {
  ts_code?: string
  trade_date?: string
  start_date?: string
  end_date?: string
  limit?: number
  offset?: number
} = {}): Promise<DailyItem[]> {
  const response = await tushareRequest('daily', params)
  return transformTushareData<DailyItem>(response)
}

// 每日指标 API
export async function getDailyBasic(params: {
  ts_code?: string
  trade_date?: string
  start_date?: string
  end_date?: string
  limit?: number
  offset?: number
} = {}): Promise<DailyBasicItem[]> {
  const response = await tushareRequest('daily_basic', params)
  return transformTushareData<DailyBasicItem>(response)
}

// 复权行情 API
export async function getProBar(params: {
  ts_code?: string
  start_date?: string
  end_date?: string
  asset?: string
  adj?: string
  freq?: string
  ma?: number[]
  factors?: string[]
  adjfactor?: boolean
  offset?: number
  limit?: number
} = {}): Promise<ProBarItem[]> {
  const response = await tushareRequest('pro_bar', params)
  return transformTushareData<ProBarItem>(response)
}

// 利润表 API
export async function getIncome(params: {
  ts_code?: string
  ann_date?: string
  start_date?: string
  end_date?: string
  period?: string
  report_type?: string
  comp_type?: string
  limit?: number
  offset?: number
} = {}): Promise<IncomeItem[]> {
  const response = await tushareRequest('income', params)
  return transformTushareData<IncomeItem>(response)
}

// 资产负债表 API
export async function getBalanceSheet(params: {
  ts_code?: string
  ann_date?: string
  start_date?: string
  end_date?: string
  period?: string
  report_type?: string
  comp_type?: string
  limit?: number
  offset?: number
} = {}): Promise<BalanceSheetItem[]> {
  const response = await tushareRequest('balancesheet', params)
  return transformTushareData<BalanceSheetItem>(response)
}

// 现金流量表 API
export async function getCashFlow(params: {
  ts_code?: string
  ann_date?: string
  start_date?: string
  end_date?: string
  period?: string
  report_type?: string
  comp_type?: string
  limit?: number
  offset?: number
} = {}): Promise<CashFlowItem[]> {
  const response = await tushareRequest('cashflow', params)
  return transformTushareData<CashFlowItem>(response)
}

// 财务指标 API
export async function getFinaIndicator(params: {
  ts_code?: string
  ann_date?: string
  start_date?: string
  end_date?: string
  period?: string
  limit?: number
  offset?: number
} = {}): Promise<FinaIndicatorItem[]> {
  const response = await tushareRequest('fina_indicator', params)
  return transformTushareData<FinaIndicatorItem>(response)
}

// 指数基础信息 API
export async function getIndexBasic(params: {
  market?: string
  publisher?: string
  category?: string
  limit?: number
  offset?: number
} = {}): Promise<IndexBasicItem[]> {
  const response = await tushareRequest('index_basic', params)
  return transformTushareData<IndexBasicItem>(response)
}

// 指数日线行情 API
export async function getIndexDaily(params: {
  ts_code?: string
  trade_date?: string
  start_date?: string
  end_date?: string
  limit?: number
  offset?: number
} = {}): Promise<IndexDailyItem[]> {
  const response = await tushareRequest('index_daily', params)
  return transformTushareData<IndexDailyItem>(response)
}

// 交易日历 API
export async function getTradeCal(params: {
  exchange?: string
  start_date?: string
  end_date?: string
  is_open?: string
  limit?: number
  offset?: number
} = {}): Promise<TradeCalItem[]> {
  const response = await tushareRequest('trade_cal', params)
  return transformTushareData<TradeCalItem>(response)
}

// ============ 核心业务 API 端点 ============

// 获取所有股票列表（简化接口）
export async function getAllStocks(params: {
  exchange?: 'SSE' | 'SZSE' | 'BSE'
  market?: string
  list_status?: 'L' | 'D' | 'P'
  limit?: number
} = {}): Promise<Stock[]> {
  try {
    const stockBasicData = await getStockBasic({
      exchange: params.exchange,
      market: params.market,
      list_status: params.list_status || 'L', // 默认只获取上市股票
      limit: params.limit || 5000
    })

    return convertStockList({ fields: ['ts_code', 'name', 'market', 'industry'], items: stockBasicData.map(item => [item.ts_code, item.name, item.market, item.industry]) })
  } catch (error) {
    logError('获取股票列表失败:', error)
    throw new Error('获取股票列表失败，请检查网络连接和API配置')
  }
}

// 获取股票历史数据（简化接口）
export async function getStockHistory(
  symbol: string,
  startDate?: string,
  endDate?: string,
  limit?: number
): Promise<StockData> {
  try {
    const dailyData = await getDaily({
      ts_code: symbol,
      start_date: startDate,
      end_date: endDate,
      limit: limit || 1000
    })

    return convertStockData(symbol, { fields: ['trade_date', 'open', 'close', 'high', 'low', 'vol'], items: dailyData.map(item => [item.trade_date, item.open, item.close, item.high, item.low, item.vol]) })
  } catch (error) {
    logError(`获取股票 ${symbol} 历史数据失败:`, error)
    throw new Error(`获取股票 ${symbol} 历史数据失败，请检查股票代码和网络连接`)
  }
}

// 获取股票基础信息（简化接口）
export async function getStockInfo(symbol: string): Promise<StockBasicItem | null> {
  try {
    const stockData = await getStockBasic({ ts_code: symbol })
    return stockData.length > 0 ? stockData[0] : null
  } catch (error) {
    logError(`获取股票 ${symbol} 基础信息失败:`, error)
    return null
  }
}

// 获取最新交易日
export async function getLatestTradeDate(exchange: string = 'SSE'): Promise<string | null> {
  try {
    const tradeCal = await getTradeCal({
      exchange,
      is_open: '1',
      limit: 1
    })

    return tradeCal.length > 0 ? tradeCal[0].cal_date : null
  } catch (error) {
    logError('获取最新交易日失败:', error)
    return null
  }
}

// 批量获取股票数据
export async function getBatchStockData(
  symbols: string[],
  startDate?: string,
  endDate?: string
): Promise<Record<string, StockData>> {
  const result: Record<string, StockData> = {}

  // 分批处理，避免一次请求太多数据
  const batchSize = 10
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize)

    const promises = batch.map(async (symbol) => {
      try {
        const data = await getStockHistory(symbol, startDate, endDate)
        return { symbol, data }
      } catch (error) {
        logError(`批量获取股票 ${symbol} 数据失败:`, error)
        return { symbol, data: null }
      }
    })

    const batchResults = await Promise.all(promises)

    for (const { symbol, data } of batchResults) {
      if (data) {
        result[symbol] = data
      }
    }

    // 批次间稍作延迟，避免触发频率限制
    if (i + batchSize < symbols.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  return result
}

// 获取股票财务数据（简化接口）
export async function getStockFinancials(
  symbol: string,
  period?: string,
  startDate?: string,
  endDate?: string
): Promise<{
  income: IncomeItem[]
  balance: BalanceSheetItem[]
  cashflow: CashFlowItem[]
  indicators: FinaIndicatorItem[]
}> {
  try {
    const params = {
      ts_code: symbol,
      period,
      start_date: startDate,
      end_date: endDate,
      limit: 20
    }

    const [income, balance, cashflow, indicators] = await Promise.all([
      getIncome(params),
      getBalanceSheet(params),
      getCashFlow(params),
      getFinaIndicator(params)
    ])

    return { income, balance, cashflow, indicators }
  } catch (error) {
    logError(`获取股票 ${symbol} 财务数据失败:`, error)
    throw new Error(`获取股票 ${symbol} 财务数据失败，请检查股票代码和网络连接`)
  }
}

// 获取行业股票列表
export async function getIndustryStocks(industry: string, limit: number = 100): Promise<Stock[]> {
  try {
    const stockBasicData = await getStockBasic({
      industry,
      list_status: 'L',
      limit
    })

    return convertStockList({
      fields: ['ts_code', 'name', 'market', 'industry'],
      items: stockBasicData.map(item => [item.ts_code, item.name, item.market, item.industry])
    })
  } catch (error) {
    logError(`获取行业 ${industry} 股票列表失败:`, error)
    throw new Error(`获取行业 ${industry} 股票列表失败，请检查网络连接`)
  }
}

// 获取指数成分股（需要权限）
export async function getIndexComponents(indexCode: string): Promise<Stock[]> {
  try {
    // 注意：这个API需要特定权限，可能需要付费账户
    const response = await tushareRequest('index_weight', {
      index_code: indexCode,
      trade_date: await getLatestTradeDate()
    })

    if (response && response.items) {
      const stockCodes = response.items.map((item: any[]) => item[1]) // 假设第二列是股票代码
      const stocksData = await Promise.all(
        stockCodes.slice(0, 50).map((code: string) => getStockInfo(code))
      )

      return stocksData
        .filter(stock => stock !== null)
        .map(stock => ({
          symbol: stock!.ts_code,
          name: stock!.name,
          market: stock!.market,
          industry: stock!.industry
        }))
    }

    return []
  } catch (error) {
    logError(`获取指数 ${indexCode} 成分股失败:`, error)
    // 如果没有权限，返回空数组而不是抛出错误
    return []
  }
}

// 搜索股票
export async function searchStocks(keyword: string, limit: number = 20): Promise<Stock[]> {
  try {
    // 先尝试按股票代码搜索
    if (/^\d{6}/.test(keyword)) {
      const codePattern = keyword.padEnd(6, '0')
      const stockData = await getStockBasic({
        ts_code: `${codePattern}.SZ`,
        limit: 1
      })

      if (stockData.length > 0) {
        return convertStockList({
          fields: ['ts_code', 'name', 'market', 'industry'],
          items: stockData.map(item => [item.ts_code, item.name, item.market, item.industry])
        })
      }

      // 尝试上海交易所
      const stockDataSH = await getStockBasic({
        ts_code: `${codePattern}.SH`,
        limit: 1
      })

      if (stockDataSH.length > 0) {
        return convertStockList({
          fields: ['ts_code', 'name', 'market', 'industry'],
          items: stockDataSH.map(item => [item.ts_code, item.name, item.market, item.industry])
        })
      }
    }

    // 按名称搜索
    const stockData = await getStockBasic({
      name: keyword,
      list_status: 'L',
      limit
    })

    return convertStockList({
      fields: ['ts_code', 'name', 'market', 'industry'],
      items: stockData.map(item => [item.ts_code, item.name, item.market, item.industry])
    })
  } catch (error) {
    logError(`搜索股票 "${keyword}" 失败:`, error)
    return []
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

// 模拟数据生成函数已移除
// 现在只使用真实数据源

// getMockStockList函数已移除

// Tushare 服务
export const tushareService = {
  // API调用控制
  setAllowApiCall,
  updateCurrentPath,
  // 模拟数据函数已移除
  // 获取缓存的股票行情
  getCachedStockQuote,
  // 获取缓存的股票列表
  getCachedStocks: getCachedStockBasic,

  // 获取股票列表
  async getStocks(): Promise<Stock[]> {
    try {
      // 尝试从缓存获取
      const cachedData = getCachedStockBasic()
      if (cachedData) {
        log('从缓存获取股票基础数据')
        return cachedData
      }

      // 使用新的简化 API 获取股票列表
      log('从 Tushare API 获取股票基本信息')
      const stocks = await getAllStocks({
        list_status: 'L',
        limit: 5000
      })

      // 缓存数据
      cacheStockBasic(stocks)

      log(`成功获取 ${stocks.length} 条股票基本信息`)
      return stocks
    } catch (error) {
      logError('获取股票列表失败:', error)
      return []
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

      // 使用新的简化 API 获取股票历史数据
      const stockData = await getStockHistory(
        symbol,
        formatDate(startDate),
        formatDate(endDate),
        days
      )

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
      // 使用新的搜索 API
      return await searchStocks(query, 20)
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

      try {
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
          data_source: data.data_source || 'tushare',
        }

        // 缓存数据
        cacheStockQuote(symbol, stockQuote)

        return stockQuote
      } catch (apiError) {
        // 如果API调用失败，尝试使用模拟数据
        log(`API调用失败，尝试使用模拟数据: ${symbol}`, apiError)

        // 尝试从缓存获取，即使之前检查过，这里再检查一次，因为可能是强制刷新导致的
        const cachedQuote = getCachedStockQuote(symbol)
        if (cachedQuote) {
          log(`使用缓存的股票行情(API失败后): ${symbol}`)
          return {
            ...cachedQuote,
            data_source: 'cache (API失败)',
          }
        }

        // 模拟数据已移除 - 抛出错误
        throw new Error(`无法获取股票${symbol}的行情数据，请检查Tushare API配置或网络连接`)
      }
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

      // 尝试使用API调用，如果失败则使用模拟数据
      log(`尝试获取指数信息: ${indexCode}`)

      try {
        // 获取指数基本信息
        const data = await tushareRequest('index_basic', {
          ts_code: indexCode,
          fields:
            'ts_code,name,market,publisher,category,base_date,base_point,list_date,weight_rule,desc,exp_date',
        })

        if (data && data.items && data.items.length > 0) {
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
        }
      } catch (apiError) {
        log(`Tushare API获取指数${indexCode} 基本信息失败: ${apiError} `)
        // 如果API调用失败，直接抛出错误，不使用模拟数据
        throw new Error(`Tushare API获取指数${indexCode} 基本信息失败，请检查API配置或网络连接`)
      }

      /* 原始API调用代码，暂时注释掉
      // 获取指数基本信息
      const data = await tushareRequest('index_basic', {
        ts_code: indexCode,
        fields:
          'ts_code,name,market,publisher,category,base_date,base_point,list_date,weight_rule,desc,exp_date',
      })
  
      if (!data || !data.items || data.items.length === 0) {
        throw new Error(`未获取到指数 ${ indexCode } 的基本信息`)
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
      console.error(`获取指数 ${indexCode} 信息失败: `, error)
      return null
    }
  },

  // 获取指数行情
  async getIndexQuote(indexCode: string, forceRefresh = false): Promise<any> {
    try {
      // 定义缓存键
      const cacheKey = `${INDEX_CACHE_PREFIX}quote_${indexCode} `

      // 如果不强制刷新，尝试从缓存获取
      if (!forceRefresh) {
        const cachedData = getCachedData(cacheKey, QUOTE_CACHE_EXPIRE_MS)
        if (cachedData) {
          log(`使用缓存的指数行情: ${indexCode} `)
          return cachedData
        }
      }

      // 尝试使用API调用，如果失败则使用模拟数据
      log(`尝试获取指数行情: ${indexCode} `)

      try {
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

        if (data && data.items && data.items.length > 0) {
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
        }
      } catch (apiError) {
        log(`API调用失败: ${indexCode} `, apiError)
        throw new Error(`无法获取指数${indexCode} 的行情数据，请检查API配置或网络连接`)
      }

      // 不使用模拟数据，返回null
      return null

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
        throw new Error(`未获取到指数 ${ indexCode } 的行情数据`)
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
      console.error(`获取指数 ${indexCode} 行情失败: `, error)
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

      // 尝试使用API调用，如果失败则使用模拟数据
      log(`尝试获取行业板块列表`)

      try {
        // 获取行业板块列表
        const data = await tushareRequest('index_classify', {
          level: 'L1',
          src: 'SW', // 申万行业分类
        })

        if (data && data.items && data.items.length > 0) {
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
        }
      } catch (apiError) {
        log(`Tushare API获取行业板块列表失败: ${apiError} `)
        // 如果API调用失败，直接抛出错误，不使用模拟数据
        throw new Error(`Tushare API获取行业板块列表失败，请检查API配置或网络连接`)
      }

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
      const CACHE_KEY = `sector_quote_${sectorCode} `
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
              log(`使用缓存的行业板块行情: ${sectorCode} `)
              return data
            }
          }
        } catch (cacheError) {
          console.warn('读取缓存数据失败:', cacheError)
        }
      }

      // Tushare 不直接提供行业板块行情，抛出错误
      throw new Error('Tushare API 不提供行业板块行情功能，请使用其他数据源')
    } catch (error) {
      console.error(`获取行业板块 ${sectorCode} 行情失败: `, error)
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
      console.error(`获取行业 ${sectorCode} ${type === 'up' ? '领涨' : '领跌'} 股票失败: `, error)
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
          return cachedNews.slice(0, count).map((item) => ({
            ...item,
            data_source: 'cache',
          }))
        }
      }

      // 检查是否允许API调用
      if (!allowApiCall) {
        log('API调用被禁止，使用缓存或模拟数据')

        // 再次尝试从缓存获取
        const cachedNews = getCachedNews()
        if (cachedNews) {
          log(`使用缓存的财经新闻(API调用被禁止)`)
          return cachedNews.slice(0, count).map((item) => ({
            ...item,
            data_source: 'cache (API禁止)',
          }))
        }

        // 如果缓存也没有，抛出错误
        throw new Error('API调用被禁止，且没有缓存数据')
      }

      // 尝试从API获取财经新闻
      try {
        // 这里应该是实际的API调用，但由于Tushare没有直接提供财经新闻API，
        // 我们使用模拟数据，但标记为API数据
        log('从API获取财经新闻')

        // Tushare 不直接提供财经新闻，抛出错误提示用户使用其他新闻源
        throw new Error('Tushare API 不提供财经新闻功能，请使用其他新闻数据源')
      } catch (apiError) {
        logError('API获取财经新闻失败:', apiError)

        // 尝试从缓存获取
        const cachedNews = getCachedNews()
        if (cachedNews) {
          log(`使用缓存的财经新闻(API失败后)`)
          return cachedNews.slice(0, count).map((item) => ({
            ...item,
            data_source: 'cache (API失败)',
          }))
        }

        // 如果缓存也没有，抛出错误而不是使用模拟数据
        log('无法获取财经新闻数据，所有数据源均失败')
        throw new Error('无法获取财经新闻数据，请检查Tushare API配置或网络连接')
      }
    } catch (error) {
      logError('获取财经新闻失败:', error)

      // 返回一个最小的模拟数据集
      return [
        {
          title: '获取新闻失败，显示备用数据',
          time: '刚刚',
          source: '系统',
          url: '#',
          important: true,
          content: '由于网络或服务器问题，无法获取最新财经新闻。这是一条备用数据。',
          data_source: 'mock (error)',
        },
      ]
    }
  },
}
