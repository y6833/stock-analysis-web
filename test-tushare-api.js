// 测试 Tushare API 连接
import axios from 'axios';

// Tushare API 配置
const TUSHARE_API_URL = 'http://api.tushare.pro';
const TOKEN = '983b25aa025eee598034c4741dc776dd73356ddc53ddcffbb180cf61';

async function testDailyAPI() {
  console.log('========== 开始测试 Tushare daily API ==========');
  console.log('当前时间:', new Date().toISOString());
  console.log('API URL:', TUSHARE_API_URL);
  console.log('Token:', TOKEN ? '已设置' : '未设置');

  try {
    const requestData = {
      api_name: 'daily',
      token: TOKEN,
      params: {
        ts_code: '000001.SZ',
        start_date: '20240401',
        end_date: '20240410'
      }
    };

    console.log('请求数据:', JSON.stringify(requestData, null, 2));

    const response = await axios.post(TUSHARE_API_URL, requestData, {
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

    console.log('响应状态码:', response.status);

    if (response.data && response.data.code === 0) {
      console.log('Tushare daily API 请求成功!');
      console.log('数据字段:', response.data.data.fields);
      console.log('数据条数:', response.data.data.items.length);
      console.log('示例数据 (前3条):', response.data.data.items.slice(0, 3));
    } else {
      console.error('Tushare daily API 请求失败:', response.data.msg || '未知错误');
      if (response.data.code === -2001) {
        console.error('错误原因: 可能是token无效或过期');
      }
    }
  } catch (error) {
    console.error('Tushare daily API 请求错误:');
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
testDailyAPI()
  .then(() => console.log('测试完成'))
  .catch(err => console.error('测试过程中发生错误:', err));
