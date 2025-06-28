/**
 * 新数据源测试文件
 * 测试 Alpha Vantage 和 AllTick 数据源的功能
 */

import AlphaVantageDataSource from '@/services/dataSource/AlphaVantageDataSource'
import AlltickDataSource from '@/services/dataSource/AlltickDataSource'

/**
 * 测试 Alpha Vantage 数据源
 */
export async function testAlphaVantageDataSource() {
  console.log('🧪 开始测试 Alpha Vantage 数据源...')
  
  const dataSource = new AlphaVantageDataSource()
  
  try {
    // 测试连接
    console.log('📡 测试连接...')
    const connectionTest = await dataSource.testConnection()
    console.log(`连接测试结果: ${connectionTest ? '✅ 成功' : '❌ 失败'}`)
    
    if (!connectionTest) {
      console.log('❌ Alpha Vantage 连接失败，跳过后续测试')
      return false
    }
    
    // 测试获取股票列表
    console.log('📋 测试获取股票列表...')
    const stocks = await dataSource.getStocks()
    console.log(`获取到 ${stocks.length} 只股票`)
    if (stocks.length > 0) {
      console.log('前3只股票:', stocks.slice(0, 3))
    }
    
    // 测试获取股票行情
    console.log('📈 测试获取股票行情...')
    const quote = await dataSource.getStockQuote('AAPL')
    console.log('AAPL 行情数据:', {
      symbol: quote.symbol,
      price: quote.price,
      change: quote.change,
      changePercent: quote.changePercent,
      volume: quote.volume
    })
    
    // 测试获取历史数据
    console.log('📊 测试获取历史数据...')
    const history = await dataSource.getStockHistory('AAPL', 'day')
    console.log(`获取到 ${history.length} 条历史数据`)
    if (history.length > 0) {
      console.log('最新数据:', history[history.length - 1])
    }
    
    // 测试搜索功能
    console.log('🔍 测试搜索功能...')
    const searchResults = await dataSource.searchStocks('Apple')
    console.log(`搜索 "Apple" 得到 ${searchResults.length} 个结果`)
    
    // 测试获取新闻
    console.log('📰 测试获取新闻...')
    const news = await dataSource.getFinancialNews(5)
    console.log(`获取到 ${news.length} 条新闻`)
    
    console.log('✅ Alpha Vantage 数据源测试完成')
    return true
    
  } catch (error) {
    console.error('❌ Alpha Vantage 测试失败:', error.message)
    return false
  }
}

/**
 * 测试 AllTick 数据源
 */
export async function testAlltickDataSource() {
  console.log('🧪 开始测试 AllTick 数据源...')
  
  const dataSource = new AlltickDataSource()
  
  try {
    // 测试连接
    console.log('📡 测试连接...')
    const connectionTest = await dataSource.testConnection()
    console.log(`连接测试结果: ${connectionTest ? '✅ 成功' : '❌ 失败'}`)
    
    if (!connectionTest) {
      console.log('❌ AllTick 连接失败，跳过后续测试')
      return false
    }
    
    // 测试获取股票列表
    console.log('📋 测试获取股票列表...')
    const stocks = await dataSource.getStocks()
    console.log(`获取到 ${stocks.length} 只股票`)
    if (stocks.length > 0) {
      console.log('前3只股票:', stocks.slice(0, 3))
    }
    
    // 测试获取股票行情 - 美股
    console.log('📈 测试获取美股行情...')
    const usQuote = await dataSource.getStockQuote('AAPL')
    console.log('AAPL 行情数据:', {
      symbol: usQuote.symbol,
      price: usQuote.price,
      volume: usQuote.volume,
      market: usQuote.market
    })
    
    // 测试获取股票行情 - A股
    console.log('📈 测试获取A股行情...')
    const cnQuote = await dataSource.getStockQuote('000001')
    console.log('000001 行情数据:', {
      symbol: cnQuote.symbol,
      price: cnQuote.price,
      volume: cnQuote.volume,
      market: cnQuote.market
    })
    
    // 测试获取历史数据 - 日K线
    console.log('📊 测试获取日K线数据...')
    const dailyHistory = await dataSource.getStockHistory('AAPL', 'day')
    console.log(`获取到 ${dailyHistory.length} 条日K线数据`)
    if (dailyHistory.length > 0) {
      console.log('最新日K线:', dailyHistory[dailyHistory.length - 1])
    }
    
    // 测试获取历史数据 - 分钟K线
    console.log('📊 测试获取分钟K线数据...')
    const minuteHistory = await dataSource.getStockHistory('AAPL', 'minute')
    console.log(`获取到 ${minuteHistory.length} 条分钟K线数据`)
    
    // 测试搜索功能
    console.log('🔍 测试搜索功能...')
    const searchResults = await dataSource.searchStocks('AAPL')
    console.log(`搜索 "AAPL" 得到 ${searchResults.length} 个结果`)
    
    console.log('✅ AllTick 数据源测试完成')
    return true
    
  } catch (error) {
    console.error('❌ AllTick 测试失败:', error.message)
    return false
  }
}

/**
 * 运行所有新数据源测试
 */
export async function runNewDataSourceTests() {
  console.log('🚀 开始运行新数据源测试套件...')
  console.log('=' .repeat(50))
  
  const results = {
    alphavantage: false,
    alltick: false
  }
  
  // 测试 Alpha Vantage
  try {
    results.alphavantage = await testAlphaVantageDataSource()
  } catch (error) {
    console.error('Alpha Vantage 测试异常:', error)
  }
  
  console.log('\n' + '=' .repeat(50))
  
  // 测试 AllTick
  try {
    results.alltick = await testAlltickDataSource()
  } catch (error) {
    console.error('AllTick 测试异常:', error)
  }
  
  console.log('\n' + '=' .repeat(50))
  console.log('📊 测试结果汇总:')
  console.log(`Alpha Vantage: ${results.alphavantage ? '✅ 通过' : '❌ 失败'}`)
  console.log(`AllTick: ${results.alltick ? '✅ 通过' : '❌ 失败'}`)
  
  const passedCount = Object.values(results).filter(Boolean).length
  const totalCount = Object.keys(results).length
  
  console.log(`\n总体结果: ${passedCount}/${totalCount} 个数据源测试通过`)
  
  if (passedCount === totalCount) {
    console.log('🎉 所有新数据源测试通过！')
  } else {
    console.log('⚠️ 部分数据源测试失败，请检查配置和网络连接')
  }
  
  return results
}

/**
 * 性能测试
 */
export async function performanceTest() {
  console.log('⚡ 开始性能测试...')
  
  const dataSource = new AlltickDataSource()
  const testSymbol = 'AAPL'
  const testCount = 5
  
  console.log(`测试获取 ${testSymbol} 行情 ${testCount} 次...`)
  
  const startTime = Date.now()
  const promises = []
  
  for (let i = 0; i < testCount; i++) {
    promises.push(dataSource.getStockQuote(testSymbol))
  }
  
  try {
    const results = await Promise.all(promises)
    const endTime = Date.now()
    const totalTime = endTime - startTime
    const avgTime = totalTime / testCount
    
    console.log(`✅ 性能测试完成:`)
    console.log(`  总时间: ${totalTime}ms`)
    console.log(`  平均时间: ${avgTime.toFixed(2)}ms`)
    console.log(`  成功请求: ${results.length}/${testCount}`)
    
    return {
      totalTime,
      avgTime,
      successCount: results.length,
      totalCount: testCount
    }
  } catch (error) {
    console.error('❌ 性能测试失败:', error.message)
    return null
  }
}

// 如果直接运行此文件，执行测试
if (import.meta.hot) {
  // 在开发环境中可以手动触发测试
  (window as any).testNewDataSources = runNewDataSourceTests
  (window as any).testPerformance = performanceTest
  
  console.log('🔧 开发模式: 可以在控制台中运行以下命令:')
  console.log('  testNewDataSources() - 运行新数据源测试')
  console.log('  testPerformance() - 运行性能测试')
}
