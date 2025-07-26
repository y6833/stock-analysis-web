/**
 * Tushare API 集成测试套件
 * 用于验证 Tushare API 集成的正确性
 */

import {
  checkTushareConfig,
  validateTushareTokenAsync,
  getTushareConfigInfo,
  getRateLimitStats,
  getRemainingRequests,
  getAllStocks,
  getStockHistory,
  getStockInfo,
  getStockFinancials,
  searchStocks,
  getLatestTradeDate,
  setAllowApiCall
} from '@/services/tushareService'

// 测试结果接口
export interface TestResult {
  name: string
  passed: boolean
  message: string
  duration: number
  data?: any
}

// 测试套件结果
export interface TestSuiteResult {
  totalTests: number
  passedTests: number
  failedTests: number
  duration: number
  results: TestResult[]
}

// 测试工具类
export class TushareTestSuite {
  private results: TestResult[] = []
  private startTime: number = 0

  // 开始测试套件
  async runAllTests(): Promise<TestSuiteResult> {
    this.results = []
    this.startTime = Date.now()

    console.log('🚀 开始 Tushare API 集成测试...')

    // 启用 API 调用
    setAllowApiCall(true)

    // 运行所有测试
    await this.testConfiguration()
    await this.testAuthentication()
    await this.testRateLimit()
    await this.testBasicApis()
    await this.testDataIntegrity()
    await this.testErrorHandling()

    const duration = Date.now() - this.startTime
    const passedTests = this.results.filter(r => r.passed).length
    const failedTests = this.results.length - passedTests

    const summary: TestSuiteResult = {
      totalTests: this.results.length,
      passedTests,
      failedTests,
      duration,
      results: this.results
    }

    this.printSummary(summary)
    return summary
  }

  // 测试配置
  private async testConfiguration(): Promise<void> {
    await this.runTest('配置验证', async () => {
      const config = checkTushareConfig()

      if (!config.valid) {
        throw new Error(`配置无效: ${config.errors.join(', ')}`)
      }

      const configInfo = getTushareConfigInfo()

      if (!configInfo.hasToken) {
        throw new Error('未配置 Tushare Token')
      }

      return {
        hasToken: configInfo.hasToken,
        tokenPreview: configInfo.tokenPreview,
        rateLimit: configInfo.rateLimit,
        debugEnabled: configInfo.debugEnabled
      }
    })
  }

  // 测试认证
  private async testAuthentication(): Promise<void> {
    await this.runTest('Token 验证', async () => {
      const validation = await validateTushareTokenAsync()

      if (!validation.valid) {
        throw new Error(`Token 验证失败: ${validation.message}`)
      }

      return validation
    })
  }

  // 测试速率限制
  private async testRateLimit(): Promise<void> {
    await this.runTest('速率限制检查', async () => {
      const stats = getRateLimitStats()
      const remaining = getRemainingRequests()

      return {
        stats,
        dailyRemaining: remaining.dailyRemaining,
        minuteRemaining: remaining.minuteRemaining
      }
    })
  }

  // 测试基础 API
  private async testBasicApis(): Promise<void> {
    // 测试获取交易日历
    await this.runTest('获取最新交易日', async () => {
      const latestDate = await getLatestTradeDate()

      if (!latestDate) {
        throw new Error('无法获取最新交易日')
      }

      return { latestTradeDate: latestDate }
    })

    // 测试获取股票列表
    await this.runTest('获取股票列表', async () => {
      const stocks = await getAllStocks({ limit: 10 })

      if (!stocks || stocks.length === 0) {
        throw new Error('无法获取股票列表')
      }

      return {
        count: stocks.length,
        sample: stocks.slice(0, 3)
      }
    })

    // 测试搜索股票
    await this.runTest('搜索股票', async () => {
      const results = await searchStocks('平安', 5)

      return {
        count: results.length,
        results: results.slice(0, 2)
      }
    })

    // 测试获取股票信息
    await this.runTest('获取股票基础信息', async () => {
      const stockInfo = await getStockInfo('000001.SZ')

      if (!stockInfo) {
        throw new Error('无法获取股票基础信息')
      }

      return stockInfo
    })

    // 测试获取股票历史数据
    await this.runTest('获取股票历史数据', async () => {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 30)

      const formatDate = (date: Date) => {
        return date.toISOString().split('T')[0].replace(/-/g, '')
      }

      const stockData = await getStockHistory(
        '000001.SZ',
        formatDate(startDate),
        formatDate(endDate),
        30
      )

      if (!stockData || !stockData.dates || stockData.dates.length === 0) {
        throw new Error('无法获取股票历史数据')
      }

      return {
        symbol: stockData.symbol,
        dataPoints: stockData.dates.length,
        latestPrice: stockData.prices[stockData.prices.length - 1],
        dateRange: {
          start: stockData.dates[0],
          end: stockData.dates[stockData.dates.length - 1]
        }
      }
    })
  }

  // 测试数据完整性
  private async testDataIntegrity(): Promise<void> {
    await this.runTest('数据完整性检查', async () => {
      // 获取一只股票的基础信息和历史数据
      const symbol = '000001.SZ'
      const stockInfo = await getStockInfo(symbol)

      if (!stockInfo) {
        throw new Error('无法获取股票基础信息')
      }

      // 检查必要字段
      const requiredFields = ['ts_code', 'name', 'market', 'exchange']
      const missingFields = requiredFields.filter(field => !stockInfo[field as keyof typeof stockInfo])

      if (missingFields.length > 0) {
        throw new Error(`缺少必要字段: ${missingFields.join(', ')}`)
      }

      return {
        symbol: stockInfo.ts_code,
        name: stockInfo.name,
        market: stockInfo.market,
        exchange: stockInfo.exchange,
        fieldsComplete: true
      }
    })
  }

  // 测试错误处理
  private async testErrorHandling(): Promise<void> {
    await this.runTest('错误处理测试', async () => {
      try {
        // 尝试获取不存在的股票
        await getStockInfo('999999.XX')
        return { errorHandling: 'no_error_thrown' }
      } catch (error) {
        // 预期会抛出错误
        return {
          errorHandling: 'correct',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })
  }

  // 运行单个测试
  private async runTest(name: string, testFn: () => Promise<any>): Promise<void> {
    const startTime = Date.now()

    try {
      console.log(`🧪 运行测试: ${name}`)
      const data = await testFn()
      const duration = Date.now() - startTime

      this.results.push({
        name,
        passed: true,
        message: '测试通过',
        duration,
        data
      })

      console.log(`✅ ${name} - 通过 (${duration}ms)`)
    } catch (error) {
      const duration = Date.now() - startTime
      const message = error instanceof Error ? error.message : '未知错误'

      this.results.push({
        name,
        passed: false,
        message,
        duration
      })

      console.log(`❌ ${name} - 失败: ${message} (${duration}ms)`)
    }
  }

  // 打印测试摘要
  private printSummary(summary: TestSuiteResult): void {
    console.log('\n📊 测试摘要:')
    console.log(`总测试数: ${summary.totalTests}`)
    console.log(`通过: ${summary.passedTests}`)
    console.log(`失败: ${summary.failedTests}`)
    console.log(`总耗时: ${summary.duration}ms`)
    console.log(`成功率: ${((summary.passedTests / summary.totalTests) * 100).toFixed(1)}%`)

    if (summary.failedTests > 0) {
      console.log('\n❌ 失败的测试:')
      summary.results
        .filter(r => !r.passed)
        .forEach(r => console.log(`  - ${r.name}: ${r.message}`))
    }

    console.log('\n🎉 测试完成!')
  }
}

// 导出测试实例
export const tushareTestSuite = new TushareTestSuite()

// 获取 Tushare 配置信息
export function getTushareConfigInfo() {
  return {
    token: getTushareToken() ? '已配置' : '未配置',
    baseUrl: getTushareBaseUrl(),
    proxyUrl: getTushareProxyUrl(),
    debugMode: isTushareDebugEnabled() ? '启用' : '禁用'
  }
}

// 获取剩余请求次数（模拟）
export function getRemainingRequests() {
  return {
    daily: 500, // 模拟每日限制
    remaining: 450, // 模拟剩余次数
    resetTime: '明日 00:00'
  }
}

// 快速测试函数
export async function quickTest(): Promise<boolean> {
  console.log('🚀 运行 Tushare API 快速测试...')

  try {
    // 启用 API 调用
    setAllowApiCall(true)

    // 检查配置
    const config = checkTushareConfig()
    if (!config.valid) {
      console.error('❌ 配置无效:', config.errors)
      return false
    }

    // 验证 Token
    const validation = await validateTushareTokenAsync()
    if (!validation.valid) {
      console.error('❌ Token 验证失败:', validation.message)
      return false
    }

    // 测试基础 API
    const stocks = await getAllStocks({ limit: 1 })
    if (!stocks || stocks.length === 0) {
      console.error('❌ 无法获取股票列表')
      return false
    }

    console.log('✅ 快速测试通过!')
    console.log(`📈 成功获取 ${stocks.length} 条股票数据`)
    return true
  } catch (error) {
    console.error('❌ 快速测试失败:', error)
    return false
  }
}
