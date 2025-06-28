/**
 * 浏览器控制台测试脚本
 * 可以在浏览器开发者工具中直接运行
 */

import { ComprehensiveTestRunner, testAlphaVantage, testAllTick } from './detailedConnectionTest'
import AlphaVantageDataSource from '@/services/dataSource/AlphaVantageDataSource'
import AlltickDataSource from '@/services/dataSource/AlltickDataSource'

/**
 * 浏览器控制台测试工具
 */
export class BrowserTestUtils {
  
  /**
   * 快速连接测试
   */
  static async quickConnectionTest() {
    console.log('🔍 快速连接测试开始...')
    
    try {
      // 测试 Alpha Vantage
      console.log('\n📈 测试 Alpha Vantage...')
      const alphaVantage = new AlphaVantageDataSource()
      const alphaConnection = await alphaVantage.testConnection()
      console.log(`Alpha Vantage 连接: ${alphaConnection ? '✅ 成功' : '❌ 失败'}`)
      
      // 测试 AllTick
      console.log('\n📊 测试 AllTick...')
      const allTick = new AlltickDataSource()
      const allTickConnection = await allTick.testConnection()
      console.log(`AllTick 连接: ${allTickConnection ? '✅ 成功' : '❌ 失败'}`)
      
      return {
        alphaVantage: alphaConnection,
        allTick: allTickConnection
      }
    } catch (error) {
      console.error('❌ 快速连接测试失败:', error)
      return null
    }
  }

  /**
   * 获取样本数据
   */
  static async getSampleData() {
    console.log('📊 获取样本数据...')
    
    const results = {
      alphaVantage: {},
      allTick: {}
    }

    try {
      // Alpha Vantage 样本数据
      console.log('\n📈 Alpha Vantage 样本数据:')
      const alphaVantage = new AlphaVantageDataSource()
      
      console.log('获取 AAPL 行情...')
      const alphaQuote = await alphaVantage.getStockQuote('AAPL')
      console.log('AAPL 行情:', alphaQuote)
      results.alphaVantage.quote = alphaQuote

      console.log('获取股票列表...')
      const alphaStocks = await alphaVantage.getStocks()
      console.log(`股票列表: ${alphaStocks.length} 只股票`)
      console.log('前3只股票:', alphaStocks.slice(0, 3))
      results.alphaVantage.stocks = alphaStocks.slice(0, 3)

    } catch (error) {
      console.error('❌ Alpha Vantage 数据获取失败:', error.message)
      results.alphaVantage.error = error.message
    }

    try {
      // AllTick 样本数据
      console.log('\n📊 AllTick 样本数据:')
      const allTick = new AlltickDataSource()
      
      console.log('获取 AAPL 行情...')
      const allTickQuote = await allTick.getStockQuote('AAPL')
      console.log('AAPL 行情:', allTickQuote)
      results.allTick.quote = allTickQuote

      console.log('获取股票列表...')
      const allTickStocks = await allTick.getStocks()
      console.log(`股票列表: ${allTickStocks.length} 只股票`)
      console.log('前3只股票:', allTickStocks.slice(0, 3))
      results.allTick.stocks = allTickStocks.slice(0, 3)

    } catch (error) {
      console.error('❌ AllTick 数据获取失败:', error.message)
      results.allTick.error = error.message
    }

    return results
  }

  /**
   * 网络请求监控
   */
  static monitorNetworkRequests() {
    console.log('🌐 开始监控网络请求...')
    
    // 保存原始的 fetch 函数
    const originalFetch = window.fetch
    
    // 重写 fetch 函数以监控请求
    window.fetch = async function(...args) {
      const url = args[0]
      const options = args[1] || {}
      
      console.log(`🌐 发起请求: ${url}`)
      console.log('请求选项:', options)
      
      const startTime = Date.now()
      
      try {
        const response = await originalFetch.apply(this, args)
        const duration = Date.now() - startTime
        
        console.log(`✅ 请求成功: ${url}`)
        console.log(`状态码: ${response.status}`)
        console.log(`耗时: ${duration}ms`)
        
        return response
      } catch (error) {
        const duration = Date.now() - startTime
        
        console.error(`❌ 请求失败: ${url}`)
        console.error(`错误: ${error.message}`)
        console.error(`耗时: ${duration}ms`)
        
        throw error
      }
    }
    
    console.log('✅ 网络请求监控已启用')
    
    // 返回恢复函数
    return () => {
      window.fetch = originalFetch
      console.log('🔄 网络请求监控已恢复')
    }
  }

  /**
   * 性能测试
   */
  static async performanceTest() {
    console.log('⚡ 开始性能测试...')
    
    const testCases = [
      { name: 'Alpha Vantage AAPL 行情', fn: () => new AlphaVantageDataSource().getStockQuote('AAPL') },
      { name: 'AllTick AAPL 行情', fn: () => new AlltickDataSource().getStockQuote('AAPL') },
      { name: 'Alpha Vantage 股票列表', fn: () => new AlphaVantageDataSource().getStocks() },
      { name: 'AllTick 股票列表', fn: () => new AlltickDataSource().getStocks() }
    ]

    const results = []

    for (const testCase of testCases) {
      console.log(`\n测试: ${testCase.name}`)
      
      const times = []
      const successCount = { value: 0 }
      
      // 运行3次测试
      for (let i = 0; i < 3; i++) {
        const startTime = performance.now()
        
        try {
          await testCase.fn()
          const endTime = performance.now()
          const duration = endTime - startTime
          times.push(duration)
          successCount.value++
          console.log(`  第${i + 1}次: ${duration.toFixed(2)}ms ✅`)
        } catch (error) {
          console.log(`  第${i + 1}次: 失败 ❌ - ${error.message}`)
        }
        
        // 避免频率限制
        if (i < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
      
      if (times.length > 0) {
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length
        const minTime = Math.min(...times)
        const maxTime = Math.max(...times)
        
        results.push({
          name: testCase.name,
          avgTime: avgTime.toFixed(2),
          minTime: minTime.toFixed(2),
          maxTime: maxTime.toFixed(2),
          successRate: (successCount.value / 3 * 100).toFixed(1)
        })
        
        console.log(`  平均耗时: ${avgTime.toFixed(2)}ms`)
        console.log(`  最快: ${minTime.toFixed(2)}ms, 最慢: ${maxTime.toFixed(2)}ms`)
        console.log(`  成功率: ${successCount.value}/3`)
      }
    }

    console.log('\n📊 性能测试汇总:')
    console.table(results)
    
    return results
  }

  /**
   * 数据完整性检查
   */
  static async dataIntegrityCheck() {
    console.log('🔍 开始数据完整性检查...')
    
    const checks = []

    try {
      // 检查 Alpha Vantage 数据
      console.log('\n📈 检查 Alpha Vantage 数据完整性:')
      const alphaVantage = new AlphaVantageDataSource()
      
      const alphaQuote = await alphaVantage.getStockQuote('AAPL')
      const alphaQuoteCheck = this.validateQuoteData(alphaQuote, 'Alpha Vantage AAPL 行情')
      checks.push(alphaQuoteCheck)
      
      const alphaHistory = await alphaVantage.getStockHistory('AAPL', 'day')
      const alphaHistoryCheck = this.validateHistoryData(alphaHistory, 'Alpha Vantage AAPL 历史数据')
      checks.push(alphaHistoryCheck)

    } catch (error) {
      console.error('❌ Alpha Vantage 数据检查失败:', error.message)
      checks.push({ name: 'Alpha Vantage', valid: false, error: error.message })
    }

    try {
      // 检查 AllTick 数据
      console.log('\n📊 检查 AllTick 数据完整性:')
      const allTick = new AlltickDataSource()
      
      const allTickQuote = await allTick.getStockQuote('AAPL')
      const allTickQuoteCheck = this.validateQuoteData(allTickQuote, 'AllTick AAPL 行情')
      checks.push(allTickQuoteCheck)
      
      const allTickHistory = await allTick.getStockHistory('AAPL', 'day')
      const allTickHistoryCheck = this.validateHistoryData(allTickHistory, 'AllTick AAPL 历史数据')
      checks.push(allTickHistoryCheck)

    } catch (error) {
      console.error('❌ AllTick 数据检查失败:', error.message)
      checks.push({ name: 'AllTick', valid: false, error: error.message })
    }

    console.log('\n📋 数据完整性检查结果:')
    console.table(checks)
    
    return checks
  }

  /**
   * 验证行情数据
   */
  private static validateQuoteData(quote: any, name: string) {
    const issues = []
    
    if (!quote) {
      issues.push('数据为空')
    } else {
      if (!quote.symbol) issues.push('缺少股票代码')
      if (typeof quote.price !== 'number' || quote.price <= 0) issues.push('价格无效')
      if (typeof quote.volume !== 'number' || quote.volume < 0) issues.push('成交量无效')
      if (!quote.timestamp) issues.push('缺少时间戳')
    }
    
    const result = {
      name,
      valid: issues.length === 0,
      issues: issues.join(', ') || '无',
      data: quote ? `价格: ${quote.price}, 成交量: ${quote.volume}` : '无数据'
    }
    
    console.log(`${result.valid ? '✅' : '❌'} ${name}: ${result.valid ? '有效' : result.issues}`)
    
    return result
  }

  /**
   * 验证历史数据
   */
  private static validateHistoryData(history: any[], name: string) {
    const issues = []
    
    if (!Array.isArray(history)) {
      issues.push('不是数组格式')
    } else if (history.length === 0) {
      issues.push('数据为空')
    } else {
      const sample = history[0]
      const requiredFields = ['date', 'open', 'high', 'low', 'close', 'volume']
      
      for (const field of requiredFields) {
        if (!(field in sample)) {
          issues.push(`缺少字段: ${field}`)
        }
      }
      
      if (typeof sample.open !== 'number' || sample.open <= 0) {
        issues.push('开盘价无效')
      }
    }
    
    const result = {
      name,
      valid: issues.length === 0,
      issues: issues.join(', ') || '无',
      data: Array.isArray(history) ? `${history.length} 条记录` : '无数据'
    }
    
    console.log(`${result.valid ? '✅' : '❌'} ${name}: ${result.valid ? '有效' : result.issues}`)
    
    return result
  }
}

// 在开发环境中将测试函数暴露到全局
if (import.meta.hot) {
  // 将测试函数添加到 window 对象
  (window as any).testDataSources = {
    quickTest: BrowserTestUtils.quickConnectionTest,
    getSampleData: BrowserTestUtils.getSampleData,
    monitorNetwork: BrowserTestUtils.monitorNetworkRequests,
    performanceTest: BrowserTestUtils.performanceTest,
    integrityCheck: BrowserTestUtils.dataIntegrityCheck,
    fullTest: ComprehensiveTestRunner.runAllTests,
    testAlphaVantage,
    testAllTick
  }
  
  console.log('🔧 数据源测试工具已加载到 window.testDataSources')
  console.log('可用的测试方法:')
  console.log('  - quickTest(): 快速连接测试')
  console.log('  - getSampleData(): 获取样本数据')
  console.log('  - monitorNetwork(): 监控网络请求')
  console.log('  - performanceTest(): 性能测试')
  console.log('  - integrityCheck(): 数据完整性检查')
  console.log('  - fullTest(): 完整测试套件')
  console.log('  - testAlphaVantage(): 测试 Alpha Vantage')
  console.log('  - testAllTick(): 测试 AllTick')
}

export default BrowserTestUtils
