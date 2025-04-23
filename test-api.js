// 简单的测试脚本，用于测试 Tushare API 连接
const axios = require('axios');

// Tushare API 配置
const TUSHARE_API_URL = 'https://api.tushare.pro';
const TOKEN = '983b25aa025eee598034c4741dc776dd73356ddc53ddcffbb180cf61';

async function testAPI() {
  console.log('开始测试 Tushare API 连接...');
  
  try {
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
        'Referer': 'http://localhost:5173/',
        'sec-ch-ua': '"Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"'
      }
    });
    
    if (response.data && response.data.code === 0) {
      console.log('Tushare API 连接成功!');
      console.log(`获取到 ${response.data.data.items.length} 条数据`);
      console.log('示例数据 (前3条):', response.data.data.items.slice(0, 3));
    } else {
      console.error('Tushare API 请求失败:', response.data.msg || '未知错误');
    }
  } catch (error) {
    console.error('Tushare API 连接错误:');
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应数据:', error.response.data);
    } else if (error.request) {
      console.error('无响应:', error.request);
    } else {
      console.error('错误信息:', error.message);
    }
  }
}

// 执行测试
testAPI()
  .then(() => console.log('测试完成'))
  .catch(err => console.error('测试过程中发生错误:', err));
