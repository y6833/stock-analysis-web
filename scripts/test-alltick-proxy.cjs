#!/usr/bin/env node

/**
 * 测试 AllTick 前端代理
 */

const https = require('https')
const http = require('http')

// 测试前端代理
async function testFrontendProxy() {
  console.log('🔍 测试 AllTick 前端代理...')

  const API_TOKEN = '85b75304f6ef5a52123479654ddab44e-c-app'

  // 构建查询参数
  const queryData = {
    trace: `proxy-test-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    data: {
      symbol_list: [{ code: 'AAPL.US' }]
    }
  }

  const queryParams = new URLSearchParams({
    token: API_TOKEN,
    query: JSON.stringify(queryData)
  })

  const proxyUrl = `http://localhost:5173/alltick-api/quote-stock-b-api/trade-tick?${queryParams.toString()}`

  console.log(`代理URL: ${proxyUrl}`)

  return new Promise((resolve) => {
    const url = new URL(proxyUrl)

    const req = http.get({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data)
          console.log('✅ 代理请求成功')
          console.log('响应状态:', res.statusCode)
          console.log('响应数据:', JSON.stringify(jsonData, null, 2))

          if (jsonData.ret === 200 && jsonData.data && jsonData.data.tick_list) {
            console.log('🎉 AllTick 代理工作正常！')
            resolve(true)
          } else {
            console.log('⚠️ 代理响应格式异常')
            resolve(false)
          }
        } catch (error) {
          console.error('❌ 解析代理响应失败:', error.message)
          console.log('原始响应:', data)
          resolve(false)
        }
      })
    })

    req.on('error', (error) => {
      console.error('❌ 代理请求失败:', error.message)
      resolve(false)
    })

    req.on('timeout', () => {
      req.destroy()
      console.error('❌ 代理请求超时')
      resolve(false)
    })
  })
}

// 测试直接 API 调用（用于对比）
async function testDirectAPI() {
  console.log('\n🔍 测试直接 AllTick API 调用（用于对比）...')

  const API_TOKEN = '85b75304f6ef5a52123479654ddab44e-c-app'

  const queryData = {
    trace: `direct-test-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    data: {
      symbol_list: [{ code: 'AAPL.US' }]
    }
  }

  const queryParams = new URLSearchParams({
    token: API_TOKEN,
    query: JSON.stringify(queryData)
  })

  const directUrl = `https://quote.alltick.io/quote-stock-b-api/trade-tick?${queryParams.toString()}`

  console.log(`直接URL: ${directUrl}`)

  return new Promise((resolve) => {
    const req = https.get(directUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data)
          console.log('✅ 直接 API 调用成功')
          console.log('响应状态:', res.statusCode)
          console.log('响应数据:', JSON.stringify(jsonData, null, 2))
          resolve(true)
        } catch (error) {
          console.error('❌ 解析响应失败:', error.message)
          resolve(false)
        }
      })
    })

    req.on('error', (error) => {
      console.error('❌ 直接 API 调用失败:', error.message)
      resolve(false)
    })

    req.on('timeout', () => {
      req.destroy()
      console.error('❌ 直接 API 调用超时')
      resolve(false)
    })
  })
}

// 主函数
async function main() {
  console.log('🚀 AllTick 代理测试开始...')
  console.log('=' .repeat(60))

  // 等待前端服务器启动
  console.log('⏳ 等待前端服务器启动...')
  await new Promise(resolve => setTimeout(resolve, 3000))

  const results = {
    proxy: false,
    direct: false
  }

  try {
    // 测试前端代理
    results.proxy = await testFrontendProxy()

    // 测试直接 API 调用
    results.direct = await testDirectAPI()

    // 生成报告
    console.log('\n📋 测试报告')
    console.log('=' .repeat(60))
    console.log(`前端代理: ${results.proxy ? '✅ 成功' : '❌ 失败'}`)
    console.log(`直接调用: ${results.direct ? '✅ 成功' : '❌ 失败'}`)

    if (results.proxy && results.direct) {
      console.log('\n🎉 AllTick 代理配置成功！CORS 问题已解决！')
    } else if (results.direct && !results.proxy) {
      console.log('\n⚠️ 直接 API 可用，但代理配置有问题')
      console.log('建议检查：')
      console.log('1. 前端服务器是否在 localhost:5173 运行')
      console.log('2. vite.config.ts 中的代理配置是否正确')
      console.log('3. 代理路径是否匹配')
    } else if (!results.direct) {
      console.log('\n❌ AllTick API 本身有问题，需要检查 API 密钥或网络连接')
    } else {
      console.log('\n❓ 未知状态，需要进一步调试')
    }

  } catch (error) {
    console.error('\n💥 测试过程中发生错误:', error.message)
  }

  console.log('\n' + '=' .repeat(60))
}

// 运行测试
if (require.main === module) {
  main().catch(error => {
    console.error('\n💥 未处理的错误:', error.message)
    process.exit(1)
  })
}
