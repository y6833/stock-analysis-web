/**
 * 测试仪表板API端点
 */

import axios from 'axios'

const BASE_URL = 'http://localhost:7001'

// 测试API端点
const testEndpoints = [
  {
    name: '股票基础信息',
    url: '/api/stocks',
    method: 'GET'
  },
  {
    name: '热门股票',
    url: '/api/stocks/hot-stocks',
    method: 'GET'
  },
  {
    name: '涨停股票',
    url: '/api/stocks/limit-up',
    method: 'GET'
  },
  {
    name: '跌停股票',
    url: '/api/stocks/limit-down',
    method: 'GET'
  },
  {
    name: '市场概览',
    url: '/api/market/overview',
    method: 'GET'
  },
  {
    name: '财经新闻',
    url: '/api/news/financial',
    method: 'GET'
  },
  {
    name: '指数行情',
    url: '/api/eastmoney/quote?symbol=000001.SH',
    method: 'GET'
  },
  {
    name: 'Tushare股票基础信息',
    url: '/api/tushare/stock-basic',
    method: 'GET'
  }
]

async function testAPI(endpoint) {
  try {
    console.log(`\n测试: ${endpoint.name}`)
    console.log(`URL: ${BASE_URL}${endpoint.url}`)
    
    const response = await axios({
      method: endpoint.method,
      url: `${BASE_URL}${endpoint.url}`,
      timeout: 10000
    })
    
    console.log(`✅ 状态: ${response.status}`)
    console.log(`📊 数据类型: ${typeof response.data}`)
    
    if (response.data) {
      if (Array.isArray(response.data)) {
        console.log(`📋 数组长度: ${response.data.length}`)
        if (response.data.length > 0) {
          console.log(`🔍 第一项键: ${Object.keys(response.data[0]).join(', ')}`)
        }
      } else if (typeof response.data === 'object') {
        console.log(`🔍 对象键: ${Object.keys(response.data).join(', ')}`)
      }
    }
    
    return { success: true, endpoint: endpoint.name, data: response.data }
  } catch (error) {
    console.log(`❌ 错误: ${error.message}`)
    if (error.response) {
      console.log(`📄 响应状态: ${error.response.status}`)
      console.log(`📄 响应数据: ${JSON.stringify(error.response.data, null, 2)}`)
    }
    return { success: false, endpoint: endpoint.name, error: error.message }
  }
}

async function testAllAPIs() {
  console.log('🚀 开始测试仪表板API端点...\n')
  
  const results = []
  
  for (const endpoint of testEndpoints) {
    const result = await testAPI(endpoint)
    results.push(result)
    
    // 等待一秒避免请求过快
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  console.log('\n📊 测试结果汇总:')
  console.log('='.repeat(50))
  
  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)
  
  console.log(`✅ 成功: ${successful.length}/${results.length}`)
  console.log(`❌ 失败: ${failed.length}/${results.length}`)
  
  if (failed.length > 0) {
    console.log('\n❌ 失败的端点:')
    failed.forEach(f => {
      console.log(`  - ${f.endpoint}: ${f.error}`)
    })
  }
  
  if (successful.length > 0) {
    console.log('\n✅ 成功的端点:')
    successful.forEach(s => {
      console.log(`  - ${s.endpoint}`)
    })
  }
  
  return results
}

// 运行测试
testAllAPIs().catch(console.error)
