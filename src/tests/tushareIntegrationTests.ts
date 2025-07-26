/**
 * Tushare Pro API 完整集成测试套件
 * 验证与实际 Tushare Pro 数据源的集成，包括真实 API 调用、数据验证、错误处理等
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
  setAllowApiCall,
  tushareRequest
} from '@/services/tushareService'

// 测试结果接口
export interface TestResult {
  name: string
  category: string
  passed: boolean
  message: string
  duration: number
  data?: any
  error?: any
}

// 测试套件结果
export interface TestSuiteResult {
  totalTests: number
  passedTests: number
  failedTests: number
  duration: number
  results: TestResult[]
  categories: Record<string, { passed: number; total: number }>
}

// 数据质量检查结果
export interface DataQualityResult {
  isValid: boolean
  issues: string[]
  score: number // 0-100
}

// 完整的 Tushare Pro 集成测试套件
export class TushareProIntegrationTestSuite {
  private results: TestResult[] = []
  private startTime: number = 0

  /**
   * 运行完整的集成测试套件
   */
  async runFullTestSuite(): Promise<TestSuiteResult> {
    this.results = []
    this.startTime = Date.now()

    console.log('🚀 开始 Tushare Pro API 完整集成测试...')

    // 启用 API 调用
    setAllowApiCall(true)

    // 运行所有测试类别
    await this.testConfiguration()
    await this.testAuthentication()
    await this.testRateLimit()
    await this.testBasicDataApis()
    await this.testMarketDataApis()
    await this.testFinancialDataApis()
    await this.testIndexDataApis()
    await this.testDataQuality()
    await this.testErrorHandling()
    await this.testPerformance()

    return this.generateSummary()
  }

  /**
   * 快速健康检查测试
   */
  async runHealthCheck(): Promise<TestSuiteResult> {
    this.results = []
    this.startTime = Date.now()

    console.log('⚡ 运行 Tushare Pro API 健康检查...')

    setAllowApiCall(true)

    await this.testConfiguration()
    await this.testAuthentication()
    await this.testBasicConnectivity()

    return this.generateSummary()
  }

  /**
   * 测试配置
   */
  private async testConfiguration(): Promise<void> {
    await this.runTest('配置验证', 'Configuration', async () => {
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

    await this.runTest('环境变量检查', 'Configuration', async () => {
      const requiredEnvVars = [
        'VITE_TUSHARE_API_TOKEN',
        'VITE_TUSHARE_BASE_URL'
      ]

      const missing = requiredEnvVars.filter(varName => !import.meta.env[varName])

      if (missing.length > 0) {
        throw new Error(`缺少环境变量: ${missing.join(', ')}`)
      }

      return { allEnvVarsPresent: true }
    })
  }

  /**
   * 测试认证
   */
  private async testAuthentication(): Promise<void> {
    await this.runTest('Token 验证', 'Authentication', async () => {
      const validation = await validateTushareTokenAsync()

      if (!validation.valid) {
        throw new Error(`Token 验证失败: ${validation.message}`)
      }

      return validation
    })

    await this.runTest('权限检查', 'Authentication', async () => {
      // 尝试调用需要权限的接口
      try {
        const result = await tushareRequest('stock_basic', { limit: 1 })
        return { hasBasicPermission: true, sampleData: result }
      } catch (error: any) {
        if (error.message.includes('40001')) {
          throw new Error('Token 权限不足，需要升级积分')
        }
        throw error
      }
    })
  }

  /**
   * 测试速率限制
   */
  private async testRateLimit(): Promise<void> {
    await this.runTest('速率限制检查', 'RateLimit', async () => {
      const stats = getRateLimitStats()
      const remaining = getRemainingRequests()

      return {
        stats,
        dailyRemaining: remaining.dailyRemaining,
        minuteRemaining: remaining.minuteRemaining
      }
    })

    await this.runTest('请求频率测试', 'RateLimit', async () => {
      const startTime = Date.now()
      const requests = []

      // 发送多个快速请求测试频率限制
      for (let i = 0; i < 3; i++) {
        requests.push(tushareRequest('trade_cal', { limit: 1 }))
      }

      await Promise.all(requests)
      const duration = Date.now() - startTime

      return {
        requestCount: requests.length,
        totalDuration: duration,
        averageLatency: duration / requests.length
      }
    })
  }

  /**
   * 测试基础数据 API
   */
  private async testBasicDataApis(): Promise<void> {
    await this.runTest('股票列表获取', 'BasicData', async () => {
      const stocks = await getAllStocks({ limit: 10 })

      if (!stocks || stocks.length === 0) {
        throw new Error('无法获取股票列表')
      }

      return {
        count: stocks.length,
        sample: stocks.slice(0, 3),
        hasRequiredFields: this.validateStockListData(stocks[0])
      }
    })

    await this.runTest('交易日历获取', 'BasicData', async () => {
      const latestDate = await getLatestTradeDate()

      if (!latestDate) {
        throw new Error('无法获取最新交易日')
      }

      // 验证日期格式
      const dateRegex = /^\d{8}$/
      if (!dateRegex.test(latestDate)) {
        throw new Error('交易日期格式不正确')
      }

      return { latestTradeDate: latestDate }
    })

    await this.runTest('股票搜索功能', 'BasicData', async () => {
      const results = await searchStocks('平安', 5)

      return {
        count: results.length,
        results: results.slice(0, 2),
        hasRelevantResults: results.some(stock => 
          stock.name.includes('平安') || stock.symbol.includes('000001')
        )
      }
    })
  }

  /**
   * 测试行情数据 API
   */
  private async testMarketDataApis(): Promise<void> {
    await this.runTest('日线行情获取', 'MarketData', async () => {
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
        dateRange: {
          start: stockData.dates[0],
          end: stockData.dates[stockData.dates.length - 1]
        },
        hasOHLCData: this.validateOHLCData(stockData)
      }
    })

    await this.runTest('实时行情获取', 'MarketData', async () => {
      const stockInfo = await getStockInfo('000001.SZ')

      if (!stockInfo) {
        throw new Error('无法获取股票实时信息')
      }

      return {
        symbol: stockInfo.symbol,
        name: stockInfo.name,
        hasCurrentPrice: stockInfo.currentPrice !== undefined,
        hasMarketData: stockInfo.marketCap !== undefined
      }
    })
  }

  /**
   * 测试财务数据 API
   */
  private async testFinancialDataApis(): Promise<void> {
    await this.runTest('财务数据获取', 'FinancialData', async () => {
      const financials = await getStockFinancials('000001.SZ', '20231231')

      if (!financials) {
        throw new Error('无法获取财务数据')
      }

      return {
        symbol: financials.symbol,
        period: financials.period,
        hasIncomeStatement: financials.income !== undefined,
        hasBalanceSheet: financials.balance !== undefined,
        hasCashFlow: financials.cashflow !== undefined
      }
    })
  }

  /**
   * 测试指数数据 API
   */
  private async testIndexDataApis(): Promise<void> {
    await this.runTest('指数基础信息', 'IndexData', async () => {
      const result = await tushareRequest('index_basic', { market: 'SSE', limit: 5 })

      if (!result || !result.items || result.items.length === 0) {
        throw new Error('无法获取指数基础信息')
      }

      return {
        count: result.items.length,
        sample: result.items[0]
      }
    })
  }

  /**
   * 测试基础连接性
   */
  private async testBasicConnectivity(): Promise<void> {
    await this.runTest('API 连接测试', 'Connectivity', async () => {
      const result = await tushareRequest('trade_cal', { limit: 1 })

      if (!result || result.code !== 0) {
        throw new Error('API 连接失败')
      }

      return { connected: true, responseTime: Date.now() - this.startTime }
    })
  }

  /**
   * 测试数据质量
   */
  private async testDataQuality(): Promise<void> {
    await this.runTest('数据完整性检查', 'DataQuality', async () => {
      const stocks = await getAllStocks({ limit: 5 })
      const qualityResults = stocks.map(stock => this.checkDataQuality(stock))
      
      const averageScore = qualityResults.reduce((sum, result) => sum + result.score, 0) / qualityResults.length
      const allIssues = qualityResults.flatMap(result => result.issues)

      return {
        averageQualityScore: averageScore,
        totalIssues: allIssues.length,
        sampleIssues: allIssues.slice(0, 5)
      }
    })
  }

  /**
   * 测试错误处理
   */
  private async testErrorHandling(): Promise<void> {
    await this.runTest('无效参数处理', 'ErrorHandling', async () => {
      try {
        await tushareRequest('stock_basic', { invalid_param: 'test' })
        throw new Error('应该抛出错误但没有')
      } catch (error: any) {
        if (error.message.includes('40301') || error.message.includes('参数错误')) {
          return { errorHandledCorrectly: true }
        }
        throw error
      }
    })

    await this.runTest('不存在的股票代码', 'ErrorHandling', async () => {
      const result = await getStockInfo('INVALID.CODE')
      
      return {
        handledGracefully: result === null || result === undefined,
        result: result
      }
    })
  }

  /**
   * 测试性能
   */
  private async testPerformance(): Promise<void> {
    await this.runTest('响应时间测试', 'Performance', async () => {
      const startTime = Date.now()
      await tushareRequest('trade_cal', { limit: 10 })
      const responseTime = Date.now() - startTime

      return {
        responseTime,
        isAcceptable: responseTime < 5000 // 5秒内
      }
    })
  }

  /**
   * 运行单个测试
   */
  private async runTest(
    name: string,
    category: string,
    testFn: () => Promise<any>
  ): Promise<void> {
    const startTime = Date.now()
    
    try {
      console.log(`  🧪 ${name}...`)
      const data = await testFn()
      const duration = Date.now() - startTime
      
      this.results.push({
        name,
        category,
        passed: true,
        message: '测试通过',
        duration,
        data
      })
      
      console.log(`  ✅ ${name} - 通过 (${duration}ms)`)
    } catch (error: any) {
      const duration = Date.now() - startTime
      
      this.results.push({
        name,
        category,
        passed: false,
        message: error.message || '测试失败',
        duration,
        error: error
      })
      
      console.log(`  ❌ ${name} - 失败: ${error.message} (${duration}ms)`)
    }
  }

  /**
   * 验证股票列表数据
   */
  private validateStockListData(stock: any): boolean {
    const requiredFields = ['symbol', 'name', 'market', 'industry']
    return requiredFields.every(field => stock[field] !== undefined && stock[field] !== null)
  }

  /**
   * 验证 OHLC 数据
   */
  private validateOHLCData(stockData: any): boolean {
    if (!stockData.opens || !stockData.highs || !stockData.lows || !stockData.closes) {
      return false
    }
    
    // 检查数据长度一致性
    const lengths = [stockData.opens.length, stockData.highs.length, stockData.lows.length, stockData.closes.length]
    return lengths.every(length => length === lengths[0])
  }

  /**
   * 检查数据质量
   */
  private checkDataQuality(data: any): DataQualityResult {
    const issues: string[] = []
    let score = 100

    // 检查必填字段
    if (!data.symbol) {
      issues.push('缺少股票代码')
      score -= 20
    }

    if (!data.name) {
      issues.push('缺少股票名称')
      score -= 15
    }

    // 检查数据格式
    if (data.symbol && !/^[0-9]{6}\.(SH|SZ|BJ)$/.test(data.symbol)) {
      issues.push('股票代码格式不正确')
      score -= 10
    }

    return {
      isValid: issues.length === 0,
      issues,
      score: Math.max(0, score)
    }
  }

  /**
   * 生成测试摘要
   */
  private generateSummary(): TestSuiteResult {
    const duration = Date.now() - this.startTime
    const passedTests = this.results.filter(r => r.passed).length
    const failedTests = this.results.length - passedTests

    // 按类别统计
    const categories: Record<string, { passed: number; total: number }> = {}
    this.results.forEach(result => {
      if (!categories[result.category]) {
        categories[result.category] = { passed: 0, total: 0 }
      }
      categories[result.category].total++
      if (result.passed) {
        categories[result.category].passed++
      }
    })

    const summary: TestSuiteResult = {
      totalTests: this.results.length,
      passedTests,
      failedTests,
      duration,
      results: this.results,
      categories
    }

    this.printSummary(summary)
    return summary
  }

  /**
   * 打印测试摘要
   */
  private printSummary(summary: TestSuiteResult): void {
    console.log('\n📊 测试摘要:')
    console.log(`总测试数: ${summary.totalTests}`)
    console.log(`通过: ${summary.passedTests}`)
    console.log(`失败: ${summary.failedTests}`)
    console.log(`成功率: ${((summary.passedTests / summary.totalTests) * 100).toFixed(1)}%`)
    console.log(`总耗时: ${summary.duration}ms`)

    console.log('\n📋 分类统计:')
    Object.entries(summary.categories).forEach(([category, stats]) => {
      const successRate = ((stats.passed / stats.total) * 100).toFixed(1)
      console.log(`  ${category}: ${stats.passed}/${stats.total} (${successRate}%)`)
    })

    if (summary.failedTests > 0) {
      console.log('\n❌ 失败的测试:')
      summary.results
        .filter(r => !r.passed)
        .forEach(result => {
          console.log(`  - ${result.name}: ${result.message}`)
        })
    }
  }
}

// 导出便捷函数
export const tushareIntegrationTests = new TushareProIntegrationTestSuite()

/**
 * 快速测试函数
 */
export async function quickTest(): Promise<boolean> {
  const result = await tushareIntegrationTests.runHealthCheck()
  return result.failedTests === 0
}

/**
 * 完整测试函数
 */
export async function fullTest(): Promise<TestSuiteResult> {
  return await tushareIntegrationTests.runFullTestSuite()
}
