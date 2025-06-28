#!/usr/bin/env node

/**
 * 测试港股代码格式
 */

const https = require('https')

const ALLTICK_API_KEY = '85b75304f6ef5a52123479654ddab44e-c-app'
const STOCK_BASE_URL = 'https://quote.alltick.io/quote-stock-b-api'

function log(message, color = 'reset') {
  const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    cyan: '\x1b[36m'
  }
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) })
        } catch (error) {
          resolve({ status: res.statusCode, data: data, parseError: error.message })
        }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')) })
  })
}

async function testHKStock() {
  log('🔍 测试港股代码格式...', 'cyan')
  
  const hkFormats = [
    '700.HK',     // 去掉前导零
    '00700.HK',   // 保留前导零
    '0700.HK',    // 部分前导零
    'HK.00700',   // 不同格式
    '700',        // 只有数字
  ]
  
  for (const symbol of hkFormats) {
    try {
      log(`\n测试: ${symbol}`)
      
      const queryData = {
        trace: `hk-test-${Date.now()}`,
        data: { symbol_list: [{ code: symbol }] }
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
          log(`   价格: ${tick.price}, 成交量: ${tick.volume}`)
        }
      } else {
        log(`❌ ${symbol} - 失败: ${response.data ? response.data.msg : '未知错误'}`, 'red')
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      
    } catch (error) {
      log(`❌ ${symbol} - 异常: ${error.message}`, 'red')
    }
  }
}

testHKStock().catch(console.error)
