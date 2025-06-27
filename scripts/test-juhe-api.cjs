#!/usr/bin/env node

/**
 * 聚合数据API专项测试
 * 测试聚合数据的各种可能的API端点
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

// 聚合数据官方API端点（基于官方文档）
const juheEndpoints = [
  // 主要股票API（基于官方文档）
  {
    name: '沪深股市',
    url: 'http://web.juhe.cn/finance/stock/hs',
    params: { gid: 'sh000001' },
    description: '查询沪深股市行情数据'
  },
  {
    name: '香港股市',
    url: 'http://web.juhe.cn/finance/stock/hk',
    params: { num: '00700' },
    description: '查询香港股市行情数据'
  },
  {
    name: '美国股市',
    url: 'http://web.juhe.cn/finance/stock/usa',
    params: { gid: 'AAPL' },
    description: '查询美国股市行情数据'
  },
  {
    name: '香港股市列表',
    url: 'http://web.juhe.cn/finance/stock/hk',
    params: {},
    description: '获取香港股市列表'
  },
  {
    name: '美国股市列表',
    url: 'http://web.juhe.cn/finance/stock/usa',
    params: {},
    description: '获取美国股市列表'
  },
  {
    name: '深圳股市列表',
    url: 'http://web.juhe.cn/finance/stock/szall',
    params: {},
    description: '获取深圳股市列表'
  },
  {
    name: '沪股列表',
    url: 'http://web.juhe.cn/finance/stock/shall',
    params: {},
    description: '获取沪股列表'
  }
];

// 测试单个API端点
async function testEndpoint(endpoint, apiKey) {
  try {
    console.log(colors.yellow(`\n🔍 测试: ${endpoint.name}`));
    console.log(colors.gray(`描述: ${endpoint.description}`));
    console.log(colors.gray(`URL: ${endpoint.url}`));

    const params = { ...endpoint.params, key: apiKey };
    console.log(colors.gray(`参数: ${JSON.stringify(params)}`));

    const response = await axios.get(endpoint.url, {
      params: params,
      headers: {
        'User-Agent': 'HappyStockMarket/1.0',
        'Accept': 'application/json'
      },
      timeout: 10000
    });

    console.log(colors.gray(`HTTP状态: ${response.status}`));

    if (response.status === 200) {
      const data = response.data;
      console.log(colors.gray(`响应类型: ${typeof data}`));

      if (typeof data === 'object') {
        console.log(colors.gray(`响应字段: ${Object.keys(data).join(', ')}`));

        if (data.error_code !== undefined) {
          if (data.error_code === 0) {
            console.log(colors.green(`✅ 成功: ${data.reason || '调用成功'}`));
            console.log(colors.gray(`数据预览: ${JSON.stringify(data, null, 2).substring(0, 200)}...`));
            return true;
          } else {
            console.log(colors.red(`❌ 错误码 ${data.error_code}: ${data.reason || '未知错误'}`));
            return false;
          }
        } else {
          console.log(colors.yellow(`⚠️ 响应格式未知，但状态正常`));
          console.log(colors.gray(`响应内容: ${JSON.stringify(data, null, 2).substring(0, 300)}...`));
          return true;
        }
      } else {
        console.log(colors.yellow(`⚠️ 非JSON响应: ${String(data).substring(0, 100)}...`));
        return true;
      }
    } else {
      console.log(colors.red(`❌ HTTP错误: ${response.status}`));
      return false;
    }

  } catch (error) {
    if (error.response) {
      console.log(colors.red(`❌ HTTP ${error.response.status}: ${error.message}`));
      if (error.response.status === 404) {
        console.log(colors.gray(`提示: 该API端点可能不存在或已废弃`));
      } else if (error.response.status === 403) {
        console.log(colors.gray(`提示: 可能是API Key权限问题`));
      } else if (error.response.status === 429) {
        console.log(colors.gray(`提示: API调用频率限制`));
      }

      if (error.response.data) {
        console.log(colors.gray(`错误响应: ${JSON.stringify(error.response.data, null, 2)}`));
      }
    } else {
      console.log(colors.red(`❌ 网络错误: ${error.message}`));
    }
    return false;
  }
}

// 主函数
async function main() {
  console.log(colors.blue(colors.bold('\n🧪 聚合数据API专项测试\n')));
  console.log(colors.gray('基于官方文档: https://www.juhe.cn/docs/api/id/21\n'));

  // 加载环境变量
  const envVars = loadEnvFile();
  const apiKey = envVars.JUHE_API_KEY;

  if (!apiKey) {
    console.log(colors.red('❌ 聚合数据API Key未配置'));
    console.log(colors.yellow('请在 server/.env 文件中配置 JUHE_API_KEY'));
    process.exit(1);
  }

  console.log(colors.blue(`🔑 使用API Key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`));
  console.log(colors.gray(`总共测试 ${juheEndpoints.length} 个API端点\n`));

  let successCount = 0;
  let totalCount = juheEndpoints.length;

  // 测试所有端点
  for (let i = 0; i < juheEndpoints.length; i++) {
    const endpoint = juheEndpoints[i];
    console.log(colors.blue(`[${i + 1}/${totalCount}] ${endpoint.name}`));

    const success = await testEndpoint(endpoint, apiKey);
    if (success) {
      successCount++;
    }

    // 避免频率限制，每次请求间隔1秒
    if (i < juheEndpoints.length - 1) {
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
    console.log(colors.gray('建议使用成功的端点更新后端控制器'));
  } else {
    console.log(colors.red('\n❌ 所有API端点都失败了'));
    console.log(colors.yellow('可能的原因:'));
    console.log(colors.gray('1. API Key无效或过期'));
    console.log(colors.gray('2. 聚合数据API结构已变更'));
    console.log(colors.gray('3. 账户余额不足'));
    console.log(colors.gray('4. 网络连接问题'));

    console.log(colors.blue('\n💡 建议:'));
    console.log(colors.gray('1. 检查聚合数据官网最新文档'));
    console.log(colors.gray('2. 验证API Key是否正确'));
    console.log(colors.gray('3. 联系聚合数据客服'));
    console.log(colors.gray('4. 考虑使用其他数据源'));
  }

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
