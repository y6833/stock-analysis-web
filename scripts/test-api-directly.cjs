#!/usr/bin/env node

/**
 * 直接测试API调用
 * 绕过后端，直接调用API来诊断问题
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

// 测试Alpha Vantage API
async function testAlphaVantage(apiKey) {
  console.log(colors.blue('\n🔍 测试 Alpha Vantage API...'));

  if (!apiKey) {
    console.log(colors.red('❌ API Key未配置'));
    return false;
  }

  try {
    const response = await axios.get('https://www.alphavantage.co/query', {
      params: {
        function: 'GLOBAL_QUOTE',
        symbol: 'AAPL',
        apikey: apiKey
      },
      timeout: 15000
    });

    console.log(colors.gray(`HTTP状态: ${response.status}`));
    console.log(colors.gray(`响应数据:`, JSON.stringify(response.data, null, 2)));

    if (response.data['Global Quote']) {
      console.log(colors.green('✅ Alpha Vantage API调用成功'));
      return true;
    } else if (response.data['Error Message']) {
      console.log(colors.red(`❌ API错误: ${response.data['Error Message']}`));
      return false;
    } else if (response.data['Note']) {
      console.log(colors.yellow(`⚠️ 频率限制: ${response.data['Note']}`));
      return false;
    } else {
      console.log(colors.yellow('⚠️ 未知响应格式'));
      return false;
    }

  } catch (error) {
    console.log(colors.red(`❌ 请求失败: ${error.message}`));
    if (error.response) {
      console.log(colors.gray(`HTTP状态: ${error.response.status}`));
      console.log(colors.gray(`响应数据:`, JSON.stringify(error.response.data, null, 2)));
    }
    return false;
  }
}

// 测试聚合数据API
async function testJuhe(apiKey) {
  console.log(colors.blue('\n🔍 测试 聚合数据 API...'));

  if (!apiKey) {
    console.log(colors.red('❌ API Key未配置'));
    return false;
  }

  const testEndpoints = [
    {
      name: '沪深股市接口',
      url: 'http://web.juhe.cn/finance/stock/hs',
      params: { gid: 'sh000001', key: apiKey }
    },
    {
      name: '香港股市接口',
      url: 'http://web.juhe.cn/finance/stock/hk',
      params: { num: '00700', key: apiKey }
    },
    {
      name: '美国股市接口',
      url: 'http://web.juhe.cn/finance/stock/usa',
      params: { gid: 'AAPL', key: apiKey }
    }
  ];

  for (const endpoint of testEndpoints) {
    try {
      console.log(colors.yellow(`测试: ${endpoint.name}`));
      console.log(colors.gray(`URL: ${endpoint.url}`));
      console.log(colors.gray(`参数:`, endpoint.params));

      const response = await axios.get(endpoint.url, {
        params: endpoint.params,
        timeout: 10000
      });

      console.log(colors.gray(`HTTP状态: ${response.status}`));
      console.log(colors.gray(`响应数据:`, JSON.stringify(response.data, null, 2)));

      if (response.data.error_code === 0) {
        console.log(colors.green(`✅ ${endpoint.name} 调用成功`));
        return true;
      } else {
        console.log(colors.red(`❌ ${endpoint.name} 调用失败: ${response.data.reason}`));
      }

    } catch (error) {
      console.log(colors.red(`❌ ${endpoint.name} 请求失败: ${error.message}`));
      if (error.response) {
        console.log(colors.gray(`HTTP状态: ${error.response.status}`));
        console.log(colors.gray(`响应数据:`, JSON.stringify(error.response.data, null, 2)));
      }
    }

    console.log();
  }

  return false;
}

// 测试智兔数服API
async function testZhitu(apiKey) {
  console.log(colors.blue('\n🔍 测试 智兔数服 API...'));

  if (!apiKey) {
    console.log(colors.red('❌ API Key未配置'));
    return false;
  }

  const testEndpoints = [
    {
      name: '公司简介接口',
      url: 'https://api.zhituapi.com/hs/gs/gsjj/000001',
      params: { token: apiKey }
    },
    {
      name: '实时交易数据',
      url: 'https://api.zhituapi.com/hs/real/time/000001',
      params: { token: apiKey }
    },
    {
      name: '股票列表接口',
      url: 'https://api.zhituapi.com/hs/list/all',
      params: { token: apiKey }
    },
    {
      name: '历史交易数据',
      url: 'https://api.zhituapi.com/hs/latest/000001',
      params: { token: apiKey, start: '2024-01-01', end: '2024-01-02' }
    }
  ];

  for (const endpoint of testEndpoints) {
    try {
      console.log(colors.yellow(`测试: ${endpoint.name}`));
      console.log(colors.gray(`URL: ${endpoint.url}`));
      console.log(colors.gray(`参数:`, endpoint.params));

      const response = await axios.get(endpoint.url, {
        params: endpoint.params,
        timeout: 10000
      });

      console.log(colors.gray(`HTTP状态: ${response.status}`));
      console.log(colors.gray(`响应数据:`, JSON.stringify(response.data, null, 2)));

      if (response.data.code === 0 || response.data.success === true) {
        console.log(colors.green(`✅ ${endpoint.name} 调用成功`));
        return true;
      } else {
        console.log(colors.red(`❌ ${endpoint.name} 调用失败: ${response.data.msg || response.data.message}`));
      }

    } catch (error) {
      console.log(colors.red(`❌ ${endpoint.name} 请求失败: ${error.message}`));
      if (error.response) {
        console.log(colors.gray(`HTTP状态: ${error.response.status}`));
        console.log(colors.gray(`响应数据:`, JSON.stringify(error.response.data, null, 2)));
      }
    }

    console.log();
  }

  return false;
}

// 测试Tushare API
async function testTushare(token) {
  console.log(colors.blue('\n🔍 测试 Tushare API...'));

  if (!token) {
    // 使用项目中的默认token
    token = '983b25aa025eee598034c4741dc776dd73356ddc53ddcffbb180cf61';
    console.log(colors.yellow('使用项目默认Token'));
  }

  try {
    console.log(colors.yellow(`测试: Tushare股票基本信息`));
    console.log(colors.gray(`Token: ${token.substring(0, 8)}...${token.substring(token.length - 4)}`));

    const response = await axios.post('https://api.tushare.pro', {
      api_name: 'stock_basic',
      token: token,
      params: {
        exchange: '',
        list_status: 'L',
        fields: 'ts_code,name,industry,market,list_date'
      }
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    console.log(colors.gray(`HTTP状态: ${response.status}`));
    console.log(colors.gray(`响应数据:`, JSON.stringify(response.data, null, 2).substring(0, 300) + '...'));

    if (response.data.code === 0) {
      const recordCount = response.data.data ? response.data.data.items.length : 0;
      console.log(colors.green(`✅ Tushare API调用成功，返回${recordCount}条记录`));
      return true;
    } else {
      console.log(colors.red(`❌ Tushare API错误: ${response.data.msg}`));
      return false;
    }

  } catch (error) {
    console.log(colors.red(`❌ Tushare请求失败: ${error.message}`));
    if (error.response) {
      console.log(colors.gray(`HTTP状态: ${error.response.status}`));
      console.log(colors.gray(`响应数据:`, JSON.stringify(error.response.data, null, 2)));
    }
    return false;
  }
}

// 主函数
async function main() {
  console.log(colors.blue(colors.bold('\n🧪 API直接测试工具\n')));

  // 加载环境变量
  const envVars = loadEnvFile();

  console.log(colors.blue('📋 已配置的API Key:'));
  console.log(colors.gray(`Alpha Vantage: ${envVars.ALPHA_VANTAGE_API_KEY ? '已配置' : '未配置'}`));
  console.log(colors.gray(`聚合数据: ${envVars.JUHE_API_KEY ? '已配置' : '未配置'}`));
  console.log(colors.gray(`智兔数服: ${envVars.ZHITU_API_KEY ? '已配置' : '未配置'}`));
  console.log(colors.gray(`Tushare: ${envVars.TUSHARE_TOKEN ? '已配置' : '使用默认Token'}`));

  let successCount = 0;
  let totalTests = 0;

  // 测试Alpha Vantage
  if (envVars.ALPHA_VANTAGE_API_KEY) {
    totalTests++;
    if (await testAlphaVantage(envVars.ALPHA_VANTAGE_API_KEY)) {
      successCount++;
    }
  }

  // 测试聚合数据
  if (envVars.JUHE_API_KEY) {
    totalTests++;
    if (await testJuhe(envVars.JUHE_API_KEY)) {
      successCount++;
    }
  }

  // 测试智兔数服
  if (envVars.ZHITU_API_KEY) {
    totalTests++;
    if (await testZhitu(envVars.ZHITU_API_KEY)) {
      successCount++;
    }
  }

  // 测试Tushare
  totalTests++;
  if (await testTushare(envVars.TUSHARE_TOKEN)) {
    successCount++;
  }

  // 输出结果
  console.log(colors.blue(colors.bold('\n📊 测试结果汇总\n')));
  console.log(colors.gray(`总测试数: ${totalTests}`));
  console.log(colors.green(`成功: ${successCount}`));
  console.log(colors.red(`失败: ${totalTests - successCount}`));

  if (totalTests === 0) {
    console.log(colors.yellow('\n⚠️ 没有配置任何API Key进行测试'));
    console.log(colors.gray('请在 server/.env 文件中配置API Key'));
  } else if (successCount === 0) {
    console.log(colors.red('\n❌ 所有API测试都失败了'));
    console.log(colors.yellow('可能的原因:'));
    console.log(colors.gray('1. API Key无效或过期'));
    console.log(colors.gray('2. API端点已变更'));
    console.log(colors.gray('3. 网络连接问题'));
    console.log(colors.gray('4. API调用频率限制'));
  } else {
    console.log(colors.green(`\n🎉 ${successCount}/${totalTests} 个API测试成功！`));
  }

  console.log(colors.blue(colors.bold('\n💡 建议:\n')));
  console.log(colors.gray('1. 检查API Key是否正确复制'));
  console.log(colors.gray('2. 确认API Key未过期且有剩余额度'));
  console.log(colors.gray('3. 查看API提供商的最新文档'));
  console.log(colors.gray('4. 考虑使用已经正常工作的数据源'));

  process.exit(successCount === totalTests ? 0 : 1);
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
