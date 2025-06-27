#!/usr/bin/env node

/**
 * 智兔数服API专项测试
 * 基于官方文档测试智兔数服的各种API端点
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 简单的颜色输出函数
const colors = {
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  gray: (text) => `\x1b[90m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`
};

// 手动读取.env文件
function loadEnvFile() {
  const envPath = path.join(__dirname, '../server/.env');
  const env = {};
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        }
      }
    }
  }
  
  return env;
}

// 智兔数服API端点（基于官方文档）
const zhituEndpoints = [
  // 基础信息类
  {
    name: '公司简介',
    url: 'https://api.zhituapi.com/hs/gs/gsjj/000001',
    params: {},
    description: '获取公司基本信息和简介'
  },
  {
    name: '公司概况',
    url: 'https://api.zhituapi.com/hs/gs/gsjj/000001',
    params: {},
    description: '获取公司概况信息'
  },
  {
    name: '主要指标',
    url: 'https://api.zhituapi.com/hs/gs/zyzb/000001',
    params: {},
    description: '获取公司主要财务指标'
  },
  
  // 实时数据类
  {
    name: '实时交易数据',
    url: 'https://api.zhituapi.com/hs/real/time/000001',
    params: {},
    description: '获取股票实时交易数据'
  },
  {
    name: '实时分时数据',
    url: 'https://api.zhituapi.com/hs/real/fs/000001',
    params: {},
    description: '获取股票实时分时数据'
  },
  
  // 历史数据类
  {
    name: '日K线数据',
    url: 'https://api.zhituapi.com/hs/latest/000001',
    params: { start: '2024-01-01', end: '2024-01-05' },
    description: '获取股票日K线历史数据'
  },
  {
    name: '周K线数据',
    url: 'https://api.zhituapi.com/hs/history/week/000001',
    params: { start: '2024-01-01', end: '2024-01-31' },
    description: '获取股票周K线历史数据'
  },
  {
    name: '月K线数据',
    url: 'https://api.zhituapi.com/hs/history/month/000001',
    params: { start: '2024-01-01', end: '2024-12-31' },
    description: '获取股票月K线历史数据'
  },
  
  // 列表类
  {
    name: '股票列表',
    url: 'https://api.zhituapi.com/hs/list/all',
    params: {},
    description: '获取所有股票列表'
  },
  {
    name: '沪市股票列表',
    url: 'https://api.zhituapi.com/hs/list/sh',
    params: {},
    description: '获取沪市股票列表'
  },
  {
    name: '深市股票列表',
    url: 'https://api.zhituapi.com/hs/list/sz',
    params: {},
    description: '获取深市股票列表'
  }
];

// 测试单个API端点
async function testEndpoint(endpoint, apiKey) {
  try {
    console.log(colors.yellow(`\n🔍 测试: ${endpoint.name}`));
    console.log(colors.gray(`描述: ${endpoint.description}`));
    console.log(colors.gray(`URL: ${endpoint.url}`));
    
    const params = { ...endpoint.params, token: apiKey };
    console.log(colors.gray(`参数: ${JSON.stringify(params)}`));
    
    const response = await axios.get(endpoint.url, {
      params: params,
      headers: {
        'User-Agent': 'HappyStockMarket/1.0',
        'Accept': 'application/json'
      },
      timeout: 15000
    });
    
    console.log(colors.gray(`HTTP状态: ${response.status}`));
    
    if (response.status === 200) {
      const data = response.data;
      console.log(colors.gray(`响应类型: ${typeof data}`));
      
      if (typeof data === 'string') {
        if (data.includes('error') || data.includes('Error')) {
          console.log(colors.red(`❌ 错误响应: ${data}`));
          return false;
        } else {
          console.log(colors.green(`✅ 成功 (字符串响应)`));
          console.log(colors.gray(`响应内容: ${data.substring(0, 100)}...`));
          return true;
        }
      } else if (Array.isArray(data)) {
        console.log(colors.green(`✅ 成功 (数组响应，${data.length}条记录)`));
        if (data.length > 0) {
          console.log(colors.gray(`示例数据: ${JSON.stringify(data[0], null, 2).substring(0, 200)}...`));
        }
        return true;
      } else if (typeof data === 'object' && data !== null) {
        console.log(colors.green(`✅ 成功 (对象响应)`));
        console.log(colors.gray(`字段: ${Object.keys(data).join(', ')}`));
        console.log(colors.gray(`示例数据: ${JSON.stringify(data, null, 2).substring(0, 200)}...`));
        return true;
      } else {
        console.log(colors.yellow(`⚠️ 未知响应格式: ${data}`));
        return true;
      }
    } else {
      console.log(colors.red(`❌ HTTP错误: ${response.status}`));
      return false;
    }
    
  } catch (error) {
    if (error.response) {
      console.log(colors.red(`❌ HTTP ${error.response.status}: ${error.message}`));
      
      if (error.response.status === 401) {
        console.log(colors.gray(`提示: API Key可能无效或未授权`));
      } else if (error.response.status === 403) {
        console.log(colors.gray(`提示: 可能是API Key权限不足`));
      } else if (error.response.status === 404) {
        console.log(colors.gray(`提示: API端点可能不存在`));
      } else if (error.response.status === 429) {
        console.log(colors.gray(`提示: API调用频率限制`));
      }
      
      if (error.response.data) {
        console.log(colors.gray(`错误响应: ${JSON.stringify(error.response.data, null, 2)}`));
      }
    } else if (error.code === 'ENOTFOUND') {
      console.log(colors.red(`❌ 域名解析失败: ${error.hostname}`));
      console.log(colors.gray(`提示: 请检查域名是否正确或网络连接`));
    } else {
      console.log(colors.red(`❌ 网络错误: ${error.message}`));
    }
    return false;
  }
}

// 主函数
async function main() {
  console.log(colors.blue(colors.bold('\n🧪 智兔数服API专项测试\n')));
  console.log(colors.gray('基于官方文档: https://zhituapi.com/hsstockapi.html\n'));
  
  // 加载环境变量
  const envVars = loadEnvFile();
  const apiKey = envVars.ZHITU_API_KEY;
  
  if (!apiKey) {
    console.log(colors.red('❌ 智兔数服API Key未配置'));
    console.log(colors.yellow('请在 server/.env 文件中配置 ZHITU_API_KEY'));
    console.log(colors.gray('获取API Key: https://zhituapi.com/'));
    process.exit(1);
  }
  
  console.log(colors.blue(`🔑 使用API Key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`));
  console.log(colors.gray(`总共测试 ${zhituEndpoints.length} 个API端点\n`));
  
  let successCount = 0;
  let totalCount = zhituEndpoints.length;
  
  // 测试所有端点
  for (let i = 0; i < zhituEndpoints.length; i++) {
    const endpoint = zhituEndpoints[i];
    console.log(colors.blue(`[${i + 1}/${totalCount}] ${endpoint.name}`));
    
    const success = await testEndpoint(endpoint, apiKey);
    if (success) {
      successCount++;
    }
    
    // 避免频率限制，每次请求间隔1秒
    if (i < zhituEndpoints.length - 1) {
      console.log(colors.gray('等待1秒避免频率限制...'));
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // 输出结果
  console.log(colors.blue(colors.bold('\n📊 测试结果汇总\n')));
  console.log(colors.gray(`总测试数: ${totalCount}`));
  console.log(colors.green(`成功: ${successCount}`));
  console.log(colors.red(`失败: ${totalCount - successCount}`));
  console.log(colors.blue(`成功率: ${Math.round((successCount / totalCount) * 100)}%`));
  
  if (successCount > 0) {
    console.log(colors.green(`\n🎉 找到 ${successCount} 个可用的API端点！`));
    console.log(colors.gray('智兔数服API连接正常，可以正常使用'));
  } else {
    console.log(colors.red('\n❌ 所有API端点都失败了'));
    console.log(colors.yellow('可能的原因:'));
    console.log(colors.gray('1. API Key无效或过期'));
    console.log(colors.gray('2. API Key权限不足'));
    console.log(colors.gray('3. 账户余额不足'));
    console.log(colors.gray('4. 网络连接问题'));
    
    console.log(colors.blue('\n💡 建议:'));
    console.log(colors.gray('1. 检查智兔数服官网账户状态'));
    console.log(colors.gray('2. 验证API Key是否正确'));
    console.log(colors.gray('3. 联系智兔数服客服'));
    console.log(colors.gray('4. 考虑使用其他数据源'));
  }
  
  console.log(colors.blue(colors.bold('\n📚 智兔数服API文档\n')));
  console.log(colors.gray('官方文档: https://zhituapi.com/hsstockapi.html'));
  console.log(colors.gray('API域名: https://api.zhituapi.com'));
  console.log(colors.gray('参数格式: ?token=YOUR_API_KEY'));
  
  process.exit(successCount > 0 ? 0 : 1);
}

// 错误处理
process.on('unhandledRejection', (error) => {
  console.error(colors.red('\n❌ 未处理的错误:'), error);
  process.exit(1);
});

// 运行测试
main().catch(error => {
  console.error(colors.red('\n❌ 测试过程发生错误:'), error);
  process.exit(1);
});
