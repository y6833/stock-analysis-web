#!/usr/bin/env node

/**
 * 数据源快速验证脚本
 * 可以在命令行中直接运行，无需启动完整的开发环境
 */

const https = require('https')
const http = require('http')

// API 配置
const ALPHA_VANTAGE_API_KEY = 'UZMT16NQOTELC1O7'
const ALLTICK_API_KEY = '85b75304f6ef5a52123479654ddab44e-c-app'

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

// HTTP 请求工具
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http
    
    const req = protocol.get(url, {
      timeout: 10000,
      ...options
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
            headers: res.headers
          })
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers,
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

// Alpha Vantage 测试
async function testAlphaVantage() {
  log('\n📈 测试 Alpha Vantage 数据源...', 'blue')
  log('=' .repeat(50), 'blue')
  
  const tests = [
    {
      name: 'API Key 验证',
      url: `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=${ALPHA_VANTAGE_API_KEY}`,
      validator: (response) => {
        if (response.status !== 200) {
          throw new Error(`HTTP ${response.status}`)
        }
        if (response.data['Error Message']) {
          throw new Error(response.data['Error Message'])
        }
        if (response.data['Note']) {
          throw new Error('API 调用频率限制: ' + response.data['Note'])
        }
        if (!response.data['Global Quote']) {
          throw new Error('未返回预期的数据格式')
        }
        return {
          symbol: response.data['Global Quote']['01. symbol'],
          price: response.data['Global Quote']['05. price'],
          change: response.data['Global Quote']['09. change'],
          changePercent: response.data['Global Quote']['10. change percent']
        }
      }
    },
    {
      name: '股票搜索',
      url: `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=Apple&apikey=${ALPHA_VANTAGE_API_KEY}`,
      validator: (response) => {
        if (response.status !== 200) {
          throw new Error(`HTTP ${response.status}`)
        }
        if (!response.data.bestMatches || !Array.isArray(response.data.bestMatches)) {
          throw new Error('搜索结果格式错误')
        }
        return {
          count: response.data.bestMatches.length,
          firstResult: response.data.bestMatches[0] ? {
            symbol: response.data.bestMatches[0]['1. symbol'],
            name: response.data.bestMatches[0]['2. name']
          } : null
        }
      }
    }
  ]
  
  const results = []
  
  for (const test of tests) {
    const startTime = Date.now()
    try {
      log(`\n🔍 ${test.name}...`, 'cyan')
      const response = await makeRequest(test.url)
      const validatedData = test.validator(response)
      const duration = Date.now() - startTime
      
      log(`✅ ${test.name} - 成功 (${duration}ms)`, 'green')
      log(`   数据: ${JSON.stringify(validatedData, null, 2)}`, 'reset')
      
      results.push({
        name: test.name,
        success: true,
        duration,
        data: validatedData
      })
    } catch (error) {
      const duration = Date.now() - startTime
      log(`❌ ${test.name} - 失败 (${duration}ms)`, 'red')
      log(`   错误: ${error.message}`, 'red')
      
      results.push({
        name: test.name,
        success: false,
        duration,
        error: error.message
      })
    }
    
    // 避免频率限制
    if (test !== tests[tests.length - 1]) {
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }
  
  return results
}

// AllTick 测试
async function testAllTick() {
  log('\n📊 测试 AllTick 数据源...', 'magenta')
  log('=' .repeat(50), 'magenta')
  
  // 注意：AllTick 的 API 需要 POST 请求，这里我们测试基础连接
  const tests = [
    {
      name: '基础连接测试',
      url: 'https://quote.alltick.io',
      validator: (response) => {
        if (response.status !== 200 && response.status !== 404) {
          throw new Error(`HTTP ${response.status}`)
        }
        // 即使返回 404，也说明域名可以访问
        return {
          status: response.status,
          accessible: true,
          message: '域名可访问'
        }
      }
    }
  ]
  
  const results = []
  
  for (const test of tests) {
    const startTime = Date.now()
    try {
      log(`\n🔍 ${test.name}...`, 'cyan')
      const response = await makeRequest(test.url)
      const validatedData = test.validator(response)
      const duration = Date.now() - startTime
      
      log(`✅ ${test.name} - 成功 (${duration}ms)`, 'green')
      log(`   数据: ${JSON.stringify(validatedData, null, 2)}`, 'reset')
      
      results.push({
        name: test.name,
        success: true,
        duration,
        data: validatedData
      })
    } catch (error) {
      const duration = Date.now() - startTime
      log(`❌ ${test.name} - 失败 (${duration}ms)`, 'red')
      log(`   错误: ${error.message}`, 'red')
      
      results.push({
        name: test.name,
        success: false,
        duration,
        error: error.message
      })
    }
  }
  
  return results
}

// 网络连接测试
async function testNetworkConnectivity() {
  log('\n🌐 测试网络连接...', 'yellow')
  log('=' .repeat(50), 'yellow')
  
  const endpoints = [
    'https://www.alphavantage.co',
    'https://quote.alltick.io',
    'https://www.google.com'
  ]
  
  const results = []
  
  for (const endpoint of endpoints) {
    const startTime = Date.now()
    try {
      log(`\n🔍 测试 ${endpoint}...`, 'cyan')
      const response = await makeRequest(endpoint)
      const duration = Date.now() - startTime
      
      log(`✅ ${endpoint} - 可访问 (${duration}ms)`, 'green')
      
      results.push({
        endpoint,
        success: true,
        duration,
        status: response.status
      })
    } catch (error) {
      const duration = Date.now() - startTime
      log(`❌ ${endpoint} - 不可访问 (${duration}ms)`, 'red')
      log(`   错误: ${error.message}`, 'red')
      
      results.push({
        endpoint,
        success: false,
        duration,
        error: error.message
      })
    }
  }
  
  return results
}

// 生成测试报告
function generateReport(alphaVantageResults, allTickResults, networkResults) {
  log('\n📋 测试报告', 'blue')
  log('=' .repeat(60), 'blue')
  
  const allResults = [
    ...alphaVantageResults,
    ...allTickResults,
    ...networkResults
  ]
  
  const totalTests = allResults.length
  const passedTests = allResults.filter(r => r.success).length
  const failedTests = totalTests - passedTests
  const successRate = totalTests > 0 ? (passedTests / totalTests * 100).toFixed(1) : 0
  
  log(`\n📊 统计信息:`, 'cyan')
  log(`   总测试数: ${totalTests}`)
  log(`   通过测试: ${passedTests}`)
  log(`   失败测试: ${failedTests}`)
  log(`   成功率: ${successRate}%`)
  
  if (successRate >= 80) {
    log(`\n🎉 测试结果: 优秀`, 'green')
  } else if (successRate >= 60) {
    log(`\n⚠️  测试结果: 良好`, 'yellow')
  } else {
    log(`\n❌ 测试结果: 需要改进`, 'red')
  }
  
  // Alpha Vantage 详细结果
  log(`\n📈 Alpha Vantage 详细结果:`, 'blue')
  alphaVantageResults.forEach(result => {
    const status = result.success ? '✅' : '❌'
    log(`   ${status} ${result.name} (${result.duration}ms)`)
    if (!result.success) {
      log(`      错误: ${result.error}`, 'red')
    }
  })
  
  // AllTick 详细结果
  log(`\n📊 AllTick 详细结果:`, 'magenta')
  allTickResults.forEach(result => {
    const status = result.success ? '✅' : '❌'
    log(`   ${status} ${result.name} (${result.duration}ms)`)
    if (!result.success) {
      log(`      错误: ${result.error}`, 'red')
    }
  })
  
  // 网络连接结果
  log(`\n🌐 网络连接结果:`, 'yellow')
  networkResults.forEach(result => {
    const status = result.success ? '✅' : '❌'
    log(`   ${status} ${result.endpoint} (${result.duration}ms)`)
    if (!result.success) {
      log(`      错误: ${result.error}`, 'red')
    }
  })
  
  log('\n' + '=' .repeat(60), 'blue')
}

// 主函数
async function main() {
  log('🚀 开始数据源验证测试...', 'green')
  log(`测试时间: ${new Date().toLocaleString()}`, 'reset')
  
  try {
    // 网络连接测试
    const networkResults = await testNetworkConnectivity()
    
    // Alpha Vantage 测试
    const alphaVantageResults = await testAlphaVantage()
    
    // AllTick 测试
    const allTickResults = await testAllTick()
    
    // 生成报告
    generateReport(alphaVantageResults, allTickResults, networkResults)
    
  } catch (error) {
    log(`\n❌ 测试过程中发生错误: ${error.message}`, 'red')
    process.exit(1)
  }
}

// 运行测试
if (require.main === module) {
  main().catch(error => {
    log(`\n💥 未处理的错误: ${error.message}`, 'red')
    process.exit(1)
  })
}

module.exports = {
  testAlphaVantage,
  testAllTick,
  testNetworkConnectivity,
  generateReport
}
