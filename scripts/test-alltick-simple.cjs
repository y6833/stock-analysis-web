#!/usr/bin/env node

/**
 * AllTick 数据源简化测试脚本
 * 专门用于诊断 AllTick API 连接问题
 */

const https = require('https')

// API 配置
const ALLTICK_API_KEY = '85b75304f6ef5a52123479654ddab44e-c-app'
const STOCK_BASE_URL = 'https://quote.alltick.io/quote-stock-b-api'

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

// HTTP 请求工具
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/json',
        ...options.headers
      }
    }, (res) => {
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data)
          resolve({
            status: res.statusCode,
            data: jsonData,
            headers: res.headers,
            rawData: data
          })
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers,
            rawData: data,
            parseError: error.message
          })
        }
      })
    })
    
    req.on('error', (error) => {
      reject(error)
    })
    
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })
  })
}

// 测试基础连接
async function testBasicConnection() {
  log('\n🔍 测试 AllTick 基础连接...', 'blue')
  
  try {
    const response = await makeRequest('https://quote.alltick.io')
    log(`✅ 基础连接成功 - 状态码: ${response.status}`, 'green')
    return true
  } catch (error) {
    log(`❌ 基础连接失败: ${error.message}`, 'red')
    return false
  }
}

// 测试 API 端点
async function testApiEndpoint() {
  log('\n🔍 测试 AllTick API 端点...', 'blue')
  
  try {
    const response = await makeRequest(`${STOCK_BASE_URL}/trade-tick`)
    log(`✅ API 端点可访问 - 状态码: ${response.status}`, 'green')
    log(`响应数据: ${response.rawData.substring(0, 200)}...`, 'cyan')
    return true
  } catch (error) {
    log(`❌ API 端点测试失败: ${error.message}`, 'red')
    return false
  }
}

// 测试完整的 API 调用
async function testFullApiCall() {
  log('\n🔍 测试完整的 AllTick API 调用...', 'blue')
  
  try {
    // 构建查询参数
    const queryData = {
      trace: `test-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      data: {
        symbol_list: [{ code: 'AAPL.US' }]
      }
    }

    const queryParams = new URLSearchParams({
      token: ALLTICK_API_KEY,
      query: JSON.stringify(queryData)
    })

    const url = `${STOCK_BASE_URL}/trade-tick?${queryParams.toString()}`
    
    log(`请求URL: ${url}`, 'cyan')
    
    const response = await makeRequest(url)
    
    log(`✅ API 调用成功 - 状态码: ${response.status}`, 'green')
    log(`响应数据:`, 'cyan')
    console.log(JSON.stringify(response.data, null, 2))
    
    // 检查响应格式
    if (response.data && typeof response.data === 'object') {
      if (response.data.ret === 200) {
        log(`✅ API 返回成功状态`, 'green')
        if (response.data.data && response.data.data.tick_list) {
          log(`✅ 获取到 ${response.data.data.tick_list.length} 条行情数据`, 'green')
        }
      } else {
        log(`⚠️ API 返回错误状态: ${response.data.ret} - ${response.data.msg}`, 'yellow')
      }
    }
    
    return true
  } catch (error) {
    log(`❌ 完整 API 调用失败: ${error.message}`, 'red')
    return false
  }
}

// 测试不同的股票代码格式
async function testDifferentSymbols() {
  log('\n🔍 测试不同股票代码格式...', 'blue')
  
  const symbols = [
    'AAPL.US',    // 美股
    '00700.HK',   // 港股
    '000001.SZ',  // A股深圳
    '600000.SH'   // A股上海
  ]
  
  const results = []
  
  for (const symbol of symbols) {
    try {
      log(`\n测试股票代码: ${symbol}`, 'cyan')
      
      const queryData = {
        trace: `test-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        data: {
          symbol_list: [{ code: symbol }]
        }
      }

      const queryParams = new URLSearchParams({
        token: ALLTICK_API_KEY,
        query: JSON.stringify(queryData)
      })

      const url = `${STOCK_BASE_URL}/trade-tick?${queryParams.toString()}`
      const response = await makeRequest(url)
      
      if (response.data && response.data.ret === 200) {
        log(`✅ ${symbol} - 成功`, 'green')
        if (response.data.data && response.data.data.tick_list && response.data.data.tick_list.length > 0) {
          const tick = response.data.data.tick_list[0]
          log(`   价格: ${tick.price}, 成交量: ${tick.volume}`, 'cyan')
        }
        results.push({ symbol, success: true })
      } else {
        log(`❌ ${symbol} - 失败: ${response.data ? response.data.msg : '未知错误'}`, 'red')
        results.push({ symbol, success: false, error: response.data ? response.data.msg : '未知错误' })
      }
      
      // 避免频率限制
      await new Promise(resolve => setTimeout(resolve, 1000))
      
    } catch (error) {
      log(`❌ ${symbol} - 异常: ${error.message}`, 'red')
      results.push({ symbol, success: false, error: error.message })
    }
  }
  
  return results
}

// 主函数
async function main() {
  log('🚀 开始 AllTick 数据源诊断测试...', 'green')
  log(`测试时间: ${new Date().toLocaleString()}`, 'reset')
  log('=' .repeat(60), 'blue')
  
  const results = {
    basicConnection: false,
    apiEndpoint: false,
    fullApiCall: false,
    symbolTests: []
  }
  
  try {
    // 1. 基础连接测试
    results.basicConnection = await testBasicConnection()
    
    // 2. API 端点测试
    results.apiEndpoint = await testApiEndpoint()
    
    // 3. 完整 API 调用测试
    results.fullApiCall = await testFullApiCall()
    
    // 4. 不同股票代码测试
    results.symbolTests = await testDifferentSymbols()
    
    // 生成报告
    log('\n📋 测试报告', 'blue')
    log('=' .repeat(60), 'blue')
    
    log(`基础连接: ${results.basicConnection ? '✅ 成功' : '❌ 失败'}`)
    log(`API 端点: ${results.apiEndpoint ? '✅ 成功' : '❌ 失败'}`)
    log(`完整调用: ${results.fullApiCall ? '✅ 成功' : '❌ 失败'}`)
    
    log('\n股票代码测试结果:')
    results.symbolTests.forEach(result => {
      log(`  ${result.symbol}: ${result.success ? '✅ 成功' : '❌ 失败'}`)
      if (!result.success && result.error) {
        log(`    错误: ${result.error}`, 'red')
      }
    })
    
    const successCount = [
      results.basicConnection,
      results.apiEndpoint,
      results.fullApiCall,
      ...results.symbolTests.map(r => r.success)
    ].filter(Boolean).length
    
    const totalCount = 3 + results.symbolTests.length
    const successRate = (successCount / totalCount * 100).toFixed(1)
    
    log(`\n总体成功率: ${successRate}% (${successCount}/${totalCount})`)
    
    if (successRate >= 75) {
      log('🎉 AllTick 数据源状态: 良好', 'green')
    } else if (successRate >= 50) {
      log('⚠️ AllTick 数据源状态: 部分可用', 'yellow')
    } else {
      log('❌ AllTick 数据源状态: 需要修复', 'red')
    }
    
  } catch (error) {
    log(`\n❌ 测试过程中发生错误: ${error.message}`, 'red')
    process.exit(1)
  }
  
  log('\n' + '=' .repeat(60), 'blue')
}

// 运行测试
if (require.main === module) {
  main().catch(error => {
    log(`\n💥 未处理的错误: ${error.message}`, 'red')
    process.exit(1)
  })
}
