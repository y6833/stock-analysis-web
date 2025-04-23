import axios from 'axios'

// Tushare API 配置
const TUSHARE_API_URL = 'https://api.tushare.pro'
const TOKEN = '983b25aa025eee598034c4741dc776dd73356ddc53ddcffbb180cf61'

// 测试 Tushare API 连接
async function testTushareConnection() {
  try {
    console.log('开始测试 Tushare API 连接...')
    
    const response = await axios.post(TUSHARE_API_URL, {
      api_name: 'stock_basic',
      token: TOKEN,
      params: {
        exchange: '',
        list_status: 'L',
        fields: 'ts_code,name,industry,market,list_date'
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })
    
    if (response.data && response.data.code === 0) {
      console.log('Tushare API 连接成功!')
      console.log('数据字段:', response.data.data.fields)
      console.log('数据条数:', response.data.data.items.length)
      console.log('示例数据 (前3条):', response.data.data.items.slice(0, 3))
      return true
    } else {
      console.error('Tushare API 请求失败:', response.data.msg || '未知错误')
      return false
    }
  } catch (error) {
    console.error('Tushare API 连接错误:', error)
    return false
  }
}

// 执行测试
testTushareConnection()
  .then(success => {
    if (success) {
      console.log('测试完成，API 连接正常')
    } else {
      console.log('测试完成，API 连接异常')
    }
  })
  .catch(err => {
    console.error('测试过程中发生错误:', err)
  })
