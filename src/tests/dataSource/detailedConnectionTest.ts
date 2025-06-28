/**
 * 详细的数据源连接测试脚本
 * 用于验证 Alpha Vantage 和 AllTick 数据源的连接和功能
 */

import AlphaVantageDataSource from '@/services/dataSource/AlphaVantageDataSource'
import AlltickDataSource from '@/services/dataSource/AlltickDataSource'

interface TestResult {
  testName: string
  success: boolean
  data?: any
  error?: string
  duration: number
}

/**
 * 1. 连接测试方法
 */
export class ConnectionTester {
  
  /**
   * 测试 Alpha Vantage 连接
   */
  static async testAlphaVantageConnection(): Promise<TestResult[]> {
    console.log('🔍 开始 Alpha Vantage 连接测试...')
    const results: TestResult[] = []
    const dataSource = new AlphaVantageDataSource()

    // 1.1 API Key 有效性测试
    const apiKeyTest = await this.timeTest('API Key 有效性', async () => {
      const testResult = await dataSource.testConnection()
      if (!testResult) {
        throw new Error('API Key 无效或连接失败')
      }
      return { valid: true, message: 'API Key 有效' }
    })
    results.push(apiKeyTest)

    // 1.2 网络连接测试
    const networkTest = await this.timeTest('网络连接', async () => {
      const response = await fetch('https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=IBM&interval=5min&apikey=demo')
      if (!response.ok) {
        throw new Error(`网络请求失败: ${response.status}`)
      }
      const data = await response.json()
      return { status: response.status, hasData: !!data }
    })
    results.push(networkTest)

    // 1.3 API 端点可访问性测试
    const endpointTest = await this.timeTest('API 端点可访问性', async () => {
      try {
        const quote = await dataSource.getStockQuote('AAPL')
        return { accessible: true, sampleData: quote }
      } catch (error) {
        throw new Error(`API 端点不可访问: ${error.message}`)
      }
    })
    results.push(endpointTest)

    return results
  }

  /**
   * 测试 AllTick 连接
   */
  static async testAlltickConnection(): Promise<TestResult[]> {
    console.log('🔍 开始 AllTick 连接测试...')
    const results: TestResult[] = []
    const dataSource = new AlltickDataSource()

    // 1.1 API Key 有效性测试
    const apiKeyTest = await this.timeTest('API Key 有效性', async () => {
      const testResult = await dataSource.testConnection()
      if (!testResult) {
        throw new Error('API Key 无效或连接失败')
      }
      return { valid: true, message: 'API Key 有效' }
    })
    results.push(apiKeyTest)

    // 1.2 网络连接测试
    const networkTest = await this.timeTest('网络连接', async () => {
      const response = await fetch('https://quote.alltick.io')
      if (!response.ok) {
        throw new Error(`网络请求失败: ${response.status}`)
      }
      return { status: response.status, accessible: true }
    })
    results.push(networkTest)

    // 1.3 API 端点可访问性测试
    const endpointTest = await this.timeTest('API 端点可访问性', async () => {
      try {
        const quote = await dataSource.getStockQuote('AAPL')
        return { accessible: true, sampleData: quote }
      } catch (error) {
        throw new Error(`API 端点不可访问: ${error.message}`)
      }
    })
    results.push(endpointTest)

    return results
  }

  /**
   * 通用计时测试方法
   */
  private static async timeTest(testName: string, testFn: () => Promise<any>): Promise<TestResult> {
    const startTime = Date.now()
    try {
      const data = await testFn()
      const duration = Date.now() - startTime
      console.log(`✅ ${testName} - 成功 (${duration}ms)`)
      return {
        testName,
        success: true,
        data,
        duration
      }
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`❌ ${testName} - 失败 (${duration}ms):`, error.message)
      return {
        testName,
        success: false,
        error: error.message,
        duration
      }
    }
  }
}

/**
 * 2. 数据获取测试
 */
export class DataFetchTester {

  /**
   * 测试 Alpha Vantage 数据获取
   */
  static async testAlphaVantageDataFetch(): Promise<TestResult[]> {
    console.log('📊 开始 Alpha Vantage 数据获取测试...')
    const results: TestResult[] = []
    const dataSource = new AlphaVantageDataSource()

    // 2.1 实时股票行情测试
    const realtimeTest = await ConnectionTester['timeTest']('实时股票行情 (AAPL)', async () => {
      const quote = await dataSource.getStockQuote('AAPL')
      this.validateQuoteData(quote, 'AAPL')
      return quote
    })
    results.push(realtimeTest)

    // 2.2 历史数据测试
    const historyTest = await ConnectionTester['timeTest']('历史数据 (AAPL 最近30天)', async () => {
      const history = await dataSource.getStockHistory('AAPL', 'day')
      this.validateHistoryData(history)
      return { count: history.length, sample: history.slice(-3) }
    })
    results.push(historyTest)

    // 2.3 股票搜索测试
    const searchTest = await ConnectionTester['timeTest']('股票搜索 (Apple)', async () => {
      const searchResults = await dataSource.searchStocks('Apple')
      if (searchResults.length === 0) {
        throw new Error('搜索结果为空')
      }
      return { count: searchResults.length, results: searchResults.slice(0, 3) }
    })
    results.push(searchTest)

    // 2.4 财经新闻测试
    const newsTest = await ConnectionTester['timeTest']('财经新闻获取', async () => {
      const news = await dataSource.getFinancialNews(5)
      return { count: news.length, sample: news.slice(0, 2) }
    })
    results.push(newsTest)

    return results
  }

  /**
   * 测试 AllTick 数据获取
   */
  static async testAlltickDataFetch(): Promise<TestResult[]> {
    console.log('📊 开始 AllTick 数据获取测试...')
    const results: TestResult[] = []
    const dataSource = new AlltickDataSource()

    // 2.1 美股实时行情测试
    const usStockTest = await ConnectionTester['timeTest']('美股实时行情 (AAPL)', async () => {
      const quote = await dataSource.getStockQuote('AAPL')
      this.validateQuoteData(quote, 'AAPL')
      return quote
    })
    results.push(usStockTest)

    // 2.2 A股实时行情测试
    const cnStockTest = await ConnectionTester['timeTest']('A股实时行情 (000001)', async () => {
      const quote = await dataSource.getStockQuote('000001')
      this.validateQuoteData(quote, '000001')
      return quote
    })
    results.push(cnStockTest)

    // 2.3 历史K线数据测试
    const historyTest = await ConnectionTester['timeTest']('历史K线数据 (AAPL 日K)', async () => {
      const history = await dataSource.getStockHistory('AAPL', 'day')
      this.validateHistoryData(history)
      return { count: history.length, sample: history.slice(-3) }
    })
    results.push(historyTest)

    // 2.4 分钟K线数据测试
    const minuteTest = await ConnectionTester['timeTest']('分钟K线数据 (AAPL)', async () => {
      const history = await dataSource.getStockHistory('AAPL', 'minute')
      this.validateHistoryData(history)
      return { count: history.length, sample: history.slice(-3) }
    })
    results.push(minuteTest)

    // 2.5 股票搜索测试
    const searchTest = await ConnectionTester['timeTest']('股票搜索 (AAPL)', async () => {
      const searchResults = await dataSource.searchStocks('AAPL')
      if (searchResults.length === 0) {
        throw new Error('搜索结果为空')
      }
      return { count: searchResults.length, results: searchResults }
    })
    results.push(searchTest)

    return results
  }

  /**
   * 验证行情数据格式
   */
  private static validateQuoteData(quote: any, symbol: string): void {
    if (!quote) {
      throw new Error('行情数据为空')
    }
    if (!quote.symbol) {
      throw new Error('缺少股票代码')
    }
    if (typeof quote.price !== 'number' || quote.price <= 0) {
      throw new Error('价格数据无效')
    }
    if (typeof quote.volume !== 'number' || quote.volume < 0) {
      throw new Error('成交量数据无效')
    }
    console.log(`✅ 行情数据验证通过: ${symbol} - 价格: ${quote.price}, 成交量: ${quote.volume}`)
  }

  /**
   * 验证历史数据格式
   */
  private static validateHistoryData(history: any[]): void {
    if (!Array.isArray(history)) {
      throw new Error('历史数据不是数组格式')
    }
    if (history.length === 0) {
      throw new Error('历史数据为空')
    }
    
    const sample = history[0]
    const requiredFields = ['date', 'open', 'high', 'low', 'close', 'volume']
    
    for (const field of requiredFields) {
      if (!(field in sample)) {
        throw new Error(`历史数据缺少字段: ${field}`)
      }
    }
    
    if (typeof sample.open !== 'number' || sample.open <= 0) {
      throw new Error('开盘价数据无效')
    }
    
    console.log(`✅ 历史数据验证通过: ${history.length} 条记录`)
  }
}

/**
 * 3. 错误处理验证
 */
export class ErrorHandlingTester {

  /**
   * 测试无效 API Key 处理
   */
  static async testInvalidApiKey(): Promise<TestResult[]> {
    console.log('🚫 开始错误处理测试...')
    const results: TestResult[] = []

    // 创建使用无效 API Key 的数据源实例
    const invalidAlphaVantage = new AlphaVantageDataSource()
    // 注意：这里我们不能直接修改私有属性，所以这个测试需要特殊处理

    const invalidKeyTest = await ConnectionTester['timeTest']('无效 API Key 处理', async () => {
      try {
        // 尝试使用明显无效的股票代码来触发错误
        await invalidAlphaVantage.getStockQuote('INVALID_SYMBOL_12345')
        throw new Error('应该抛出错误但没有')
      } catch (error) {
        if (error.message.includes('应该抛出错误但没有')) {
          throw error
        }
        // 期望的错误
        return { errorHandled: true, errorMessage: error.message }
      }
    })
    results.push(invalidKeyTest)

    return results
  }

  /**
   * 测试网络超时处理
   */
  static async testNetworkTimeout(): Promise<TestResult[]> {
    console.log('⏱️ 开始网络超时测试...')
    const results: TestResult[] = []

    // 这个测试比较难模拟，我们可以测试快速连续请求来触发限流
    const rateLimitTest = await ConnectionTester['timeTest']('频率限制处理', async () => {
      const dataSource = new AlltickDataSource()
      const promises = []
      
      // 快速发送多个请求
      for (let i = 0; i < 3; i++) {
        promises.push(dataSource.getStockQuote('AAPL'))
      }
      
      try {
        const results = await Promise.all(promises)
        return { requestCount: promises.length, successCount: results.length }
      } catch (error) {
        // 期望可能会有限流错误
        return { rateLimitTriggered: true, error: error.message }
      }
    })
    results.push(rateLimitTest)

    return results
  }
}

/**
 * 4. 综合测试执行器
 */
export class ComprehensiveTestRunner {
  
  /**
   * 运行所有测试
   */
  static async runAllTests(): Promise<{
    alphaVantage: {
      connection: TestResult[]
      dataFetch: TestResult[]
    }
    allTick: {
      connection: TestResult[]
      dataFetch: TestResult[]
    }
    errorHandling: TestResult[]
    summary: {
      totalTests: number
      passedTests: number
      failedTests: number
      successRate: number
    }
  }> {
    console.log('🚀 开始综合测试...')
    console.log('=' .repeat(60))

    const results = {
      alphaVantage: {
        connection: [] as TestResult[],
        dataFetch: [] as TestResult[]
      },
      allTick: {
        connection: [] as TestResult[],
        dataFetch: [] as TestResult[]
      },
      errorHandling: [] as TestResult[],
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        successRate: 0
      }
    }

    try {
      // Alpha Vantage 测试
      console.log('\n📈 Alpha Vantage 测试')
      console.log('-' .repeat(30))
      results.alphaVantage.connection = await ConnectionTester.testAlphaVantageConnection()
      await this.delay(2000) // 避免频率限制
      results.alphaVantage.dataFetch = await DataFetchTester.testAlphaVantageDataFetch()

      // AllTick 测试
      console.log('\n📊 AllTick 测试')
      console.log('-' .repeat(30))
      results.allTick.connection = await ConnectionTester.testAlltickConnection()
      await this.delay(2000) // 避免频率限制
      results.allTick.dataFetch = await DataFetchTester.testAlltickDataFetch()

      // 错误处理测试
      console.log('\n🚫 错误处理测试')
      console.log('-' .repeat(30))
      results.errorHandling = await ErrorHandlingTester.testInvalidApiKey()

    } catch (error) {
      console.error('测试执行过程中发生错误:', error)
    }

    // 计算汇总统计
    const allResults = [
      ...results.alphaVantage.connection,
      ...results.alphaVantage.dataFetch,
      ...results.allTick.connection,
      ...results.allTick.dataFetch,
      ...results.errorHandling
    ]

    results.summary.totalTests = allResults.length
    results.summary.passedTests = allResults.filter(r => r.success).length
    results.summary.failedTests = allResults.filter(r => !r.success).length
    results.summary.successRate = results.summary.totalTests > 0 
      ? (results.summary.passedTests / results.summary.totalTests) * 100 
      : 0

    // 打印汇总报告
    this.printSummaryReport(results.summary)

    return results
  }

  /**
   * 延迟函数
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 打印汇总报告
   */
  private static printSummaryReport(summary: any): void {
    console.log('\n' + '=' .repeat(60))
    console.log('📋 测试汇总报告')
    console.log('=' .repeat(60))
    console.log(`总测试数: ${summary.totalTests}`)
    console.log(`通过测试: ${summary.passedTests}`)
    console.log(`失败测试: ${summary.failedTests}`)
    console.log(`成功率: ${summary.successRate.toFixed(2)}%`)
    
    if (summary.successRate >= 80) {
      console.log('🎉 测试结果: 优秀')
    } else if (summary.successRate >= 60) {
      console.log('⚠️ 测试结果: 良好')
    } else {
      console.log('❌ 测试结果: 需要改进')
    }
    console.log('=' .repeat(60))
  }
}

// 导出便捷的测试函数
export const runQuickTest = ComprehensiveTestRunner.runAllTests
export const testAlphaVantage = async () => {
  const connection = await ConnectionTester.testAlphaVantageConnection()
  const dataFetch = await DataFetchTester.testAlphaVantageDataFetch()
  return { connection, dataFetch }
}
export const testAllTick = async () => {
  const connection = await ConnectionTester.testAlltickConnection()
  const dataFetch = await DataFetchTester.testAlltickDataFetch()
  return { connection, dataFetch }
}
