/**
 * 测试特定股票数据
 */

import axios from 'axios'

const BASE_URL = 'http://localhost:7001'

// 测试股票列表
const testStocks = [
  { symbol: '601398.SH', name: '工商银行' },
  { symbol: '000001.SZ', name: '平安银行' },
  { symbol: '000001.SH', name: '上证指数' },
  { symbol: '399001.SZ', name: '深证成指' },
  { symbol: '600519.SH', name: '贵州茅台' },
  { symbol: '000858.SZ', name: '五粮液' }
]

async function testStockQuote(stock) {
  try {
    console.log(`\n测试股票行情: ${stock.name} (${stock.symbol})`)
    
    const response = await axios.get(`${BASE_URL}/api/eastmoney/quote`, {
      params: { symbol: stock.symbol },
      timeout: 10000
    })
    
    if (response.data && response.data.success && response.data.data) {
      const data = response.data.data
      console.log(`✅ 成功获取数据`)
      console.log(`📊 股票名称: ${data.name || '未知'}`)
      console.log(`💰 当前价格: ${data.price || '未知'}`)
      console.log(`📈 涨跌幅: ${data.changePercent || '未知'}%`)
      console.log(`📊 成交量: ${data.volume || '未知'}`)
      
      return { success: true, stock: stock.symbol, data }
    } else {
      console.log(`❌ 数据格式错误或无数据`)
      return { success: false, stock: stock.symbol, error: '数据格式错误' }
    }
  } catch (error) {
    console.log(`❌ 错误: ${error.message}`)
    return { success: false, stock: stock.symbol, error: error.message }
  }
}

async function testHotStocks() {
  try {
    console.log(`\n测试热门股票数据`)
    
    const response = await axios.get(`${BASE_URL}/api/stocks/hot-stocks`, {
      timeout: 10000
    })
    
    if (response.data && response.data.success && response.data.data) {
      const stocks = response.data.data
      console.log(`✅ 成功获取 ${stocks.length} 只热门股票`)
      
      if (stocks.length > 0) {
        console.log(`📊 示例股票:`)
        stocks.slice(0, 3).forEach((stock, index) => {
          console.log(`  ${index + 1}. ${stock.name || stock.symbol} (${stock.symbol})`)
        })
      }
      
      return { success: true, count: stocks.length, data: stocks }
    } else {
      console.log(`❌ 数据格式错误或无数据`)
      return { success: false, error: '数据格式错误' }
    }
  } catch (error) {
    console.log(`❌ 错误: ${error.message}`)
    return { success: false, error: error.message }
  }
}

async function testLimitUpStocks() {
  try {
    console.log(`\n测试涨停股票数据`)
    
    const response = await axios.get(`${BASE_URL}/api/stocks/limit-up`, {
      timeout: 10000
    })
    
    if (response.data && response.data.success) {
      const stocks = response.data.data || []
      console.log(`✅ 成功获取 ${stocks.length} 只涨停股票`)
      
      if (stocks.length > 0) {
        console.log(`📊 示例涨停股票:`)
        stocks.slice(0, 3).forEach((stock, index) => {
          console.log(`  ${index + 1}. ${stock.name || stock.symbol} (${stock.symbol})`)
        })
      } else {
        console.log(`📊 今日暂无涨停股票`)
      }
      
      return { success: true, count: stocks.length, data: stocks }
    } else {
      console.log(`❌ 数据格式错误或无数据`)
      return { success: false, error: '数据格式错误' }
    }
  } catch (error) {
    console.log(`❌ 错误: ${error.message}`)
    return { success: false, error: error.message }
  }
}

async function runStockTests() {
  console.log('🚀 开始测试股票数据...\n')
  
  // 测试特定股票行情
  console.log('=' * 50)
  console.log('测试特定股票行情')
  console.log('=' * 50)
  
  const quoteResults = []
  for (const stock of testStocks) {
    const result = await testStockQuote(stock)
    quoteResults.push(result)
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  // 测试热门股票
  console.log('\n' + '=' * 50)
  console.log('测试热门股票')
  console.log('=' * 50)
  const hotStocksResult = await testHotStocks()
  
  // 测试涨停股票
  console.log('\n' + '=' * 50)
  console.log('测试涨停股票')
  console.log('=' * 50)
  const limitUpResult = await testLimitUpStocks()
  
  // 汇总结果
  console.log('\n📊 测试结果汇总:')
  console.log('='.repeat(50))
  
  const successfulQuotes = quoteResults.filter(r => r.success)
  console.log(`📈 股票行情: ${successfulQuotes.length}/${quoteResults.length} 成功`)
  console.log(`🔥 热门股票: ${hotStocksResult.success ? '✅' : '❌'}`)
  console.log(`📈 涨停股票: ${limitUpResult.success ? '✅' : '❌'}`)
  
  if (successfulQuotes.length > 0) {
    console.log('\n✅ 成功获取行情的股票:')
    successfulQuotes.forEach(r => {
      console.log(`  - ${r.stock}`)
    })
  }
  
  const failedQuotes = quoteResults.filter(r => !r.success)
  if (failedQuotes.length > 0) {
    console.log('\n❌ 获取行情失败的股票:')
    failedQuotes.forEach(r => {
      console.log(`  - ${r.stock}: ${r.error}`)
    })
  }
}

// 运行测试
runStockTests().catch(console.error)
